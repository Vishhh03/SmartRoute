import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, Navigation, Clock, Zap, Activity } from "lucide-react";

const PredictiveSimulation = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const pathPolylineRef = useRef<any>(null);
  const heatmapLayerRef = useRef<any>(null);

  const [destination, setDestination] = useState("");
  const [timeOffset, setTimeOffset] = useState(0);
  const [congestionIndex, setCongestionIndex] = useState(42.7);
  const [weatherImpact, setWeatherImpact] = useState(18.3);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictedPath, setPredictedPath] = useState<[number, number][]>([]);
  const [currentWeather, setCurrentWeather] = useState({ temp: 15, condition: "Cloudy" });

  // Minneapolis center coordinates
  const minneapolisCenter = [44.9778, -93.2650] as [number, number];

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: minneapolisCenter,
        zoom: 13,
        zoomControl: true,
      });

      // Cyberpunk themed tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Add some initial zones
      const zones = [
        { name: "Downtown", coords: [44.9778, -93.2650], congestion: 0.7 },
        { name: "North District", coords: [45.0000, -93.2650], congestion: 0.3 },
        { name: "East Corridor", coords: [44.9778, -93.2400], congestion: 0.5 },
        { name: "West Highway", coords: [44.9778, -93.2900], congestion: 0.8 },
        { name: "South Sector", coords: [44.9500, -93.2650], congestion: 0.4 },
      ];

      zones.forEach((zone) => {
        const marker = L.circleMarker(zone.coords as [number, number], {
          radius: 15,
          fillColor: zone.congestion > 0.6 ? "#ef4444" : zone.congestion > 0.3 ? "#f59e0b" : "#10b981",
          color: zone.congestion > 0.6 ? "#dc2626" : zone.congestion > 0.3 ? "#d97706" : "#059669",
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6,
        }).addTo(map);

        marker.bindTooltip(`${zone.name} - Congestion: ${(zone.congestion * 100).toFixed(0)}%`, {
          permanent: false,
          direction: "top",
          className: "cyberpunk-tooltip",
        });

        markersRef.current[zone.name] = marker;
      });

      mapInstanceRef.current = map;
    };

    initMap();
  }, []);

  // Time travel effect - update heatmap based on time offset
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const updateHeatmap = async () => {
      const L = await import("leaflet");
      
      // Remove existing heatmap
      if (heatmapLayerRef.current) {
        mapInstanceRef.current.removeLayer(heatmapLayerRef.current);
      }

      // Simulate hourly baseline changes
      const hour = (new Date().getHours() + timeOffset) % 24;
      const baselineIntensity = Math.sin((hour - 6) * Math.PI / 12) * 0.5 + 0.5;
      
      // Create heatmap data points
      const heatmapData: [number, number, number][] = [];
      for (let i = 0; i < 50; i++) {
        const lat = 44.9 + (Math.random() - 0.5) * 0.2;
        const lng = -93.2650 + (Math.random() - 0.5) * 0.2;
        const intensity = baselineIntensity * (0.5 + Math.random() * 0.5);
        
        heatmapData.push([lat, lng, intensity]);
      }

      // Create heatmap layer (simplified version)
      const heatLayer = L.layerGroup();
      heatmapData.forEach(([lat, lng, intensity]: [number, number, number]) => {
        const color = intensity > 0.7 ? "#ef4444" : intensity > 0.4 ? "#f59e0b" : "#10b981";
        const circle = L.circle([lat, lng], {
          radius: 200 * intensity,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.6,
          fillOpacity: 0.3,
        });
        heatLayer.addLayer(circle);
      });

      heatmapLayerRef.current = heatLayer;
      mapInstanceRef.current.addLayer(heatLayer);

      // Update congestion index based on time
      const newCongestionIndex = 30 + baselineIntensity * 40 + Math.random() * 10;
      setCongestionIndex(newCongestionIndex);
      
      // Update weather impact
      const weatherImpact = 15 + Math.sin(hour * Math.PI / 12) * 8 + Math.random() * 5;
      setWeatherImpact(weatherImpact);
    };

    updateHeatmap();
  }, [timeOffset]);

  // Quick predict function
  const handleQuickPredict = async () => {
    if (!destination.trim() || !mapInstanceRef.current) return;

    setIsPredicting(true);

    try {
      // Simulate prediction engine call
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          current_time: new Date().toISOString(),
          time_offset: timeOffset
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create predicted path
        const path: [number, number][] = [
          minneapolisCenter,
          [44.9700, -93.2500],
          [44.9600, -93.2400],
          [44.9500, -93.2300],
          [44.9400, -93.2200],
          [44.9300, -93.2100],
          [44.9200, -93.2000],
        ];

        setPredictedPath(path);

        // Draw path on map
        const L = await import("leaflet");
        
        if (pathPolylineRef.current) {
          mapInstanceRef.current.removeLayer(pathPolylineRef.current);
        }

        // Calculate path color based on congestion
        const avgCongestion = path.reduce((sum, point) => {
          const zone = Object.values(markersRef.current).find(marker => {
            const markerPos = marker.getLatLng();
            return Math.abs(markerPos.lat - point[0]) < 0.01 && Math.abs(markerPos.lng - point[1]) < 0.01;
          });
          return sum + (zone ? zone.options.fillColor === "#ef4444" ? 0.8 : 0.3 : 0);
        }, 0) / path.length;

        const pathColor = avgCongestion > 0.6 ? "#ef4444" : avgCongestion > 0.3 ? "#f59e0b" : "#10b981";

        const polyline = L.polyline(path, {
          color: pathColor,
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 5",
        }).addTo(mapInstanceRef.current);

        pathPolylineRef.current = polyline;

        // Add destination marker
        L.marker(path[path.length - 1], {
          icon: L.divIcon({
            html: `<div style="background: #00ff00; color: #000; padding: 4px; border-radius: 50%; font-size: 12px; font-weight: bold;">📍</div>`,
            className: 'cyberpunk-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(mapInstanceRef.current);

      } else {
        console.error('Prediction failed');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Cyberpunk Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20 pointer-events-none" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iZGZlbnM9IjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAiIGZpbGw9Im5vbmUiPjwvc3ZnPg==')] opacity-10 pointer-events-none" />
      
      <div className="relative z-10 p-6">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
              PREDICTIVE SIMULATION
            </h1>
            <p className="text-xl text-gray-400">
              Real-time traffic prediction powered by neural networks
            </p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1 space-y-4">
              {/* Quick Predict Card */}
              <Card className="bg-gray-900/80 backdrop-blur-lg border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Navigation className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-xl font-bold text-cyan-400">Quick Predict</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Destination</label>
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Enter destination..."
                        className="bg-black/50 border-cyan-500/50 text-cyan-400 placeholder-gray-600 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    
                    <Button
                      onClick={handleQuickPredict}
                      disabled={isPredicting || !destination.trim()}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold"
                    >
                      {isPredicting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
                          Predicting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Generate Path
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Live Metrics */}
              <Card className="bg-gray-900/80 backdrop-blur-lg border-purple-500/30 shadow-2xl shadow-purple-500/20">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-gray-400">Live Congestion Index</span>
                      </div>
                      <div className="text-3xl font-bold text-red-400">
                        {congestionIndex.toFixed(1)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-gray-400">Current Weather Impact</span>
                      </div>
                      <div className="text-3xl font-bold text-yellow-400">
                        {weatherImpact.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center - Map */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900/80 backdrop-blur-lg border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
                <CardContent className="p-2">
                  <div className="relative">
                    <div
                      ref={mapRef}
                      className="h-[600px] w-full rounded-lg border border-cyan-500/30"
                      style={{ backgroundColor: "#0a0a0a" }}
                    >
                      {/* Prediction Overlay */}
                      {isPredicting && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-lg">
                          <div className="text-center">
                            <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mb-4" />
                            <p className="text-cyan-400 font-bold">Analyzing traffic patterns...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Time Travel Slider */}
          <div className="mt-8">
            <Card className="bg-gray-900/80 backdrop-blur-lg border-purple-500/30 shadow-2xl shadow-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Clock className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-bold text-purple-400">Time Travel</h3>
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {timeOffset === 0 ? "Now" : `+${timeOffset} Hours`}
                  </Badge>
                </div>
                
                <div className="mt-4">
                  <Slider
                    value={[timeOffset]}
                    onValueChange={(value) => setTimeOffset(value[0])}
                    max={4}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Now</span>
                    <span>+1 Hour</span>
                    <span>+2 Hours</span>
                    <span>+3 Hours</span>
                    <span>+4 Hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Custom styles */}
      <style>{`
        .cyberpunk-tooltip {
          background: rgba(0, 0, 0, 0.9) !important;
          border: 1px solid #00ffff !important;
          color: #00ffff !important;
          font-family: 'Courier New', monospace !important;
        }
        .cyberpunk-marker {
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.8));
        }
      `}</style>
    </div>
  );
};

export default PredictiveSimulation;
