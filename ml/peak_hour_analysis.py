"""
Peak hour analysis for traffic volume across weather conditions.

This module:
- Loads Train.csv from the Metro Interstate dataset
- Derives hourly traffic statistics per weather_type
- Identifies actual peak hours per weather type and compares them
  against assumed peak windows (07–10 and 17–20)
- Flags weather types with non-standard peaks
- Saves detailed and hourly baseline summaries
- Exposes helper functions for Flask:
  - `get_peak_hours_for_weather(weather_type)`
  - `get_hourly_baseline()`
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Dict

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
RESULTS_DIR = PROJECT_ROOT / "results"


def _load_train_data() -> pd.DataFrame:
    """Load Train.csv which contains `traffic_volume`."""
    train_path = DATA_DIR / "Train.csv"
    df_train = pd.read_csv(train_path)
    return df_train


def _prepare_with_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add hour, day_of_week, and month from `date_time`."""
    df = df.copy()
    dt = pd.to_datetime(df["date_time"])
    df["hour"] = dt.dt.hour
    df["day_of_week"] = dt.dt.dayofweek
    df["month"] = dt.dt.month
    return df


def _is_in_assumed_window(hour: int) -> bool:
    """Return True if hour is in the assumed morning/evening peak windows."""
    return (7 <= hour <= 10) or (17 <= hour <= 20)


def analyze_peak_hours() -> pd.DataFrame:
    """
    Perform peak hour analysis per weather_type.

    Returns:
        DataFrame with columns:
        [weather_type, actual_peak_hour, assumed_peak_window,
         is_non_standard, peak_volume, avg_volume]
    """
    df = _load_train_data()
    df = _prepare_with_time_features(df)

    if "weather_type" not in df.columns or "traffic_volume" not in df.columns:
        raise ValueError("Train.csv must contain 'weather_type' and 'traffic_volume' columns.")

    # Group by weather_type and hour to compute mean volumes
    grouped = (
        df.groupby(["weather_type", "hour"], as_index=False)["traffic_volume"]
        .agg({"traffic_volume": "mean"})
        .rename(columns={"traffic_volume": "mean_volume"})
    )

    # For each weather_type, find the hour with maximum mean traffic volume
    grouped["rank"] = grouped.groupby("weather_type")["mean_volume"].rank(
        method="first", ascending=False
    )
    peak_rows = grouped[grouped["rank"] == 1].drop(columns=["rank"])

    peak_rows["actual_peak_hour"] = peak_rows["hour"].astype(int)
    peak_rows["assumed_peak_window"] = "07-10 & 17-20"
    peak_rows["is_non_standard"] = ~peak_rows["actual_peak_hour"].apply(_is_in_assumed_window)
    peak_rows["peak_volume"] = peak_rows["mean_volume"]

    # Also compute overall average volume per weather_type (across all hours)
    avg_by_weather = (
        df.groupby("weather_type", as_index=False)["traffic_volume"]
        .agg({"traffic_volume": "mean"})
        .rename(columns={"traffic_volume": "avg_volume"})
    )

    result = peak_rows.merge(avg_by_weather, on="weather_type", how="left")
    result = result[
        [
            "weather_type",
            "actual_peak_hour",
            "assumed_peak_window",
            "is_non_standard",
            "peak_volume",
            "avg_volume",
        ]
    ].copy()

    # Ensure results directory exists
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # Save detailed weather_type peak analysis
    detailed_path = RESULTS_DIR / "peak_hour_analysis.csv"
    result.to_csv(detailed_path, index=False)

    # Hourly baseline across all data
    hourly_baseline = (
        df.groupby("hour", as_index=False)["traffic_volume"]
        .agg({"traffic_volume": "mean"})
        .rename(columns={"traffic_volume": "avg_traffic_volume"})
    )
    hourly_baseline["is_assumed_peak"] = hourly_baseline["hour"].apply(_is_in_assumed_window)

    baseline_path = RESULTS_DIR / "area_peak_summary.csv"
    hourly_baseline.to_csv(baseline_path, index=False)

    # Summary prints
    total_types = result["weather_type"].nunique()
    non_standard_types = result.loc[result["is_non_standard"], "weather_type"].nunique()
    print(f"{non_standard_types} out of {total_types} weather types have non-standard peak hours")

    # Simple table of weather_type and its actual peak hour
    print("\nWeather Type Peak Hours:")
    print("------------------------")
    for _, row in result.sort_values("actual_peak_hour").iterrows():
        print(f"{row['weather_type']}: {int(row['actual_peak_hour'])}:00")

    return result


def get_peak_hours_for_weather(weather_type: str) -> List[int]:
    """
    Return the actual peak hour(s) for a given weather_type from the saved CSV.
    """
    analysis_path = RESULTS_DIR / "peak_hour_analysis.csv"

    if analysis_path.exists():
        df = pd.read_csv(analysis_path)
    else:
        df = analyze_peak_hours()

    mask = df["weather_type"].astype(str).str.lower() == weather_type.lower()
    hours = sorted(df.loc[mask, "actual_peak_hour"].dropna().unique().tolist())
    return [int(h) for h in hours]


def get_hourly_baseline() -> List[Dict[str, float]]:
    """
    Return the hourly baseline traffic summary as a list of dicts:
    [{hour, avg_traffic_volume, is_assumed_peak}, ...]
    """
    baseline_path = RESULTS_DIR / "area_peak_summary.csv"

    if baseline_path.exists():
        df = pd.read_csv(baseline_path)
    else:
        # Recompute analysis, which will also create the baseline file
        analyze_peak_hours()
        df = pd.read_csv(baseline_path)

    records: List[Dict[str, float]] = df.to_dict(orient="records")
    return records


if __name__ == "__main__":
    analyze_peak_hours()

