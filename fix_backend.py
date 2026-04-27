
import os

file_path = r"c:\Users\visha\Desktop\Minorproject\backend\app_new.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add /predict alias
content = content.replace(
    '@app.route("/api/predict", methods=["POST"])',
    '@app.route("/api/predict", methods=["POST"])\n@app.route("/predict", methods=["POST"]) # Alias for simpler frontend compatibility'
)

# 2. Fix CORS
old_cors = """CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:8080",
            ]
        }
    },
)"""

new_cors = """CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost:8080",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173",
            ]
        }
    },
)"""
# We do a more flexible match for CORS
import re
content = re.sub(r'CORS\(\s*app,\s*resources=\{.*?\}\s*\)', new_cors, content, flags=re.DOTALL)

# 3. Update /api/routes to use ORS
old_routes = """@app.route("/api/routes", methods=["GET"])
def api_routes():
    # Multi-Modal "Green Route" Recommendations mock
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
        }
    })"""

new_routes = """@app.route("/api/routes", methods=["GET"])
def api_routes():
    \"\"\"
    Get route recommendations.
    FIXED: Now attempts to use real ORS API if key is present.
    \"\"\"
    start_lat = request.args.get("start_lat", type=float)
    start_lng = request.args.get("start_lng", type=float)
    end_lat = request.args.get("end_lat", type=float)
    end_lng = request.args.get("end_lng", type=float)

    if all([start_lat, start_lng, end_lat, end_lng]) and ORS_API_KEY:
        try:
            ors_data = get_ors_route((start_lat, start_lng), (end_lat, end_lng))
            if ors_data:
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
            print(f"ORS API Error: {e}")

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
        "status": "Using Simulated Data (No ORS Key)" if not ORS_API_KEY else "Using Simulated Data (Fallback)"
    })"""

content = content.replace(old_routes, new_routes)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated app_new.py")
