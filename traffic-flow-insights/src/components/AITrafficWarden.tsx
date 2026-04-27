import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Shield, Activity, Zap, AlertCircle, TrendingUp, Clock, Wind } from "lucide-react";

const AITrafficWarden = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [impactSolver, setImpactSolver] = useState({ visible: false, anomaly: null, carbonCost: 0 });
  const [congestionProbability, setCongestionProbability] = useState(0.65);
  const [isPulsing, setIsPulsing] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState("Clear");
  const [roadSegment, setRoadSegment] = useState("Highway-35");

  // Fetch anomaly data from /api/peak-hours
  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const response = await fetch('/api/peak-hours', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Filter for non-standard traffic behavior
          const anomalyData = data.filter(item => 
            item.is_anomaly || 
            item.deviation_score > 2.0 ||
            item.weather_type === "Heavy Rain" ||
            item.road_segment.includes("Construction")
          );
          
          setAnomalies(anomalyData);
          
          // Update congestion probability based on anomalies
          const highCongestionCount = anomalyData.filter(a => a.severity === "Critical").length;
          setCongestionProbability(Math.min(0.95, 0.3 + (highCongestionCount * 0.15)));
          setIsPulsing(highCongestionCount > 0);
        }
      } catch (error) {
        console.error('Failed to fetch anomalies:', error);
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle anomaly selection for impact solver
  const handleAnomalyClick = async (anomaly) => {
    setSelectedAnomaly(anomaly);
    
    // Calculate carbon cost using carbon_calculator.py
    try {
      const carbonResponse = await fetch('/api/carbon-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delay_minutes: anomaly.estimated_delay,
          vehicle_count: anomaly.affected_vehicles,
          weather_condition: anomaly.weather_type,
          road_segment: anomaly.road_segment
        })
      });
      
      if (carbonResponse.ok) {
        const carbonData = await carbonResponse.json();
        setImpactSolver({
          visible: true,
          anomaly: anomaly,
          carbonCost: carbonData.carbon_cost_kg
        });
      }
    } catch (error) {
      console.error('Failed to calculate carbon cost:', error);
    }
  };

  // Get anomaly severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'text-red-400 border-red-500 bg-red-500/10';
      case 'High': return 'text-orange-400 border-orange-500 bg-orange-500/10';
      case 'Medium': return 'text-yellow-400 border-yellow-500 bg-yellow-500/10';
      default: return 'text-blue-400 border-blue-500 bg-blue-500/10';
    }
  };

  // Get out of bounds indicator
  const getOutOfBoundsIndicator = (anomaly) => {
    const deviation = Math.abs(anomaly.deviation_score);
    if (deviation > 3.0) return { text: 'SEVERE', color: 'text-red-500' };
    if (deviation > 2.0) return { text: 'HIGH', color: 'text-orange-500' };
    if (deviation > 1.5) return { text: 'MODERATE', color: 'text-yellow-500' };
    return { text: 'MONITOR', color: 'text-blue-500' };
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-red-900/20 via-black to-orange-900/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iZGZlbnM9IjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAiIGZpbGw9Im5vbmUiPjwvc3ZnPg==')] opacity-10 pointer-events-none" />
      
      {/* Scanning Animation */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-4 animate-pulse">
              AI TRAFFIC WARDEN
            </h1>
            <p className="text-xl text-gray-400">
              Emergency Response Center • Real-time Anomaly Detection
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Anomaly Feed */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-900/80 backdrop-blur-lg border-red-500/30 shadow-2xl shadow-red-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <CardTitle className="text-xl text-red-400">Anomaly Feed</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isPulsing ? 'bg-red-500 animate-ping' : 'bg-green-500'}`} />
                  <span className="text-sm text-gray-400">
                    {isPulsing ? 'Anomalies Detected' : 'System Normal'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {anomalies.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
                      <p className="text-gray-400">No anomalies detected</p>
                      <p className="text-sm text-gray-500">System monitoring all traffic patterns</p>
                    </div>
                  ) : (
                    anomalies.map((anomaly, index) => {
                      const outOfBounds = getOutOfBoundsIndicator(anomaly);
                      return (
                        <div
                          key={index}
                          onClick={() => handleAnomalyClick(anomaly)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${getSeverityColor(anomaly.severity)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-semibold text-sm">{anomaly.anomaly_type}</div>
                              <div className="text-xs text-gray-400">{anomaly.road_segment}</div>
                            </div>
                            <div className={`text-xs font-bold ${outOfBounds.color}`}>
                              {outOfBounds.text}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400">Deviation:</span>
                              <span className="font-bold">+{anomaly.deviation_score.toFixed(1)}σ</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Delay:</span>
                              <span className="font-bold">{anomaly.estimated_delay}m</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Weather:</span>
                              <span className="font-bold">{anomaly.weather_type}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Vehicles:</span>
                              <span className="font-bold">{anomaly.affected_vehicles}</span>
                            </div>
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-300">
                            {anomaly.timestamp}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center - Circular Radar */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900/80 backdrop-blur-lg border-orange-500/30 shadow-2xl shadow-orange-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-400" />
                  <CardTitle className="text-xl text-orange-400">Congestion Radar</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${isPulsing ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                  <span className="text-sm text-gray-400">
                    {congestionProbability > 0.8 ? 'High Probability' : 
                     congestionProbability > 0.6 ? 'Moderate Probability' : 'Low Probability'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  {/* Circular Radar Visualization */}
                  <div className={`w-64 h-64 mx-auto relative ${isPulsing ? 'animate-pulse' : ''}`}>
                    {/* Outer ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-red-500/30" />
                    
                    {/* Middle ring */}
                    <div 
                      className="absolute inset-4 rounded-full border-4 border-orange-500/50 transition-all duration-500"
                      style={{
                        borderColor: `rgba(251, 146, 60, ${congestionProbability})`,
                        transform: `scale(${0.8 + congestionProbability * 0.4})`
                      }}
                    />
                    
                    {/* Inner core */}
                    <div 
                      className="absolute inset-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 transition-all duration-500"
                      style={{
                        transform: `scale(${0.5 + congestionProbability * 0.5})`
                      }}
                    />
                    
                    {/* Center pulse */}
                    {isPulsing && (
                      <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    )}
                    
                    {/* Probability text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">
                          {(congestionProbability * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-300">
                          CONGESTION
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Risk Level</div>
                      <div className={`text-lg font-bold ${
                        congestionProbability > 0.8 ? 'text-red-400' :
                        congestionProbability > 0.6 ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {congestionProbability > 0.8 ? 'CRITICAL' :
                         congestionProbability > 0.6 ? 'ELEVATED' : 'NORMAL'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-400">Active Anomalies</div>
                      <div className="text-lg font-bold text-red-400">
                        {anomalies.filter(a => a.severity === 'Critical').length}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Impact Solver */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-gray-900/80 backdrop-blur-lg border-yellow-500/30 shadow-2xl shadow-yellow-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <CardTitle className="text-xl text-yellow-400">Impact Solver</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {impactSolver.visible && impactSolver.anomaly ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="font-semibold text-red-400">Selected Anomaly</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        <div className="font-medium">{impactSolver.anomaly.anomaly_type}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {impactSolver.anomaly.road_segment} • {impactSolver.anomaly.weather_type}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-yellow-400" />
                        <span className="font-semibold text-yellow-400">Carbon Impact</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-400">
                        {impactSolver.carbonCost.toFixed(1)} kg CO₂
                      </div>
                      <div className="text-sm text-gray-400">
                        Estimated cost of traffic delay
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button 
                        onClick={() => setImpactSolver({ visible: false, anomaly: null, carbonCost: 0 })}
                        className="w-full bg-gray-700 hover:bg-gray-600"
                      >
                        Clear
                      </Button>
                      <Button 
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
                      >
                        Deploy Solution
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No anomaly selected</p>
                    <p className="text-sm text-gray-500">Click an anomaly to calculate impact</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-gray-900/80 backdrop-blur-lg border-green-500/30 shadow-2xl shadow-green-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  <CardTitle className="text-xl text-green-400">System Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Weather Condition:</span>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">{weatherCondition}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Road Segment:</span>
                    <span className="font-medium">{roadSegment}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Baseline Status:</span>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                      48k Records Active
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Last Update:</span>
                    <span className="font-medium">{new Date().toLocaleTimeString()}</span>
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

export default AITrafficWarden;
