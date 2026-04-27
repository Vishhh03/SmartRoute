'use client'

import { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Terminal, Server, Cpu, Database, Network } from 'lucide-react'

export default function SystemLogsDrawer() {
  const [healthData, setHealthData] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])

  const fetchHealth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/health')
      const data = await res.json()
      setHealthData(data)
      
      const newLog = `[${new Date().toISOString()}] Health check: ${data.status.toUpperCase()}`
      setLogs(prev => [newLog, ...prev].slice(0, 50))
    } catch (error) {
      const errorLog = `[${new Date().toISOString()}] ERROR: Connection to API failed`
      setLogs(prev => [errorLog, ...prev].slice(0, 50))
    }
  }

  // Poll health endpoint every 5 seconds when drawer might be open
  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 font-mono text-xs">
          <Terminal className="w-3 h-3 mr-2" />
          System Health & Logs
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-slate-950 border-slate-800 h-[80vh]">
        <div className="mx-auto w-full max-w-5xl h-full flex flex-col pt-4">
          <DrawerHeader>
            <DrawerTitle className="font-mono text-emerald-400 flex items-center">
              <Server className="w-5 h-5 mr-2" />
              Observability & API Health
            </DrawerTitle>
            <DrawerDescription className="font-mono text-slate-400">
              Real-time telemetry from the Flask backend and ML inference engines.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
            {/* System Metrics Panel */}
            <div className="lg:w-1/3 space-y-4 overflow-y-auto">
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Core Metrics
              </h3>
              
              {healthData ? (
                <div className="space-y-4">
                  <div className="bg-slate-900/50 border border-slate-800 rounded p-4">
                    <p className="text-xs text-slate-500 font-mono mb-2 flex items-center">
                      <Cpu className="w-3 h-3 mr-2" /> API Status
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${healthData.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                      <p className="text-lg font-mono text-slate-200 uppercase">{healthData.status}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 rounded p-4">
                    <p className="text-xs text-slate-500 font-mono mb-2 flex items-center">
                      <Database className="w-3 h-3 mr-2" /> Loaded Models
                    </p>
                    <ul className="space-y-2">
                      {Object.entries(healthData.models || {}).map(([model, isLoaded]: any) => (
                        <li key={model} className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300 capitalize">{model.replace('_', ' ')}</span>
                          <span className={isLoaded ? "text-emerald-400" : "text-red-400"}>
                            {isLoaded ? "ONLINE" : "OFFLINE"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {healthData.system && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded p-4">
                      <p className="text-xs text-slate-500 font-mono mb-2 flex items-center">
                        <Network className="w-3 h-3 mr-2" /> Telemetry
                      </p>
                      <ul className="space-y-2 text-xs font-mono">
                        <li className="flex justify-between">
                          <span className="text-slate-400">CPU Usage</span>
                          <span className="text-slate-200">{healthData.system.cpu_usage_pct}%</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400">Memory</span>
                          <span className="text-slate-200">{healthData.system.memory_usage_mb} MB</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400">WS Conns</span>
                          <span className="text-slate-200">{healthData.system.active_connections}</span>
                        </li>
                        <li className="flex justify-between pt-2 border-t border-slate-800 mt-2">
                          <span className="text-slate-400">Last Retrain</span>
                          <span className="text-slate-200">{new Date(healthData.system.last_retrain).toLocaleDateString()}</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-500 font-mono text-sm">
                  Waiting for telemetry...
                </div>
              )}
            </div>

            {/* Terminal Window */}
            <div className="lg:w-2/3 border border-slate-800 rounded bg-black/80 flex flex-col overflow-hidden font-mono">
              <div className="bg-slate-900 border-b border-slate-800 p-2 px-4 flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                <span className="ml-4 text-[10px] text-slate-500">root@smartroute-backend:~# tail -f /var/log/flask.log</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className={`text-xs ${log.includes('ERROR') ? 'text-red-400' : 'text-slate-400'}`}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
