"""
Retrain all models with current sklearn version and save using joblib
"""
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import warnings

def retrain_bangalore_model():
    """Retrain Bangalore GradientBoosting model with 3 independent features"""
    print("\n" + "="*60)
    print("RETRAINING BANGALORE MODEL")
    print("="*60)
    
    # Load Bangalore dataset
    import os
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(BASE_DIR, "data", "Banglore_traffic_Dataset.csv")
    df = pd.read_csv(data_path)
    print(f"Loaded Bangalore dataset: {df.shape}")
    
    # Keep ONLY these 3 columns as features
    feature_cols = ['Weather Conditions', 'Roadwork and Construction Activity', 'Incident Reports']
    target_col = 'Traffic Volume'
    
    # Label encode Weather Conditions and Roadwork and Construction Activity
    le_weather = LabelEncoder()
    le_roadwork = LabelEncoder()
    
    df['weather_enc'] = le_weather.fit_transform(df['Weather Conditions'].astype(str))
    df['roadwork_enc'] = le_roadwork.fit_transform(df['Roadwork and Construction Activity'].astype(str))
    
    # Use Incident Reports as numeric directly
    X = df[['weather_enc', 'roadwork_enc', 'Incident Reports']]
    y = df[target_col]
    
    print(f"Using features: {list(X.columns)}")
    print(f"Features prepared: {X.shape}")
    
    # Temporal split: first 80% train, last 20% test
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Train GradientBoosting model
    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    print("Training Bangalore GradientBoosting model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Compute persistence baseline for comparison
    baseline_predictions = y_test[:-1]  # pred[i] = actual[i-1]
    baseline_r2 = r2_score(y_test[1:], baseline_predictions)
    
    print(f"Bangalore Results - R²: {r2:.4f}, MAE: {mae:.2f}, RMSE: {rmse:.2f}")
    print(f"Persistence Baseline R²: {baseline_r2:.4f}")
    
    # Expected R² range for weather-only prediction: 0.30 to 0.65
    if r2 > 0.65:
        print("WARNING: Possible data leakage detected - R² > 0.65")
    elif r2 < 0.30:
        print("WARNING: Model performance below expected range - R² < 0.30")
    
    # Save model
    model_path = os.path.join(BASE_DIR, "models", "gradient_boosting_model.pkl")
    joblib.dump(model, model_path)
    print(f"Saved Bangalore model to: {model_path}")
    
    return r2, mae, rmse

def retrain_chennai_mumbai_model():
    """Retrain Chennai/Mumbai GradientBoosting model"""
    print("\n" + "="*60)
    print("RETRAINING CHENNAI/MUMBAI MODEL")
    print("="*60)
    
    # Load Chennai/Mumbai dataset
    data_path = os.path.join(BASE_DIR, "data", "traffic_2000_rows.csv")
    df = pd.read_csv(data_path)
    print(f"Loaded Chennai/Mumbai dataset: {df.shape}")
    
    # Target column
    target_col = "vehicle_count"
    
    # Sort by datetime ascending
    df['datetime'] = pd.to_datetime(df['datetime'], errors='coerce')
    df = df.sort_values('datetime')
    
    # After encoding do this explicitly:
    df['weather_enc'] = LabelEncoder().fit_transform(df['weather'])
    df['city_enc'] = LabelEncoder().fit_transform(df['city'])
    df['road_enc'] = LabelEncoder().fit_transform(df['road_segment'])
    df['day_enc'] = LabelEncoder().fit_transform(df['day_of_week'])
    
    # Add engineered features
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['temp_humidity'] = df['temperature_celsius'] * df['humidity']
    
    print(f"Features prepared: {df.shape}")
    
    # Build X using correct encoded column names
    X = df[['hour','hour_sin','hour_cos','temperature_celsius',
            'humidity','is_peak_hour','weather_enc','city_enc',
            'road_enc','day_enc','temp_humidity']]
    y = df[target_col]
    
    # Temporal split: first 80% train, last 20% test, no shuffle
    split_idx = int(len(df) * 0.8)
    df_train = df.iloc[:split_idx]
    df_test = df.iloc[split_idx:]
    
    X_train = df_train[['hour','hour_sin','hour_cos','temperature_celsius',
                     'humidity','is_peak_hour','weather_enc','city_enc',
                     'road_enc','day_enc','temp_humidity']]
    y_train = df_train[target_col]
    X_test = df_test[['hour','hour_sin','hour_cos','temperature_celsius',
                     'humidity','is_peak_hour','weather_enc','city_enc',
                     'road_enc','day_enc','temp_humidity']]
    y_test = df_test[target_col]
    
    # Train GradientBoosting model
    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    print("Training Chennai/Mumbai GradientBoosting model...")
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print(f"Chennai/Mumbai Results - R²: {r2:.4f}, MAE: {mae:.2f}, RMSE: {rmse:.2f}")
    
    # Save model as dict with joblib
    model_path = os.path.join(BASE_DIR, "models", "chennai_mumbai_model.pkl")
    encoders_path = os.path.join(BASE_DIR, "models", "chennai_mumbai_encoders.pkl")
    features_path = os.path.join(BASE_DIR, "models", "chennai_mumbai_features.pkl")
    
    model_dict = {
        "model": model, 
        "data_source": "synthetic_simulation",
        "city": "Chennai/Mumbai"
    }
    
    joblib.dump(model_dict, model_path)
    joblib.dump({}, encoders_path) # Empty dict since encoders are inline
    joblib.dump(['hour','hour_sin','hour_cos','temperature_celsius',
                'humidity','is_peak_hour','weather_enc','city_enc',
                'road_enc','day_enc','temp_humidity'], features_path)
    
    print(f"Saved Chennai/Mumbai model to: {model_path}")
    print(f"Saved Chennai/Mumbai encoders to: {encoders_path}")
    print(f"Saved Chennai/Mumbai features to: {features_path}")
    
    return r2, mae, rmse

def print_summary_table(bangalore_r2, bangalore_mae, bangalore_rmse, 
                      chennai_r2, chennai_mae, chennai_rmse):
    """Print summary table of all results"""
    print("\n" + "="*80)
    print("RETRAINING SUMMARY TABLE")
    print("="*80)
    print(f"{'Dataset':<15} {'Model':<20} {'R²':<10} {'MAE':<10} {'RMSE':<10}")
    print("-"*80)
    print(f"{'Bangalore':<15} {'GradientBoosting':<20} {bangalore_r2:<10.4f} {bangalore_mae:<10.2f} {bangalore_rmse:<10.2f}")
    print(f"{'Chennai/Mumbai':<15} {'GradientBoosting':<20} {chennai_r2:<10.4f} {chennai_mae:<10.2f} {chennai_rmse:<10.2f}")
    print("-"*80)

def main():
    """Main function to retrain all models"""
    print("SMARTROUTE - MODEL RETRAINING SCRIPT")
    print("Retraining all models with current sklearn version...")
    
    # Suppress warnings
    warnings.filterwarnings('ignore')
    
    try:
        # Retrain Bangalore model
        bangalore_r2, bangalore_mae, bangalore_rmse = retrain_bangalore_model()
        
        # Retrain Chennai/Mumbai model
        chennai_r2, chennai_mae, chennai_rmse = retrain_chennai_mumbai_model()
        
        # Print summary table
        print_summary_table(bangalore_r2, bangalore_mae, bangalore_rmse,
                           chennai_r2, chennai_mae, chennai_rmse)
        
        print("\nAll models retrained and saved successfully!")
        
    except Exception as e:
        print(f"Error during retraining: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
