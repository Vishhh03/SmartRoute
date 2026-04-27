'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Activity, CloudRain, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function SimulatorPanel() {
  const [rainIntensity, setRainIntensity] = useState([0])
  const [incidentSeverity, setIncidentSeverity] = useState([0])
  const [basePrediction, setBasePrediction] = useState(4500)
  const [simulatedPrediction, setSimulatedPrediction] = useState(4500)
  const [loading, setLoading] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])

  // Calculate multiplier based on user's rules
  const getRainMultiplier = (rain: number) => {
    if (rain <= 20) return 1.0
    if (rain <= 50) return 1.15
    if (rain <= 80) return 1.30
    return 1.45
  }

  const getIncidentMultiplier = (severity: number) => {
    if (severity <= 2) return 1.0
    if (severity <= 5) return 1.20
    if (severity <= 8) return 1.40
    return 1.60
  }

  const runSimulation = async () => {
    setLoading(true)
    try {
      // 1. Call POST /api/predict with current weather params (mocking the body)
      const res = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: new Date().toISOString(),
          is_holiday: 0,
          air_pollution_index: 50,
          humidity: 60,
          wind_speed: 10,
          wind_direction: 180,
          visibility_in_miles: 10,
          dew_point: 10,
          temperature: 290, // Kelvin
          rain_p_h: rainIntensity[0],
          snow_p_h: 0,
          clouds_all: 90,
          weather_type: 'Rain',
          weather_description: 'light rain'
        })
      })
      
      const data = await res.json()
      const base = data.prediction || 4500
      setBasePrediction(Math.round(base))
      
      // 2. Apply multipliers
      const rainMult = getRainMultiplier(rainIntensity[0])
      const incMult = getIncidentMultiplier(incidentSeverity[0])
      
      // Cumulative effect
      const adjusted = base * rainMult * incMult
      setSimulatedPrediction(Math.round(adjusted))
      
      // Generate chart data to show comparison over the next few hours
      const newChartData = []
      const currentHour = new Date().getHours()
      
      for (let i = 0; i < 6; i++) {
        const hour = (currentHour + i) % 24
        // Simulate a curve
        const curveBase = base * (1 + Math.sin(i * 0.5) * 0.2)
        const curveSim = curveBase * rainMult * incMult
        
        newChartData.push({
          time: `${hour}:00`,
          predicted: Math.round(curveBase),
          simulated: Math.round(curveSim)
        })
      }
      setChartData(newChartData)
      
    } catch (error) {
      console.error('Simulation failed:', error)
      // Fallback if API is offline
      const base = 4500
      setBasePrediction(base)
      const adjusted = base * getRainMultiplier(rainIntensity[0]) * getIncidentMultiplier(incidentSeverity[0])
      setSimulatedPrediction(Math.round(adjusted))
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    runSimulation()
  }, [])

  // Auto-run when sliders change (debounced slightly by just letting it run)
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation()
    }, 500)
    return () => clearTimeout(timer)
  }, [rainIntensity, incidentSeverity])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20">
          <Activity className="w-4 h-4 mr-2" />
          Digital Twin Simulator
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] border-l-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="font-mono text-xl text-blue-400 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            "What-If" Scenario Simulator
          </SheetTitle>
          <SheetDescription className="font-mono text-xs text-slate-400">
            Override live environment variables to predict traffic network resilience under stress.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6 space-y-8">
          {/* Controls */}
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-mono text-slate-300 flex items-center">
                  <CloudRain className="w-4 h-4 mr-2 text-cyan-400" />
                  Rain Intensity (mm)
                </label>
                <span className="text-xs font-mono text-cyan-400">{rainIntensity[0]} mm</span>
              </div>
              <Slider
                value={rainIntensity}
                onValueChange={setRainIntensity}
                max={100}
                step={1}
                className="[&_[role=slider]]:border-cyan-400"
              />
              <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                <span>0 (Clear)</span>
                <span>100 (Extreme)</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-mono text-slate-300 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-400" />
                  Incident Severity
                </label>
                <span className="text-xs font-mono text-orange-400">Level {incidentSeverity[0]}</span>
              </div>
              <Slider
                value={incidentSeverity}
                onValueChange={setIncidentSeverity}
                max={10}
                step={1}
                className="[&_[role=slider]]:border-orange-400"
              />
              <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                <span>0 (None)</span>
                <span>10 (Critical)</span>
              </div>
            </div>
          </div>

          {/* Results Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
              <p className="text-xs font-mono text-slate-400 mb-1">Standard Prediction</p>
              <p className="text-2xl font-mono text-slate-200">{basePrediction.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-slate-500 mt-1">Vehicles / Hour</p>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </div>
              <p className="text-xs font-mono text-blue-400 mb-1">Simulated Scenario</p>
              <p className="text-2xl font-mono text-blue-100">{simulatedPrediction.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-blue-400/50 mt-1">
                {simulatedPrediction > basePrediction 
                  ? `+${(((simulatedPrediction / basePrediction) - 1) * 100).toFixed(1)}% Volume` 
                  : 'No Impact'}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 pt-6 mt-4">
            <h3 className="text-xs font-mono text-slate-400 mb-4 flex items-center">
              <TrendingUp className="w-3 h-3 mr-2" />
              6-Hour Projection
            </h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={40} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Line type="monotone" dataKey="predicted" name="Standard" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="simulated" name="Simulated" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
