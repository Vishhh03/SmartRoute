# ============================================================
# SmartRoute — Card 8: CO₂ Calculator + Sustainability Score
# ============================================================

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
from xgboost import XGBRegressor
import warnings
warnings.filterwarnings('ignore')

CSV_PATH = r"D:\Minorproject\data\Banglore_traffic_Dataset.csv"

CO2_PER_VEHICLE_KM = 0.21
AVG_TRIP_KM        = 8.5
EV_FRACTION        = 0.08
CO2_TREE_OFFSET_YR = 21.0

def co2_from_volume(volume):
    return volume * (1 - EV_FRACTION) * CO2_PER_VEHICLE_KM * AVG_TRIP_KM

def sustainability_score(co2_kg, volume):
    if volume <= 0: return 100
    co2_per_vehicle = co2_kg / volume
    baseline = CO2_PER_VEHICLE_KM * AVG_TRIP_KM
    return round(max(0, min(100, 100 * (1 - (co2_per_vehicle / baseline)))), 1)

def trees_needed(co2_kg):
    return round(co2_kg / (CO2_TREE_OFFSET_YR / 8760), 1)

def congestion_label(volume):
    if volume < 2000:   return 'Low',      '#1D9E75'
    elif volume < 5000: return 'Moderate', '#EF9F27'
    elif volume < 8000: return 'High',     '#E87D3E'
    else:               return 'Critical', '#E24B4A'

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

# ── 24-Hour Predictions ───────────────────────────────────────
print("\n── 24-Hour CO₂ + Sustainability Analysis ──────────────")
hours = np.arange(24)
volumes = []; co2_vals = []; sus_scores = []; tree_vals = []

for hour in hours:
    row = {col: 0.0 for col in feat_cols}
    if 'hour'        in row: row['hour']        = float(hour)
    if 'day_of_week' in row: row['day_of_week']  = 1.0
    if 'month'       in row: row['month']        = 3.0
    if 'hour_sin'    in row: row['hour_sin']     = np.sin(2*np.pi*hour/24)
    if 'hour_cos'    in row: row['hour_cos']     = np.cos(2*np.pi*hour/24)
    if 'morning_peak'   in row: row['morning_peak']   = int(7<=hour<=10)
    if 'evening_peak'   in row: row['evening_peak']   = int(16<=hour<=19)
    if 'is_weekend'     in row: row['is_weekend']     = 0
    if 'business_hours' in row: row['business_hours'] = int(9<=hour<=17)
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
    if 'speed_x_congestion'    in row: row['speed_x_congestion']    = speed * cong
    if 'speed_x_capacity'      in row: row['speed_x_capacity']      = speed * cap
    if 'capacity_x_congestion' in row: row['capacity_x_congestion'] = cap * cong
    if 'speed_category'        in row: row['speed_category']        = 0 if speed<35 else (1 if speed<60 else 2)
    X_row = pd.DataFrame([row])[feat_cols]
    vol   = max(0, float(model.predict(X_row)[0]))
    co2   = co2_from_volume(vol)
    sus   = sustainability_score(co2, vol)
    trees = trees_needed(co2)
    volumes.append(vol); co2_vals.append(co2)
    sus_scores.append(sus); tree_vals.append(trees)
    lbl, _ = congestion_label(vol)
    print(f"  Hour {hour:02d}:00  Volume={vol:7.0f}  CO₂={co2:7.1f}kg  SusScore={sus:5.1f}  [{lbl}]")

total_co2_day   = round(sum(co2_vals), 1)
avg_sus         = round(np.mean(sus_scores), 1)
peak_hour_co2   = hours[np.argmax(co2_vals)]
total_trees_day = round(sum(tree_vals), 0)

print(f"\n  📊 Daily Total CO₂    : {total_co2_day:,.1f} kg")
print(f"  🌱 Avg Sustainability  : {avg_sus}/100")
print(f"  🔴 Peak CO₂ Hour      : {peak_hour_co2:02d}:00")
print(f"  🌳 Trees to offset    : {total_trees_day:,.0f}")

peak_vol  = volumes[peak_hour_co2]
peak_co2  = co2_vals[peak_hour_co2]
peak_sus  = sus_scores[peak_hour_co2]
peak_tree = tree_vals[peak_hour_co2]
lbl, _    = congestion_label(peak_vol)
print(f"\n── Example /api/predict Response ──────────────────────")
print(f'  {{"status": "success", "prediction": {round(peak_vol,2)},')
print(f'   "congestion_label": "{lbl}",')
print(f'   "sustainability": {{')
print(f'     "co2_kg_per_hour": {round(peak_co2,2)},')
print(f'     "sustainability_score": {peak_sus},')
print(f'     "trees_to_offset": {peak_tree}}}}}')

# ── FIGURE ────────────────────────────────────────────────────
fig = plt.figure(figsize=(20, 12), facecolor='#0f1117')
fig.suptitle(
    f'SmartRoute — Card 8: CO₂ Calculator + Sustainability Score\n'
    f'Daily CO₂={total_co2_day:,.0f}kg  |  Avg Score={avg_sus}/100  |  Peak Hour={peak_hour_co2:02d}:00  |  Trees={total_trees_day:,.0f}',
    fontsize=14, fontweight='bold', color='white', y=0.98)

GREEN  = '#1D9E75'; PURPLE = '#534AB7'; ORANGE = '#EF9F27'
RED    = '#E24B4A'; GREY   = '#aaaaaa'; BG     = '#1a1d27'

hour_colors = [RED if (7<=h<=10 or 16<=h<=19) else (ORANGE if 9<=h<=17 else PURPLE) for h in hours]

ax1 = fig.add_axes([0.05, 0.55, 0.42, 0.36])
ax1.set_facecolor(BG)
ax1.bar(hours, volumes, color=hour_colors, edgecolor='none', width=0.7)
ax1.set_xlabel('Hour of Day', color=GREY, fontsize=9)
ax1.set_ylabel('Traffic Volume', color=GREY, fontsize=9)
ax1.set_title('24-Hour Traffic Volume', color='white', fontsize=11, fontweight='bold', pad=6)
ax1.tick_params(colors=GREY, labelsize=8)
ax1.spines[['top','right','bottom','left']].set_visible(False)
ax1.set_xticks(hours[::2])

ax2 = fig.add_axes([0.55, 0.55, 0.42, 0.36])
ax2.set_facecolor(BG)
ax2.fill_between(hours, co2_vals, alpha=0.35, color=RED)
ax2.plot(hours, co2_vals, color=RED, linewidth=2)
ax2.scatter([peak_hour_co2], [co2_vals[peak_hour_co2]],
            color=ORANGE, s=80, zorder=5, label=f'Peak {peak_hour_co2:02d}:00')
ax2.set_xlabel('Hour of Day', color=GREY, fontsize=9)
ax2.set_ylabel('CO₂ (kg/hour)', color=GREY, fontsize=9)
ax2.set_title('Hourly CO₂ Emissions', color='white', fontsize=11, fontweight='bold', pad=6)
ax2.tick_params(colors=GREY, labelsize=8)
ax2.spines[['top','right','bottom','left']].set_visible(False)
ax2.legend(facecolor='#0f1117', edgecolor='#333344', labelcolor='white', fontsize=8)
ax2.set_xticks(hours[::2])

ax3 = fig.add_axes([0.05, 0.08, 0.42, 0.36])
ax3.set_facecolor(BG)
score_colors = [GREEN if s>=70 else (ORANGE if s>=40 else RED) for s in sus_scores]
ax3.bar(hours, sus_scores, color=score_colors, edgecolor='none', width=0.7)
ax3.axhline(y=70, color=GREEN, linewidth=1, linestyle='--', alpha=0.6, label='Good threshold (70)')
ax3.set_xlabel('Hour of Day', color=GREY, fontsize=9)
ax3.set_ylabel('Score (0-100)', color=GREY, fontsize=9)
ax3.set_title('Sustainability Score by Hour', color='white', fontsize=11, fontweight='bold', pad=6)
ax3.tick_params(colors=GREY, labelsize=8)
ax3.spines[['top','right','bottom','left']].set_visible(False)
ax3.legend(facecolor='#0f1117', edgecolor='#333344', labelcolor='white', fontsize=8)
ax3.set_xticks(hours[::2]); ax3.set_ylim(0, 105)

ax4 = fig.add_axes([0.55, 0.08, 0.42, 0.36])
ax4.set_facecolor(BG); ax4.axis('off')
ax4.set_title('CO₂ & Sustainability Summary', color='white', fontsize=11, fontweight='bold', pad=6)

summary = [
    ('Daily Total CO₂',    f'{total_co2_day:,.1f} kg',   RED),
    ('Avg Sustainability',  f'{avg_sus} / 100',           GREEN),
    ('Peak CO₂ Hour',       f'{peak_hour_co2:02d}:00',   ORANGE),
    ('Peak CO₂ Value',      f'{round(peak_co2,1):,} kg', RED),
    ('Trees to Offset/Day', f'{total_trees_day:,.0f}',   GREEN),
    ('EV Fraction',         f'{EV_FRACTION*100:.0f}%',   PURPLE),
    ('Avg Trip Length',     f'{AVG_TRIP_KM} km',         PURPLE),
    ('CO₂/Vehicle/Trip',    f'{CO2_PER_VEHICLE_KM*AVG_TRIP_KM:.2f} kg', GREY),
    ('Model R²',            str(r2),                     GREEN),
]
row_h = 0.1
for i, (label, value, color) in enumerate(summary):
    y_pos = 0.93 - i * row_h
    bg = mpatches.FancyBboxPatch((0.0, y_pos-0.01), 0.99, row_h-0.008,
        boxstyle='round,pad=0.004', linewidth=0,
        facecolor=color+'18', transform=ax4.transAxes, clip_on=True)
    ax4.add_patch(bg)
    ax4.text(0.04, y_pos + row_h/2 - 0.012, label,
             transform=ax4.transAxes, fontsize=9, color=GREY, va='center')
    ax4.text(0.70, y_pos + row_h/2 - 0.012, value,
             transform=ax4.transAxes, fontsize=10,
             fontweight='bold', color=color, va='center')

plt.savefig(r'D:\Minorproject\card_scripts\card8_co2_calculator.png',
            dpi=150, bbox_inches='tight', facecolor='#0f1117')
plt.show()
print("\n✅ Saved: card8_co2_calculator.png")