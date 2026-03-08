'use client'

import { useEffect, useState } from 'react'

interface Road {
  id: string
  name: string
  congestion: number
  vehicles: number
  avgSpeed: number
  status: 'light' | 'moderate' | 'heavy' | 'severe'
}

const ROADS = [
  { id: '1', name: 'MG Road', congestion: 78, vehicles: 2340, avgSpeed: 28, status: 'heavy' as const },
  { id: '2', name: 'Silk Board', congestion: 85, vehicles: 2680, avgSpeed: 22, status: 'severe' as const },
  { id: '3', name: 'Hebbal', congestion: 62, vehicles: 1890, avgSpeed: 35, status: 'moderate' as const },
  { id: '4', name: 'Whitefield', congestion: 45, vehicles: 1240, avgSpeed: 48, status: 'light' as const },
  { id: '5', name: 'Bannerghatta', congestion: 72, vehicles: 2150, avgSpeed: 32, status: 'heavy' as const },
]

const statusColors = {
  light: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  heavy: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  severe: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
}

export default function RoadTable() {
  const [roads, setRoads] = useState<Road[]>(ROADS)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simulate live updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRoads(prev => prev.map(road => ({
        ...road,
        congestion: Math.max(20, Math.min(95, road.congestion + (Math.random() - 0.5) * 8)),
        vehicles: Math.max(800, road.vehicles + Math.floor((Math.random() - 0.5) * 200)),
        avgSpeed: Math.max(15, Math.min(60, road.avgSpeed + (Math.random() - 0.5) * 3)),
      })))
      setLastUpdate(new Date())
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col h-full" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono font-semibold text-foreground">
          Live Road Data
        </h3>
        <span className="text-xs text-muted-foreground font-mono">
          {lastUpdate.toLocaleTimeString()}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2">
        {roads.map((road, idx) => {
          const colors = statusColors[road.status]
          return (
            <div
              key={road.id}
              className={`p-3 rounded-lg border ${colors.border} ${colors.bg} transition-all duration-300 fade-in`}
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {road.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {road.vehicles.toLocaleString()} vehicles
                  </p>
                </div>
                <div className={`text-right`}>
                  <p className={`text-xs font-mono font-bold ${colors.text}`}>
                    {Math.round(road.congestion)}%
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {road.avgSpeed.toFixed(0)} km/h
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    road.status === 'severe'
                      ? 'bg-red-500 shadow-lg shadow-red-500/50'
                      : road.status === 'heavy'
                      ? 'bg-orange-500'
                      : road.status === 'moderate'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${road.congestion}%` }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
