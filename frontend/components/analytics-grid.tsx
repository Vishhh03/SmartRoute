'use client'

import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import RoadTable from './road-table'

export default function AnalyticsGrid() {
  const [congestionData] = useState([
    { name: 'Light', value: 15, color: '#10b981' },
    { name: 'Moderate', value: 35, color: '#f59e0b' },
    { name: 'Heavy', value: 35, color: '#ef4444' },
    { name: 'Severe', value: 15, color: '#7c3aed' },
  ])

  const [trafficVolumeData] = useState([
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
  ])

  const [hourlyData] = useState([
    { hour: '00', traffic: 45 },
    { hour: '04', traffic: 22 },
    { hour: '08', traffic: 78 },
    { hour: '12', traffic: 85 },
    { hour: '16', traffic: 92 },
    { hour: '20', traffic: 68 },
  ])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left - Congestion Breakdown */}
      <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
        <h3 className="text-sm font-mono font-semibold text-foreground mb-4">
          Congestion Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={congestionData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
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

      {/* Center - Live Road Data Table */}
      <div className="lg:col-span-1 fade-in" style={{ animationDelay: '0.1s' }}>
        <RoadTable />
      </div>

      {/* Right - Hourly Traffic Bar Chart */}
      <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col fade-in" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)', animationDelay: '0.2s' }}>
        <h3 className="text-sm font-mono font-semibold text-foreground mb-4">
          Hourly Traffic Distribution
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourlyData}>
            <XAxis
              dataKey="hour"
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
              formatter={(value) => [`${value}%`, 'Congestion']}
            />
            <Bar
              dataKey="traffic"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
