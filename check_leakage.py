"""
Check for data leakage in features
"""

import pandas as pd

print("Checking for data leakage...")

df = pd.read_csv('results/engineered_data.csv')

# Find target
target = 'traffic_volume'

# Drop date column if exists
if 'date' in df.columns:
    df = df.drop(columns=['date'])
    print("✓ Dropped date column")

# Select only numeric columns
numeric_df = df.select_dtypes(include=['number'])

print(f"✓ Analyzing {len(numeric_df.columns)} numeric features")

# Check correlation with target
correlations = numeric_df.corr()[target].abs().sort_values(ascending=False)

print("\n" + "="*80)
print("FEATURE CORRELATIONS WITH TARGET")
print("="*80)
print(correlations.head(20))

print("\n⚠️ Features with correlation > 0.95 (possible leakage):")
leakage_features = correlations[correlations > 0.95].index.tolist()
if target in leakage_features:
    leakage_features.remove(target)  # Remove target itself

for feat in leakage_features:
    print(f"  - {feat}: {correlations[feat]:.4f}")

if leakage_features:
    print(f"\n✓ Found {len(leakage_features)} features with possible leakage")
    print("\nThese features should be removed before training!")
    
    # Save list of features to remove
    with open('results/features_to_remove.txt', 'w') as f:
        for feat in leakage_features:
            f.write(feat + '\n')
    print("✓ Saved to: results/features_to_remove.txt")
else:
    print("\n✓ No obvious data leakage found")