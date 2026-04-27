'use client'

import { useState, useEffect } from 'react'
import { Map, Leaf, Clock, Zap } from 'lucide-react'

export default function RouteRecommendations() {
  const [routes, setRoutes] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/routes')
        const data = await res.json()
        setRoutes(data)
      } catch (error) {
        console.error('Failed to fetch routes', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoutes()
  }, [])

  if (loading || !routes) {
    return (
      <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col justify-center items-center h-[280px]" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-xs font-mono text-slate-400">Analyzing Network Topology...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border backdrop-blur-sm p-6 flex flex-col fade-in h-full" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-mono font-semibold text-foreground flex items-center">
          <Map className="w-4 h-4 mr-2 text-blue-400" />
          Multi-Modal Route Intelligence
        </h3>
        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-mono rounded border border-green-500/20 flex items-center">
          <Leaf className="w-3 h-3 mr-1" />
          Eco-Mode Active
        </span>
      </div>

      <div className="space-y-4 flex-1">
        {/* Primary Route */}
        <div className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-all hover:bg-slate-800">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-mono font-bold text-slate-200">{routes.primary.name}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-1">Default Navigation Path</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-orange-400 flex items-center justify-end">
                <Clock className="w-4 h-4 mr-1" />
                {routes.primary.eta_mins} min
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Distance</p>
              <p className="text-xs text-slate-300 font-mono">{routes.primary.distance_km} km</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Congestion</p>
              <p className="text-xs text-orange-400 font-mono flex items-center">
                <Zap className="w-3 h-3 mr-1" />
                {routes.primary.congestion_level}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Est. CO₂</p>
              <p className="text-xs text-slate-300 font-mono">{routes.primary.co2_emissions_g}g</p>
            </div>
          </div>
        </div>

        {/* Alternative Route */}
        <div className="relative overflow-hidden rounded-lg border border-green-500/30 bg-green-950/20 p-4 transition-all hover:bg-green-900/30">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl"></div>
          
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div>
              <p className="text-sm font-mono font-bold text-green-400">{routes.alternative.name}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-1">Recommended Alternative</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-mono font-bold text-green-400 flex items-center justify-end">
                <Clock className="w-4 h-4 mr-1" />
                {routes.alternative.eta_mins} min
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-green-500/20 relative z-10">
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Distance</p>
              <p className="text-xs text-slate-300 font-mono">{routes.alternative.distance_km} km</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Congestion</p>
              <p className="text-xs text-green-400 font-mono">{routes.alternative.congestion_level}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-mono">Est. CO₂</p>
              <p className="text-xs text-green-400 font-mono flex items-center">
                <Leaf className="w-3 h-3 mr-1" />
                {routes.alternative.co2_emissions_g}g
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
