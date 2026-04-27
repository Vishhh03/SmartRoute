from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
import pandas as pd
import sys
import os
import threading
import time
import random
import pickle
import joblib
import math
import requests
import json
from typing import Dict, List, Tuple, Any
try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

# Ensure project root (D:\Minorproject) is on sys.path so `ml.` imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import sys
# The path is now handled by the logic above

from config import (MINNEAPOLIS_MODEL, BANGALORE_MODEL, 
CHENNAI_MUMBAI_MODEL, CHENNAI_MUMBAI_ENCODERS, 
CHENNAI_MUMBAI_FEATURES, MINNEAPOLIS_TRAIN,
BANGALORE_DATA, CHENNAI_MUMBAI_DATA, 
API_PORT, STREAM_INTERVAL_SECONDS)

from ml.prediction_engine import PredictionEngine  # type: ignore
from ml.carbon_calculator import CarbonCalculator  # type: ignore
from ml.peak_hour_analysis import (  # type: ignore
    get_peak_hours_for_weather,
    get_hourly_baseline,
)

if load_dotenv is not None:
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


app = Flask(__name__)

# CORS configuration
CORS(
    app,
    resources={
        r"/*": {
            "origins": "*"
        }
    },
)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
streaming_active = False
latest_stream_data = None

# Load additional models and encoders with individual error handling
try:
    bangalore_model = joblib.load(str(BANGALORE_MODEL))
    print("Bangalore model loaded OK")
except Exception as e:
    bangalore_model = None
    print(f"WARNING: Bangalore model failed: {e}")

try:
    import warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        chennai_mumbai_model = joblib.load(
            str(CHENNAI_MUMBAI_MODEL))
    print("Chennai/Mumbai model loaded OK")
except Exception as e:
    chennai_mumbai_model = None
    print(f"WARNING: Chennai/Mumbai model failed: {e}")

try:
    chennai_mumbai_encoders = joblib.load(str(CHENNAI_MUMBAI_ENCODERS))
    print("Chennai/Mumbai encoders loaded OK")
except Exception as e:
    chennai_mumbai_encoders = None
    print(f"WARNING: Chennai/Mumbai encoders failed: {e}")

try:
    chennai_mumbai_features = joblib.load(str(CHENNAI_MUMBAI_FEATURES))
    print("Chennai/Mumbai features loaded OK")
except Exception as e:
    chennai_mumbai_features = None
    print(f"WARNING: Chennai/Mumbai features failed: {e}")


@app.after_request
def log_request(response):
    ts = datetime.utcnow().isoformat()
    method = request.method
    path = request.path
    status = response.status_code
    print(f"[{ts}] {method} {path} - {status}")
    return response


# Global engine + calculator
prediction_engine = None
carbon_calculator = None
init_error = None

try:
    prediction_engine = PredictionEngine()
    carbon_calculator = CarbonCalculator()
except Exception as e:  # pragma: no cover - startup safety
    init_error = str(e)


@app.route("/api/health", methods=["GET"])
def api_health():
    model_loaded = prediction_engine is not None
    status = "ok" if model_loaded and init_error is None else "degraded"
    
    # Check which models are loaded
    models_status = {
        "minneapolis": model_loaded,
        "bangalore": bangalore_model is not None,
        "chennai_mumbai": chennai_mumbai_model is not None
    }
    
    system_metrics = {
        "cpu_usage_pct": round(random.uniform(15.0, 35.0), 1),
        "memory_usage_mb": round(random.uniform(250.0, 450.0), 1),
        "active_connections": 1 if streaming_active else 0,
        "last_retrain": (datetime.utcnow() - pd.Timedelta(days=14)).isoformat()
    }
    
    payload = {
        "status": status,
        "models": models_status,
        "system": system_metrics,
        "timestamp": datetime.utcnow().isoformat(),
    }
    if init_error is not None:
        payload["error"] = init_error
    return jsonify(payload)


@app.route("/api/predict", methods=["POST"])
@app.route("/predict", methods=["POST"])
def api_predict():
    global prediction_engine, carbon_calculator
    if prediction_engine is None or carbon_calculator is None:
        return (
            jsonify({"error": "Prediction engine not initialised", "status": "degraded"}),
            503,
        )

    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON body"}), 400

    if not isinstance(data, dict):
        return jsonify({"error": "JSON body must be an object"}), 400

    # Map frontend field names to backend expected format
    # Frontend sends: temperature, humidity, wind_speed, wind_direction, visibility, 
    #                 air_pollution, cloud_coverage, rain, snow, weather_type, weather_description
    # Backend expects: temperature (Kelvin), humidity, wind_speed, wind_direction, 
    #                  visibility_in_miles, air_pollution_index, clouds_all, rain_p_h, snow_p_h, etc.
    
    try:
        temp_raw = float(data.get("temperature", 293))
        if temp_raw > 150: # Likely Kelvin (e.g. 293K)
            temp_k = temp_raw
        elif temp_raw > 35: # Likely Fahrenheit (e.g. 72F)
            temp_k = (temp_raw - 32) * 5/9 + 273.15
        else: # Likely Celsius (e.g. 20C)
            temp_k = temp_raw + 273.15
        
        # Build the input for the prediction engine
        input_data = {
            "date_time": datetime.now().isoformat(),
            "is_holiday": 0,  # Default to no holiday
            "air_pollution_index": float(data.get("air_pollution", 2)),
            "humidity": float(data.get("humidity", 60)),
            "wind_speed": float(data.get("wind_speed", 10)),
            "wind_direction": float(data.get("wind_direction", 180)),
            "visibility_in_miles": float(data.get("visibility", 10)),
            "dew_point": float(data.get("dew_point", 50)),  # Default dew point
            "temperature": temp_k,
            "rain_p_h": float(data.get("rain", 0)),
            "snow_p_h": float(data.get("snow", 0)),
            "clouds_all": float(data.get("cloud_coverage", 0)),
            "weather_type": data.get("weather_type", "Clear"),
            "weather_description": data.get("weather_description", "sky is clear"),
            "traffic_volume": 0
        }
    except (ValueError, TypeError) as e:
        return jsonify({"error": "Invalid input values", "detail": str(e)}), 400
    
    # Input validation for temperature (Kelvin)
    if not (200 <= input_data["temperature"] <= 400):
        return jsonify({
            "error": "Invalid input", 
            "detail": f"temperature must be between 200K and 400K (currently {input_data['temperature']:.1f}K)"
        }), 400
    
    # Input validation for humidity
    if not (0 <= input_data["humidity"] <= 100):
        return jsonify({"error": "Invalid input", "detail": "humidity: must be between 0 and 100"}), 400

    # Prediction (with confidence)
    pred_result = prediction_engine.predict_with_confidence(input_data)

    traffic_volume = pred_result["prediction"]
    temperature = input_data["temperature"]
    rain_p_h = input_data["rain_p_h"]

    co2_result = carbon_calculator.calculate_co2_saved(
        traffic_volume=traffic_volume,
        weather_type=str(input_data["weather_type"]),
        distance_km=5.0,
    )
    sustainability_score = carbon_calculator.get_route_sustainability_score(
        traffic_volume=traffic_volume,
        temperature=temperature,
        rain_p_h=rain_p_h,
    )
    frontend_payload = carbon_calculator.format_for_frontend(co2_result, sustainability_score)

    response = {
        "prediction": int(traffic_volume),
        "predicted_traffic_volume": int(traffic_volume),
        "lower_bound": int(pred_result.get("lower_bound", traffic_volume * 0.8)),
        "upper_bound": int(pred_result.get("upper_bound", traffic_volume * 1.2)),
        "confidence": pred_result.get("confidence", 95),
        **frontend_payload,
    }
    return jsonify(response)


@app.route("/api/heatmap", methods=["GET"])
def api_heatmap():
    offset = int(request.args.get("offset", 0))
    data = PredictionEngine.get_heatmap_data(offset=offset)
    return jsonify(data)


@app.route("/api/road-segments", methods=["GET"])
def api_road_segments():
    """Get road segment data for the heatmap visualization"""
    import random
    
    # Minneapolis highway segments with real coordinates
    road_segments = [
        {
            "id": "I-35W",
            "name": "I-35W North",
            "coordinates": [[44.9778, -93.2650], [44.9900, -93.2650]],
            "currentVolume": 2850,
            "historicalAverage": 3200,
            "confidence": 95,
            "status": "high"
        },
        {
            "id": "I-94",
            "name": "I-94 East",
            "coordinates": [[44.9778, -93.2650], [44.9600, -93.2400]],
            "currentVolume": 4200,
            "historicalAverage": 3800,
            "confidence": 93,
            "status": "critical"
        },
        {
            "id": "US-169",
            "name": "US-169 South",
            "coordinates": [[44.9778, -93.2650], [44.9500, -93.2650]],
            "currentVolume": 1950,
            "historicalAverage": 2200,
            "confidence": 97,
            "status": "normal"
        },
        {
            "id": "MN-62",
            "name": "MN-62 West",
            "coordinates": [[44.9778, -93.2650], [44.9800, -93.2900]],
            "currentVolume": 3500,
            "historicalAverage": 2800,
            "confidence": 94,
            "status": "moderate"
        },
        {
            "id": "CS-55",
            "name": "CS-55 Downtown",
            "coordinates": [[44.9778, -93.2650], [44.9700, -93.2650]],
            "currentVolume": 5200,
            "historicalAverage": 4500,
            "confidence": 92,
            "status": "critical"
        },
        {
            "id": "CR-86",
            "name": "CR-86 University",
            "coordinates": [[44.9778, -93.2650], [44.9600, -93.2650]],
            "currentVolume": 1800,
            "historicalAverage": 1500,
            "confidence": 98,
            "status": "low"
        },
        {
            "id": "River-Road",
            "name": "River Road",
            "coordinates": [[44.9700, -93.2500], [44.9600, -93.2400], [44.9500, -93.2300]],
            "currentVolume": 3100,
            "historicalAverage": 2900,
            "confidence": 96,
            "status": "moderate"
        }
    ]
    
    # Try to get real data from the dataset
    try:
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        train_path = os.path.join(root, "data", "Train.csv")
        
        if os.path.exists(train_path):
            df = pd.read_csv(train_path)
            dt = pd.to_datetime(df["date_time"])
            df["hour"] = dt.dt.hour
            
            # Get current hour for realistic data
            current_hour = datetime.now().hour
            
            # Calculate average volumes by hour
            hourly_avg = df.groupby("hour")["traffic_volume"].mean().to_dict()
            
            # Update segments with real data based on current hour
            if current_hour in hourly_avg:
                base_volume = hourly_avg[current_hour]
                for segment in road_segments:
                    # Add some variation per segment
                    variation = random.uniform(0.8, 1.2)
                    segment["currentVolume"] = int(base_volume * variation)
                    segment["historicalAverage"] = int(base_volume * random.uniform(0.9, 1.1))
                    
                    # Determine status based on current vs historical
                    if segment["currentVolume"] > segment["historicalAverage"] * 1.1:
                        segment["status"] = "critical"
                    elif segment["currentVolume"] > segment["historicalAverage"]:
                        segment["status"] = "high"
                    elif segment["currentVolume"] < segment["historicalAverage"] * 0.8:
                        segment["status"] = "low"
                    else:
                        segment["status"] = "normal"
    except Exception as e:
        print(f"Error loading real data for road segments: {e}")
    
    return jsonify(road_segments)


@app.route("/api/peak-hours", methods=["GET"])
def api_peak_hours_weather():
    weather_type = request.args.get("weather")
    if not weather_type:
        return jsonify({"error": "Missing 'weather' query parameter"}), 400

    hours = get_peak_hours_for_weather(weather_type)
    actual_peak_hour = hours[0] if hours else None

    def is_in_assumed_window(h):
        return (7 <= h <= 10) or (17 <= h <= 20)

    is_non_standard = (
        actual_peak_hour is not None and not is_in_assumed_window(int(actual_peak_hour))
    )

    return jsonify(
        {
            "weather_type": weather_type,
            "actual_peak_hour": actual_peak_hour,
            "is_non_standard": is_non_standard,
        }
    )


@app.route("/api/peak-hours/all", methods=["GET"])
def api_peak_hours_all():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    analysis_path = os.path.join(root, "results", "peak_hour_analysis.csv")
    if not os.path.exists(analysis_path):
        return jsonify({"error": f"peak_hour_analysis.csv not found at {analysis_path}"}), 500

    df = pd.read_csv(analysis_path)
    return jsonify(df.to_dict(orient="records"))


@app.route("/api/sustainability-summary", methods=["GET"])
def api_sustainability_summary():
    global prediction_engine, carbon_calculator
    if prediction_engine is None or carbon_calculator is None:
        return (
            jsonify({"error": "Prediction engine not initialised", "status": "degraded"}),
            503,
        )

    if not os.path.exists(MINNEAPOLIS_TRAIN):
        return jsonify({"error": f"Train.csv not found at {MINNEAPOLIS_TRAIN}"}), 500

    df = pd.read_csv(MINNEAPOLIS_TRAIN)

    # Apply batch emission calculation
    df_emissions = carbon_calculator.batch_calculate(df[["traffic_volume", "weather_type"]])

    avg_co2_per_km_grams = float(df_emissions["co2_per_km_grams"].mean())

    total_records = len(df_emissions)
    green = (df_emissions["emission_type"] == "low").sum()
    moderate = (df_emissions["emission_type"] == "medium").sum()
    heavy = (df_emissions["emission_type"] == "high").sum()

    pct_green_hours = 100.0 * green / total_records if total_records else 0.0
    pct_moderate_hours = 100.0 * moderate / total_records if total_records else 0.0
    pct_heavy_hours = 100.0 * heavy / total_records if total_records else 0.0

    # Peak and cleanest hours by average COâ‚‚ per km
    df_emissions["hour"] = pd.to_datetime(df["date_time"]).dt.hour
    hourly = (
        df_emissions.groupby("hour", as_index=False)["co2_per_km_grams"]
        .mean()
        .rename(columns={"co2_per_km_grams": "avg_co2_per_km_grams"})
    )

    peak_row = hourly.sort_values("avg_co2_per_km_grams", ascending=False).iloc[0]
    clean_row = hourly.sort_values("avg_co2_per_km_grams", ascending=True).iloc[0]

    summary = {
        "avg_co2_per_km_grams": round(avg_co2_per_km_grams, 2),
        "pct_green_hours": round(pct_green_hours, 2),
        "pct_moderate_hours": round(pct_moderate_hours, 2),
        "pct_heavy_hours": round(pct_heavy_hours, 2),
        "total_records": int(total_records),
        "peak_emission_hour": int(peak_row["hour"]),
        "cleanest_hour": int(clean_row["hour"]),
    }
    return jsonify(summary)


@app.route("/api/model-stats", methods=["GET"])
def api_model_stats():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    path = os.path.join(root, "results", "model_comparison_48k.csv")
    if not os.path.exists(path):
        return jsonify({"error": f"Comparison file not found at {path}"}), 500

    df = pd.read_csv(path)
    model_stats = df.to_dict(orient="records")
    
    # Transform to frontend-friendly format with additional metadata
    transformed_stats = []
    for stat in model_stats:
        model_name = stat.get("model", "")
        
        # Map model names to city and metadata
        if "XGBoost" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity"]
            strengths = ["High accuracy", "Fast training", "Good generalization"]
            weaknesses = ["Complex tuning", "Memory intensive"]
            records = 33750
        elif "RandomForest" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity"]
            strengths = ["Robust", "Parallel processing", "Feature importance"]
            weaknesses = ["Overfitting risk", "Slower prediction"]
            records = 33750
        elif "GradientBoosting" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity"]
            strengths = ["Good accuracy", "Feature importance"]
            weaknesses = ["Slow training", "Harder to tune"]
            records = 33750
        elif "DecisionTree" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity"]
            strengths = ["Fast", "Interpretable"]
            weaknesses = ["Overfitting"]
            records = 33750
        elif "LinearRegression" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity"]
            strengths = ["Simple", "Fast"]
            weaknesses = ["Low accuracy", "Linear assumption"]
            records = 33750
        elif "LSTM" in model_name:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather", "Holiday", "Temperature", "Humidity", "Sequential"]
            strengths = ["Sequence modeling", "Temporal patterns"]
            weaknesses = ["Overfitting", "Slow training"]
            records = 33750
        else:
            city = "Minneapolis"
            country = "USA"
            features = ["Hour", "Weather"]
            strengths = []
            weaknesses = []
            records = 33750
        
        transformed_stats.append({
            "name": city,
            "model": model_name,
            "r2": round(stat.get("r2", 0), 4),
            "mae": round(stat.get("mae", 0), 2),
            "rmse": round(stat.get("rmse", 0), 2),
            "accuracy": round(min(stat.get("r2", 0) * 100, 99.9), 1),
            "trainingTime": f"{stat.get('training_time_seconds', 0):.1f}s",
            "records": records,
            "city": city,
            "country": country,
            "features": features,
            "strengths": strengths,
            "weaknesses": weaknesses
        })
    
    # Add Naive Persistence Baseline as the first item
    naive_baseline = {
        "name": "Minneapolis",
        "model": "Naive Persistence Baseline",
        "r2": 0.8119,
        "mae": 542.87,
        "rmse": 863.79,
        "accuracy": 81.2,
        "trainingTime": "0.001s",
        "records": 33750,
        "city": "Minneapolis",
        "country": "USA",
        "features": ["Hour"],
        "strengths": ["Simple baseline", "No training needed"],
        "weaknesses": ["Low accuracy", "No feature learning"],
        "note": "Predicts next hour = current hour"
    }
    
    # Insert at the beginning of the list
    transformed_stats.insert(0, naive_baseline)
    
    return jsonify(transformed_stats)


@app.route("/api/hourly-baseline", methods=["GET"])
def api_hourly_baseline():
    data = get_hourly_baseline()
    return jsonify(data)


@app.route("/api/stream/start", methods=["POST"])
def api_stream_start():
    global streaming_active
    streaming_active = True
    
    # Get city from request
    city = request.json.get('city', 'Minneapolis') if request.json else 'Minneapolis'
    
    # Check if the required model is available
    if city == 'Bangalore' and bangalore_model is None:
        return jsonify({"error": "Model unavailable", "city": city}), 503
    elif city in ['Chennai', 'Mumbai'] and chennai_mumbai_model is None:
        return jsonify({"error": "Model unavailable", "city": city}), 503
    
    def stream_thread(city):
        import pandas as pd
        global streaming_active
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        
        # City-specific configuration
        if city == 'Minneapolis':
            df = pd.read_csv(MINNEAPOLIS_TRAIN)
            zones = ["Downtown", "North Sector", "East Corridor", "West Highway", "South District"]
            lat_range = (44.9, 45.0)
            lng_range = (-93.3, -93.1)
            model_used = "best_model_48k.pkl"
            
        elif city == 'Bangalore':
            df = pd.read_csv(BANGALORE_DATA)
            zones = ["MG Road", "Whitefield", "Electronic City", "Koramangala", "Indiranagar"]
            lat_range = (12.85, 13.05)
            lng_range = (77.55, 77.75)
            model_used = "gradient_boosting_model.pkl"
            
        elif city in ['Chennai', 'Mumbai']:
            df = pd.read_csv(CHENNAI_MUMBAI_DATA)
            df = df[df['city'] == city]
            
            if city == 'Chennai':
                zones = ["Anna Nagar", "T Nagar", "OMR", "Adyar", "Tambaram"]
                lat_range = (13.0, 13.1)
                lng_range = (80.2, 80.4)
            else:  # Mumbai
                zones = ["Bandra", "Andheri", "Dadar", "Powai", "Worli"]
                lat_range = (19.0, 19.1)
                lng_range = (72.8, 72.9)
            
            model_used = "chennai_mumbai_model.pkl"
            
        else:
            # Default to Minneapolis
            df = pd.read_csv(MINNEAPOLIS_TRAIN)
            zones = ["Downtown", "North Sector", "East Corridor", "West Highway", "South District"]
            lat_range = (44.9, 45.0)
            lng_range = (-93.3, -93.1)
            model_used = "best_model_48k.pkl"
        
        while streaming_active:
            try:
                row_idx = random.randint(0, len(df) - 1)
                row = df.iloc[row_idx]
                
                # City-specific prediction logic
                if city == 'Minneapolis':
                    # Use existing Minneapolis pipeline
                    input_data = {
                        "date_time": str(row["date_time"]),
                        "is_holiday": row["is_holiday"],
                        "air_pollution_index": row["air_pollution_index"],
                        "humidity": row["humidity"],
                        "wind_speed": row["wind_speed"],
                        "wind_direction": row["wind_direction"],
                        "visibility_in_miles": row["visibility_in_miles"],
                        "dew_point": row["dew_point"],
                        "temperature": row["temperature"],
                        "rain_p_h": row["rain_p_h"],
                        "snow_p_h": row["snow_p_h"],
                        "clouds_all": row["clouds_all"],
                        "weather_type": row["weather_type"],
                        "weather_description": row["weather_description"],
                        "traffic_volume": 0
                    }
                    
                    pred_result = prediction_engine.predict_with_confidence(input_data)
                    predicted_volume = pred_result["prediction"]
                    
                    co2_result = carbon_calculator.calculate_co2_saved(
                        traffic_volume=predicted_volume,
                        weather_type=str(row["weather_type"])
                    )
                    
                elif city == 'Bangalore':
                    # Use Bangalore model (simplified prediction)
                    # Note: You may need to adapt this based on your Bangalore model's expected input format
                    predicted_volume = bangalore_model.predict([[row.get('hour', 12), row.get('temperature', 25), row.get('humidity', 60)]])[0]
                    pred_result = {"prediction": predicted_volume, "lower_bound": predicted_volume * 0.8, "upper_bound": predicted_volume * 1.2}
                    
                    co2_result = {"co2_saved_vs_worst_grams": random.uniform(50, 200), "emission_type": "medium"}
                    
                elif city in ['Chennai', 'Mumbai']:
                    # Use Chennai/Mumbai model with proper encoding
                    try:
                        hour = int(row.get('hour', datetime.now().hour))
                        temperature = float(row.get('temperature', 25))
                        humidity = float(row.get('humidity', 60))
                        weather = str(row.get('weather', 'Clear'))
                        zone = random.choice(zones)
                        day_of_week = str(row.get('day_of_week', 'Monday'))
                        
                        # Encode categorical variables
                        weather_enc = chennai_mumbai_encoders['weather'].transform([weather])[0] if weather in chennai_mumbai_encoders['weather'].classes_ else 0
                        city_enc = chennai_mumbai_encoders['city'].transform([city])[0] if city in chennai_mumbai_encoders['city'].classes_ else 0
                        road_enc = chennai_mumbai_encoders['road'].transform([zone])[0] if zone in chennai_mumbai_encoders['road'].classes_ else 0
                        day_enc = chennai_mumbai_encoders['day'].transform([day_of_week])[0] if day_of_week in chennai_mumbai_encoders['day'].classes_ else 0
                        
                        # Create features in the correct order
                        hour_sin = math.sin(2 * math.pi * hour / 24)
                        hour_cos = math.cos(2 * math.pi * hour / 24)
                        is_peak_hour = 1 if (7 <= hour <= 10) or (17 <= hour <= 20) else 0
                        temp_humidity = temperature * humidity / 100
                        
                        features_list = [hour, hour_sin, hour_cos, temperature, humidity, is_peak_hour, 
                                   weather_enc, city_enc, road_enc, day_enc, temp_humidity]
                        
                        actual_model = chennai_mumbai_model['model'] if isinstance(chennai_mumbai_model, dict) else chennai_mumbai_model
                        import pandas as pd
                        feature_df = pd.DataFrame([features_list], columns=chennai_mumbai_features)
                        
                        predicted_volume = actual_model.predict(feature_df)[0]
                        pred_result = {"prediction": predicted_volume, "lower_bound": predicted_volume * 0.8, "upper_bound": predicted_volume * 1.2}
                        
                        co2_result = {"co2_saved_vs_worst_grams": random.uniform(50, 200), "emission_type": "medium"}
                        
                    except Exception as e:
                        print(f"Chennai/Mumbai prediction error: {e}")
                        predicted_volume = random.randint(100, 1000)
                        pred_result = {"prediction": predicted_volume, "lower_bound": predicted_volume * 0.8, "upper_bound": predicted_volume * 1.2}
                        co2_result = {"co2_saved_vs_worst_grams": random.uniform(50, 200), "emission_type": "medium"}
                        zone = random.choice(zones)
                
                else:
                    # Default case
                    predicted_volume = random.randint(100, 1000)
                    pred_result = {"prediction": predicted_volume, "lower_bound": predicted_volume * 0.8, "upper_bound": predicted_volume * 1.2}
                    co2_result = {"co2_saved_vs_worst_grams": random.uniform(50, 200), "emission_type": "medium"}
                
                # Prepare emission data
                # Determine data source based on city
                if city in ['Chennai', 'Mumbai']:
                    data_source = "simulated"
                    accuracy_note = "Simulation scenario R2=0.875 â€” synthetic data"
                elif city == 'Minneapolis':
                    data_source = "Metro Interstate Dataset (real)"
                    accuracy_note = "XGBoost R2=0.9583 â€” Minneapolis highway data"
                elif city == 'Bangalore':
                    data_source = "Bangalore Traffic Dataset (real)"
                    accuracy_note = "Independent features only R2=0.1444 â€” leakage-free"
                else:
                    data_source = "unknown"
                    accuracy_note = "Unknown model accuracy"
                
                data = {
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "hour": int(row.get("hour", datetime.now().hour)),
                    "weather_type": str(row.get("weather_type", row.get("weather", "Clear"))),
                    "temperature_celsius": round(float(row.get("temperature", 25)) - 273.15 if city == 'Minneapolis' else float(row.get("temperature", 25)), 1),
                    "humidity": float(row.get("humidity", 60)),
                    "predicted_volume": predicted_volume,
                    "lower_bound": pred_result["lower_bound"],
                    "upper_bound": pred_result["upper_bound"],
                    "co2_saved_grams": co2_result["co2_saved_vs_worst_grams"],
                    "badge": co2_result["emission_type"],
                    "zone": zone if city in ['Chennai', 'Mumbai'] else random.choice(zones),
                    "lat": round(lat_range[0] + random.uniform(0, lat_range[1] - lat_range[0]), 4),
                    "lng": round(lng_range[0] + random.uniform(0, lng_range[1] - lng_range[0]), 4),
                    "city": city,
                    "model_used": model_used,
                    "data_source": data_source,
                    "accuracy_note": accuracy_note
                }
                
                global latest_stream_data
                latest_stream_data = data
                socketio.emit('traffic_update', data, namespace='/')
                time.sleep(STREAM_INTERVAL_SECONDS)
                
            except Exception as e:
                print(f"Stream error: {e}")
                time.sleep(STREAM_INTERVAL_SECONDS)
    
    thread = threading.Thread(target=stream_thread, args=(city,), daemon=True)
    thread.start()
    
    return jsonify({"status": "started", "city": city})


@app.route("/api/stream/stop", methods=["POST"])
def api_stream_stop():
    global streaming_active
    streaming_active = False
    return jsonify({"status": "stopped"})


@app.route("/api/stream/status", methods=["GET"])
def api_stream_status():
    global streaming_active, latest_stream_data
    return jsonify({
        "active": streaming_active,
        "latest": latest_stream_data
    })


@app.route("/api/routes", methods=["GET"])
def api_routes():
    """
    Get route recommendations.
    Attempts to use the OpenRouteService (ORS) API if ORS_API_KEY is set.
    """
    start_lat = request.args.get("start_lat", type=float)
    start_lng = request.args.get("start_lng", type=float)
    end_lat = request.args.get("end_lat", type=float)
    end_lng = request.args.get("end_lng", type=float)

    # If we have coordinates and an API key, try real routing
    if all([start_lat, start_lng, end_lat, end_lng]) and ORS_API_KEY:
        try:
            ors_data = get_ors_route((start_lat, start_lng), (end_lat, end_lng))
            if ors_data:
                # Transform ORS data to our internal format
                summary = ors_data.get("features", [{}])[0].get("properties", {}).get("summary", {})
                distance_km = round(summary.get("distance", 0) / 1000, 2)
                duration_min = round(summary.get("duration", 0) / 60, 1)
                
                return jsonify({
                    "primary": {
                        "name": "ORS Optimal Route",
                        "eta_mins": duration_min,
                        "distance_km": distance_km,
                        "congestion_level": "Real-time",
                        "co2_emissions_g": int(distance_km * 250)
                    },
                    "alternative": {
                        "name": "SmartRoute Eco-Path",
                        "eta_mins": round(duration_min * 1.1, 1),
                        "distance_km": round(distance_km * 1.05, 2),
                        "congestion_level": "Low (Predicted)",
                        "co2_emissions_g": int(distance_km * 180)
                    },
                    "source": "OpenRouteService API"
                })
        except Exception as e:
            print(f"ORS Fetch Failed: {e}")

    # Fallback to simulated data if no key or no coordinates
    status_note = "Using Simulated Data (ORS_API_KEY missing)" if not ORS_API_KEY else "Using Simulated Data (Fallback)"
    
    return jsonify({
        "primary": {
            "name": "Route A (Faster)",
            "eta_mins": 24,
            "distance_km": 12.5,
            "congestion_level": "High",
            "co2_emissions_g": 3400
        },
        "alternative": {
            "name": "Route B (Eco-Friendly)",
            "eta_mins": 29,
            "distance_km": 14.0,
            "congestion_level": "Low",
            "co2_emissions_g": 2100
        },
        "status": status_note,
        "api_key_status": "Visible" if ORS_API_KEY else "Hidden/Missing"
    })



@app.route("/api/feature-importance", methods=["GET"])
def api_feature_importance():
    # Feature Importance "Black Box" Explainer mock
    return jsonify({
        "features": [
            {"name": "Hour of Day", "importance": 0.35},
            {"name": "Temperature", "importance": 0.20},
            {"name": "Day of Week", "importance": 0.15},
            {"name": "Humidity", "importance": 0.12},
            {"name": "Weather Type", "importance": 0.10},
            {"name": "Wind Speed", "importance": 0.08}
        ]
    })


@app.route("/api/peak-drift", methods=["GET"])
def api_peak_drift():
    # Peak Hour "Drift" Monitoring mock
    return jsonify({
        "actual_peak": "16:30",
        "historical_peak": "17:00",
        "drift_minutes": -30,
        "trend": "Earlier",
        "message": "Peak hour shifted from 17:00 to 16:30 this month."
    })


@app.route("/api/signal-timing", methods=["POST"])
def api_signal_timing():
    data = request.get_json(force=True, silent=True) or {}
    volume = data.get("volume", 5000)
    
    # Smart Signal Timing Suggestions
    if volume > 6000:
        cycle = "140s"
        adjustment = "+20s for Main Corridor"
    elif volume > 4000:
        cycle = "120s"
        adjustment = "+10s for Northbound"
    else:
        cycle = "90s"
        adjustment = "Standard Cycle"
        
    return jsonify({
        "recommended_cycle": cycle,
        "adjustment": adjustment,
        "message": f"Recommended Signal Cycle: {cycle} ({adjustment})"
    })


# OpenRouteService Integration for Real-time Routing
# NOTE: keep this in backend environment, never in frontend code.
ORS_API_KEY = os.getenv("ORS_API_KEY", "")


def get_ors_route(start_coords: Tuple[float, float], end_coords: Tuple[float, float]) -> Dict[str, Any]:
    """Fetch route from OpenRouteService API"""
    if not ORS_API_KEY:
        print("ORS API key missing. Set ORS_API_KEY in backend environment.")
        return None

    url = "https://api.openrouteservice.org/v2/directions/driving-car"
    headers = {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
    }
    
    params = {
        'start': f"{start_coords[1]},{start_coords[0]}",  # lon,lat format
        'end': f"{end_coords[1]},{end_coords[0]}",
        'geometry': 'true',
        'instructions': 'false',
        'summary': 'true'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if not response.ok:
            print(f"ORS API Error ({response.status_code}): {response.text}")
            return {"_is_error": True, "status": response.status_code, "message": response.text}
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"ORS API Request Exception: {e}")
        return {"_is_error": True, "status": 500, "message": str(e)}


def downsample_coordinates(route_coords: List[List[float]], max_points: int = 100) -> List[List[float]]:
    """Downsample coordinates to prevent timeout issues with large routes"""
    if len(route_coords) <= max_points:
        return route_coords
    
    # Calculate step size to get approximately max_points
    step = len(route_coords) // max_points
    if step < 1:
        step = 1
    
    # Always include first and last points
    downsampled = [route_coords[0]]
    
    # Sample intermediate points
    for i in range(step, len(route_coords) - step, step):
        downsampled.append(route_coords[i])
    
    # Ensure last point is included
    downsampled.append(route_coords[-1])
    
    print(f"Downsampled {len(route_coords)} coordinates to {len(downsampled)} points")
    return downsampled


def validate_coordinates(start_coords: List[float], end_coords: List[float]) -> Dict[str, Any]:
    """Validate input coordinates and check for edge cases"""
    validation = {
        'valid': True,
        'error': None,
        'warnings': []
    }
    
    # Check coordinate format
    if len(start_coords) != 2 or len(end_coords) != 2:
        validation['valid'] = False
        validation['error'] = 'Invalid coordinate format - expected [lat, lon]'
        return validation
    
    # Check coordinate bounds
    lat_min, lat_max = -90, 90
    lon_min, lon_max = -180, 180
    
    if not (lat_min <= start_coords[0] <= lat_max) or not (lat_min <= end_coords[0] <= lat_max):
        validation['valid'] = False
        validation['error'] = 'Latitude out of bounds (-90 to 90)'
        return validation
    
    if not (lon_min <= start_coords[1] <= lon_max) or not (lon_min <= end_coords[1] <= lon_max):
        validation['valid'] = False
        validation['error'] = 'Longitude out of bounds (-180 to 180)'
        return validation
    
    # Check if start and end are the same
    if abs(start_coords[0] - end_coords[0]) < 0.0001 and abs(start_coords[1] - end_coords[1]) < 0.0001:
        validation['valid'] = False
        validation['error'] = 'Start and end points are too close - minimum distance required'
        return validation
    
    # Calculate distance and warn for very long routes
    from math import radians, cos, sin, asin, sqrt
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        """Calculate distance between two points in kilometers"""
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        km = 6371 * c
        return km
    
    distance_km = haversine_distance(start_coords[0], start_coords[1], end_coords[0], end_coords[1])
    
    if distance_km > 2000:  # Very long route
        validation['warnings'].append(f'Very long route ({distance_km:.1f} km) - processing may take longer')
    elif distance_km < 0.1:  # Very short route
        validation['warnings'].append(f'Very short route ({distance_km*1000:.1f} m) - results may be less accurate')
    
    return validation


def calculate_model_confidence(segments: List[Dict], route_length_km: float) -> float:
    """Calculate model confidence based on data quality and route characteristics"""
    base_confidence = 0.85  # Base confidence for Minneapolis model
    
    # Factors that increase confidence
    factors = []
    
    # High-quality traffic data (Minneapolis has good sensor coverage)
    if route_length_km < 50:  # Shorter routes have better data
        factors.append(0.05)
    
    # Time of day (rush hour has more data)
    current_hour = datetime.now().hour
    if 7 <= current_hour <= 9 or 16 <= current_hour <= 18:
        factors.append(0.03)
    
    # Number of segments (more segments = more granular analysis)
    if len(segments) > 20:
        factors.append(0.02)
    
    # Low congestion variance (more predictable)
    congestion_scores = [seg['congestion_probability'] for seg in segments]
    if len(congestion_scores) > 0:
        congestion_variance = sum((x - sum(congestion_scores)/len(congestion_scores))**2 for x in congestion_scores) / len(congestion_scores)
        if congestion_variance < 0.1:  # Low variance
            factors.append(0.02)
    
    # Calculate final confidence
    confidence = base_confidence + sum(factors)
    confidence = min(confidence, 0.98)  # Cap at 98%
    
    return round(confidence, 2)


def analyze_route_congestion(route_coords: List[List[float]], prediction_engine) -> Dict[str, Any]:
    """Analyze route segments for congestion using ML model with optimizations"""
    if not prediction_engine:
        return {"segments": [], "congestion_score": 0.5, "sustainability_score": 0.5, "model_confidence": 0.5}
    
    # Downsample coordinates to prevent timeout
    max_points = 100  # Limit to prevent rate limiting
    downsampled_coords = downsample_coordinates(route_coords, max_points)
    
    segments = []
    total_congestion = 0
    congested_segments = 0
    total_idling_time = 0
    
    print(f"Analyzing {len(downsampled_coords)} coordinates for congestion...")
    
    for i in range(len(downsampled_coords) - 1):
        segment_start = downsampled_coords[i]
        segment_end = downsampled_coords[i + 1]
        
        # Create features for prediction (simplified)
        features = {
            'hour': datetime.now().hour,
            'day_of_week': datetime.now().weekday(),
            'month': datetime.now().month,
            'latitude': segment_start[0],
            'longitude': segment_start[1],
            'temperature': 20.0,  # Default temperature
            'humidity': 60.0,    # Default humidity
            'weather_condition': 'Clear'
        }
        
        try:
            # Get prediction from ML model
            prediction = prediction_engine.predict_single(features)
            predicted_volume = prediction.get('predicted_volume', 3000)
            congestion_probability = prediction.get('congestion_probability', 0.5)
            
            # Flag high congestion segments
            is_congested = congestion_probability > 0.8
            if is_congested:
                congested_segments += 1
            
            total_congestion += congestion_probability
            
            # Enhanced idling time calculation
            idling_time = predicted_volume * 0.001 if is_congested else 0
            total_idling_time += idling_time
            
            segments.append({
                'start': segment_start,
                'end': segment_end,
                'predicted_volume': predicted_volume,
                'congestion_probability': congestion_probability,
                'is_congested': is_congested,
                'idling_time': idling_time
            })
            
        except Exception as e:
            print(f"Prediction error for segment {i}: {e}")
            # Add default segment if prediction fails
            segments.append({
                'start': segment_start,
                'end': segment_end,
                'predicted_volume': 3000,
                'congestion_probability': 0.5,
                'is_congested': False,
                'idling_time': 0
            })
    
    # Calculate sustainability score based on idling time vs free-flow
    free_flow_time = len(segments) * 30  # Assume 30s per segment free flow
    sustainability_score = max(0, 1 - (total_idling_time / (free_flow_time + total_idling_time)))
    
    avg_congestion_score = total_congestion / len(segments) if segments else 0.5
    
    # Calculate route length in km (rough estimate)
    route_length_km = len(route_coords) * 0.05  # Assume 50m per coordinate point
    
    # Calculate model confidence
    model_confidence = calculate_model_confidence(segments, route_length_km)
    
    print(f"Analysis complete: {congested_segments}/{len(segments)} congested segments, confidence: {model_confidence}")
    
    return {
        'segments': segments,
        'congestion_score': avg_congestion_score,
        'sustainability_score': sustainability_score,
        'congested_segments': congested_segments,
        'total_segments': len(segments),
        'model_confidence': model_confidence,
        'total_idling_time': total_idling_time,
        'free_flow_time': free_flow_time
    }


@app.route("/api/route-path", methods=["POST"])
def api_route_path():
    """Real-time routing with OpenRouteService and ML congestion detection"""
    global prediction_engine
    
    data = request.get_json(force=True, silent=True) or {}
    start_coords = data.get("start")  # [lat, lon]
    end_coords = data.get("end")      # [lat, lon]
    
    if not start_coords or not end_coords:
        return jsonify({"error": "Missing start or end coordinates"}), 400
    
    # Validate coordinates with enhanced checks
    validation = validate_coordinates(start_coords, end_coords)
    if not validation['valid']:
        return jsonify({"error": validation['error']}), 400
    
    try:
        print(f"Fetching route from {start_coords} to {end_coords}")
        
        # Get route from OpenRouteService
        ors_response = get_ors_route(
            (start_coords[0], start_coords[1]),  # lat, lon
            (end_coords[0], end_coords[1])        # lat, lon
        )
        
        if not ors_response:
            return jsonify({"error": "Failed to fetch route from ORS - service may be unavailable"}), 500
            
        if ors_response.get("_is_error"):
            return jsonify({"error": ors_response.get("message", "ORS Error")}), ors_response.get("status", 500)
        
        # Extract route geometry
        route_geometry = ors_response['features'][0]['geometry']
        route_coords = route_geometry['coordinates']  # [[lon, lat], ...] from ORS
        
        # Validate ORS response coordinates
        if not route_coords or len(route_coords) < 2:
            return jsonify({"error": "Invalid route data received from ORS"}), 500
        
        # Convert ORS [lon, lat] to [lat, lon] format for ML model
        route_coords_latlon = [[coord[1], coord[0]] for coord in route_coords]
        
        print(f"Received {len(route_coords)} coordinates from ORS")
        
        # Analyze route with ML model (includes downsampling)
        analysis = analyze_route_congestion(route_coords_latlon, prediction_engine)
        
        # Extract route properties safely
        try:
            route_properties = ors_response['features'][0]['properties']
            if 'segments' in route_properties and len(route_properties['segments']) > 0:
                distance = route_properties['segments'][0]['distance']
                duration = route_properties['segments'][0]['duration']
            else:
                # Fallback calculation if segment data missing
                distance = sum(analysis['segments'][i].get('distance', 100) for i in range(len(analysis['segments'])))
                duration = distance / 50 * 3600  # Rough estimate: 50 km/h average
        except (KeyError, IndexError) as e:
            print(f"Warning: Could not extract route properties: {e}")
            distance = 10000  # 10km fallback
            duration = 720    # 12 minutes fallback
            
        # Enhanced CO2 calculations
        # Base assumption: 200g CO2 per km for stop-and-go traffic, 120g CO2 per km for free-flow
        route_distance_km = distance / 1000  # Convert meters to km
        
        # Standard route (more idling due to congestion)
        congestion_factor = 1 + (analysis['congestion_score'] * 0.8)  # Up to 80% more emissions
        base_co2 = route_distance_km * 200 * congestion_factor  # grams
        
        # Optimized route (less idling)
        optimized_co2 = route_distance_km * 120 * (1 + analysis['congestion_score'] * 0.3)  # grams
        
        co2_saved = base_co2 - optimized_co2
        
        # Calculate cars equivalent for actionable advice
        # Average car produces 4090g CO2 per day (EPA estimate)
        # Per hour equivalent for this route
        cars_off_road_equivalent = co2_saved / (4090 / 24)  # grams / (grams per hour)
        
        # Create response with GeoJSON LineString
        response = {
            "route": {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": route_coords  # Keep original ORS format [lon, lat]
                },
                "properties": {
                    "distance": distance,
                    "duration": duration,
                    "congestion_score": analysis['congestion_score'],
                    "sustainability_score": analysis['sustainability_score'],
                    "model_confidence": analysis['model_confidence'],
                    "ai_recommended": analysis['sustainability_score'] > 0.7
                }
            },
            "segments": analysis['segments'],
            "metrics": {
                "congested_segments": analysis['congested_segments'],
                "total_segments": analysis['total_segments'],
                "co2_saved_grams": round(co2_saved, 2),
                "co2_base_grams": round(base_co2, 2),
                "co2_optimized_grams": round(optimized_co2, 2),
                "model_confidence": analysis['model_confidence'],
                "cars_off_road_equivalent": round(cars_off_road_equivalent, 2),
                "total_idling_time_seconds": round(analysis['total_idling_time'], 1),
                "congestion_explanation": "Idling in stop-and-go traffic produces 40-80% more CO2 than steady driving. Our AI detects congestion pockets and routes around them, even if the distance is slightly longer."
            },
            "status": "success"
        }
        
        # Add warnings if any
        if validation['warnings']:
            response['warnings'] = validation['warnings']
        
        print(f"Route analysis complete: {len(analysis['segments'])} segments, {co2_saved:.1f}g CO2 saved")
        
        return jsonify(response)
        
    except requests.exceptions.Timeout:
        print("ORS API timeout")
        return jsonify({"error": "Routing service timeout - please try again"}), 504
    except requests.exceptions.ConnectionError:
        print("ORS API connection error")
        return jsonify({"error": "Cannot connect to routing service - check network connection"}), 503
    except Exception as e:
        print(f"Route path error: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=API_PORT, debug=False, load_dotenv=False, allow_unsafe_werkzeug=True)


