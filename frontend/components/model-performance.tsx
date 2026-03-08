'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar,
} from 'recharts'

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
            {[
              { label: 'R² Score', value: '0.844', color: 'text-blue-400' },
              { label: 'MAE (vehicles)', value: '3,142', color: 'text-cyan-400' },
              { label: 'MAPE (%)', value: '9.59%', color: 'text-green-400' },
              { label: 'Model Type', value: 'Gradient Boosting', color: 'text-purple-400' },
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
