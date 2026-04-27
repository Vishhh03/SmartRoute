"""
Train and evaluate multiple models on the Metro Interstate Traffic Volume dataset
using Train.csv (with labels) and MLflow tracking.

This script:
- Loads Train.csv and Test.csv
- Builds an inline feature engineering pipeline tailored to the dataset
- Splits Train.csv into 80% train and 20% validation
- Trains 6 models (LinearRegression, DecisionTree, RandomForest,
  XGBoost, GradientBoosting, LSTM)
- Logs metrics and hyperparameters to MLflow
- Saves the best model, feature names, comparison CSV, and a feature
  importance plot for the best tree-based model.
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd

import mlflow
from mlflow import MlflowClient  # noqa: F401 (imported for completeness, may not be used directly)

from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

from xgboost import XGBRegressor

import matplotlib.pyplot as plt


def ensure_directories(project_root: Path) -> Tuple[Path, Path, Path]:
    models_dir = project_root / "models"
    results_dir = project_root / "results"
    figures_dir = results_dir / "figures"

    models_dir.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    return models_dir, results_dir, figures_dir


def setup_mlflow(project_root: Path) -> None:
    tracking_dir = project_root / "mlruns"
    tracking_dir.mkdir(parents=True, exist_ok=True)
    import pathlib
    mlflow_path = project_root / "mlruns"
    mlflow_path.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(mlflow_path.as_uri())
    mlflow.set_experiment("SmartRoute_48k_Minneapolis")


def load_data(project_root: Path) -> Tuple[pd.DataFrame, pd.DataFrame]:
    train_path = project_root / "data" / "Train.csv"
    test_path = project_root / "data" / "Test.csv"

    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)

    print(f"[INFO] Loaded Train.csv: {df_train.shape}")
    print(f"[INFO] Loaded Test.csv:  {df_test.shape}")

    return df_train, df_test


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering tailored to the Metro Interstate Traffic Volume dataset."""
    df = df.copy()

    # Parse datetime
    dt = pd.to_datetime(df["date_time"])
    df["hour"] = dt.dt.hour
    df["day_of_week"] = dt.dt.dayofweek  # Monday=0, Sunday=6
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

    # Holiday flag (0 = None, 1 = holiday)
    df["is_holiday_flag"] = (df["is_holiday"].astype(str) != "None").astype(int)

    # Temperature in Celsius
    df["temp_celsius"] = df["temperature"] - 273.15

    # Label encode weather_type and weather_description
    for col in ["weather_type", "weather_description"]:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))

    # Interaction terms
    df["temp_humidity_interaction"] = df["temp_celsius"] * df["humidity"]
    df["wind_speed_clouds_interaction"] = df["wind_speed"] * df["clouds_all"]
    df["rain_humidity_interaction"] = df["rain_p_h"] * df["humidity"]

    # Drop raw columns that are no longer needed
    df = df.drop(columns=["date_time", "is_holiday"])

    return df


def prepare_datasets(df_train_raw: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[str]]:
    """Engineer features, split Train into train/validation, and scale features."""
    if "traffic_volume" not in df_train_raw.columns:
        raise ValueError("Train.csv must contain 'traffic_volume' column.")

    # Engineer features on the full Train dataframe
    df_fe = engineer_features(df_train_raw)

    y = df_fe["traffic_volume"].values.astype(float)
    X_df = df_fe.drop(columns=["traffic_volume"])
    feature_names = X_df.columns.tolist()

    X_train_df, X_val_df, y_train, y_val = train_test_split(
        X_df, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train_df)
    X_val = scaler.transform(X_val_df)

    print(f"[INFO] Train split: X_train={X_train.shape}, X_val={X_val.shape}")

    return X_train, X_val, y_train, y_val, feature_names


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    r2 = float(r2_score(y_true, y_pred))
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {"r2": r2, "mae": mae, "rmse": rmse}


def train_sklearn_model(
    name: str,
    estimator: Any,
    params: Dict[str, Any],
    X_train: np.ndarray,
    X_val: np.ndarray,
    y_train: np.ndarray,
    y_val: np.ndarray,
) -> Dict[str, Any]:
    """Train a scikit-learn (or XGBoost) model with MLflow logging and error handling."""
    result: Dict[str, Any] = {
        "model": name,
        "r2": np.nan,
        "mae": np.nan,
        "rmse": np.nan,
        "training_time_seconds": np.nan,
        "estimator": None,
    }

    with mlflow.start_run(run_name=f"{name}_48k"):
        mlflow.log_params(params)

        try:
            start = time.time()
            estimator.fit(X_train, y_train)
            training_time = time.time() - start

            y_pred = estimator.predict(X_val)
            metrics = compute_metrics(y_val, y_pred)

            mlflow.log_metric("r2_score", metrics["r2"])
            mlflow.log_metric("mae", metrics["mae"])
            mlflow.log_metric("rmse", metrics["rmse"])
            mlflow.log_metric("training_time_seconds", training_time)

            result.update(
                {
                    "r2": metrics["r2"],
                    "mae": metrics["mae"],
                    "rmse": metrics["rmse"],
                    "training_time_seconds": float(training_time),
                    "estimator": estimator,
                }
            )

            print(
                f"[OK] {name}: R2={metrics['r2']:.4f}, "
                f"MAE={metrics['mae']:.2f}, RMSE={metrics['rmse']:.2f}, "
                f"Time={training_time:.2f}s"
            )

        except Exception as e:
            mlflow.set_tag("error", repr(e))
            print(f"[ERROR] {name} failed: {e}")

        return result


def train_lstm_model(
    X_train: np.ndarray,
    X_val: np.ndarray,
    y_train: np.ndarray,
    y_val: np.ndarray,
    n_features: int,
) -> Dict[str, Any]:
    """Train LSTM model with MLflow logging and error handling."""
    # Lazy import to avoid TensorFlow overhead if not used
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping

    name = "LSTM"
    params = {
        "layers": "LSTM(50) -> LSTM(25)",
        "dropout": 0.2,
        "epochs": 30,
        "batch_size": 64,
        "patience": 5,
        "sequence_length": 1,
    }

    result: Dict[str, Any] = {
        "model": name,
        "r2": np.nan,
        "mae": np.nan,
        "rmse": np.nan,
        "training_time_seconds": np.nan,
        "estimator": None,
    }

    # Reshape to (samples, timesteps, features); here timesteps=1
    X_train_seq = X_train.reshape(X_train.shape[0], 1, n_features)
    X_val_seq = X_val.reshape(X_val.shape[0], 1, n_features)

    with mlflow.start_run(run_name=f"{name}_48k"):
        mlflow.log_params(params)

        try:
            model = Sequential(
                [
                    LSTM(50, return_sequences=True, input_shape=(1, n_features)),
                    Dropout(0.2),
                    LSTM(25, return_sequences=False),
                    Dropout(0.2),
                    Dense(1, activation="linear"),
                ]
            )
            model.compile(optimizer="adam", loss="mse")

            early_stop = EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True)

            start = time.time()
            model.fit(
                X_train_seq,
                y_train,
                epochs=params["epochs"],
                batch_size=params["batch_size"],
                validation_data=(X_val_seq, y_val),
                callbacks=[early_stop],
                verbose=0,
            )
            training_time = time.time() - start

            y_pred = model.predict(X_val_seq, verbose=0).flatten()
            metrics = compute_metrics(y_val, y_pred)

            mlflow.log_metric("r2_score", metrics["r2"])
            mlflow.log_metric("mae", metrics["mae"])
            mlflow.log_metric("rmse", metrics["rmse"])
            mlflow.log_metric("training_time_seconds", training_time)

            result.update(
                {
                    "r2": metrics["r2"],
                    "mae": metrics["mae"],
                    "rmse": metrics["rmse"],
                    "training_time_seconds": float(training_time),
                    "estimator": model,
                }
            )

            print(
                f"[OK] {name}: R2={metrics['r2']:.4f}, "
                f"MAE={metrics['mae']:.2f}, RMSE={metrics['rmse']:.2f}, "
                f"Time={training_time:.2f}s"
            )

        except Exception as e:
            mlflow.set_tag("error", repr(e))
            print(f"[ERROR] {name} failed: {e}")

        return result


def save_best_model_and_features(
    results: List[Dict[str, Any]],
    feature_names: List[str],
    models_dir: Path,
) -> Tuple[Dict[str, Any], Path]:
    """Save the best model by R2 and the feature name list."""
    import pickle

    valid_results = [r for r in results if not np.isnan(r["r2"])]
    if not valid_results:
        raise RuntimeError("No successful models to save.")

    best = max(valid_results, key=lambda r: r["r2"])

    best_model_path = models_dir / "best_model_48k.pkl"
    with open(best_model_path, "wb") as f:
        pickle.dump(best["estimator"], f)

    feature_path = models_dir / "feature_names_48k.pkl"
    with open(feature_path, "wb") as f:
        pickle.dump(feature_names, f)

    print(f"[INFO] Best model: {best['model']} (R2={best['r2']:.4f})")
    print(f"[INFO] Saved best model to: {best_model_path}")
    print(f"[INFO] Saved feature names to: {feature_path}")

    return best, best_model_path


def save_feature_importance_plot(
    best_tree_result: Dict[str, Any],
    feature_names: List[str],
    figures_dir: Path,
) -> None:
    estimator = best_tree_result["estimator"]
    if not hasattr(estimator, "feature_importances_"):
        print("[WARN] Best tree-based model has no feature_importances_. Skipping plot.")
        return

    importances = estimator.feature_importances_
    indices = np.argsort(importances)[::-1]

    top_k = min(20, len(feature_names))
    top_indices = indices[:top_k]

    plt.figure(figsize=(10, 6))
    plt.title(f"Feature Importance - {best_tree_result['model']} (Top {top_k})")
    plt.bar(range(top_k), importances[top_indices], align="center")
    plt.xticks(range(top_k), [feature_names[i] for i in top_indices], rotation=45, ha="right")
    plt.tight_layout()

    out_path = figures_dir / "feature_importance_48k.png"
    plt.savefig(out_path, dpi=150)
    plt.close()

    print(f"[INFO] Saved feature importance plot to: {out_path}")


def save_comparison_csv(results: List[Dict[str, Any]], results_dir: Path) -> Path:
    rows = []
    for r in results:
        rows.append(
            {
                "model": r["model"],
                "r2": r["r2"],
                "mae": r["mae"],
                "rmse": r["rmse"],
                "training_time_seconds": r["training_time_seconds"],
            }
        )

    df = pd.DataFrame(rows)
    csv_path = results_dir / "model_comparison_48k.csv"
    df.to_csv(csv_path, index=False)
    print(f"[INFO] Saved comparison CSV to: {csv_path}")
    return csv_path


def print_summary_table(results: List[Dict[str, Any]]) -> None:
    df = pd.DataFrame(results)
    df = df.copy()
    df = df[~df["r2"].isna()].sort_values("r2", ascending=False).reset_index(drop=True)

    if df.empty:
        print("[WARN] No successful models to summarize.")
        return

    df.insert(0, "Rank", np.arange(1, len(df) + 1))

    # Formatting for display
    df_display = df[["Rank", "model", "r2", "mae", "rmse", "training_time_seconds"]].copy()
    df_display["r2"] = df_display["r2"].map(lambda x: f"{x:.3f}")
    df_display["mae"] = df_display["mae"].map(lambda x: f"{x:.1f}")
    df_display["rmse"] = df_display["rmse"].map(lambda x: f"{x:.1f}")
    df_display["training_time_seconds"] = df_display["training_time_seconds"].map(lambda x: f"{x:.1f}")

    print("\nRank | Model             | R2    | MAE     | RMSE    | Time(s)")
    print("-----+-------------------+-------+---------+---------+--------")
    for _, row in df_display.iterrows():
        print(
            f"{int(row['Rank']):>4} | "
            f"{str(row['model']):<17} | "
            f"{row['r2']:<5} | "
            f"{row['mae']:<7} | "
            f"{row['rmse']:<7} | "
            f"{row['training_time_seconds']:<6}"
        )


def main() -> None:
    project_root = Path(__file__).resolve().parent
    models_dir, results_dir, figures_dir = ensure_directories(project_root)
    setup_mlflow(project_root)

    print("=" * 90)
    print("SMARTROUTE - 48k TRAINING (Metro Interstate Traffic Volume)")
    print("=" * 90)

    df_train_raw, df_test_raw = load_data(project_root)

    # Prepare X/y using only Train.csv (Test.csv has no labels)
    X_train, X_val, y_train, y_val, feature_names = prepare_datasets(df_train_raw)
    n_features = X_train.shape[1]

    # Traditional ML models
    models: List[Tuple[str, Any, Dict[str, Any]]] = [
        (
            "LinearRegression",
            LinearRegression(),
            {},
        ),
        (
            "DecisionTree",
            DecisionTreeRegressor(max_depth=10, random_state=42),
            {"max_depth": 10, "random_state": 42},
        ),
        (
            "RandomForest",
            RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
            {"n_estimators": 100, "random_state": 42, "n_jobs": -1},
        ),
        (
            "XGBoost",
            XGBRegressor(
                n_estimators=200,
                learning_rate=0.1,
                random_state=42,
                n_jobs=-1,
                verbosity=0,
            ),
            {
                "n_estimators": 200,
                "learning_rate": 0.1,
                "random_state": 42,
                "n_jobs": -1,
            },
        ),
        (
            "GradientBoosting",
            GradientBoostingRegressor(
                n_estimators=200,
                learning_rate=0.1,
                random_state=42,
            ),
            {
                "n_estimators": 200,
                "learning_rate": 0.1,
                "random_state": 42,
            },
        ),
    ]

    all_results: List[Dict[str, Any]] = []

    print("\n[STEP] Training traditional ML models...")
    for name, estimator, params in models:
        res = train_sklearn_model(
            name=name,
            estimator=estimator,
            params=params,
            X_train=X_train,
            X_val=X_val,
            y_train=y_train,
            y_val=y_val,
        )
        all_results.append(res)

    print("\n[STEP] Training LSTM model...")
    lstm_result = train_lstm_model(
        X_train=X_train,
        X_val=X_val,
        y_train=y_train,
        y_val=y_val,
        n_features=n_features,
    )
    all_results.append(lstm_result)

    # Save artifacts
    print("\n[STEP] Saving best model, feature names, comparison CSV, and feature importance...")
    best_result, best_model_path = save_best_model_and_features(
        results=all_results,
        feature_names=feature_names,
        models_dir=models_dir,
    )

    # Feature importance for best tree-based model
    tree_results = [
        r
        for r in all_results
        if (r["model"] in {"DecisionTree", "RandomForest", "XGBoost", "GradientBoosting"})
        and not np.isnan(r["r2"])
        and r["estimator"] is not None
        and hasattr(r["estimator"], "feature_importances_")
    ]
    if tree_results:
        best_tree_result = max(tree_results, key=lambda r: r["r2"])
        save_feature_importance_plot(
            best_tree_result=best_tree_result,
            feature_names=feature_names,
            figures_dir=figures_dir,
        )
    else:
        print("[WARN] No valid tree-based model with feature_importances_ to plot.")

    # Comparison CSV
    save_comparison_csv(all_results, results_dir)

    # Final summary
    print_summary_table(all_results)


if __name__ == "__main__":
    # Ensure MLflow stores runs under mlruns by default
    project_dir = Path(__file__).resolve().parent
    os.environ.setdefault("MLFLOW_TRACKING_URI", str((project_dir / "mlruns").resolve().as_uri()))
    main()

