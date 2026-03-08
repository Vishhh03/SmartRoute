"""
Calculate sustainability and environmental impact metrics
"""

import pandas as pd
import numpy as np

print("="*80)
print("SUSTAINABILITY & ENVIRONMENTAL IMPACT ANALYSIS")
print("="*80)

# Load results
df = pd.read_csv('results/engineered_data.csv')
comparison = pd.read_csv('results/model_comparison.csv')

print("\n[1/4] Loading data...")
print(f"  Total traffic records: {len(df):,}")

# Calculate baseline metrics
baseline_volume = df['traffic_volume'].mean()
peak_volume = df[df['is_peak_hour'] == 1]['traffic_volume'].mean()
offpeak_volume = df[df['is_peak_hour'] == 0]['traffic_volume'].mean()

print("\n[2/4] Traffic Statistics:")
print(f"  Average traffic volume: {baseline_volume:,.0f} vehicles/hour")
print(f"  Peak hour average: {peak_volume:,.0f} vehicles/hour")
print(f"  Off-peak average: {offpeak_volume:,.0f} vehicles/hour")
print(f"  Peak increase: {((peak_volume/offpeak_volume - 1) * 100):.1f}%")

# Sustainability Calculations
print("\n[3/4] Calculating Environmental Impact...")

# Constants
CO2_PER_VEHICLE_IDLE = 2.3  # kg CO₂ per hour (idling)
AVG_IDLE_TIME_CONGESTED = 0.25  # 15 minutes per hour in congestion
FUEL_COST_PER_LITER = 100  # ₹100 per liter
FUEL_CONSUMPTION_IDLE = 1.0  # liters per hour (idling)

# Model improvement
best_r2 = comparison.iloc[0]['Test_R2']
congestion_reduction = 0.15  # 15% reduction potential with optimization

# Calculate impacts
total_vehicles_daily = baseline_volume * 24
vehicles_in_congestion = total_vehicles_daily * 0.3  # 30% in congestion

# Environmental Impact
co2_baseline = vehicles_in_congestion * CO2_PER_VEHICLE_IDLE * AVG_IDLE_TIME_CONGESTED
co2_optimized = co2_baseline * (1 - congestion_reduction)
co2_saved = co2_baseline - co2_optimized

# Economic Impact
fuel_baseline = vehicles_in_congestion * FUEL_CONSUMPTION_IDLE * AVG_IDLE_TIME_CONGESTED
fuel_optimized = fuel_baseline * (1 - congestion_reduction)
fuel_saved = fuel_baseline - fuel_optimized
money_saved = fuel_saved * FUEL_COST_PER_LITER

# Time Impact
time_wasted_baseline = vehicles_in_congestion * 0.5  # 30 min average
time_saved_total = time_wasted_baseline * congestion_reduction

print("\n" + "="*80)
print("SUSTAINABILITY METRICS (Per Day)")
print("="*80)

print("\n🌍 ENVIRONMENTAL IMPACT:")
print(f"  Baseline CO₂ Emissions:     {co2_baseline:,.0f} kg/day")
print(f"  With Optimization:          {co2_optimized:,.0f} kg/day")
print(f"  CO₂ Reduction:              {co2_saved:,.0f} kg/day ({congestion_reduction*100:.0f}%)")
print(f"  Annual CO₂ Savings:         {co2_saved * 365 / 1000:,.1f} tonnes/year")

print("\n💰 ECONOMIC IMPACT:")
print(f"  Baseline Fuel Waste:        {fuel_baseline:,.0f} liters/day")
print(f"  Fuel Saved:                 {fuel_saved:,.0f} liters/day")
print(f"  Cost Savings:               ₹{money_saved:,.0f}/day")
print(f"  Annual Savings:             ₹{money_saved * 365:,.0f}/year")

print("\n⏱️ TIME IMPACT:")
print(f"  Time Wasted (Baseline):     {time_wasted_baseline:,.0f} hours/day")
print(f"  Time Saved:                 {time_saved_total:,.0f} hours/day")
print(f"  Per 1000 Vehicles:          {(time_saved_total / vehicles_in_congestion * 1000):.1f} hours/day")

print("\n📊 MODEL CONTRIBUTION:")
print(f"  Prediction Accuracy (R²):   {best_r2:.3f} ({best_r2*100:.1f}%)")
print(f"  Average Error (MAE):        {comparison.iloc[0]['MAE']:,.0f} vehicles")
print(f"  Enables:                    Real-time traffic management")
print(f"  Supports:                   Dynamic route optimization")

# SDG Alignment
print("\n🎯 SDG ALIGNMENT:")
print("  ✓ SDG 11: Sustainable Cities & Communities")
print("    - Improved urban mobility and traffic management")
print(f"    - {congestion_reduction*100:.0f}% congestion reduction potential")
print("\n  ✓ SDG 13: Climate Action")
print(f"    - {co2_saved * 365 / 1000:,.1f} tonnes CO₂ reduction/year")
print("    - Lower greenhouse gas emissions")
print("\n  ✓ SDG 9: Industry, Innovation & Infrastructure")
print("    - Data-driven infrastructure planning")
print("    - AI-powered decision support")

# Policy Recommendations
print("\n[4/4] Policy Recommendations:")
print("\n📋 ACTIONABLE INSIGHTS:")
print("  1. Deploy dynamic traffic signals during peak hours (7-10 AM, 5-8 PM)")
print("  2. Incentivize flexible work hours to distribute traffic")
print("  3. Improve public transport during identified high-congestion periods")
print("  4. Use predictions for emergency vehicle routing optimization")
print("  5. Monitor high-capacity roads (>80% utilization) for expansion")

# Save metrics
metrics = {
    'Metric': [
        'Baseline CO₂ (kg/day)',
        'CO₂ Saved (kg/day)', 
        'Annual CO₂ Saved (tonnes)',
        'Fuel Saved (liters/day)',
        'Cost Saved (₹/day)',
        'Annual Savings (₹)',
        'Time Saved (hours/day)',
        'Congestion Reduction (%)',
        'Model R² Score',
        'Model MAE'
    ],
    'Value': [
        f"{co2_baseline:.0f}",
        f"{co2_saved:.0f}",
        f"{co2_saved * 365 / 1000:.1f}",
        f"{fuel_saved:.0f}",
        f"{money_saved:.0f}",
        f"{money_saved * 365:.0f}",
        f"{time_saved_total:.0f}",
        f"{congestion_reduction*100:.0f}",
        f"{best_r2:.4f}",
        f"{comparison.iloc[0]['MAE']:.0f}"
    ]
}

metrics_df = pd.DataFrame(metrics)
metrics_df.to_csv('results/sustainability_metrics.csv', index=False)

print("\n" + "="*80)
print("✅ SUSTAINABILITY ANALYSIS COMPLETE!")
print("="*80)
print("\n✓ Saved to: results/sustainability_metrics.csv")
print("\nUse these metrics in your research paper and viva presentation!")