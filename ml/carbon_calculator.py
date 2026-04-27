"""
Carbon impact utilities for highway traffic segments.

The CarbonCalculator provides:
- Per-segment CO₂ estimates based on traffic volume and simple
  stop‑start vs free‑flow assumptions
- A lightweight sustainability score (0–100)
- Helpers to format results for the frontend and to run
  batch calculations on pandas DataFrames.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Any

import numpy as np
import pandas as pd


@dataclass
class CarbonCalculator:
    """
    Estimate CO₂ emissions and simple sustainability scores
    for traffic segments.
    """

    # Emission factors in kg CO₂ per km
    HIGH_TRAFFIC_EMISSION_KG_PER_KM: float = 0.21  # stop‑start
    MED_TRAFFIC_EMISSION_KG_PER_KM: float = 0.16  # moderate
    LOW_TRAFFIC_EMISSION_KG_PER_KM: float = 0.12  # free flow

    # Mapping: one tree absorbs ~21 kg CO₂ per year
    KG_CO2_PER_TREE_PER_YEAR: float = 21.0

    def calculate_co2_saved(
        self,
        traffic_volume: float,
        weather_type: str,
        distance_km: float = 5.0,
    ) -> Dict[str, Any]:
        """
        Estimate CO₂ emissions for a given segment and how much CO₂
        is saved versus a worst‑case, high‑congestion scenario.

        Args:
            traffic_volume: Vehicles per hour.
            weather_type: Descriptive label (currently informational only).
            distance_km: Segment length to evaluate.
        """
        tv = float(traffic_volume)

        if tv > 4000:
            emission_type = "high"
            rate_kg_per_km = self.HIGH_TRAFFIC_EMISSION_KG_PER_KM
        elif 2000 <= tv <= 4000:
            emission_type = "medium"
            rate_kg_per_km = self.MED_TRAFFIC_EMISSION_KG_PER_KM
        else:
            emission_type = "low"
            rate_kg_per_km = self.LOW_TRAFFIC_EMISSION_KG_PER_KM

        # Convert to grams and compute totals
        co2_per_km_grams = rate_kg_per_km * 1000.0
        total_co2_grams = co2_per_km_grams * distance_km

        worst_rate_kg_per_km = self.HIGH_TRAFFIC_EMISSION_KG_PER_KM
        worst_total_grams = worst_rate_kg_per_km * 1000.0 * distance_km
        co2_saved_vs_worst_grams = max(worst_total_grams - total_co2_grams, 0.0)

        trees_equivalent = co2_saved_vs_worst_grams / (self.KG_CO2_PER_TREE_PER_YEAR * 1000.0)

        if emission_type == "low":
            status_message = "Free‑flowing traffic: strong environmental performance."
        elif emission_type == "medium":
            status_message = "Moderate congestion: some optimisation potential."
        else:
            status_message = "Heavy congestion: high emissions compared to free‑flow conditions."

        return {
            "emission_type": emission_type,
            "co2_per_km_grams": co2_per_km_grams,
            "total_co2_grams": total_co2_grams,
            "co2_saved_vs_worst_grams": co2_saved_vs_worst_grams,
            "trees_equivalent": trees_equivalent,
            "status_message": status_message,
            "traffic_volume": tv,
            "weather_type": weather_type,
            "distance_km": distance_km,
        }

    def get_route_sustainability_score(
        self,
        traffic_volume: float,
        temperature: float,
        rain_p_h: float,
    ) -> float:
        """
        Compute a simple 0–100 sustainability score
        (100 = best / most sustainable).

        Heuristics:
        - High traffic volume reduces the score
        - Rain increases braking/acceleration and reduces the score
        - Temperatures far from a comfortable band reduce the score
        """
        tv = float(traffic_volume)
        temp = float(temperature)
        rain = float(rain_p_h)

        # Traffic penalty: assume typical range 0–6000 veh/h
        traffic_ratio = np.clip(tv / 6000.0, 0.0, 1.5)
        traffic_penalty = 40.0 * traffic_ratio  # up to ~60 if extreme

        # Temperature penalty:
        # Dataset is in Kelvin; convert to Celsius for interpretation.
        temp_c = temp - 273.15
        if temp_c < 0:
            temp_penalty = min(abs(temp_c) * 1.0, 20.0)
        elif temp_c > 30:
            temp_penalty = min((temp_c - 30.0) * 1.0, 20.0)
        else:
            temp_penalty = 0.0

        # Rain penalty: heavier rain increases penalty
        rain_penalty = np.clip(rain * 15.0, 0.0, 25.0)

        base_score = 100.0
        score = base_score - (traffic_penalty + temp_penalty + rain_penalty)
        return float(np.clip(score, 0.0, 100.0))

    def format_for_frontend(
        self,
        calculator_result: Dict[str, Any],
        sustainability_score: float,
    ) -> Dict[str, Any]:
        """
        Convert raw calculation outputs into a compact structure for the UI.
        """
        score = float(sustainability_score)
        saved = float(calculator_result.get("co2_saved_vs_worst_grams", 0.0))
        trees = float(calculator_result.get("trees_equivalent", 0.0))

        if score >= 75:
            badge = "🟢 Green"
        elif score >= 40:
            badge = "🟡 Moderate"
        else:
            badge = "🔴 Heavy"

        message = f"You saved {saved:.0f}g CO₂ vs a worst‑case congested route."

        return {
            "co2_saved_grams": saved,
            "sustainability_score": score,
            "badge": badge,
            "message": message,
            "trees_equivalent": trees,
        }

    def batch_calculate(self, df: pd.DataFrame, distance_km: float = 5.0) -> pd.DataFrame:
        """
        Apply emission calculations to an entire DataFrame.

        Expects at least:
        - 'traffic_volume' column
        - 'weather_type' column (optional; used for context only)

        Adds columns:
        - emission_type
        - co2_per_km_grams
        - co2_saved_vs_worst_grams
        """
        if "traffic_volume" not in df.columns:
            raise ValueError("DataFrame must contain a 'traffic_volume' column.")

        weather_col = "weather_type" if "weather_type" in df.columns else None

        df_out = df.copy()

        emission_types = []
        co2_per_km_vals = []
        saved_vs_worst_vals = []

        for _, row in df_out.iterrows():
            tv = row["traffic_volume"]
            wt = row[weather_col] if weather_col is not None else "Unknown"

            res = self.calculate_co2_saved(
                traffic_volume=tv,
                weather_type=str(wt),
                distance_km=distance_km,
            )

            emission_types.append(res["emission_type"])
            co2_per_km_vals.append(res["co2_per_km_grams"])
            saved_vs_worst_vals.append(res["co2_saved_vs_worst_grams"])

        df_out["emission_type"] = emission_types
        df_out["co2_per_km_grams"] = co2_per_km_vals
        df_out["co2_saved_vs_worst_grams"] = saved_vs_worst_vals

        return df_out


if __name__ == "__main__":
    calc = CarbonCalculator()

    scenarios = [
        {"label": "Rush hour", "traffic_volume": 5000, "weather_type": "Clear"},
        {"label": "Normal", "traffic_volume": 3000, "weather_type": "Rain"},
        {"label": "Off‑peak", "traffic_volume": 1000, "weather_type": "Snow"},
    ]

    for s in scenarios:
        print("=" * 80)
        print(f"Scenario: {s['label']}")
        print("-" * 80)

        result = calc.calculate_co2_saved(
            traffic_volume=s["traffic_volume"],
            weather_type=s["weather_type"],
        )

        # Use a representative temperature and rain value for demonstration
        sustainability = calc.get_route_sustainability_score(
            traffic_volume=s["traffic_volume"],
            temperature=288.15,  # ~15°C
            rain_p_h=0.0,
        )

        formatted = calc.format_for_frontend(result, sustainability)

        print("Raw calculation:", result)
        print("Frontend payload:", formatted)

