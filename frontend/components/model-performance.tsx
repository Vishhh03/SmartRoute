'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar,
} from 'recharts'
import { Info } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

const trafficVolumeData = [
  { time: '00:00', volume: 1200 },
  { time: '02:00', volume: 800 },
  { time: '04:00', volume: 600 },
  { time: '06:00', volume: 2400 },
  { time: '08:00', volume: 4200 },
  { time: '10:00', volume: 3800 },
  { time: '12:00', volume: 5100 },
  { time: '14:00', volume: 4800 },
  { time: '16:00', volume: 5600 },
  { time: '18:00', volume: 6200 },
]

export default function ModelPerformance() {
  const [featureImportance, setFeatureImportance] = useState<any[]>([])

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/feature-importance')
        const data = await res.json()
        setFeatureImportance(data.features || [])
      } catch (error) {
        console.error('Failed to fetch feature importance', error)
      }
    }
    fetchFeatures()
  }, [])

  return (
    <div className="space-y-6">
      {/* Traffic Volume Chart */}
      <div className="rounded-lg border backdrop-blur-sm p-6 fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)', animationDelay: '0.3s' }}>
        <h3 className="text-sm font-mono font-semibold text-foreground mb-4">
          Traffic Volume Timeline
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={trafficVolumeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
              formatter={(value) => [value.toLocaleString(), 'Vehicles']}
            />
            <Bar
              dataKey="volume"
              fill="#3b82f6"
              fillOpacity={0.3}
              radius={[8, 8, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Model Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border backdrop-blur-sm p-6 fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)', animationDelay: '0.4s' }}>
          <h3 className="text-sm font-mono font-semibold text-foreground mb-6">
            Model Performance
          </h3>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">R² Score</span>
              <span className="text-sm font-mono font-bold text-blue-400">0.844</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">MAE (vehicles)</span>
              <span className="text-sm font-mono font-bold text-cyan-400">3,142</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">MAPE (%)</span>
              <span className="text-sm font-mono font-bold text-green-400">9.59%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono flex items-center">
                Model Type
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Info className="w-3 h-3 ml-2 cursor-pointer text-slate-500 hover:text-slate-300" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64 bg-slate-900 border-slate-700 p-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold font-mono text-slate-200">Feature Importance (XAI)</h4>
                      <p className="text-[10px] text-slate-400 font-mono mb-2">Top factors driving current predictions:</p>
                      <div className="space-y-1.5">
                        {featureImportance.map((feat: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-300">{feat.name}</span>
                            <div className="flex items-center w-24">
                              <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${feat.importance * 100}%` }}></div>
                              <span className="text-slate-500 ml-2 w-8 text-right">{(feat.importance * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </span>
              <span className="text-sm font-mono font-bold text-purple-400">Gradient Boosting</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border backdrop-blur-sm p-6 fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)', animationDelay: '0.5s' }}>
          <h3 className="text-sm font-mono font-semibold text-foreground mb-6">
            System Info
          </h3>
          <div className="space-y-5">
            {[
              { label: 'API Latency', value: '45ms', color: 'text-green-400' },
              { label: 'Update Interval', value: '3 seconds', color: 'text-blue-400' },
              { label: 'Data Points', value: '8,936', color: 'text-cyan-400' },
              { label: 'Last Training', value: '2 weeks ago', color: 'text-yellow-400' },
            ].map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  {metric.label}
                </span>
                <span className={`text-sm font-mono font-bold ${metric.color}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

