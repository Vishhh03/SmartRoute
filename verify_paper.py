"""
Quick Verification Script for Research Paper Values
Run this from your project root directory: python verify_paper.py
"""

import pandas as pd
import os

print("="*80)
print("PAPER VALUES VERIFICATION")
print("="*80)

# Expected values from your paper
expected = {
    "Gradient Boosting": {"R2": 0.845, "MAE": 3130, "RMSE": 5094, "Time": 1.807},
    "Random Forest": {"R2": 0.833, "MAE": 3235, "RMSE": 5286, "Time": 1.273},
    "XGBoost": {"R2": 0.812, "MAE": 3484, "RMSE": 5607, "Time": 0.393},
    "Decision Tree": {"R2": 0.650, "MAE": 4461, "RMSE": 7653, "Time": 0.091},
    "Linear Regression": {"R2": 0.749, "MAE": 4271, "RMSE": 6479, "Time": 0.022},
    "LSTM": {"R2": -0.003, "MAE": 10492, "RMSE": 12975, "Time": 13.229}
}

# Check model results
print("\n1. CHECKING MODEL RESULTS...")
print("-"*80)

csv_files = [
    "results/model_comparison.csv",
    "results/model_comparison_with_lstm.csv", 
    "results/model_comparison_with_lstm_fixed.csv"
]

df = None
for csv_file in csv_files:
    if os.path.exists(csv_file):
        df = pd.read_csv(csv_file)
        print(f"✓ Loaded: {csv_file}")
        print(f"  Columns: {list(df.columns)}\n")
        break

if df is not None:
    # Find the correct column names
    r2_col = None
    mae_col = None
    rmse_col = None
    time_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'r' in col_lower and '2' in col_lower or 'r²' in col_lower or 'rsquared' in col_lower:
            r2_col = col
        elif 'mae' in col_lower:
            mae_col = col
        elif 'rmse' in col_lower:
            rmse_col = col
        elif 'time' in col_lower or 'training time' in col_lower:
            time_col = col
    
    print(f"Using columns: R²={r2_col}, MAE={mae_col}, RMSE={rmse_col}, Time={time_col}\n")
    
    print(f"{'Model':<20} {'Metric':<10} {'Paper':<10} {'Actual':<10} {'Match'}")
    print("-"*70)
    
    all_match = True
    
    for model, values in expected.items():
        if model in df['Model'].values:
            row = df[df['Model'] == model].iloc[0]
            
            # Check R²
            if r2_col:
                paper_val = values['R2']
                actual_val = round(float(row[r2_col]), 3)
                match = "✓" if abs(paper_val - actual_val) < 0.01 else "✗"
                print(f"{model:<20} {'R²':<10} {paper_val:<10} {actual_val:<10} {match}")
                if match == "✗":
                    all_match = False
            
            # Check MAE
            if mae_col:
                paper_val = values['MAE']
                actual_val = round(float(row[mae_col]))
                match = "✓" if abs(paper_val - actual_val) < 5 else "✗"
                print(f"{model:<20} {'MAE':<10} {paper_val:<10} {actual_val:<10} {match}")
                if match == "✗":
                    all_match = False
            
            # Check RMSE
            if rmse_col:
                paper_val = values['RMSE']
                actual_val = round(float(row[rmse_col]))
                match = "✓" if abs(paper_val - actual_val) < 5 else "✗"
                print(f"{model:<20} {'RMSE':<10} {paper_val:<10} {actual_val:<10} {match}")
                if match == "✗":
                    all_match = False
    
    if all_match:
        print("\n✅ ALL VALUES MATCH YOUR PAPER!")
    else:
        print("\n⚠️ SOME VALUES DON'T MATCH - CHECK ABOVE!")
else:
    print("✗ No model comparison CSV found!")

# Check dataset
print("\n2. CHECKING DATASET...")
print("-"*80)

if os.path.exists("results/engineered_data.csv"):
    data = pd.read_csv("results/engineered_data.csv")
    print(f"✓ Shape: {data.shape}")
    print(f"  Records: {len(data)} (Paper says: 8936)")
    print(f"  Features: {len(data.columns)} (Paper says: 45)")
    
    if len(data) == 8936:
        print("  ✓ Record count matches!")
    else:
        print(f"  ✗ Record count: {len(data)} vs 8936 in paper")
        
    if len(data.columns) == 45:
        print("  ✓ Feature count matches!")
    else:
        print(f"  ⚠️ Feature count is {len(data.columns)}, paper says 45")
else:
    print("✗ engineered_data.csv not found!")

# Check training R²
print("\n3. CHECKING TRAINING R² (for the inconsistency)...")
print("-"*80)

if df is not None:
    train_cols = [col for col in df.columns if 'train' in col.lower() and ('r' in col.lower() or '2' in col.lower())]
    
    if train_cols:
        train_r2 = df[df['Model'] == 'Gradient Boosting'][train_cols[0]].iloc[0]
        print(f"Actual Training R²: {train_r2:.3f}")
        print(f"  Figure 2 caption says: 0.886")
        print(f"  Section text says: 0.859")
        
        if abs(train_r2 - 0.886) < 0.01:
            print("  ✓ Matches 0.886 - Keep Figure caption as is")
        elif abs(train_r2 - 0.859) < 0.01:
            print("  ✓ Matches 0.859 - Update Figure caption to 0.859")
        else:
            print(f"  ⚠️ Actual value is {train_r2:.3f} - Update both!")
    else:
        print("  ℹ️ Training R² column not found in CSV")

print("\n" + "="*80)
print("SUMMARY - ISSUES TO FIX IN PAPER:")
print("="*80)
print("1. ⚠️ Dropout rate inconsistency: 0.2 (text) vs 0.1 (figure text)")
print("2. ⚠️ Typo: 'seasonalality' → 'seasonality'")
print("3. ⚠️ Training R² inconsistency (check result above)")
print("\nIf all model values show ✓ above, your Table I is correct!")
print("="*80)