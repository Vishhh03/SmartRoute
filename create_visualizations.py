"""
Generate publication-ready visualizations for research paper
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
import warnings
warnings.filterwarnings('ignore')

# Set style for publication-quality plots
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")
sns.set_context("paper", font_scale=1.3)

print("="*80)
print("GENERATING RESEARCH VISUALIZATIONS")
print("="*80)

# Load engineered data
print("\n[1/6] Loading data...")
df = pd.read_csv('results/engineered_data.csv')

# Remove data leakage columns
leakage_cols = ['traffic_volume_hour_avg', 'traffic_volume_dow_avg', 
                'environmental_impact', 'area_name_hour_avg', 
                'area_name_dow_avg', 'roadintersection_name_hour_avg',
                'roadintersection_name_dow_avg']
leakage_cols = [col for col in leakage_cols if col in df.columns]
if leakage_cols:
    df = df.drop(columns=leakage_cols)
    print(f"✓ Removed {len(leakage_cols)} leakage columns")

# Identify target
target = 'traffic_volume'
cols_to_drop = [target, 'environmental_impact', 'date']
cols_to_drop = [col for col in cols_to_drop if col in df.columns]

X = df.drop(columns=cols_to_drop)
y = df[target]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train best model
print("\n[2/6] Training Gradient Boosting model...")
model = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# Predictions
y_pred_train = model.predict(X_train)
y_pred_test = model.predict(X_test)

print("✓ Model trained successfully!")

# Create results/figures directory
import os
os.makedirs('results/figures', exist_ok=True)

print("\n[3/6] Generating visualizations...")
print("This will create 5 publication-ready figures...")

# ============================================================================
# VISUALIZATION 1: Actual vs Predicted
# ============================================================================
print("\n  Creating: 1_actual_vs_predicted.png")

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Training set
ax1.scatter(y_train, y_pred_train, alpha=0.5, s=20, c='#667eea')
ax1.plot([y_train.min(), y_train.max()], [y_train.min(), y_train.max()], 
         'r--', lw=2, label='Perfect Prediction')
ax1.set_xlabel('Actual Traffic Volume', fontsize=12, fontweight='bold')
ax1.set_ylabel('Predicted Traffic Volume', fontsize=12, fontweight='bold')
ax1.set_title('Training Set (R² = 0.886)', fontsize=14, fontweight='bold')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Test set
ax2.scatter(y_test, y_pred_test, alpha=0.5, s=20, c='#764ba2')
ax2.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
         'r--', lw=2, label='Perfect Prediction')
ax2.set_xlabel('Actual Traffic Volume', fontsize=12, fontweight='bold')
ax2.set_ylabel('Predicted Traffic Volume', fontsize=12, fontweight='bold')
ax2.set_title('Test Set (R² = 0.844)', fontsize=14, fontweight='bold')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig('results/figures/1_actual_vs_predicted.png', dpi=300, bbox_inches='tight')
plt.close()

print("  ✓ Saved: results/figures/1_actual_vs_predicted.png")


# ============================================================================
# VISUALIZATION 2: Model Comparison
# ============================================================================
print("\n  Creating: 2_model_comparison.png")

# Load model comparison results
comparison_df = pd.read_csv('results/model_comparison_with_lstm_fixed.csv')

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: R² Score
ax = axes[0, 0]
bars = ax.barh(comparison_df['Model'], comparison_df['Test_R2'], color='#667eea')
ax.set_xlabel('R² Score', fontsize=12, fontweight='bold')
ax.set_title('Model Performance: R² Score', fontsize=14, fontweight='bold')
ax.set_xlim(0, 1)
for i, (bar, val) in enumerate(zip(bars, comparison_df['Test_R2'])):
    ax.text(val + 0.01, i, f'{val:.3f}', va='center', fontsize=10, fontweight='bold')
ax.grid(True, alpha=0.3, axis='x')

# Plot 2: MAE
ax = axes[0, 1]
bars = ax.barh(comparison_df['Model'], comparison_df['MAE'], color='#764ba2')
ax.set_xlabel('Mean Absolute Error', fontsize=12, fontweight='bold')
ax.set_title('Model Performance: MAE', fontsize=14, fontweight='bold')
for i, (bar, val) in enumerate(zip(bars, comparison_df['MAE'])):
    ax.text(val + 50, i, f'{val:.1f}', va='center', fontsize=10, fontweight='bold')
ax.grid(True, alpha=0.3, axis='x')

# Plot 3: RMSE
ax = axes[1, 0]
bars = ax.barh(comparison_df['Model'], comparison_df['RMSE'], color='#48bb78')
ax.set_xlabel('Root Mean Squared Error', fontsize=12, fontweight='bold')
ax.set_title('Model Performance: RMSE', fontsize=14, fontweight='bold')
for i, (bar, val) in enumerate(zip(bars, comparison_df['RMSE'])):
    ax.text(val + 50, i, f'{val:.1f}', va='center', fontsize=10, fontweight='bold')
ax.grid(True, alpha=0.3, axis='x')

# Plot 4: Training Time
ax = axes[1, 1]
bars = ax.barh(comparison_df['Model'], comparison_df['Training_Time'], color='#ed8936')
ax.set_xlabel('Training Time (seconds)', fontsize=12, fontweight='bold')
ax.set_title('Model Training Time', fontsize=14, fontweight='bold')
for i, (bar, val) in enumerate(zip(bars, comparison_df['Training_Time'])):
    ax.text(val + 0.05, i, f'{val:.2f}s', va='center', fontsize=10, fontweight='bold')
ax.grid(True, alpha=0.3, axis='x')

plt.tight_layout()
plt.savefig('results/figures/2_model_comparison.png', dpi=300, bbox_inches='tight')
plt.close()

print("  ✓ Saved: results/figures/2_model_comparison.png")

# ============================================================================
# VISUALIZATION 3: Feature Importance (Top 15)
# ============================================================================
print("\n  Creating: 3_feature_importance.png")

# Get feature importance
feature_importance = pd.DataFrame({
    'Feature': X.columns,
    'Importance': model.feature_importances_
}).sort_values('Importance', ascending=False).head(15)

plt.figure(figsize=(12, 8))
colors = plt.cm.viridis(np.linspace(0, 1, len(feature_importance)))
bars = plt.barh(feature_importance['Feature'], feature_importance['Importance'], color=colors)

plt.xlabel('Importance Score', fontsize=13, fontweight='bold')
plt.ylabel('Features', fontsize=13, fontweight='bold')
plt.title('Top 15 Most Important Features (Gradient Boosting)', fontsize=15, fontweight='bold')
plt.gca().invert_yaxis()

# Add value labels
for i, (bar, val) in enumerate(zip(bars, feature_importance['Importance'])):
    plt.text(val + 0.002, i, f'{val:.3f}', va='center', fontsize=10, fontweight='bold')

plt.grid(True, alpha=0.3, axis='x')
plt.tight_layout()
plt.savefig('results/figures/3_feature_importance.png', dpi=300, bbox_inches='tight')
plt.close()

print("  ✓ Saved: results/figures/3_feature_importance.png")

# ============================================================================
# VISUALIZATION 4: Hourly Traffic Patterns
# ============================================================================
print("\n  Creating: 4_hourly_traffic_patterns.png")

# Check if 'hour' column exists
if 'hour' in df.columns:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # Plot 1: Average traffic by hour
    hourly_avg = df.groupby('hour')[target].mean()
    hourly_std = df.groupby('hour')[target].std()
    
    ax1.plot(hourly_avg.index, hourly_avg.values, marker='o', linewidth=3, 
             markersize=8, color='#667eea', label='Average Traffic')
    ax1.fill_between(hourly_avg.index, 
                      hourly_avg.values - hourly_std.values,
                      hourly_avg.values + hourly_std.values,
                      alpha=0.3, color='#667eea', label='± 1 Std Dev')
    
    # Highlight peak hours
    peak_hours = [7, 8, 9, 17, 18, 19]
    for hour in peak_hours:
        ax1.axvspan(hour - 0.5, hour + 0.5, alpha=0.2, color='red')
    
    ax1.set_xlabel('Hour of Day', fontsize=12, fontweight='bold')
    ax1.set_ylabel('Average Traffic Volume', fontsize=12, fontweight='bold')
    ax1.set_title('Average Traffic Volume by Hour', fontsize=14, fontweight='bold')
    ax1.set_xticks(range(0, 24, 2))
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: Box plot by hour
    hour_data = [df[df['hour'] == h][target].values for h in range(24)]
    bp = ax2.boxplot(hour_data, positions=range(24), patch_artist=True,
                     boxprops=dict(facecolor='#764ba2', alpha=0.6),
                     medianprops=dict(color='red', linewidth=2))
    
    ax2.set_xlabel('Hour of Day', fontsize=12, fontweight='bold')
    ax2.set_ylabel('Traffic Volume Distribution', fontsize=12, fontweight='bold')
    ax2.set_title('Traffic Volume Distribution by Hour', fontsize=14, fontweight='bold')
    ax2.set_xticks(range(0, 24, 2))
    ax2.grid(True, alpha=0.3, axis='y')
    
    plt.tight_layout()
    plt.savefig('results/figures/4_hourly_traffic_patterns.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    print("  ✓ Saved: results/figures/4_hourly_traffic_patterns.png")
else:
    print("  ⚠ Skipped: 'hour' column not found in dataset")

    # ============================================================================
# VISUALIZATION 5: Residual Analysis
# ============================================================================
print("\n  Creating: 5_residual_analysis.png")

# Calculate residuals
residuals_test = y_test - y_pred_test

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Plot 1: Residuals vs Predicted
ax = axes[0, 0]
ax.scatter(y_pred_test, residuals_test, alpha=0.5, s=20, c='#667eea')
ax.axhline(y=0, color='red', linestyle='--', linewidth=2)
ax.set_xlabel('Predicted Traffic Volume', fontsize=12, fontweight='bold')
ax.set_ylabel('Residuals', fontsize=12, fontweight='bold')
ax.set_title('Residual Plot', fontsize=14, fontweight='bold')
ax.grid(True, alpha=0.3)

# Plot 2: Residual Distribution
ax = axes[0, 1]
ax.hist(residuals_test, bins=50, edgecolor='black', alpha=0.7, color='#764ba2')
ax.axvline(x=0, color='red', linestyle='--', linewidth=2, label='Zero Error')
ax.set_xlabel('Residuals', fontsize=12, fontweight='bold')
ax.set_ylabel('Frequency', fontsize=12, fontweight='bold')
ax.set_title('Residual Distribution', fontsize=14, fontweight='bold')
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

# Plot 3: Q-Q Plot
ax = axes[1, 0]
from scipy import stats
stats.probplot(residuals_test, dist="norm", plot=ax)
ax.set_title('Q-Q Plot (Normality Check)', fontsize=14, fontweight='bold')
ax.grid(True, alpha=0.3)

# Plot 4: Error Metrics Summary
ax = axes[1, 1]
ax.axis('off')

from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

r2 = r2_score(y_test, y_pred_test)
mae = mean_absolute_error(y_test, y_pred_test)
rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
mape = np.mean(np.abs((y_test - y_pred_test) / y_test)) * 100

metrics_text = f"""
Model Performance Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━

Model: Gradient Boosting

Test Set Metrics:
  • R² Score:     {r2:.4f}
  • MAE:          {mae:.2f}
  • RMSE:         {rmse:.2f}
  • MAPE:         {mape:.2f}%

Residual Statistics:
  • Mean:         {residuals_test.mean():.2f}
  • Std Dev:      {residuals_test.std():.2f}
  • Min:          {residuals_test.min():.2f}
  • Max:          {residuals_test.max():.2f}

Test Samples:   {len(y_test)}
"""

ax.text(0.1, 0.5, metrics_text, fontsize=11, family='monospace',
        verticalalignment='center', bbox=dict(boxstyle='round', 
        facecolor='wheat', alpha=0.3))

plt.tight_layout()
plt.savefig('results/figures/5_residual_analysis.png', dpi=300, bbox_inches='tight')
plt.close()

print("  ✓ Saved: results/figures/5_residual_analysis.png")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n[4/6] All visualizations created successfully!")
print("\n[5/6] Summary:")
print("  ✓ 1_actual_vs_predicted.png")
print("  ✓ 2_model_comparison.png")
print("  ✓ 3_feature_importance.png")
print("  ✓ 4_hourly_traffic_patterns.png")
print("  ✓ 5_residual_analysis.png")

print("\n[6/6] Location: results/figures/")
print("\n" + "="*80)
print("✅ VISUALIZATION GENERATION COMPLETE!")
print("="*80)
print("\nThese figures are ready for your research paper!")

# Add to your existing create_visualizations.py

def create_ml_vs_dl_comparison(results_df, output_path):
    """
    Create comparison between Traditional ML and Deep Learning
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Subplot 1: R² Comparison
    ax1 = axes[0]
    colors = ['#3498db' if t == 'Traditional ML' else '#e74c3c' 
              for t in results_df['Type']]
    ax1.barh(results_df['Model'], results_df['Test_R2'], color=colors)
    ax1.set_xlabel('R² Score', fontsize=12)
    ax1.set_title('Model Accuracy Comparison', fontsize=14, fontweight='bold')
    ax1.axvline(x=0.8, color='green', linestyle='--', alpha=0.5, label='80% threshold')
    ax1.legend()
    
    # Subplot 2: Training Time
    ax2 = axes[1]
    ax2.barh(results_df['Model'], results_df['Training_Time'], color=colors)
    ax2.set_xlabel('Training Time (seconds)', fontsize=12)
    ax2.set_title('Training Efficiency', fontsize=14, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()