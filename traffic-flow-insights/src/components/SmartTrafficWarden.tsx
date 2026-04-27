import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Cloud, CloudRain, CloudSnow, Zap, Shield, Eye, Clock, TrendingUp, TreePine, Activity } from "lucide-react";

const SmartTrafficWarden = () => {
  const [weatherMode, setWeatherMode] = useState("Clear");
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [congestionScore, setCongestionScore] = useState(0.45);
  const [lastAuditTime, setLastAuditTime] = useState(new Date().toLocaleTimeString());
  const [treesSaved, setTreesSaved] = useState(0);
  const [showReroute, setShowReroute] = useState(false);

  // Weather simulation effect
  useEffect(() => {
    const fetchWeatherPrediction = async () => {
      try {
        const response = await fetch('/api/weather-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weather_condition: weatherMode,
            location: "Minneapolis",
            timestamp: new Date().toISOString()
          })
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentPrediction(data);
          
          // Update congestion score based on prediction
          if (data.prediction_level === "High") {
            setCongestionScore(0.85);
            setShowReroute(true);
          } else if (data.prediction_level === "Moderate") {
            setCongestionScore(0.65);
            setShowReroute(false);
          } else {
            setCongestionScore(0.35);
            setShowReroute(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch weather prediction:', error);
      }
    };

    fetchWeatherPrediction();
    const interval = setInterval(fetchWeatherPrediction, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [weatherMode]);

  // Update last audit time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastAuditTime(new Date().toLocaleTimeString());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate trees saved when reroute is recommended
  useEffect(() => {
    if (showReroute && congestionScore > 0.7) {
      const treesSaved = Math.floor(congestionScore * 50);
      setTreesSaved(treesSaved);
    }
  }, [showReroute, congestionScore]);

  const getWeatherIcon = () => {
    switch (weatherMode) {
      case "Clear": return <Cloud className="h-5 w-5 text-yellow-400" />;
      case "Rain": return <CloudRain className="h-5 w-5 text-blue-400" />;
      case "Snow": return <CloudSnow className="h-5 w-5 text-blue-200" />;
      case "Squall": return <Cloud className="h-5 w-5 text-gray-400" />;
      default: return <Cloud className="h-5 w-5 text-gray-300" />;
    }
  };

  const getWeatherBackground = () => {
    switch (weatherMode) {
      case "Clear": return "from-yellow-100 via-orange-100 to-yellow-50";
      case "Rain": return "from-blue-100 via-blue-200 to-blue-50";
      case "Snow": return "from-blue-50 via-blue-100 to-blue-200";
      case "Squall": return "from-gray-100 via-gray-200 to-gray-50";
      default: return "from-gray-50 via-gray-100 to-gray-50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iZGZlbnM9IjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAiIGZpbGw9Im5vbmUiPjwvc3ZnPg==')] opacity-5" />
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-10 left-10 w-4 h-4 bg-blue-500 rounded-full opacity-20"
          animate={{
            x: [0, 100, 0, 100],
            y: [0, 50, 100, 50],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-20 right-20 w-6 h-6 bg-green-500 rounded-full opacity-30"
          animate={{
            x: [0, -50, 50, -50, 0],
            y: [0, 30, 60, 30],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-4">
              SMART TRAFFIC WARDEN
            </h1>
            <p className="text-xl text-gray-400">
              Decision Support System • Real-time Weather Intelligence
            </p>
          </div>
        </div>

        {/* Main Control Panel */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weather Simulation Control */}
          <div className="lg:col-span-1">
            <Card className={`bg-gradient-to-br ${getWeatherBackground()} border-2 shadow-2xl`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWeatherIcon()}
                    <CardTitle className="text-xl text-gray-900">Weather Simulation</CardTitle>
                  </div>
                  <Select value={weatherMode} onValueChange={setWeatherMode}>
                    <SelectTrigger className="bg-white/90 border-gray-700">
                      <SelectValue placeholder="Select weather" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clear">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          <span>Clear</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Rain">
                        <div className="flex items-center gap-2">
                          <CloudRain className="h-4 w-4" />
                          <span>Rain</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Snow">
                        <div className="flex items-center gap-2">
                          <CloudSnow className="h-4 w-4" />
                          <span>Snow</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Squall">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-4 w-4" />
                          <span>Squall</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Weather:</span>
                    <div className="flex items-center gap-2">
                      {getWeatherIcon()}
                      <span className="font-semibold text-gray-900">{weatherMode}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prediction Level:</span>
                    <Badge variant={
                      currentPrediction?.prediction_level === "High" ? "destructive" :
                      currentPrediction?.prediction_level === "Moderate" ? "default" : "secondary"
                    }>
                      {currentPrediction?.prediction_level || "No Data"}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="font-semibold text-gray-900">
                      {currentPrediction?.confidence ? `${(currentPrediction.confidence * 100).toFixed(0)}%` : "N/A"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Impact Duration:</span>
                    <span className="font-semibold text-gray-900">
                      {currentPrediction?.impact_duration || "N/A"} min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Decision Support Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/90 backdrop-blur-lg border-2 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl text-gray-900">Decision Support</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {showReroute && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-semibold text-red-700">High Congestion Detected</div>
                          <div className="text-sm text-red-600">
                            AI recommends rerouting to optimize traffic flow
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Route:</span>
                        <Badge variant="destructive">Suboptimal</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Alternative Available:</span>
                        <Badge variant="default">Highway 35W</Badge>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => setShowReroute(false)}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Reroute Recommended
                    </Button>
                  </div>
                  ) : (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-semibold text-green-700">Traffic Flow Optimal</div>
                          <div className="text-sm text-green-600">
                            Current route conditions are within acceptable parameters
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Current Route:</span>
                        <Badge variant="default">Optimal</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant="secondary">Monitoring Active</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sustainability Impact Card */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <TreePine className="h-5 w-5 text-white" />
                  <CardTitle className="text-xl">Sustainability Impact</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80">Trees Saved:</span>
                    <motion.div
                      className="text-3xl font-bold text-white"
                      animate={{
                        scale: [1, 1.2, 1],
                        transition: { duration: 0.5, repeat: 1 }
                      }}
                    >
                      {treesSaved}
                    </motion.div>
                  </div>
                  
                  <div className="text-sm text-white/70">
                    by following AI-recommended routes
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80">CO₂ Reduction:</span>
                    <div className="text-2xl font-bold text-white">
                      {(treesSaved * 22).toFixed(1)} kg/day
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80">Energy Saved:</span>
                    <div className="text-2xl font-bold text-white">
                      {(treesSaved * 42).toFixed(0)} kWh
                    </div>
                  </div>
                  
                  <div className="mt-4 p-4 bg-white/20 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Environmental Impact This Month
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Equivalent Cars:</span>
                          <div className="font-bold text-gray-900">{(treesSaved * 0.8).toFixed(1)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Homes Powered:</span>
                          <div className="font-bold text-gray-900">{(treesSaved * 0.3).toFixed(1)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Trees Planted:</span>
                          <div className="font-bold text-green-400">{treesSaved}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Status Card */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/90 backdrop-blur-lg border-2 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Clock className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-xl text-gray-100">System Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Last System Audit:</span>
                    <span className="font-semibold text-gray-100">{lastAuditTime}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Congestion Score:</span>
                    <motion.div
                      className="text-2xl font-bold text-cyan-400"
                      animate={{
                        scale: [1, 1.1 + congestionScore * 0.2, 1],
                        transition: { duration: 0.3, repeat: 1 }
                      }}
                    >
                      {(congestionScore * 100).toFixed(0)}
                    </motion.div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Active Modules:</span>
                    <div className="flex gap-2">
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/50">
                        Weather AI
                      </Badge>
                      <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                        Decision Engine
                      </Badge>
                      <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                        Carbon Tracker
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">System Health:</span>
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                      Operational
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Data Stream:</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-semibold text-green-400">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartTrafficWarden;
