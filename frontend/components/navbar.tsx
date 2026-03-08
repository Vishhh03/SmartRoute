'use client'

import { MapPin, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const [currentTime, setCurrentTime] = useState<string>('--:--:-- --')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setCurrentTime(new Date().toLocaleTimeString())
  }, [])

  return (
    <nav className="border-b border-slate-700/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-6 space-y-4">
        {/* Top Row - Logo and Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-mono font-bold text-foreground">SmartRoute</h1>
            <span className="text-xs text-muted-foreground font-mono mx-2">/</span>
            <span className="text-xs text-muted-foreground font-mono">Traffic Analytics</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {isMounted ? currentTime : '--:--:-- --'}
          </div>
        </div>

        {/* Bottom Row - Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 pulse-subtle"></span>
            <span className="text-foreground font-semibold">LIVE</span>
          </div>

          {/* Model Accuracy */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-sm" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <span className="text-muted-foreground">R²:</span>
            <span className="text-blue-400 font-medium">0.844</span>
          </div>

          {/* Dataset Info */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-sm" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <span className="text-muted-foreground">Records:</span>
            <span className="text-cyan-400 font-medium">8,936</span>
          </div>

          {/* Last Updated */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg border backdrop-blur-sm" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            <Zap className="w-3 h-3 text-yellow-400" />
            <span className="text-muted-foreground">Updated 2s ago</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
