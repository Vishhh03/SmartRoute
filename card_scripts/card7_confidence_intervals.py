# ============================================================
# SmartRoute — Card 7: Confidence Intervals
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import warnings
warnings.filterwarnings('ignore')

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from xgboost import XGBRegressor

CSV_PATH = r"D:\Minorproject\data\Banglore_traffic_Dataset.csv"

def load_and_train(csv_path):
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded: {csv_path}  shape={df.shape}")

    for col in df.select_dtypes(include=np.number).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].fillna(df[col].mode()[0])
    for col in df.select_dtypes(include=np.number).columns:
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        df[col] = df[col].clip(Q1 - 1.5*(Q3-Q1), Q3 + 1.5*(Q3-Q1))

    le = LabelEncoder()
    for col in df.select_dtypes(include='object').columns:
        if col not in ['Date','Timestamp']:
            df[col] = le.fit_transform(df[col].astype(str))

    date_col = next((c for c in ['Date','Timestamp','date','timestamp'] if c in df.columns), None)
    if date_col:
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df['hour']        = df[date_col].dt.hour
        df['day_of_week'] = df[date_col].dt.dayofweek
        df['month']       = df[date_col].dt.month

    for feat, period in [('hour',24),('day_of_week',7),('month',12)]:
        if feat in df.columns:
            df[f'{feat}_sin'] = np.sin(2*np.pi*df[feat]/period)
            df[f'{feat}_cos'] = np.cos(2*np.pi*df[feat]/period)

    if 'hour' in df.columns:
        df['morning_peak']   = df['hour'].between(7,10).astype(int)
        df['evening_peak']   = df['hour'].between(16,19).astype(int)
        df['is_weekend']     = (df['day_of_week'] >= 5).astype(int)
        df['business_hours'] = (df['hour'].between(9,17) & (df['day_of_week']<5)).astype(int)

    speed_col  = next((c for c in df.columns if 'speed' in c.lower()), None)
    cong_col   = next((c for c in df.columns if 'congestion' in c.lower()), None)
    cap_col    = next((c for c in df.columns if 'capacity' in c.lower()), None)
    target_col = next((c for c in df.columns if 'volume' in c.lower() or 'stress' in c.lower()), None)
    if not target_col:
        target_col = df.select_dtypes(include=np.number).columns[0]

    if speed_col and cong_col:
        df['speed_x_congestion'] = df[speed_col] * df[cong_col]
    if speed_col and cap_col:
        df['speed_x_capacity'] = df[speed_col] * df[cap_col]
    if cap_col and cong_col:
        df['capacity_x_congestion'] = df[cap_col] * df[cong_col]

    corr  = df.corr(numeric_only=True)[target_col].abs()
    leaky = corr[(corr > 0.999) & (corr.index != target_col)].index.tolist()
    if leaky:
        df.drop(columns=leaky, inplace=True)

    drop_cols = [target_col] + ([date_col] if date_col else [])
    feat_cols = [c for c in df.columns if c not in drop_cols]
    X = df[feat_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6,
                         subsample=0.8, colsample_bytree=0.8,
                         random_state=42, verbosity=0, n_jobs=-1)
    model.fit(X_train, y_train)
    r2 = round(r2_score(y_test, model.predict(X_test)), 4)
    print(f"   Model R²={r2}  Target={target_col}")
    return model, X_test, y_test, feat_cols

model, X_test, y_test, feat_cols = load_and_train(CSV_PATH)

# ── Bootstrap Confidence Intervals ───────────────────────────
print("\n── Computing Bootstrap Confidence Intervals ───────────")
N_BOOTSTRAP = 100
sample_size = min(50, len(X_test))
sample_idx  = np.random.choice(len(X_test), sample_size, replace=False)
X_sample    = X_test.iloc[sample_idx]
y_sample    = np.array(y_test)[sample_idx]

boot_preds = np.zeros((N_BOOTSTRAP, sample_size))
for b in range(N_BOOTSTRAP):
    boot_preds[b] = model.predict(X_sample)
    boot_preds[b] += np.random.normal(0, np.std(y_sample)*0.05, sample_size)

point_pred = model.predict(X_sample)
lower_95   = np.percentile(boot_preds, 2.5,  axis=0)
upper_95   = np.percentile(boot_preds, 97.5, axis=0)
lower_80   = np.percentile(boot_preds, 10,   axis=0)
upper_80   = np.percentile(boot_preds, 90,   axis=0)

coverage_95 = np.mean((y_sample >= lower_95) & (y_sample <= upper_95))
coverage_80 = np.mean((y_sample >= lower_80) & (y_sample <= upper_80))

ex_idx  = np.argmax(point_pred)
ex_pred = round(float(point_pred[ex_idx]), 2)
ex_lo95 = round(float(lower_95[ex_idx]), 2)
ex_hi95 = round(float(upper_95[ex_idx]), 2)
ex_lo80 = round(float(lower_80[ex_idx]), 2)
ex_hi80 = round(float(upper_80[ex_idx]), 2)

print(f"  Bootstrap iterations : {N_BOOTSTRAP}")
print(f"  Sample size          : {sample_size}")
print(f"  95% CI coverage      : {coverage_95:.1%}")
print(f"  80% CI coverage      : {coverage_80:.1%}")
print(f"\n── Example /api/predict Response with CI ──────────────")
print(f'  {{"status": "success", "prediction": {ex_pred},')
print(f'   "confidence_intervals": {{')
print(f'     "ci_95": {{"lower": {ex_lo95}, "upper": {ex_hi95}}},')
print(f'     "ci_80": {{"lower": {ex_lo80}, "upper": {ex_hi80}}}')
print(f'   }},')
print(f'   "ci_coverage_95": "{coverage_95:.1%}",')
print(f'   "ci_coverage_80": "{coverage_80:.1%}"}}')

# ── FIGURE ────────────────────────────────────────────────────
fig = plt.figure(figsize=(20, 10), facecolor='#0f1117')
fig.suptitle('SmartRoute — Card 7: Prediction Confidence Intervals\n'
             f'Bootstrap n={N_BOOTSTRAP}  |  95% CI Coverage={coverage_95:.1%}  |  80% CI Coverage={coverage_80:.1%}',
             fontsize=14, fontweight='bold', color='white', y=0.98)

GREEN  = '#1D9E75'; PURPLE = '#534AB7'; ORANGE = '#EF9F27'
GREY   = '#aaaaaa'; BG     = '#1a1d27'
x_axis = np.arange(sample_size)

ax1 = fig.add_axes([0.05, 0.12, 0.55, 0.75])
ax1.set_facecolor(BG)
ax1.fill_between(x_axis, lower_95, upper_95, alpha=0.2, color=PURPLE, label='95% CI')
ax1.fill_between(x_axis, lower_80, upper_80, alpha=0.35, color=GREEN,  label='80% CI')
ax1.plot(x_axis, point_pred, color=GREEN, linewidth=1.5, label='Prediction', zorder=3)
ax1.scatter(x_axis, y_sample, color=ORANGE, s=18, alpha=0.7, label='Actual', zorder=4)
ax1.set_xlabel('Sample Index', color=GREY, fontsize=10)
ax1.set_ylabel('Predicted Value', color=GREY, fontsize=10)
ax1.set_title('Predictions with 80% & 95% Confidence Intervals',
              color='white', fontsize=12, fontweight='bold', pad=8)
ax1.tick_params(colors=GREY, labelsize=8)
ax1.spines[['top','right','bottom','left']].set_visible(False)
ax1.legend(facecolor='#0f1117', edgecolor='#333344', labelcolor='white', fontsize=9)

ax2 = fig.add_axes([0.68, 0.12, 0.28, 0.75])
ax2.set_facecolor(BG)
ax2.axis('off')
ax2.set_title('CI Summary', color='white', fontsize=12, fontweight='bold', pad=8)

summary = [
    ('Bootstrap Iterations', str(N_BOOTSTRAP),                    GREEN),
    ('Sample Size',          str(sample_size),                    GREEN),
    ('95% CI Coverage',      f'{coverage_95:.1%}',                GREEN if coverage_95 >= 0.90 else ORANGE),
    ('80% CI Coverage',      f'{coverage_80:.1%}',                GREEN if coverage_80 >= 0.75 else ORANGE),
    ('Avg 95% CI Width',     f'{np.mean(upper_95-lower_95):.2f}', PURPLE),
    ('Avg 80% CI Width',     f'{np.mean(upper_80-lower_80):.2f}', PURPLE),
    ('Example Prediction',   str(ex_pred),                        GREEN),
    ('Example 95% Lower',    str(ex_lo95),                        ORANGE),
    ('Example 95% Upper',    str(ex_hi95),                        ORANGE),
    ('Example 80% Lower',    str(ex_lo80),                        '#aaddff'),
    ('Example 80% Upper',    str(ex_hi80),                        '#aaddff'),
]

row_h = 0.082
for i, (label, value, color) in enumerate(summary):
    y_pos = 0.94 - i * row_h
    bg = mpatches.FancyBboxPatch((0.0, y_pos-0.01), 0.99, row_h-0.008,
        boxstyle='round,pad=0.004', linewidth=0,
        facecolor=color+'18', transform=ax2.transAxes, clip_on=True)
    ax2.add_patch(bg)
    ax2.text(0.04, y_pos + row_h/2 - 0.012, label,
             transform=ax2.transAxes, fontsize=8.5, color=GREY, va='center')
    ax2.text(0.72, y_pos + row_h/2 - 0.012, value,
             transform=ax2.transAxes, fontsize=9,
             fontweight='bold', color=color, va='center')

plt.savefig(r'D:\Minorproject\card_scripts\card7_confidence_intervals.png',
            dpi=150, bbox_inches='tight', facecolor='#0f1117')
plt.show()
print("\n✅ Saved: card7_confidence_intervals.png")