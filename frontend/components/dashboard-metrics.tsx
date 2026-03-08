'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Zap, AlertCircle, Activity } from 'lucide-react'

export default function DashboardMetrics() {
  const [vehicles, setVehicles] = useState(12847)
  const [avgSpeed, setAvgSpeed] = useState(42)
  const [congestion, setCongestion] = useState(68)
  const [alerts, setAlerts] = useState(5)

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev + Math.floor(Math.random() * 20) - 10)
      setAvgSpeed(prev => Math.max(20, Math.min(80, prev + (Math.random() - 0.5) * 4)))
      setCongestion(prev => Math.max(10, Math.min(95, prev + (Math.random() - 0.5) * 8)))
      setAlerts(Math.floor(Math.random() * 8) + 2)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const metrics = [
    {
      label: 'Total Vehicles',
      value: vehicles.toLocaleString(),
      icon: Activity,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Average Speed',
      value: `${avgSpeed.toFixed(1)} km/h`,
      subtext: 'Sparkline trend',
      icon: TrendingUp,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Congestion Index',
      value: `${Math.round(congestion)}%`,
      subtext: 'Peak traffic level',
      icon: Zap,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Active Alerts',
      value: alerts.toString(),
      subtext: 'Critical incidents',
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon
        return (
          <div
            key={idx}
            className="rounded-lg border backdrop-blur-sm p-6 transition-all cursor-pointer group fade-in"
            style={{ 
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
                <p className="text-2xl font-mono font-bold text-foreground mt-2">
                  {metric.value}
                </p>
                {metric.subtext && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">
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
