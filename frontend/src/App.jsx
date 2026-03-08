import { useState } from 'react'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    average_speed: 45,
    congestion_level: 3,
    road_capacity_utilization: 65,
    incident_reports: 0,
    weather_conditions: 1,
    hour: 8,
    day_of_week: 1,
  })

  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }))
  }

  const buildFullPayload = (data) => {
    const hour = data.hour
    const dow = data.day_of_week
    const month = 6
    const is_morning_peak = (hour >= 7 && hour <= 10) ? 1 : 0
    const is_evening_peak = (hour >= 17 && hour <= 20) ? 1 : 0
    const is_peak_hour = (is_morning_peak || is_evening_peak) ? 1 : 0
    const is_night = (hour >= 22 || hour <= 5) ? 1 : 0
    const is_weekend = (dow >= 5) ? 1 : 0
    const is_business_hours = (!is_weekend && hour >= 9 && hour <= 17) ? 1 : 0
    const is_monday = (dow === 0) ? 1 : 0
    const is_friday = (dow === 4) ? 1 : 0
    const speed_category = data.average_speed >= 60 ? 2 : data.average_speed >= 35 ? 1 : 0
    const high_congestion = data.congestion_level >= 4 ? 1 : 0
    const capacity_stressed = data.road_capacity_utilization >= 80 ? 1 : 0

    return {
      area_name: 1,
      roadintersection_name: 2,
      average_speed: data.average_speed,
      travel_time_index: 1.2,
      congestion_level: data.congestion_level,
      road_capacity_utilization: data.road_capacity_utilization,
      incident_reports: data.incident_reports,
      public_transport_usage: 30,
      traffic_signal_compliance: 85,
      parking_usage: 50,
      pedestrian_and_cyclist_count: 20,
      weather_conditions: data.weather_conditions,
      roadwork_and_construction_activity: 0,
      hour: hour,
      day_of_week: dow,
      month: month,
      hour_sin: Math.sin(2 * Math.PI * hour / 24),
      hour_cos: Math.cos(2 * Math.PI * hour / 24),
      dow_sin: Math.sin(2 * Math.PI * dow / 7),
      dow_cos: Math.cos(2 * Math.PI * dow / 7),
      month_sin: Math.sin(2 * Math.PI * month / 12),
      month_cos: Math.cos(2 * Math.PI * month / 12),
      is_morning_peak,
      is_evening_peak,
      is_peak_hour,
      is_night,
      is_business_hours,
      is_weekend,
      is_monday,
      is_friday,
      speed_congestion_interaction: data.average_speed * data.congestion_level,
      weekend_hour_interaction: is_weekend * hour,
      speed_peak_interaction: data.average_speed * is_peak_hour,
      speed_category,
      high_congestion,
      capacity_stressed
    }
  }

  const getCongestionCategory = (volume) => {
    if (volume < 5000) return 'Low'
    if (volume < 10000) return 'Medium'
    if (volume < 15000) return 'High'
    return 'Very High'
  }

  const handlePredict = async () => {
    setLoading(true)
    try {
      const payload = buildFullPayload(formData)
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      setPrediction({
        volume: data.predicted_traffic_volume,
        category: getCongestionCategory(data.predicted_traffic_volume),
        confidence: 0.844
      })
    } catch (error) {
      console.error('Prediction error:', error)
      alert('Failed to get prediction. Is the API running on port 5000?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">🚦</div>
        <div>
          <h1>SmartRoute</h1>
          <p>AI-Driven Traffic Prediction System</p>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="input-section">
            <h2>Traffic Parameters</h2>

            <div className="form-group">
              <label>Average Speed (km/h): {formData.average_speed}</label>
              <input type="range" name="average_speed" min="0" max="120"
                value={formData.average_speed} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Congestion Level (1-5): {formData.congestion_level}</label>
              <input type="range" name="congestion_level" min="1" max="5" step="0.1"
                value={formData.congestion_level} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Road Capacity Used (%): {formData.road_capacity_utilization}</label>
              <input type="range" name="road_capacity_utilization" min="20" max="95"
                value={formData.road_capacity_utilization} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Incident Reports: {formData.incident_reports}</label>
              <input type="range" name="incident_reports" min="0" max="10"
                value={formData.incident_reports} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Weather: </label>
              <select name="weather_conditions" value={formData.weather_conditions} onChange={handleChange}>
                <option value="0">Clear</option>
                <option value="1">Cloudy</option>
                <option value="2">Rain</option>
                <option value="3">Fog</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hour of Day:</label>
              <select name="hour" value={formData.hour} onChange={handleChange}>
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={i}>{i}:00</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Day of Week:</label>
              <select name="day_of_week" value={formData.day_of_week} onChange={handleChange}>
                <option value="0">Monday</option>
                <option value="1">Tuesday</option>
                <option value="2">Wednesday</option>
                <option value="3">Thursday</option>
                <option value="4">Friday</option>
                <option value="5">Saturday</option>
                <option value="6">Sunday</option>
              </select>
            </div>

            <button className="predict-btn" onClick={handlePredict} disabled={loading}>
              {loading ? '⏳ Predicting...' : '🚀 Predict Traffic'}
            </button>
          </div>

          <div className="result-section">
            <h2>Prediction Results</h2>
            {prediction ? (
              <div className="prediction-card">
                <div className="prediction-main">
                  <div className="prediction-value">{prediction.volume.toLocaleString()}</div>
                  <div className="prediction-label">Vehicles / Hour</div>
                </div>
                <div className="prediction-details">
                  <div className="detail-item">
                    <span className="detail-label">Congestion</span>
                    <span className={`detail-value congestion-${prediction.category.toLowerCase()}`}>
                      {prediction.category}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Model Accuracy</span>
                    <span className="detail-value">84.4%</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Model</span>
                    <span className="detail-value">Gradient Boosting</span>
                  </div>
                </div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: '84.4%' }} />
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>👆 Set parameters and click predict to see results</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>SmartRoute © 2024 | SRM Institute of Science and Technology</p>
        <p>Best Model: Gradient Boosting (R² = 0.844)</p>
      </footer>
    </div>
  )
}

export default App
