"""
Flask API for Traffic Prediction
"""

from flask import Flask, request, jsonify
import pickle
import pandas as pd
import numpy as np

app = Flask(__name__)

print("="*80)
print("LOADING SMARTROUTE API")
print("="*80)

# Load trained model
print("\n[1/2] Loading model...")
with open('models/gradient_boosting_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Load feature names
with open('models/feature_names.pkl', 'rb') as f:
    feature_names = pickle.load(f)

print(f"✓ Model loaded successfully!")
print(f"✓ Expected features: {len(feature_names)}")

print("\n[2/2] Starting API server...")
print("\n" + "="*80)

@app.route('/')
def home():
    return jsonify({
        'message': 'SmartRoute Traffic Prediction API',
        'status': 'running',
        'model': 'Gradient Boosting',
        'endpoints': {
            '/predict': 'POST - Predict traffic volume',
            '/health': 'GET - Check API health'
        }
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'model_loaded': True})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data
        data = request.get_json()
        
        # Convert to DataFrame
        df = pd.DataFrame([data])
        
        # Ensure all required features are present
        missing_features = set(feature_names) - set(df.columns)
        if missing_features:
            return jsonify({
                'error': 'Missing features',
                'missing': list(missing_features),
                'required_features': feature_names
            }), 400
        
        # Select only the required features in correct order
        df = df[feature_names]
        
        # Make prediction
        prediction = model.predict(df)[0]
        
        # Return result
        return jsonify({
            'predicted_traffic_volume': int(prediction),
            'status': 'success',
            'model': 'Gradient Boosting'
        })
    
    except Exception as e:
        return jsonify({
            'error': str(e),
            'status': 'failed'
        }), 500

if __name__ == '__main__':
    print("✅ API is running on http://127.0.0.1:5000")
    print("="*80)
    print("\nEndpoints:")
    print("  GET  http://127.0.0.1:5000/        - Home")
    print("  GET  http://127.0.0.1:5000/health  - Health check")
    print("  POST http://127.0.0.1:5000/predict - Predict traffic")
    print("\nPress Ctrl+C to stop the server")
    print("="*80)
    app.run(debug=True, port=5000)