'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Zap, AlertCircle, Activity, Leaf, Clock } from 'lucide-react'

export default function DashboardMetrics() {
  const [vehicles, setVehicles] = useState(12847)
  const [avgSpeed, setAvgSpeed] = useState(42)
  const [congestion, setCongestion] = useState(68)
  const [alerts, setAlerts] = useState(0)
  const [co2, setCo2] = useState(14.2)
  const [driftData, setDriftData] = useState<any>(null)

  // Fetch Drift
  useEffect(() => {
    const fetchDrift = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/peak-drift')
        const data = await res.json()
        setDriftData(data)
      } catch (error) {
        console.error('Failed to fetch peak drift', error)
      }
    }
    fetchDrift()
  }, [])

  // Simulate live data updates & automated anomaly detection
  useEffect(() => {
    const interval = setInterval(() => {
      const newVehicles = vehicles + Math.floor(Math.random() * 20) - 10
      setVehicles(newVehicles)
      setAvgSpeed(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 4)))
      setCongestion(prev => Math.max(10, Math.min(95, prev + (Math.random() - 0.5) * 8)))
      
      // CO2 Estimation linked to volume
      setCo2(parseFloat(((newVehicles * 0.0011) + (Math.random() * 0.2)).toFixed(2)))
      
      // Automated Incident Detection: High congestion triggers alert
      if (newVehicles > 12900 || congestion > 80) {
        setAlerts(prev => Math.min(5, prev + 1))
      } else {
        setAlerts(prev => Math.max(0, prev - 1))
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [vehicles, congestion])

  const metrics = [
    {
      label: 'Traffic Volume',
      value: vehicles.toLocaleString(),
      subtext: 'Live prediction',
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'CO₂ Footprint',
      value: `${co2} t`,
      subtext: 'Emission Impact',
      icon: Leaf,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Peak Hour Drift',
      value: driftData ? driftData.actual_peak : '16:30',
      subtext: driftData ? `Trend: ${driftData.drift_minutes}m ${driftData.trend}` : 'Historical vs Actual',
      icon: Clock,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Incident Alerts',
      value: alerts.toString(),
      subtext: alerts > 0 ? 'Anomaly Detected' : 'Network Stable',
      icon: AlertCircle,
      color: alerts > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: alerts > 0 ? 'bg-red-500/20 border border-red-500/50 animate-pulse' : 'bg-slate-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon
        return (
          <div
            key={idx}
            className={`rounded-lg border backdrop-blur-sm p-6 transition-all group fade-in ${metric.label === 'Incident Alerts' && alerts > 0 ? 'border-red-500/50 bg-red-950/20' : ''}`}
            style={metric.label === 'Incident Alerts' && alerts > 0 ? {} : { 
              borderColor: 'rgba(71, 85, 105, 0.5)', 
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              animationDelay: `${idx * 0.1}s`
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  {metric.label}
                </p>
                <p className={`text-2xl font-mono font-bold mt-2 ${metric.label === 'Incident Alerts' && alerts > 0 ? 'text-red-400' : 'text-foreground'}`}>
                  {metric.value}
                </p>
                {metric.subtext && (
                  <p className={`text-xs font-mono mt-1 ${metric.label === 'Incident Alerts' && alerts > 0 ? 'text-red-400/80' : 'text-muted-foreground'}`}>
                    {metric.subtext}
                  </p>
                )}
              </div>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

