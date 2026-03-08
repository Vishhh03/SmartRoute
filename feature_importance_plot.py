"""
SmartRoute - Gradient Boosting Feature Importance Plot
Uses Bangalore traffic dataset + additional datasets
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ── 1. Load datasets ──────────────────────────────────────────────────
bangalore_df = pd.read_csv("data/Banglore_traffic_Dataset.csv")

# additional datasets
train_df = pd.read_csv("data/train.csv")
test_df  = pd.read_csv("data/test.csv")

# combine datasets
df = pd.concat([bangalore_df, train_df, test_df], ignore_index=True)

print("Combined dataset shape:", df.shape)

# ── 2. Drop leaky/redundant columns ──────────────────────────────────
leaky_cols = ['Congestion Level', 'Travel Time Index', 'Environmental Impact']
df = df.drop(columns=[c for c in leaky_cols if c in df.columns])

# ── 3. Extract Temporal Features from Date ────────────────────────────
if 'Date' in df.columns:
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    df['hour']        = df['Date'].dt.hour
    df['day_of_week'] = df['Date'].dt.dayofweek
    df['month']       = df['Date'].dt.month
    df = df.drop(columns=['Date'])

# ── 4. Fill missing values ────────────────────────────────────────────
for col in df.columns:
    if pd.api.types.is_numeric_dtype(df[col]):
        df[col] = df[col].fillna(df[col].median())
    else:
        df[col] = df[col].fillna(df[col].mode()[0])

# ── 5. Label Encode Categorical Columns ───────────────────────────────
le = LabelEncoder()
for col in df.select_dtypes(include=['object']).columns:
    df[col] = le.fit_transform(df[col].astype(str))

# ── 6. Feature Engineering ────────────────────────────────────────────
if 'hour' in df.columns:
    df['hour_sin']        = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos']        = np.cos(2 * np.pi * df['hour'] / 24)
    df['is_morning_peak'] = df['hour'].isin([7,8,9,10]).astype(int)
    df['is_evening_peak'] = df['hour'].isin([17,18,19,20]).astype(int)

if 'day_of_week' in df.columns:
    df['day_sin']    = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_cos']    = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['is_weekend'] = df['day_of_week'].isin([5,6]).astype(int)

if 'month' in df.columns:
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

speed_col = [c for c in df.columns if 'speed' in c.lower()]
cap_col   = [c for c in df.columns if 'capacity' in c.lower()]

if speed_col and cap_col:
    df['speed_x_capacity'] = df[speed_col[0]] * df[cap_col[0]]

# ── 7. Define Target & Features ───────────────────────────────────────
target_col = 'Traffic Volume'
X = df.drop(columns=[target_col])
y = df[target_col]

print(f"Features used: {X.shape[1]}")

# ── 8. Train Model ────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

gb_model = GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)

gb_model.fit(X_train, y_train)

print(f"Train R²: {gb_model.score(X_train, y_train):.3f}")
print(f"Test  R²: {gb_model.score(X_test,  y_test):.3f}")

# ── 9. Plot Top 15 Feature Importances ───────────────────────────────
importance_df = pd.DataFrame({
    'Feature':    X_train.columns,
    'Importance': gb_model.feature_importances_
}).sort_values('Importance', ascending=False)

top15 = importance_df.head(15)

plt.figure(figsize=(10,6))
bars = plt.barh(top15['Feature'], top15['Importance'], color='steelblue', edgecolor='white')

for bar, val in zip(bars, top15['Importance']):
    plt.text(bar.get_width() + 0.005,
             bar.get_y() + bar.get_height()/2,
             f"{val:.4f}",
             va='center',
             fontsize=9)

plt.xlabel('Feature Importance Score', fontsize=12)
plt.ylabel('Feature Name', fontsize=12)
plt.title('Top 15 Feature Importance – Gradient Boosting Model\n(SmartRoute: Urban Traffic Prediction)', fontsize=13)

plt.xlim(0, max(top15['Importance']) * 1.15)
plt.gca().invert_yaxis()

plt.tight_layout()
plt.savefig("feature_importance.png", dpi=300, bbox_inches='tight')

print("\nPlot saved → feature_importance.png")

plt.show()