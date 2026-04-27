import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Activity, Eye, Thermometer, Layers } from "lucide-react";

interface RoadSegment {
  id: string;
  name: string;
  coordinates: [number, number][];
  currentVolume: number;
  historicalAverage: number;
  confidence: number;
  status: "normal" | "high" | "critical" | "low" | "moderate";
}

const HeatmapContainer = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapStyle, setMapStyle] = useState("cyberpunk");
  const [roadSegments, setRoadSegments] = useState<RoadSegment[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Fetch road segments from backend
  useEffect(() => {
    const fetchRoadSegments = async () => {
      setIsLoading(true);
      setLoadingError(null);
      try {
        const response = await fetch('/api/road-segments');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRoadSegments(data);
      } catch (err) {
        console.error('Failed to fetch road segments:', err);
        setLoadingError('Failed to load road data. Is the backend running?');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoadSegments();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [44.9778, -93.2650],
        zoom: 12,
        zoomControl: true,
      });

      // Apply cyberpunk theme to tiles
      const tileUrl = mapStyle === "cyberpunk" 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Add road segments to map
      roadSegments.forEach((segment) => {
        const color = segment.currentVolume > segment.historicalAverage 
          ? "#ef4444" // Red for above average
          : segment.currentVolume < segment.historicalAverage * 0.8
            ? "#10b981" // Green for below average
            : "#f59e0b"; // Yellow for near average

        // Draw road segment lines
        const polyline = L.polyline(segment.coordinates, {
          color: color,
          weight: 6,
          opacity: 0.8,
          smooth: true,
        });

        // Add segment marker
        const marker = L.circleMarker(segment.coordinates[0], {
          radius: 8,
          fillColor: color,
          color: color.replace("0.8", "1"), // Darken border color
          weight: 2,
          opacity: 0.7,
          fillOpacity: 0.6,
        }).addTo(map);

        // Add popup for segment
        const popupContent = `
          <div style="font-family: 'Courier New', monospace; padding: 8px; background: rgba(0,0,0,0.9);">
            <div style="font-weight: bold; color: #00ffff; margin-bottom: 4px;">${segment.name}</div>
            <div style="color: #ffffff; margin-bottom: 8px;">Current Volume: <span style="color: ${color};">${segment.currentVolume}</span></div>
            <div style="color: #ffffff; margin-bottom: 4px;">Historical Avg: <span style="color: #888;">${segment.historicalAverage}</span></div>
            <div style="color: #ffffff; margin-bottom: 4px;">Confidence: <span style="color: ${segment.confidence > 95 ? '#00ff00' : segment.confidence > 92 ? '#ffff00' : '#888888'};">${segment.confidence}%</span></div>
            <div style="color: #ffffff; margin-bottom: 4px;">Status: <span style="color: ${segment.status === 'critical' ? '#ff0000' : segment.status === 'high' ? '#ff6600' : '#fbbf24'};">${segment.status.toUpperCase()}</span></div>
            <div style="color: #00ffff; margin-top: 8px; font-size: 10px; text-align: center;">
              ${(segment.currentVolume > segment.historicalAverage ? 'ABOVE' : segment.currentVolume < segment.historicalAverage * 0.8 ? 'BELOW' : 'NEAR')} AVERAGE
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
      });

      mapInstanceRef.current = map;
    };

    initMap();
  }, [mapStyle, roadSegments]);

  // Fetch heatmap data from API
  useEffect(() => {
    const fetchHeatmapData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/heatmap', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setHeatmapData(data);
        } else {
          console.error('Failed to fetch heatmap data');
        }
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeatmapData();
    const interval = setInterval(fetchHeatmapData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle segment hover
  const handleSegmentHover = (segmentId: string) => {
    setSelectedSegment(segmentId);
  };

  const handleSegmentLeave = () => {
    setSelectedSegment(null);
  };

  const getSegmentColor = (segment: any) => {
    if (segment.currentVolume > segment.historicalAverage) return "#ef4444";
    if (segment.currentVolume < segment.historicalAverage * 0.8) return "#10b981";
    return "#f59e0b";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0">
        {/* Circuit pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-20 h-20 border border-cyan-500/30 rounded-full animate-pulse" />
          <div className="absolute top-40 right-20 w-16 h-16 border border-cyan-500/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 left-20 w-24 h-24 border border-cyan-500/30 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-60 right-40 w-32 h-32 border border-cyan-500/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        </div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iZGZlbnM9IjEiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAiIGZpbGw9Im5vbmUiPjwvc3ZnPg==')] opacity-10" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="text-center">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent mb-4 animate-pulse">
              SPATIAL HEATMAP
            </h1>
            <p className="text-xl text-gray-400">
              Real-time traffic visualization • Interactive road segment analysis
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map Container */}
          <div className="lg:col-span-3">
            <Card className="bg-slate-900/90 backdrop-blur-lg border-cyan-500/30 shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  <CardTitle className="text-xl text-cyan-400">Interactive Heatmap</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      {roadSegments.length} Segments
                    </Badge>
                    <Button
                      onClick={() => fetchHeatmapData()}
                      disabled={isLoading}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="relative">
                  <div
                    ref={mapRef}
                    className="h-[600px] w-full rounded-lg border-2 border-cyan-500/30"
                    style={{ 
                      backgroundColor: mapStyle === "cyberpunk" ? "#0a0a0a" : "#1a1a1a"
                    }}
                  >
                    {/* Loading Overlay */}
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 rounded-lg">
                        <div className="text-cyan-400 animate-pulse">Loading heatmap data...</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/90 backdrop-blur-lg border-cyan-500/30 shadow-2xl">
              <CardHeader className="pb-4">
                <Thermometer className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-xl text-cyan-400">Volume Legend</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm text-gray-400">Critical (&gt; 4k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                  <span className="text-sm text-gray-400">Moderate (2k-4k)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-400">Normal (&lt; 2k)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Segment Info */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/90 backdrop-blur-lg border-cyan-500/30 shadow-2xl">
              <CardHeader className="pb-4">
                <Eye className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-xl text-cyan-400">Segment Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {selectedSegment ? (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-cyan-400 mb-2">
                      {roadSegments.find(s => s.id === selectedSegment)?.name}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Volume:</span>
                        <div className="font-semibold text-white">
                          {roadSegments.find(s => s.id === selectedSegment)?.currentVolume}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Historical Avg:</span>
                        <div className="font-semibold text-white">
                          {roadSegments.find(s => s.id === selectedSegment)?.historicalAverage}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <div className="font-semibold text-white">
                          {roadSegments.find(s => s.id === selectedSegment)?.confidence}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge variant={
                          roadSegments.find(s => s.id === selectedSegment)?.status === "critical" ? "destructive" :
                          roadSegments.find(s => s.id === selectedSegment)?.status === "high" ? "default" : "secondary"
                        }>
                          {roadSegments.find(s => s.id === selectedSegment)?.status?.toUpperCase()}
                        </Badge>
                      </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Hover over a road segment to see detailed analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/90 backdrop-blur-lg border-cyan-500/30 shadow-2xl">
              <CardHeader className="pb-4">
                <Layers className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-xl text-cyan-400">Map Controls</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Theme:</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setMapStyle("cyberpunk")}
                      variant={mapStyle === "cyberpunk" ? "default" : "outline"}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded"
                    >
                      Cyberpunk
                    </Button>
                    <Button
                      onClick={() => setMapStyle("light")}
                      variant={mapStyle === "light" ? "default" : "outline"}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                    >
                      Light
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Source:</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                    Live API
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Update:</span>
                  <span className="font-semibold text-white">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapContainer;
