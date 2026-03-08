"""
Train and evaluate multiple ML models for traffic prediction
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
import time
import warnings
warnings.filterwarnings('ignore')

print("="*80)
print("SMARTROUTE - MODEL TRAINING & EVALUATION")
print("="*80)

# Load engineered data
print("\n[1/5] Loading engineered data...")
df = pd.read_csv('results/engineered_data.csv')
print(f"✓ Loaded: {df.shape}")

# Identify target variable
target_cols = [col for col in df.columns if 'traffic' in col.lower() and 'volume' in col.lower()]
if not target_cols:
    target_cols = [col for col in df.columns if 'volume' in col.lower()]

if target_cols:
    target = target_cols[0]
    print(f"✓ Target variable: {target}")
else:
    print("❌ Could not find target variable!")
    exit()

# Prepare features and target
print("\n[2/5] Preparing train/test split...")

# Drop target, datetime columns, and leakage features
cols_to_drop = [target]

# Remove known leakage features
leakage_features = ['environmental_impact']
cols_to_drop.extend(leakage_features)
print(f"  Removing leakage features: {leakage_features}")

# Find and drop datetime columns
datetime_cols = [col for col in df.columns if df[col].dtype == 'object']
for col in datetime_cols:
    try:
        pd.to_datetime(df[col])
        cols_to_drop.append(col)
        print(f"  Dropping datetime column: {col}")
    except:
        pass

X = df.drop(columns=cols_to_drop)
y = df[target]

# Also drop 'date' if it exists
if 'date' in X.columns:
    X = X.drop(columns=['date'])
    print(f"  Dropped 'date' column")

print(f"✓ Features shape: {X.shape}")
print(f"✓ Target shape: {y.shape}")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print(f"✓ Training set: {X_train.shape[0]} samples")
print(f"✓ Testing set: {X_test.shape[0]} samples")

# Initialize models
print("\n[3/5] Initializing ML models...")
models = {
    'Linear Regression': LinearRegression(),
    'Decision Tree': DecisionTreeRegressor(max_depth=10, random_state=42),
    'Random Forest': RandomForestRegressor(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, max_depth=5, random_state=42),
    'XGBoost': XGBRegressor(n_estimators=100, max_depth=7, learning_rate=0.1, random_state=42)
}

print(f"✓ Initialized {len(models)} models")

# Train and evaluate
print("\n[4/5] Training models...")
results = []

for name, model in models.items():
    print(f"\n{'='*80}")
    print(f"Training: {name}")
    print('='*80)
    
    start_time = time.time()
    model.fit(X_train, y_train)
    training_time = time.time() - start_time
    
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    test_mae = mean_absolute_error(y_test, y_test_pred)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    test_mape = mean_absolute_percentage_error(y_test, y_test_pred) * 100
    
    print(f"  Training R²:    {train_r2:.4f}")
    print(f"  Testing R²:     {test_r2:.4f}")
    print(f"  Testing MAE:    {test_mae:.2f}")
    print(f"  Testing RMSE:   {test_rmse:.2f}")
    print(f"  Testing MAPE:   {test_mape:.2f}%")
    print(f"  Training Time:  {training_time:.2f}s")
    
    results.append({
        'Model': name,
        'Train_R2': train_r2,
        'Test_R2': test_r2,
        'MAE': test_mae,
        'RMSE': test_rmse,
        'MAPE': test_mape,
        'Training_Time': training_time
    })

# Results summary
print("\n[5/5] Model Comparison")
print("="*80)

results_df = pd.DataFrame(results)
results_df = results_df.sort_values('Test_R2', ascending=False)

print("\n" + results_df.to_string(index=False))

results_df.to_csv('results/model_comparison.csv', index=False)
print("\n✓ Results saved to: results/model_comparison.csv")

best_model = results_df.iloc[0]
print("\n" + "="*80)
print("🏆 BEST MODEL")
print("="*80)
print(f"Model:      {best_model['Model']}")
print(f"R² Score:   {best_model['Test_R2']:.4f}")
print(f"MAE:        {best_model['MAE']:.2f}")
print(f"RMSE:       {best_model['RMSE']:.2f}")
print(f"MAPE:       {best_model['MAPE']:.2f}%")

print("\n" + "="*80)
print("✅ MODEL TRAINING COMPLETE!")
print("="*80)