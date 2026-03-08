"""
Save the best trained model (Gradient Boosting)
"""

import pandas as pd
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor

print("="*80)
print("SAVING TRAINED MODEL")
print("="*80)

# Load engineered data
print("\n[1/4] Loading data...")
df = pd.read_csv('results/engineered_data.csv')

# Remove leakage columns
leakage_cols = ['traffic_volume_hour_avg', 'traffic_volume_dow_avg', 
                'environmental_impact', 'area_name_hour_avg', 
                'area_name_dow_avg', 'roadintersection_name_hour_avg',
                'roadintersection_name_dow_avg']
leakage_cols = [col for col in leakage_cols if col in df.columns]
if leakage_cols:
    df = df.drop(columns=leakage_cols)

# Prepare features
target = 'traffic_volume'
cols_to_drop = [target, 'environmental_impact', 'date']
cols_to_drop = [col for col in cols_to_drop if col in df.columns]

X = df.drop(columns=cols_to_drop)
y = df[target]

print(f"✓ Features: {X.shape[1]}")
print(f"✓ Samples: {len(X)}")

# Split data
print("\n[2/4] Splitting data...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Gradient Boosting model
print("\n[3/4] Training Gradient Boosting model...")
model = GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42)
model.fit(X_train, y_train)

# Test the model
from sklearn.metrics import r2_score
r2 = r2_score(y_test, model.predict(X_test))
print(f"✓ Model trained! Test R² = {r2:.3f}")

# Save model
print("\n[4/4] Saving model...")
os.makedirs('models', exist_ok=True)

with open('models/gradient_boosting_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("✓ Model saved to: models/gradient_boosting_model.pkl")

# Save feature names for API
with open('models/feature_names.pkl', 'wb') as f:
    pickle.dump(list(X.columns), f)

print("✓ Feature names saved to: models/feature_names.pkl")

print("\n" + "="*80)
print("✅ MODEL SAVED SUCCESSFULLY!")
print("="*80)
print("\nNow you can run the API with: python api.py")