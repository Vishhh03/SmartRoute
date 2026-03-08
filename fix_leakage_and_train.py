"""
Fix data leakage and retrain all models
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from xgboost import XGBRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler
import time
import warnings
warnings.filterwarnings('ignore')

print("=" * 80)
print("SMARTROUTE: Training All Models (FIXED - No Data Leakage)")
print("=" * 80)

# Load engineered data
print("\n[1/7] Loading engineered dataset...")
df = pd.read_csv('results/engineered_data.csv')
print(f"✓ Dataset loaded: {df.shape[0]} samples, {df.shape[1]} features")

# REMOVE DATA LEAKAGE COLUMNS
print("\n[2/7] Removing data leakage columns...")
leakage_columns = [
    'traffic_volume_hour_avg',      # Created from target
    'traffic_volume_dow_avg',       # Created from target
    'environmental_impact',         # 100% correlation with target
    'area_name_hour_avg',          # May contain leakage
    'area_name_dow_avg',           # May contain leakage
    'roadintersection_name_hour_avg',  # May contain leakage
    'roadintersection_name_dow_avg'    # May contain leakage
]

# Check which columns actually exist
leakage_to_remove = [col for col in leakage_columns if col in df.columns]
print(f"✓ Removing {len(leakage_to_remove)} leakage columns:")
for col in leakage_to_remove:
    print(f"  - {col}")

df_clean = df.drop(leakage_to_remove, axis=1)
print(f"✓ Clean dataset: {df_clean.shape[1]} features remaining")

# Prepare features and target
print("\n[3/7] Preparing features and target...")
columns_to_drop = ['traffic_volume', 'date']
X = df_clean.drop(columns_to_drop, axis=1)
y = df_clean['traffic_volume']

print(f"✓ Features: {X.shape[1]} columns")
print(f"✓ Target: {y.name}")
print(f"✓ Sample size: {len(X)} records")

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
print(f"✓ Train set: {X_train.shape[0]} samples")
print(f"✓ Test set: {X_test.shape[0]} samples")

# Results storage
results = []

# ============================================================================
# PART 1: TRADITIONAL MACHINE LEARNING MODELS (5 models)
# ============================================================================

print("\n" + "=" * 80)
print("PART 1: Training Traditional ML Models")
print("=" * 80)

models = {
    'Linear Regression': LinearRegression(),
    'Decision Tree': DecisionTreeRegressor(random_state=42),
    'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
    'XGBoost': XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
}

for i, (name, model) in enumerate(models.items(), 1):
    print(f"\n[{i}/5] Training {name}...")
    
    # Train model
    start_time = time.time()
    model.fit(X_train, y_train)
    training_time = time.time() - start_time
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Metrics
    train_r2 = r2_score(y_train, y_train_pred)
    test_r2 = r2_score(y_test, y_test_pred)
    mae = mean_absolute_error(y_test, y_test_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
    mape = np.mean(np.abs((y_test - y_test_pred) / y_test)) * 100
    
    # Store results
    results.append({
        'Model': name,
        'Train_R2': train_r2,
        'Test_R2': test_r2,
        'MAE': mae,
        'RMSE': rmse,
        'MAPE': mape,
        'Training_Time': training_time
    })
    
    print(f"  ✓ Train R²: {train_r2:.4f}")
    print(f"  ✓ Test R²: {test_r2:.4f}")
    print(f"  ✓ MAE: {mae:.2f} vehicles/hour")
    print(f"  ✓ RMSE: {rmse:.2f} vehicles/hour")
    print(f"  ✓ Training Time: {training_time:.2f} seconds")

# ============================================================================
# PART 2: DEEP LEARNING MODEL (LSTM)
# ============================================================================

print("\n" + "=" * 80)
print("PART 2: Training Deep Learning Model (LSTM)")
print("=" * 80)

print("\n[6/6] Training LSTM Neural Network...")

# Scale data for LSTM
print("  → Scaling data with MinMaxScaler...")
scaler_X = MinMaxScaler()
scaler_y = MinMaxScaler()

X_train_scaled = scaler_X.fit_transform(X_train)
X_test_scaled = scaler_X.transform(X_test)
y_train_scaled = scaler_y.fit_transform(y_train.values.reshape(-1, 1)).flatten()
y_test_scaled = scaler_y.transform(y_test.values.reshape(-1, 1)).flatten()

# Create sequences for LSTM
def create_sequences(X, y, seq_length=24):
    X_seq, y_seq = [], []
    for i in range(len(X) - seq_length):
        X_seq.append(X[i:i+seq_length])
        y_seq.append(y[i+seq_length])
    return np.array(X_seq), np.array(y_seq)

print("  → Creating sequences (24-hour lookback window)...")
seq_length = 24

X_train_seq, y_train_seq = create_sequences(X_train_scaled, y_train_scaled, seq_length)
X_test_seq, y_test_seq = create_sequences(X_test_scaled, y_test_scaled, seq_length)

print(f"  ✓ Train sequences: {X_train_seq.shape}")
print(f"  ✓ Test sequences: {X_test_seq.shape}")

# Build LSTM model
print("  → Building LSTM architecture...")
lstm_model = Sequential([
    LSTM(50, return_sequences=True, input_shape=(seq_length, X_train.shape[1])),
    Dropout(0.2),
    LSTM(25, return_sequences=False),
    Dropout(0.2),
    Dense(1, activation='linear')
])

lstm_model.compile(optimizer='adam', loss='mse', metrics=['mae'])
print("  ✓ Model compiled (Adam optimizer, MSE loss)")

# Train LSTM
print("  → Training LSTM (50 epochs with early stopping)...")
early_stop = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

start_time = time.time()
history = lstm_model.fit(
    X_train_seq, y_train_seq,
    epochs=50,
    batch_size=32,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=0
)
training_time = time.time() - start_time

print(f"  ✓ Training completed in {training_time:.2f} seconds")
print(f"  ✓ Stopped at epoch {len(history.history['loss'])}")

# Predictions
y_train_pred_scaled = lstm_model.predict(X_train_seq, verbose=0).flatten()
y_test_pred_scaled = lstm_model.predict(X_test_seq, verbose=0).flatten()

# Inverse transform
y_train_pred = scaler_y.inverse_transform(y_train_pred_scaled.reshape(-1, 1)).flatten()
y_test_pred = scaler_y.inverse_transform(y_test_pred_scaled.reshape(-1, 1)).flatten()
y_train_actual = scaler_y.inverse_transform(y_train_seq.reshape(-1, 1)).flatten()
y_test_actual = scaler_y.inverse_transform(y_test_seq.reshape(-1, 1)).flatten()

# Calculate metrics
train_r2 = r2_score(y_train_actual, y_train_pred)
test_r2 = r2_score(y_test_actual, y_test_pred)
mae = mean_absolute_error(y_test_actual, y_test_pred)
rmse = np.sqrt(mean_squared_error(y_test_actual, y_test_pred))
mape = np.mean(np.abs((y_test_actual - y_test_pred) / y_test_actual)) * 100

# Store results
results.append({
    'Model': 'LSTM',
    'Train_R2': train_r2,
    'Test_R2': test_r2,
    'MAE': mae,
    'RMSE': rmse,
    'MAPE': mape,
    'Training_Time': training_time
})

print(f"  ✓ Train R²: {train_r2:.4f}")
print(f"  ✓ Test R²: {test_r2:.4f}")
print(f"  ✓ MAE: {mae:.2f} vehicles/hour")
print(f"  ✓ RMSE: {rmse:.2f} vehicles/hour")

# Save LSTM model
print("  → Saving LSTM model...")
lstm_model.save('models/lstm_model.keras')
print("  ✓ Model saved to models/lstm_model.keras")

# ============================================================================
# SAVE RESULTS
# ============================================================================

print("\n" + "=" * 80)
print("SAVING RESULTS")
print("=" * 80)

# Create results dataframe
results_df = pd.DataFrame(results)

# Sort by Test R²
results_df = results_df.sort_values('Test_R2', ascending=False)

# Save to CSV
output_path = 'results/model_comparison_with_lstm_fixed.csv'
results_df.to_csv(output_path, index=False)
print(f"\n✓ Results saved to: {output_path}")

# Display summary
print("\n" + "=" * 80)
print("FINAL RESULTS - ALL 6 MODELS (NO DATA LEAKAGE)")
print("=" * 80)
print("\nModel Performance Ranking (by Test R²):\n")
print(results_df.to_string(index=False))

# Highlight best model
best_model = results_df.iloc[0]
print("\n" + "=" * 80)
print(f"🏆 BEST MODEL: {best_model['Model']}")
print("=" * 80)
print(f"Test R²: {best_model['Test_R2']:.4f}")
print(f"MAE: {best_model['MAE']:.2f} vehicles/hour")
print(f"RMSE: {best_model['RMSE']:.2f} vehicles/hour")
print(f"Training Time: {best_model['Training_Time']:.2f} seconds")

# Overfitting check
print("\n" + "=" * 80)
print("OVERFITTING CHECK")
print("=" * 80)
for _, row in results_df.iterrows():
    gap = row['Train_R2'] - row['Test_R2']
    status = "✓ Good" if gap < 0.1 else "⚠ Possible overfitting"
    print(f"{row['Model']:20} | Train: {row['Train_R2']:.4f} | Test: {row['Test_R2']:.4f} | Gap: {gap:.4f} | {status}")

print("\n" + "=" * 80)
print("✅ ALL MODELS TRAINED SUCCESSFULLY (FIXED)!")
print("=" * 80)