"""
Prediction engine for the Minneapolis Metro Interstate Traffic Volume project.

Loads a trained model and feature list, reproduces the same feature
engineering used in `train_48k.py`, and exposes:
- single-record prediction with simple confidence bounds
- batch prediction on DataFrames
- lightweight heatmap data for the frontend.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler


class PredictionEngine:
    def __init__(self) -> None:
        """
        Initialize the prediction engine by loading:
        - best_model_48k.pkl (preferred) or gradient_boosting_model.pkl (fallback)
        - feature_names_48k.pkl for column alignment
        - encoders and scaler refit on Train.csv to mirror training preprocessing.
        """
        project_root = Path(__file__).resolve().parents[1]
        models_dir = project_root / "models"
        data_dir = project_root / "data"

        # Load model (best_model_48k preferred)
        model_paths = [
            models_dir / "best_model_48k.pkl",
            models_dir / "gradient_boosting_model.pkl",
        ]

        self.model = None
        self.model_name = None
        last_error: Exception | None = None

        for path in model_paths:
            if not path.exists():
                continue
            try:
                try:
                    import joblib  # type: ignore

                    self.model = joblib.load(path)
                except Exception:
                    import pickle

                    with open(path, "rb") as f:
                        self.model = pickle.load(f)
                self.model_name = path.name
                print(f"[PredictionEngine] Loaded model: {path.name}")
                break
            except Exception as e:  # pragma: no cover - defensive
                last_error = e
                continue

        if self.model is None:
            msg = (
                "No suitable model file found. "
                "Expected 'best_model_48k.pkl' or 'gradient_boosting_model.pkl' in the models folder."
            )
            if last_error is not None:
                msg += f" Last error: {last_error!r}"
            raise RuntimeError(msg)

        # Load feature names
        feature_path = models_dir / "feature_names_48k.pkl"
        if not feature_path.exists():
            raise RuntimeError(f"Feature names file not found: {feature_path}")

        import pickle

        with open(feature_path, "rb") as f:
            self.feature_names: List[str] = pickle.load(f)

        # Fit encoders and scaler on Train.csv to mirror training preprocessing
        train_path = data_dir / "Train.csv"
        df_train = pd.read_csv(train_path)
        df_fe = self._engineer_features_dataframe(df_train)

        if "traffic_volume" not in df_fe.columns:
            raise RuntimeError("Train.csv after feature engineering must contain 'traffic_volume'.")

        X_df = df_fe.drop(columns=["traffic_volume"])

        # Align to feature_names before fitting scaler
        for col in self.feature_names:
            if col not in X_df.columns:
                X_df[col] = 0.0
        X_df = X_df[self.feature_names]

        self.scaler = StandardScaler()
        self.scaler.fit(X_df.values)

        print("[PredictionEngine] Initialisation complete.")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _add_time_features(df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        dt = pd.to_datetime(df["date_time"])
        df["hour"] = dt.dt.hour
        df["day_of_week"] = dt.dt.dayofweek
        df["month"] = dt.dt.month
        df["year"] = dt.dt.year

        # Cyclical encodings
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)

        df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7.0)
        df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7.0)

        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)

        # Binary flags
        df["is_morning_peak"] = ((df["hour"] >= 7) & (df["hour"] <= 10)).astype(int)
        df["is_evening_peak"] = ((df["hour"] >= 17) & (df["hour"] <= 20)).astype(int)
        df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
        df["is_business_hours"] = ((df["hour"] >= 9) & (df["hour"] <= 17)).astype(int)

        # Holiday flag
        df["is_holiday_flag"] = (df["is_holiday"].astype(str) != "None").astype(int)

        # Temperature in Celsius
        df["temp_celsius"] = df["temperature"] - 273.15

        return df

    def _fit_label_encoders(self, df: pd.DataFrame) -> None:
        """Fit label encoders on Train.csv for weather_type and weather_description."""
        self._weather_type_encoder = LabelEncoder()
        self._weather_desc_encoder = LabelEncoder()

        self._weather_type_encoder.fit(df["weather_type"].astype(str))
        self._weather_desc_encoder.fit(df["weather_description"].astype(str))

        # Build mapping dicts for robust inference (handle unseen labels as 0)
        self._weather_type_map = {
            v: int(i) for i, v in enumerate(self._weather_type_encoder.classes_)
        }
        self._weather_desc_map = {
            v: int(i) for i, v in enumerate(self._weather_desc_encoder.classes_)
        }

    def _encode_weather_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        def map_with_fallback(val: Any, mapping: Dict[str, int]) -> int:
            key = str(val)
            if key in mapping:
                return mapping[key]
            # Fallback to first known class
            return 0

        df["weather_type"] = df["weather_type"].astype(str).map(
            lambda v: map_with_fallback(v, self._weather_type_map)
        )
        df["weather_description"] = df["weather_description"].astype(str).map(
            lambda v: map_with_fallback(v, self._weather_desc_map)
        )
        return df

    def _engineer_features_dataframe(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        """
        Apply the same feature engineering as in train_48k.py
        to a full dataframe (used during initialisation).
        """
        df = self._add_time_features(df_raw)

        # Fit encoders once on train data
        if not hasattr(self, "_weather_type_encoder"):
            self._fit_label_encoders(df)
        df = self._encode_weather_columns(df)

        # Interaction terms
        df["temp_humidity_interaction"] = df["temp_celsius"] * df["humidity"]
        df["wind_speed_clouds_interaction"] = df["wind_speed"] * df["clouds_all"]
        df["rain_humidity_interaction"] = df["rain_p_h"] * df["humidity"]

        # Drop raw columns that are no longer needed
        drop_cols = [c for c in ["date_time", "is_holiday"] if c in df.columns]
        if drop_cols:
            df = df.drop(columns=drop_cols)

        return df

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def _prepare_features(self, input_dict: Dict[str, Any]) -> np.ndarray:
        """
        Convert a raw input record into a single-row feature array
        aligned with the training feature order.
        """
        df_raw = pd.DataFrame([input_dict])
        df = self._add_time_features(df_raw)

        # Use existing mappings for weather columns
        df = self._encode_weather_columns(df)

        # Interaction terms
        df["temp_humidity_interaction"] = df["temp_celsius"] * df["humidity"]
        df["wind_speed_clouds_interaction"] = df["wind_speed"] * df["clouds_all"]
        df["rain_humidity_interaction"] = df["rain_p_h"] * df["humidity"]

        drop_cols = [c for c in ["date_time", "is_holiday", "traffic_volume"] if c in df.columns]
        if drop_cols:
            df = df.drop(columns=drop_cols)

        # Ensure all expected feature columns exist
        for col in self.feature_names:
            if col not in df.columns:
                df[col] = 0.0

        df = df[self.feature_names]
        df = df.fillna(0.0)

        X = self.scaler.transform(df.values)
        return X[0:1, :]

    def predict_with_confidence(self, input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a point prediction and simple confidence bounds.
        """
        X = self._prepare_features(input_dict)
        y_pred = float(self.model.predict(X)[0])

        lower: float
        upper: float

        # Tree-based models: approximate variance from individual estimators
        if hasattr(self.model, "estimators_"):
            estimators = self.model.estimators_
            try:
                # RandomForest: list of trees
                tree_preds = np.array([est.predict(X)[0] for est in estimators])
            except Exception:
                # GradientBoosting: 2D array; flatten and use base estimator + stages
                flat_ests = np.ravel(estimators)
                tree_preds = np.array([est.predict(X)[0] for est in flat_ests])

            std = float(np.std(tree_preds))
            lower = max(y_pred - 1.96 * std, 0.0)
            upper = y_pred + 1.96 * std
        else:
            # Fallback: ±10%
            lower = max(y_pred * 0.9, 0.0)
            upper = y_pred * 1.1

        result = {
            "prediction": round(y_pred, 1),
            "lower_bound": round(lower, 1),
            "upper_bound": round(upper, 1),
            "confidence_pct": 95.0,
            "model_used": str(self.model_name),
        }
        return result

    def predict_batch(self, dataframe: pd.DataFrame) -> pd.DataFrame:
        """
        Apply predict_with_confidence to each row of the dataframe.
        """
        df_out = dataframe.copy()

        preds: List[float] = []
        lowers: List[float] = []
        uppers: List[float] = []

        for _, row in df_out.iterrows():
            res = self.predict_with_confidence(row.to_dict())
            preds.append(res["prediction"])
            lowers.append(res["lower_bound"])
            uppers.append(res["upper_bound"])

        df_out["predicted_volume"] = preds
        df_out["lower_bound"] = lowers
        df_out["upper_bound"] = uppers

        return df_out

    @staticmethod
    def get_heatmap_data(offset: int = 0) -> Dict[str, List[Dict[str, Any]]]:
        """
        Build summary data for heatmaps:
        - hourly: avg volume, avg humidity, avg temp (C)
        - by_weather: avg volume and peak hour per weather_type
        """
        project_root = Path(__file__).resolve().parents[1]
        data_dir = project_root / "data"
        train_path = data_dir / "Train.csv"

        df = pd.read_csv(train_path)
        dt = pd.to_datetime(df["date_time"])
        
        # Apply the prediction offset to the hour to query the "future" hour
        df["hour"] = (dt.dt.hour + offset) % 24
        df["temp_celsius"] = df["temperature"] - 273.15

        hourly = (
            df.groupby("hour", as_index=False)
            .agg(
                avg_volume=("traffic_volume", "mean"),
                avg_humidity=("humidity", "mean"),
                avg_temp_celsius=("temp_celsius", "mean"),
            )
            .sort_values("hour")
        )

        # By weather_type: average volume and peak hour
        by_weather_avg = (
            df.groupby("weather_type", as_index=False)["traffic_volume"]
            .mean()
            .rename(columns={"traffic_volume": "avg_volume"})
        )

        by_weather_hour = (
            df.groupby(["weather_type", "hour"], as_index=False)["traffic_volume"]
            .mean()
            .rename(columns={"traffic_volume": "mean_volume"})
        )
        by_weather_hour["rank"] = by_weather_hour.groupby("weather_type")["mean_volume"].rank(
            method="first", ascending=False
        )
        peak = by_weather_hour[by_weather_hour["rank"] == 1][["weather_type", "hour"]].rename(
            columns={"hour": "peak_hour"}
        )

        by_weather = by_weather_avg.merge(peak, on="weather_type", how="left")

        return {
            "hourly": hourly.to_dict(orient="records"),
            "by_weather": by_weather.to_dict(orient="records"),
        }


if __name__ == "__main__":
    engine = PredictionEngine()

    sample_input = {
        "date_time": "2024-03-19 08:30:00",
        "is_holiday": "None",
        "air_pollution_index": 50,
        "humidity": 65,
        "wind_speed": 10,
        "wind_direction": 180,
        "visibility_in_miles": 10,
        "dew_point": 280,
        "temperature": 288.15,
        "rain_p_h": 0.0,
        "snow_p_h": 0.0,
        "clouds_all": 20,
        "weather_type": "Clear",
        "weather_description": "sky is clear",
        "traffic_volume": 0,  # ignored by feature engineering but kept for alignment
    }

    print("=" * 80)
    print("PredictionEngine test - single sample")
    print("=" * 80)
    result = engine.predict_with_confidence(sample_input)
    print("Input:", sample_input)
    print("Prediction result:", result)

