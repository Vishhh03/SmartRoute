# ============================================================
# SmartRoute — Card 9: Peak Hour Detection  /api/peak-hours
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from xgboost import XGBRegressor
import warnings, json
warnings.filterwarnings('ignore')

CSV_PATH = r"D:\Minorproject\data\Banglore_traffic_Dataset.csv"

def quick_train(csv_path):
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded: {csv_path}  shape={df.shape}")
    for col in df.select_dtypes(include=np.number).columns:
        df[col] = df[col].fillna(df[col].median())
    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].fillna(df[col].mode()[0])
    for col in df.select_dtypes(include=np.number).columns:
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        df[col] = df[col].clip(Q1-1.5*(Q3-Q1), Q3+1.5*(Q3-Q1))
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
    leaky = corr[(corr>0.999) & (corr.index!=target_col)].index.tolist()
    if leaky: df.drop(columns=leaky, inplace=True)
    drop_cols = [target_col] + ([date_col] if date_col else [])
    feat_cols = [c for c in df.columns if c not in drop_cols]
    X = df[feat_cols]; y = df[target_col]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=6,
                         subsample=0.8, colsample_bytree=0.8,
                         random_state=42, verbosity=0, n_jobs=-1)
    model.fit(X_train, y_train)
    r2 = round(r2_score(y_test, model.predict(X_test)), 4)
    print(f"   Model R²={r2}  Target={target_col}")
    return model, feat_cols, r2

model, feat_cols, r2 = quick_train(CSV_PATH)

def predict_hour(hour, day_of_week=1, month=3):
    row = {col: 0.0 for col in feat_cols}
    if 'hour'        in row: row['hour']        = float(hour)
    if 'day_of_week' in row: row['day_of_week']  = float(day_of_week)
    if 'month'       in row: row['month']        = float(month)
    if 'hour_sin'    in row: row['hour_sin']     = np.sin(2*np.pi*hour/24)
    if 'hour_cos'    in row: row['hour_cos']     = np.cos(2*np.pi*hour/24)
    if 'day_of_week_sin' in row: row['day_of_week_sin'] = np.sin(2*np.pi*day_of_week/7)
    if 'day_of_week_cos' in row: row['day_of_week_cos'] = np.cos(2*np.pi*day_of_week/7)
    if 'month_sin'   in row: row['month_sin']    = np.sin(2*np.pi*month/12)
    if 'month_cos'   in row: row['month_cos']    = np.cos(2*np.pi*month/12)
    if 'morning_peak'   in row: row['morning_peak']   = int(7<=hour<=10)
    if 'evening_peak'   in row: row['evening_peak']   = int(16<=hour<=19)
    if 'is_weekend'     in row: row['is_weekend']     = int(day_of_week>=5)
    if 'business_hours' in row: row['business_hours'] = int(9<=hour<=17 and day_of_week<5)
    if 'night_hours'    in row: row['night_hours']    = int(hour>=22 or hour<=5)
    speed = 55 - 20*(1 if 7<=hour<=10 or 16<=hour<=19 else 0)
    cong  = 7  if (7<=hour<=10 or 16<=hour<=19) else 3
    cap   = 80 if (7<=hour<=10 or 16<=hour<=19) else 50
    for key in list(row.keys()):
        if 'speed' in key.lower() and 'x_' not in key and 'cat' not in key and 'mean' not in key:
            row[key] = float(speed)
        if 'congestion' in key.lower() and 'x_' not in key:
            row[key] = float(cong)
        if 'capacity' in key.lower() and 'x_' not in key:
            row[key] = float(cap)
    if 'speed_x_congestion'    in row: row['speed_x_congestion']    = speed*cong
    if 'speed_x_capacity'      in row: row['speed_x_capacity']      = speed*cap
    if 'capacity_x_congestion' in row: row['capacity_x_congestion'] = cap*cong
    if 'speed_category'        in row: row['speed_category']        = 0 if speed<35 else (1 if speed<60 else 2)
    X_row = pd.DataFrame([row])[feat_cols]
    return max(0.0, float(model.predict(X_row)[0]))

hours   = np.arange(24)
volumes = np.array([predict_hour(h) for h in hours])

mean_vol  = volumes.mean()
std_vol   = volumes.std()
threshold = mean_vol + 0.5 * std_vol
peak_mask = volumes > threshold
peak_hours = hours[peak_mask].tolist()

windows = []
if peak_hours:
    start = peak_hours[0]; prev = peak_hours[0]
    for h in peak_hours[1:]:
        if h != prev + 1:
            windows.append((start, prev, round(float(volumes[start:prev+1].max()), 0)))
            start = h
        prev = h
    windows.append((start, prev, round(float(volumes[start:prev+1].max()), 0)))

top3_idx   = np.argsort(volumes)[::-1][:3]
top3_hours = [(int(hours[i]), round(float(volumes[i]), 0)) for i in top3_idx]

overall_peak_hour = int(hours[np.argmax(volumes)])
overall_peak_vol  = round(float(volumes.max()), 0)
off_peak_hour     = int(hours[np.argmin(volumes)])
off_peak_vol      = round(float(volumes.min()), 0)

response = {
    "status":              "success",
    "date":                "2026-03-28",
    "overall_peak_hour":   f"{overall_peak_hour:02d}:00",
    "overall_peak_volume": overall_peak_vol,
    "off_peak_hour":       f"{off_peak_hour:02d}:00",
    "off_peak_volume":     off_peak_vol,
    "peak_threshold":      round(threshold, 0),
    "peak_hours":          [f"{h:02d}:00" for h in peak_hours],
    "peak_windows": [{"start": f"{w[0]:02d}:00", "end": f"{w[1]:02d}:00", "max_volume": w[2]} for w in windows],
    "top_3_peak_hours":    [{"hour": f"{h:02d}:00", "volume": v} for h, v in top3_hours],
    "model_r2":            r2,
}

print(f"\n── /api/peak-hours Response ────────────────────────────")
print(json.dumps(response, indent=2))
print(f"\n  🔴 Overall Peak Hour : {overall_peak_hour:02d}:00  (vol={overall_peak_vol:,.0f})")
print(f"  🟢 Off-Peak Hour     : {off_peak_hour:02d}:00  (vol={off_peak_vol:,.0f})")
print(f"  🏆 Top 3 Peak Hours  : {', '.join(f'{h:02d}:00' for h,v in top3_hours)}")

# ── FIGURE ────────────────────────────────────────────────────
fig = plt.figure(figsize=(20, 10), facecolor='#0f1117')
fig.suptitle(
    f'SmartRoute — Card 9: Peak Hour Detection  /api/peak-hours\n'
    f'Peak={overall_peak_hour:02d}:00  |  Off-Peak={off_peak_hour:02d}:00  |  Windows={len(windows)}  |  R²={r2}',
    fontsize=14, fontweight='bold', color='white', y=0.98)

GREEN  = '#1D9E75'; PURPLE = '#534AB7'; ORANGE = '#EF9F27'
RED    = '#E24B4A'; GREY   = '#aaaaaa'; BG     = '#1a1d27'
bar_colors = [RED if peak_mask[h] else PURPLE for h in hours]

ax1 = fig.add_axes([0.05, 0.12, 0.55, 0.76])
ax1.set_facecolor(BG)
ax1.bar(hours, volumes, color=bar_colors, edgecolor='none', width=0.7)
ax1.axhline(y=threshold, color=ORANGE, linewidth=1.5,
            linestyle='--', label=f'Peak threshold ({threshold:,.0f})')
ax1.axhline(y=mean_vol, color=GREY, linewidth=1,
            linestyle=':', alpha=0.6, label=f'Mean ({mean_vol:,.0f})')
for w in windows:
    ax1.axvspan(w[0]-0.4, w[1]+0.4, alpha=0.08, color=RED)
ax1.scatter([overall_peak_hour], [overall_peak_vol],
            marker='*', s=200, color=ORANGE, zorder=6,
            label=f'Top Peak {overall_peak_hour:02d}:00')
ax1.set_xlabel('Hour of Day', color=GREY, fontsize=10)
ax1.set_ylabel('Traffic Volume', color=GREY, fontsize=10)
ax1.set_title('24-Hour Traffic Volume with Peak Detection',
              color='white', fontsize=12, fontweight='bold', pad=8)
ax1.tick_params(colors=GREY, labelsize=8)
ax1.spines[['top','right','bottom','left']].set_visible(False)
ax1.legend(facecolor='#0f1117', edgecolor='#333344', labelcolor='white', fontsize=9)
ax1.set_xticks(hours)
ax1.set_xticklabels([f'{h:02d}' for h in hours], color=GREY, fontsize=7)

ax2 = fig.add_axes([0.68, 0.12, 0.28, 0.76])
ax2.set_facecolor(BG); ax2.axis('off')
ax2.set_title('/api/peak-hours Response', color='white', fontsize=11, fontweight='bold', pad=8)

summary_rows = [
    ('status',            'success',                     GREEN),
    ('overall_peak_hour', f'{overall_peak_hour:02d}:00', RED),
    ('peak_volume',       f'{overall_peak_vol:,.0f}',    RED),
    ('off_peak_hour',     f'{off_peak_hour:02d}:00',     GREEN),
    ('off_peak_volume',   f'{off_peak_vol:,.0f}',        GREEN),
    ('peak_threshold',    f'{threshold:,.0f}',           ORANGE),
    ('peak_windows',      str(len(windows)),             ORANGE),
    ('top_peak_1',        f'{top3_hours[0][0]:02d}:00',  RED),
    ('top_peak_2',        f'{top3_hours[1][0]:02d}:00',  ORANGE),
    ('top_peak_3',        f'{top3_hours[2][0]:02d}:00',  PURPLE),
    ('model_r2',          str(r2),                       GREEN),
]

row_h = 0.082
for i, (key, val, color) in enumerate(summary_rows):
    y_pos = 0.94 - i * row_h
    bg = mpatches.FancyBboxPatch((0.0, y_pos-0.01), 0.99, row_h-0.008,
        boxstyle='round,pad=0.004', linewidth=0,
        facecolor=color+'18', transform=ax2.transAxes, clip_on=True)
    ax2.add_patch(bg)
    ax2.text(0.04, y_pos + row_h/2 - 0.012, f'"{key}"',
             transform=ax2.transAxes, fontsize=8, color=GREY, va='center', style='italic')
    ax2.text(0.65, y_pos + row_h/2 - 0.012, val,
             transform=ax2.transAxes, fontsize=9,
             fontweight='bold', color=color, va='center')

plt.savefig(r'D:\Minorproject\card_scripts\card9_peak_hours.png',
            dpi=150, bbox_inches='tight', facecolor='#0f1117')
plt.show()
print("\n✅ Saved: card9_peak_hours.png")