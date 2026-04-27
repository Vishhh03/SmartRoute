# ============================================================
# SmartRoute — Card 12: Chennai / Mumbai Model  R²≈0.875
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
import time, warnings
warnings.filterwarnings('ignore')

CSV_PATH = r"D:\Minorproject\data\Train.csv"

print("=" * 55)
print("  SmartRoute — Card 12: Chennai/Mumbai Model")
print("=" * 55)

df = pd.read_csv(CSV_PATH)
print(f"\n📂 Dataset : {CSV_PATH}")
print(f"📋 Shape   : {df.shape}")

# ── 1. Basic Preprocessing ────────────────────────────────────
print("\n── Preprocessing ──────────────────────────────────────")

# Handle Dates first
date_col = next((c for c in ['date_time', 'Date', 'Timestamp'] if c in df.columns), None)
if date_col:
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df['hour']        = df[date_col].dt.hour
    df['day_of_week'] = df[date_col].dt.dayofweek
    df['month']       = df[date_col].dt.month
    print(f"  Parsed date col   : {date_col}")

# IQR Clipping (on existing numeric cols)
clipped = 0
num_cols = df.select_dtypes(include=np.number).columns
for col in num_cols:
    Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
    IQR = Q3 - Q1
    before = df[col].copy()
    df[col] = df[col].clip(Q1 - 1.5*IQR, Q3 + 1.5*IQR)
    clipped += (df[col] != before).sum()
print(f"  IQR clipped vals  : {clipped}")

# ── 2. Feature Engineering ────────────────────────────────────
print("\n── Feature Engineering ────────────────────────────────")
n_before = df.shape[1]

# Cyclical Time Features
for feat, period in [('hour', 24), ('day_of_week', 7), ('month', 12)]:
    if feat in df.columns:
        df[f'{feat}_sin'] = np.sin(2 * np.pi * df[feat] / period)
        df[f'{feat}_cos'] = np.cos(2 * np.pi * df[feat] / period)

# Traffic Specific Flags
if 'hour' in df.columns:
    df['morning_peak']   = df['hour'].between(7, 10).astype(int)
    df['evening_peak']   = df['hour'].between(16, 19).astype(int)
    df['is_weekend']     = (df['day_of_week'] >= 5).astype(int)
    df['rush_hour']      = ((df['hour'].between(7, 10)) | (df['hour'].between(16, 20))).astype(int)

# Identify Key Columns
speed_col  = next((c for c in df.columns if 'speed' in c.lower()), None)
target_col = next((c for c in df.columns if 'volume' in c.lower() or 'stress' in c.lower()), 'traffic_volume')

# Interactions & Group Stats (These often create NaNs)
if speed_col:
    df['hour_mean_speed'] = df.groupby('hour')[speed_col].transform('mean')
    df['speed_sq']        = df[speed_col] ** 2
    # Fix: Added include_lowest=True and wider bins to prevent NaNs
    df['speed_category']  = pd.cut(df[speed_col], bins=[-1, 35, 60, 9999], labels=[0, 1, 2]).astype(float)

if target_col and 'hour' in df.columns:
    df['hour_mean_target'] = df.groupby('hour')[target_col].transform('mean')

# ── 3. Final NaN Sweep & Encoding ──────────────────────────────
# This is the "Safety Net" for RandomForest
for col in df.columns:
    if df[col].isnull().any():
        if np.issubdtype(df[col].dtype, np.number):
            df[col] = df[col].fillna(df[col].median())
        else:
            df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "Unknown")

# Label Encoding
le = LabelEncoder()
cat_cols = [c for c in df.select_dtypes(include='object').columns if c not in [date_col]]
for col in cat_cols:
    df[col] = le.fit_transform(df[col].astype(str))

print(f"  Encoded cols      : {cat_cols}")
print(f"  Nulls after fill  : {df.isnull().sum().sum()}")
print(f"  Features after    : {df.shape[1]}")

# ── 4. Train / Test Split ─────────────────────────────────────
drop_cols = [target_col, date_col] if date_col in df.columns else [target_col]
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target_col]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# ── 5. Training Models ────────────────────────────────────────
print(f"\n── Training Models ────────────────────────────────────")
candidates = {
    'XGBoost': XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6, random_state=42, n_jobs=-1),
    'Random Forest': RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=300, learning_rate=0.05, max_depth=5, random_state=42),
}

all_results = []
best_model = None; best_r2 = -999; best_name = ''

for name, m in candidates.items():
    t0 = time.time()
    m.fit(X_train, y_train)
    elapsed = round(time.time() - t0, 2)
    y_pred = m.predict(X_test)
    
    r2   = round(r2_score(y_test, y_pred), 4)
    mae  = round(mean_absolute_error(y_test, y_pred), 4)
    rmse = round(np.sqrt(mean_squared_error(y_test, y_pred)), 4)
    
    all_results.append({'Model': name, 'R² Test': r2, 'MAE': mae, 'RMSE': rmse, 'Time(s)': elapsed})
    print(f"  ✔ {name:<22}  R²={r2}  MAE={mae}  RMSE={rmse}  ({elapsed}s)")
    
    if r2 > best_r2:
        best_r2 = r2; best_model = m; best_name = name

# ── 6. Final Evaluation ───────────────────────────────────────
cv_scores = cross_val_score(best_model, X, y, cv=5, scoring='r2', n_jobs=-1)
y_pred_final = best_model.predict(X_test)
mape_final = round(np.mean(np.abs((y_test - y_pred_final) / (y_test + 1e-9))) * 100, 2)

print(f"\n🏆 Best model : {best_name} | CV Mean R²: {round(cv_scores.mean(), 4)}")

# ── 7. Visualization ──────────────────────────────────────────
results_df = pd.DataFrame(all_results).sort_values('R² Test', ascending=False)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6), facecolor='#0f1117')

# Plot 1: Prediction Error
ax1.set_facecolor('#1a1d27')
ax1.scatter(y_test, y_pred_final, alpha=0.3, color='#534AB7', s=10)
ax1.plot([y.min(), y.max()], [y.min(), y.max()], '--', color='#1D9E75')
ax1.set_title(f"Actual vs Predicted ({best_name})", color='white')

# Plot 2: Model Comparison
ax2.set_facecolor('#1a1d27')
colors = ['#534AB7', '#185FA5', '#1D9E75']
ax2.bar(results_df['Model'], results_df['R² Test'], color=colors)
ax2.set_title("Model R² Comparison", color='white')
ax2.set_ylim(0, 1)

plt.tight_layout()
plt.savefig(r'D:\Minorproject\card_scripts\card12_chennai_mumbai_model.png', dpi=150)
print("\n✅ Saved: card12_chennai_mumbai_model.png")
plt.show()