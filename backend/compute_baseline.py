"""
Compute Naive Persistence Baseline metrics for Minneapolis dataset
Predicts next hour = current hour (shift by 1)
"""
import pandas as pd
import numpy as np
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

def main():
    print("Computing Naive Persistence Baseline...")
    
    # Load Minneapolis dataset
    data_path = r"D:\Minorproject\data\Train.csv"
    df = pd.read_csv(data_path)
    
    print(f"Loaded dataset: {df.shape}")
    
    # Check required columns
    if 'date_time' not in df.columns:
        print("ERROR: 'date_time' column not found")
        return
    
    if 'traffic_volume' not in df.columns:
        print("ERROR: 'traffic_volume' column not found")
        return
    
    # Sort by DateTime column ascending
    df['date_time'] = pd.to_datetime(df['date_time'])
    df = df.sort_values('date_time').reset_index(drop=True)
    
    print(f"Sorted by date_time: {df.shape}")
    
    # Create persistence prediction: predicted[i] = actual[i-1] (shift by 1)
    df['predicted_volume'] = df['traffic_volume'].shift(1)
    
    # Drop first row (no previous value available)
    df_clean = df.dropna(subset=['predicted_volume']).copy()
    
    print(f"After dropping first row: {df_clean.shape}")
    
    # Extract actual and predicted values
    y_true = df_clean['traffic_volume'].values
    y_pred = df_clean['predicted_volume'].values
    
    # Compute metrics
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    
    print("\n" + "="*50)
    print("NAIVE PERSISTENCE BASELINE RESULTS")
    print("="*50)
    print(f"Dataset: Minneapolis Metro Interstate Traffic")
    print(f"Method:  Predict next hour = current hour (shift by 1)")
    print(f"Samples:  {len(y_true)}")
    print(f"R²:       {r2:.4f}")
    print(f"MAE:      {mae:.2f}")
    print(f"RMSE:     {rmse:.2f}")
    print("="*50)
    
    # Return values for updating backend
    return {
        'r2': r2,
        'mae': mae,
        'rmse': rmse
    }

if __name__ == "__main__":
    results = main()
    print(f"\nFor updating app_new.py:")
    print(f"r2: {results['r2']:.4f}")
    print(f"mae: {results['mae']:.2f}")
    print(f"rmse: {results['rmse']:.2f}")
