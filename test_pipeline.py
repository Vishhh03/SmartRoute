"""Test the complete ML pipeline"""

from ml.data_loader import TrafficDataLoader
from ml.preprocessing import TrafficDataPreprocessor
from ml.feature_engineering import TrafficFeatureEngineer

print("="*80)
print("SMARTROUTE - COMPLETE ML PIPELINE TEST")
print("="*80)

# Step 1: Load Data
print("\n[1/3] Loading data...")
loader = TrafficDataLoader('data/Banglore_traffic_Dataset.csv')
df = loader.load_data()
print(f"✓ Loaded: {df.shape[0]} rows, {df.shape[1]} columns")

# Step 2: Preprocess
print("\n[2/3] Preprocessing...")
preprocessor = TrafficDataPreprocessor(df)
df_clean = preprocessor.preprocess_pipeline()
print(f"✓ Cleaned: {df_clean.shape}")

# Step 3: Engineer Features
print("\n[3/3] Engineering features...")
engineer = TrafficFeatureEngineer(df_clean)
df_final = engineer.engineer_features_pipeline()
print(f"✓ Final: {df_final.shape}")

# Save results
print("\nSaving results...")
df_final.to_csv('results/engineered_data.csv', index=False)
print("✓ Saved to: results/engineered_data.csv")

# Summary
print("\n" + "="*80)
print("✅ PIPELINE TEST SUCCESSFUL!")
print("="*80)
print(f"Original features:  {df.shape[1]}")
print(f"Final features:     {df_final.shape[1]}")
print(f"New features:       {df_final.shape[1] - df.shape[1]}")
print(f"Total records:      {df_final.shape[0]}")
print("\nYour data is ready for ML model training! 🚀")