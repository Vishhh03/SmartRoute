import os

# Base directory of the project
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Model file paths
MINNEAPOLIS_MODEL = os.path.join(BASE_DIR, 'models', 'best_model_48k.pkl')
BANGALORE_MODEL = os.path.join(BASE_DIR, 'models', 'gradient_boosting_model.pkl')
CHENNAI_MUMBAI_MODEL = os.path.join(BASE_DIR, 'models', 'chennai_mumbai_model.pkl')
CHENNAI_MUMBAI_ENCODERS = os.path.join(BASE_DIR, 'models', 'chennai_mumbai_encoders.pkl')
CHENNAI_MUMBAI_FEATURES = os.path.join(BASE_DIR, 'models', 'chennai_mumbai_features.pkl')

# Data file paths
MINNEAPOLIS_TRAIN = os.path.join(BASE_DIR, 'data', 'Train.csv')
BANGALORE_DATA = os.path.join(BASE_DIR, 'data', 'Banglore_traffic_Dataset.csv')
CHENNAI_MUMBAI_DATA = os.path.join(BASE_DIR, 'data', 'traffic_2000_rows.csv')

# API configuration
API_PORT = 5000
STREAM_INTERVAL_SECONDS = 3