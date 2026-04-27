'use client'

import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import RoadTable from './road-table'
import { Settings2 } from 'lucide-react'

export default function AnalyticsGrid() {
  const [congestionData] = useState([
    { name: 'Light', value: 15, color: '#10b981' },
    { name: 'Moderate', value: 35, color: '#f59e0b' },
    { name: 'Heavy', value: 35, color: '#ef4444' },
    { name: 'Severe', value: 15, color: '#7c3aed' },
  ])

  // Forecasted Wave Data (24h predictive trend sparkline)
  const [forecastData] = useState([
    { time: '00:00', volume: 1200 },
    { time: '04:00', volume: 800 },
    { time: '08:00', volume: 4200 },
    { time: '12:00', volume: 3800 },
    { time: '16:00', volume: 5600 },
    { time: '20:00', volume: 2800 },
    { time: '23:59', volume: 1500 },
  ])

  const [signalSuggestion, setSignalSuggestion] = useState<any>(null)

  useEffect(() => {
    const fetchSignalSuggestion = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/signal-timing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ volume: 5600 }) // mock high volume
        })
        const data = await res.json()
        setSignalSuggestion(data)
      } catch (error) {
        console.error('Failed to fetch signal timing', error)
      }
    }
    fetchSignalSuggestion()
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left - Congestion Breakdown & Signal Suggestion */}
      <div className="flex flex-col gap-6 fade-in">
        <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col h-full" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
          <h3 className="text-sm font-mono font-semibold text-foreground mb-4">
            Congestion Breakdown
          </h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={congestionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {congestionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`${value}%`, 'Level']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-xs font-mono">
            {congestionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-foreground font-medium">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Smart Signal Timing Suggestions */}
        <div className="rounded-lg border backdrop-blur-sm p-4" style={{ borderColor: 'rgba(59, 130, 246, 0.5)', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
          <h3 className="text-xs font-mono font-semibold text-blue-400 mb-2 flex items-center">
            <Settings2 className="w-4 h-4 mr-2" />
            Smart Signal Timing
          </h3>
          <p className="text-xs font-mono text-blue-100">
            {signalSuggestion ? signalSuggestion.message : 'Analyzing signal configurations...'}
          </p>
        </div>
      </div>

      {/* Center - Live Road Data Table */}
      <div className="lg:col-span-1 fade-in" style={{ animationDelay: '0.1s' }}>
        <RoadTable />
      </div>

      {/* Right - Predictive Trend Sparklines (Area Chart) */}
      <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)', animationDelay: '0.2s' }}>
        <h3 className="text-sm font-mono font-semibold text-foreground mb-1">
          Forecasted Wave
        </h3>
        <p className="text-[10px] font-mono text-muted-foreground mb-4">24-Hour Predictive Trend</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#64748b"
              style={{ fontSize: '10px' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#64748b" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: '0.5rem',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}
              formatter={(value) => [`${value} Veh`, 'Volume']}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorVolume)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

