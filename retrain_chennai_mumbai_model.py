"""
Retrain Chennai/Mumbai GradBoost model with current sklearn version
to fix "No module named 'sklearn.ensemble._gb_losses'" error
"""
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

# Load and prepare data (same as original card12 script)
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "data", "Train.csv")
print("Loading Chennai/Mumbai training data...")

df = pd.read_csv(CSV_PATH)

# Handle dates
date_col = next((c for c in ['date_time', 'Date', 'Timestamp'] if c in df.columns), None)
if date_col:
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    df['hour'] = df[date_col].dt.hour
    df['day_of_week'] = df[date_col].dt.dayofweek
    df['month'] = df[date_col].dt.month

# IQR Clipping
clipped = 0
num_cols = df.select_dtypes(include=np.number).columns
for col in num_cols:
    Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
    IQR = Q3 - Q1
    before = df[col].copy()
    df[col] = df[col].clip(Q1 - 1.5*IQR, Q3 + 1.5*IQR)
    clipped += (df[col] != before).sum()

# Feature Engineering (same as original)
for feat, period in [('hour', 24), ('day_of_week', 7), ('month', 12)]:
    if feat in df.columns:
        df[f'{feat}_sin'] = np.sin(2 * np.pi * df[feat] / period)
        df[f'{feat}_cos'] = np.cos(2 * np.pi * df[feat] / period)

# Traffic Specific Flags
if 'hour' in df.columns:
    df['morning_peak'] = df['hour'].between(7, 10).astype(int)
    df['evening_peak'] = df['hour'].between(16, 19).astype(int)
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    df['rush_hour'] = ((df['hour'].between(7, 10)) | (df['hour'].between(16, 20))).astype(int)

# Identify target column
target_col = next((c for c in df.columns if 'volume' in c.lower() or 'stress' in c.lower()), 'traffic_volume')

# Handle NaNs
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

# Prepare features and target
drop_cols = [target_col, date_col] if date_col in df.columns else [target_col]
X = df.drop(columns=[c for c in drop_cols if c in df.columns])
y = df[target_col]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"Training GradBoost model with {X_train.shape[0]} samples...")

# Train GradBoost model (same parameters as original)
gradboost = GradientBoostingRegressor(
    n_estimators=300, 
    learning_rate=0.05, 
    max_depth=5, 
    random_state=42
)

gradboost.fit(X_train, y_train)

# Evaluate
y_pred = gradboost.predict(X_test)
r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"GradBoost trained - R²: {r2:.4f}, MAE: {mae:.2f}, RMSE: {rmse:.2f}")

# Save model using joblib (compatible with current sklearn version)
MODEL_PATH = os.path.join(BASE_DIR, "models", "chennai_mumbai_model.pkl")
joblib.dump(gradboost, MODEL_PATH)

print(f"Saved retrained model to: {MODEL_PATH}")
print("Model retraining complete!")
