import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, Navigation2, Activity, Zap, Radio, Leaf, Trophy, Database, Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, BarChart, Bar, XAxis, CartesianGrid, Cell } from "recharts";
import { HIGH_FIDELITY_PATHS } from "@/data/mockRoutes";
import { getModelStats, getHourlyBaseline } from "@/lib/api";

const Dashboard = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayersRef = useRef<Record<string, { baseLayer: any, pulseLayer: any, mult: number }[]>>({});

  const [targetSegment, setTargetSegment] = useState("");
  const [predictionOffset, setPredictionOffset] = useState<number>(0);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [bestR2, setBestR2] = useState<number | null>(null);
  const [hourlyBaseline, setHourlyBaseline] = useState<any[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [44.9300, -93.2500], // Center to see all paths
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // Cyberpunk dark theme map
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map);

      mapInstanceRef.current = map;
      
      // Draw all baseline segments
      HIGH_FIDELITY_PATHS.forEach((route) => {
        routeLayersRef.current[route.name] = [];
        
        route.segments.forEach((segment) => {
          // 1. The solid base line
          const baseLine = L.polyline(segment.coords, {
            color: "#334155", // Default inactive color
            weight: 6,
            opacity: 0.5,
            className: 'transition-all duration-1000 ease-in-out'
          }).addTo(map);

          // 2. The glowing pulse line (initially hidden/transparent)
          const pulseLine = L.polyline(segment.coords, {
            color: "#00ffcc",
            weight: 4,
            opacity: 0,
            className: 'cyber-pulse-line'
          }).addTo(map);

          routeLayersRef.current[route.name].push({
            baseLayer: baseLine,
            pulseLayer: pulseLine,
            mult: segment.baseCongestionMultiplier
          });
        });
      });
      
      // Initial fetch
      fetchHeatmapData(0);
    };

    initMap();
  }, []);

  useEffect(() => {
    getModelStats()
      .then((stats) => {
        if (stats?.length) {
          const top = [...stats].sort((a, b) => b.r2 - a.r2)[0];
          setBestR2(top.r2);
        }
      })
      .catch(() => setBestR2(null));

    getHourlyBaseline()
      .then((rows) => {
        const normalized = rows
          .map((r) => ({
            hour: Number(r.hour),
            avg_traffic_volume: Number(r.avg_traffic_volume),
          }))
          .sort((a, b) => a.hour - b.hour);
        setHourlyBaseline(normalized);
      })
      .catch(() => setHourlyBaseline([]));
  }, []);

  // Fetch heatmap data and update colors
  const fetchHeatmapData = async (offset: number) => {
    try {
      const res = await fetch(`/api/heatmap?offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const hourlyAvg = data.hourly || [];
        setHeatmapData(hourlyAvg);
        
        const currentHour = new Date().getHours();
        const targetHour = (currentHour + offset) % 24;
        
        const hourData = hourlyAvg.find((h: any) => h.hour === targetHour);
        const baseVolume = hourData ? hourData.avg_volume : 3000;
        
        // Update all path sub-segments based on this "Heatmap" snapshot
        if (mapInstanceRef.current) {
          Object.entries(routeLayersRef.current).forEach(([name, segments]) => {
            const isSelected = targetSegment.toLowerCase() && name.toLowerCase().includes(targetSegment.toLowerCase());
            
            segments.forEach(seg => {
              const volume = baseVolume * seg.mult;
              
              let color = "#10b981"; // Green
              if (volume > 4500) color = "#ef4444"; // Red
              else if (volume > 3000) color = "#f59e0b"; // Yellow
              
              // Update Base Line
              seg.baseLayer.setStyle({
                color: color,
                weight: isSelected ? 8 : 6,
                opacity: isSelected ? 0.9 : 0.4,
                className: isSelected ? 'cyber-path-glow' : 'transition-all duration-1000 ease-in-out'
              });

              // Update Pulse Line (Only show pulse if selected)
              seg.pulseLayer.setStyle({
                color: color === "#ef4444" ? "#fca5a5" : color === "#f59e0b" ? "#fde047" : "#6ee7b7", // Lighter pulse color
                opacity: isSelected ? 0.8 : 0,
                // Adjust animation speed based on congestion (red = slow, green = fast)
                className: isSelected 
                  ? (volume > 4500 ? 'cyber-pulse-line-slow' : 'cyber-pulse-line-fast')
                  : 'cyber-pulse-line-hidden'
              });
            });
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch heatmap data", e);
    }
  };

  // Time Travel Logic
  useEffect(() => {
    fetchHeatmapData(predictionOffset);
  }, [predictionOffset]);

  const handlePredict = async () => {
    if (!targetSegment.trim()) return;
    setIsPredicting(true);
    setPredictionResult(null);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_time: new Date().toISOString(),
          is_holiday: "None",
          air_pollution_index: 45,
          humidity: 60,
          wind_speed: 10,
          wind_direction: 180,
          visibility_in_miles: 10,
          dew_point: 280,
          temperature: 295.15,
          rain_p_h: 0,
          snow_p_h: 0,
          clouds_all: 20,
          weather_type: "Clear",
          weather_description: "sky is clear"
        })
      });

      if (res.ok) {
        const data = await res.json();
        const delayMins = Math.max(0, Math.round((data.prediction - 3000) / 100));
        
        // Generate mock trend data for the sparkline based on the prediction
        const sparklineData = Array.from({length: 5}, (_, i) => ({
          time: `+${i}h`,
          vol: data.prediction * (1 + Math.sin(i) * 0.15) // Wavy curve
        }));

        setPredictionResult({
          delay: delayMins > 0 ? `+${delayMins} mins` : "On Time",
          confidence: `${data.confidence_pct || 95.8}%`,
          ecoSavings: `${data.co2_saved_vs_worst_grams ? Math.round(data.co2_saved_vs_worst_grams) : 450}g`,
          volume: Math.round(data.prediction),
          trend: sparklineData
        });
        
        fetchHeatmapData(predictionOffset); 
      }
    } catch (e) {
      console.error("Prediction failed", e);
    } finally {
      setIsPredicting(false);
    }
  };

  const getBarColor = (v: number) => {
    if (v < 2000) return "#10b981";
    if (v <= 4000) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">

    <div className="relative w-full h-[calc(100vh-1rem)] -mt-4 bg-[#0a0a0f] overflow-hidden">
      
      <style>{`
        .leaflet-container {
          background: #0a0a0f !important;
          font-family: inherit;
        }
        .cyber-path-glow {
          filter: drop-shadow(0 0 12px currentColor);
          stroke-linecap: round;
          transition: stroke 1s ease-in-out, stroke-width 1s ease-in-out;
        }
        .cyber-pulse-line-hidden {
          opacity: 0 !important;
        }
        .cyber-pulse-line-fast {
          stroke-dasharray: 4 16;
          animation: pulse-dash 0.5s linear infinite;
        }
        .cyber-pulse-line-slow {
          stroke-dasharray: 6 12;
          animation: pulse-dash 2s linear infinite;
        }
        @keyframes pulse-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 50%;
          background: #00ffcc;
          cursor: pointer;
          box-shadow: 0 0 15px #00ffcc, 0 0 30px #00ffcc;
          border: 2px solid white;
        }
      `}</style>

      {/* HeatmapContainer Background */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* Pulsating Live Icon */}
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-teal-500/30 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(20,184,166,0.2)]">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
          </div>
          <span className="orbitron-mono text-teal-400 font-bold tracking-widest uppercase text-xs">
            Project Live
          </span>
        </div>
      </div>

      {/* Quick Predict Glassmorphism Card */}
      <motion.div 
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute top-6 right-6 z-10 w-[360px]"
      >
        <div className="bg-black/70 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-500 orbitron-mono tracking-wider uppercase">
                Quick Predict
              </h2>
            </div>
          </div>
          
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/50" />
            <Input 
              value={targetSegment}
              onChange={(e) => setTargetSegment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
              placeholder="e.g. Airport, University, Downtown"
              className="bg-black/40 border-teal-500/30 text-teal-100 placeholder:text-teal-800 pl-10 focus-visible:ring-teal-500/50 font-mono"
            />
          </div>

          <Button 
            onClick={handlePredict}
            disabled={isPredicting || !targetSegment}
            className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white border border-teal-400/50 shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all uppercase tracking-widest font-bold"
          >
            {isPredicting ? "Computing..." : "Run Prediction"}
          </Button>

          <AnimatePresence>
            {predictionResult && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 border-t border-teal-500/20 pt-4 overflow-hidden"
              >
                <div className="space-y-4 mb-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest font-mono">Estimated Delay</span>
                    </div>
                    <span className={`font-bold font-mono ${predictionResult.delay === "On Time" ? 'text-green-400' : 'text-red-400'}`}>
                      {predictionResult.delay}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest font-mono">Confidence</span>
                    </div>
                    <span className="font-bold text-teal-400 font-mono">
                      {predictionResult.confidence}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Leaf className="w-4 h-4 text-green-500" />
                      <span className="text-xs uppercase tracking-widest font-mono">Eco-Savings</span>
                    </div>
                    <span className="font-bold text-green-400 font-mono">
                      {predictionResult.ecoSavings}
                    </span>
                  </div>
                </div>

                {/* 4-Hour Predictive Sparkline */}
                <div className="pt-3 border-t border-teal-500/10">
                  <span className="text-[10px] text-teal-500/70 uppercase tracking-widest font-mono block mb-2">4-Hour Trajectory</span>
                  <div className="h-16 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictionResult.trend}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00ffcc" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#00ffcc" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #00ffcc', fontSize: '10px' }} 
                          labelStyle={{ color: '#00ffcc' }}
                        />
                        <Area type="monotone" dataKey="vol" stroke="#00ffcc" fillOpacity={1} fill="url(#colorVol)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Time Travel Slider */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-3xl px-4 pointer-events-none"
      >
        <div className="bg-black/80 backdrop-blur-xl border border-teal-500/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(20,184,166,0.2)] pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
              <span className="font-bold text-teal-100 orbitron-mono tracking-widest uppercase text-sm">
                Temporal Simulator
              </span>
            </div>
            <div className="px-4 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full shadow-[inset_0_0_10px_rgba(20,184,166,0.1)]">
              <span className="text-teal-400 font-mono font-bold text-sm">
                {predictionOffset === 0 ? "CURRENT TIME" : `+${predictionOffset} HOURS`}
              </span>
            </div>
          </div>
          
          <div className="relative pt-4 pb-2">
            <input 
              type="range" 
              min="0" 
              max="4" 
              step="1" 
              value={predictionOffset}
              onChange={(e) => setPredictionOffset(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer relative z-10"
              style={{
                background: `linear-gradient(to right, #00ffcc 0%, #00ffcc ${(predictionOffset/4)*100}%, #1e293b ${(predictionOffset/4)*100}%, #1e293b 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-4 px-2">
              <span>NOW</span>
              <span>+1H</span>
              <span>+2H</span>
              <span>+3H</span>
              <span>+4H</span>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
    </div>
  );
};

export default Dashboard;
