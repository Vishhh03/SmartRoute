"""
SmartRoute - Real-Time Traffic Prediction
Gradio UI + Flask-SocketIO WebSocket Backend
Deployable on Hugging Face Spaces
"""

import threading
import time
import random
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from flask import Flask
from flask_socketio import SocketIO, emit
import gradio as gr

# ─────────────────────────────────────────────
# 1. Flask + SocketIO Setup (runs in background)
# ─────────────────────────────────────────────
flask_app = Flask(__name__)
flask_app.config["SECRET_KEY"] = "smartroute-secret"
socketio = SocketIO(
    flask_app,
    cors_allowed_origins="*",
    async_mode="threading",
    path="/socket.io"
)

# ─────────────────────────────────────────────
# 2. Load ML Model
# ─────────────────────────────────────────────
def load_model():
    try:
        with open("../models/gradient_boosting_model.pkl", "rb") as f:
            model = pickle.load(f)
        with open("../models/feature_names.pkl", "rb") as f:
            feature_names = pickle.load(f)
        print("✓ Model loaded successfully")
        return model, feature_names
    except Exception as e:
        print(f"⚠ Model load failed: {e}. Using dummy model.")
        return None, None

model, feature_names = load_model()

# ─────────────────────────────────────────────
# 3. Traffic Simulation Engine
# ─────────────────────────────────────────────
LOCATIONS = [
    "MG Road", "Silk Board", "Hebbal", "Electronic City",
    "Whitefield", "Koramangala", "Indiranagar", "Marathahalli",
    "JP Nagar", "Bannerghatta Road"
]

ROAD_TYPES    = ["Highway", "Arterial", "Residential", "Commercial"]
WEATHER_CONDS = ["Clear", "Cloudy", "Rainy", "Foggy"]
CONGESTION    = ["Low", "Moderate", "High", "Severe"]

live_traffic_data = []   # shared buffer for Gradio to read


def simulate_traffic_row():
    """Generate one realistic fake traffic reading."""
    hour        = datetime.now().hour
    is_peak     = 1 if hour in range(8, 10) or hour in range(17, 20) else 0
    vehicle_cnt = random.randint(200, 2000) if is_peak else random.randint(50, 800)
    density     = round(vehicle_cnt / random.uniform(10, 50), 2)

    return {
        "timestamp"        : datetime.now().strftime("%H:%M:%S"),
        "location"         : random.choice(LOCATIONS),
        "vehicle_count"    : vehicle_cnt,
        "traffic_density"  : density,
        "road_type"        : random.choice(ROAD_TYPES),
        "weather"          : random.choice(WEATHER_CONDS),
        "hour"             : hour,
        "is_peak_hour"     : is_peak,
        "speed_kmh"        : round(random.uniform(5, 80), 1),
        "signal_violations": random.randint(0, 50),
    }


def predict_congestion(row: dict) -> tuple:
    """Run model prediction or fallback heuristic."""
    if model is not None and feature_names is not None:
        try:
            df = pd.DataFrame([row])
            for col in feature_names:
                if col not in df.columns:
                    df[col] = 0
            df = df[feature_names]
            pred = model.predict(df)[0]
            if   pred < 3000: label = "Low"
            elif pred < 6000: label = "Moderate"
            elif pred < 9000: label = "High"
            else:             label = "Severe"
            return round(float(pred), 1), label
        except Exception as e:
            print(f"Prediction error: {e}")

    # heuristic fallback
    score = row["vehicle_count"] * 0.6 + row["traffic_density"] * 100
    if   score < 300: return round(score, 1), "Low"
    elif score < 600: return round(score, 1), "Moderate"
    elif score < 900: return round(score, 1), "High"
    else:             return round(score, 1), "Severe"


# ─────────────────────────────────────────────
# 4. WebSocket Events
# ─────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    print("Client connected via WebSocket")
    emit("status", {"msg": "Connected to SmartRoute WebSocket"})


@socketio.on("request_update")
def on_request_update():
    row  = simulate_traffic_row()
    pred, label = predict_congestion(row)
    row["predicted_volume"] = pred
    row["congestion_level"] = label
    emit("traffic_update", row)


def broadcast_loop():
    """Background thread — pushes traffic updates every 3s."""
    with flask_app.app_context():
        while True:
            row  = simulate_traffic_row()
            pred, label = predict_congestion(row)
            row["predicted_volume"] = pred
            row["congestion_level"] = label

            live_traffic_data.append(row)
            if len(live_traffic_data) > 50:
                live_traffic_data.pop(0)

            socketio.emit("traffic_update", row)
            time.sleep(3)


# ─────────────────────────────────────────────
# 5. Gradio Interface
# ─────────────────────────────────────────────
CONGESTION_COLOR = {
    "Low"     : "🟢",
    "Moderate": "🟡",
    "High"    : "🟠",
    "Severe"  : "🔴",
}


def get_live_feed():
    """Called by Gradio every 3 seconds via gr.Timer."""
    if not live_traffic_data:
        return (
            "⏳ Waiting for data...",
            pd.DataFrame(),
            "–", "–", "–", "–"
        )

    latest = live_traffic_data[-1]
    icon   = CONGESTION_COLOR.get(latest["congestion_level"], "⚪")

    status_md = f"""
## {icon} {latest['congestion_level']} Congestion  —  {latest['location']}
**Time:** {latest['timestamp']}  |  **Vehicles:** {latest['vehicle_count']}  |  **Speed:** {latest['speed_kmh']} km/h  |  **Weather:** {latest['weather']}
"""

    df = pd.DataFrame(live_traffic_data[-10:][::-1])[
        ["timestamp", "location", "vehicle_count", "traffic_density",
         "speed_kmh", "weather", "congestion_level"]
    ]
    df.columns = ["Time", "Location", "Vehicles", "Density", "Speed(km/h)", "Weather", "Congestion"]

    volumes  = [r["predicted_volume"] for r in live_traffic_data[-10:]]
    avg_vol  = f"{np.mean(volumes):,.0f}"
    peak_loc = max(live_traffic_data[-10:], key=lambda r: r["vehicle_count"])["location"]
    severe   = sum(1 for r in live_traffic_data if r["congestion_level"] == "Severe")
    uptime   = f"{len(live_traffic_data) * 3}s"

    return status_md, df, avg_vol, peak_loc, str(severe), uptime


def manual_predict(vehicle_count, density, speed, hour, road_type, weather):
    """Manual single prediction from user inputs."""
    row = {
        "vehicle_count"    : vehicle_count,
        "traffic_density"  : density,
        "speed_kmh"        : speed,
        "hour"             : hour,
        "road_type"        : road_type,
        "weather"          : weather,
        "is_peak_hour"     : 1 if hour in range(8, 10) or hour in range(17, 20) else 0,
        "signal_violations": 10,
        "location"         : "Manual Input",
    }
    pred, label = predict_congestion(row)
    icon = CONGESTION_COLOR.get(label, "⚪")
    return f"{icon} **{label}** — Predicted Volume: {pred:,.0f} vehicles"


# ── Build Gradio UI ──────────────────────────
custom_css = """
    .status-card { background: #1e293b; border-radius: 12px; padding: 16px; }
    .metric-card { background: #0f172a; border: 1px solid #334155;
                   border-radius: 10px; text-align: center; }
    footer { display: none !important; }
"""

custom_theme = gr.themes.Base(
    primary_hue="orange",
    secondary_hue="slate",
    neutral_hue="slate",
    font=[gr.themes.GoogleFont("JetBrains Mono"), "monospace"],
)

with gr.Blocks(title="SmartRoute - Traffic Prediction") as demo:

    gr.Markdown("""
# 🚦 SmartRoute — Real-Time Traffic Congestion Prediction
**Live WebSocket feed · Gradient Boosting Model · Bangalore Roads**
---
""")

    with gr.Tabs():

        # ── Tab 1: Live Dashboard ──────────────
        with gr.Tab("📡 Live Dashboard"):
            status_box = gr.Markdown("⏳ Connecting to live feed...")

            with gr.Row():
                avg_vol_box  = gr.Textbox(label="Avg Predicted Volume", interactive=False)
                peak_loc_box = gr.Textbox(label="Peak Location",        interactive=False)
                severe_box   = gr.Textbox(label="Severe Events",        interactive=False)
                uptime_box   = gr.Textbox(label="Feed Uptime",          interactive=False)

            live_table = gr.Dataframe(
                label="Last 10 Readings",
                interactive=False,
                wrap=True,
            )

            timer = gr.Timer(value=3)
            timer.tick(
                fn=get_live_feed,
                outputs=[status_box, live_table, avg_vol_box,
                         peak_loc_box, severe_box, uptime_box]
            )

        # ── Tab 2: Manual Prediction ───────────
        with gr.Tab("🔮 Manual Prediction"):
            gr.Markdown("### Enter traffic parameters to get a congestion prediction")

            with gr.Row():
                vc  = gr.Slider(50,  2000, value=500, label="Vehicle Count",   step=10)
                den = gr.Slider(1,   100,  value=20,  label="Traffic Density", step=0.5)

            with gr.Row():
                spd = gr.Slider(5,   120,  value=40,  label="Speed (km/h)",    step=1)
                hr  = gr.Slider(0,   23,   value=9,   label="Hour of Day",     step=1)

            with gr.Row():
                rt  = gr.Dropdown(ROAD_TYPES,    label="Road Type",         value="Arterial")
                wc  = gr.Dropdown(WEATHER_CONDS, label="Weather Condition",  value="Clear")

            predict_btn = gr.Button("🔍 Predict Congestion", variant="primary")
            result_box  = gr.Markdown("*Result will appear here...*")

            predict_btn.click(
                fn=manual_predict,
                inputs=[vc, den, spd, hr, rt, wc],
                outputs=result_box
            )

        # ── Tab 3: About ───────────────────────
        with gr.Tab("ℹ️ About"):
            gr.Markdown("""
## SmartRoute — Project Info

| Item | Detail |
|------|--------|
| **Model** | Gradient Boosting Regressor |
| **Test R²** | 0.844 |
| **MAE** | 3,142 vehicles |
| **Dataset** | Bangalore Traffic Dataset (8,936 rows) |
| **Features** | 36 engineered features |
| **Update Rate** | Every 3 seconds (WebSocket) |

### How It Works
1. Flask-SocketIO server broadcasts simulated traffic events every 3s
2. Gradient Boosting model predicts traffic volume for each event
3. Gradio UI polls the shared buffer and refreshes the dashboard
4. Manual prediction tab allows custom parameter testing

### Tech Stack
`Python` · `Gradio` · `Flask-SocketIO` · `scikit-learn` · `XGBoost` · `Pandas`
""")


# ─────────────────────────────────────────────
# 6. Launch Everything
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # Start Flask-SocketIO in background thread
    flask_thread = threading.Thread(
        target=lambda: socketio.run(
            flask_app,
            host="0.0.0.0",
            port=5001,
            allow_unsafe_werkzeug=True
        ),
        daemon=True
    )
    flask_thread.start()
    print("✓ Flask-SocketIO started on port 5001")

    # Start traffic broadcast loop
    broadcast_thread = threading.Thread(target=broadcast_loop, daemon=True)
    broadcast_thread.start()
    print("✓ Traffic broadcast loop started")

    # Launch Gradio (theme/css passed here for Gradio 6.0 compatibility)
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        theme=custom_theme,
        css=custom_css,
    )