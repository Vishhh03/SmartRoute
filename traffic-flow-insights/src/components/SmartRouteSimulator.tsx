import { useEffect, useRef, useState } from "react";
import { Ambulance, AlertTriangle, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TrafficUpdate = {
  timestamp: string;
  zone: string;
  weather_type: string;
  temperature_celsius: number;
  humidity: number;
  predicted_volume: number;
  lower_bound: number;
  upper_bound: number;
  co2_saved_grams: number;
  badge: string;
  lat: number;
  lng: number;
  hour: number;
};

type Zone = {
  name: string;
  coordinates: [number, number];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};

// Define 10 zones across the city with their coordinates and bounds
const ZONES: Zone[] = [
  {
    name: "Zone A - Downtown",
    coordinates: [44.9778, -93.2650],
    bounds: { north: 44.9850, south: 44.9700, east: -93.2550, west: -93.2750 }
  },
  {
    name: "Zone B - North District",
    coordinates: [45.0000, -93.2650],
    bounds: { north: 45.0100, south: 44.9900, east: -93.2550, west: -93.2750 }
  },
  {
    name: "Zone C - East Corridor",
    coordinates: [44.9778, -93.2400],
    bounds: { north: 44.9850, south: 44.9700, east: -93.2300, west: -93.2500 }
  },
  {
    name: "Zone D - West Highway",
    coordinates: [44.9778, -93.2900],
    bounds: { north: 44.9850, south: 44.9700, east: -93.2800, west: -93.3000 }
  },
  {
    name: "Zone E - South Sector",
    coordinates: [44.9500, -93.2650],
    bounds: { north: 44.9600, south: 44.9400, east: -93.2550, west: -93.2750 }
  },
  {
    name: "Zone F - Northeast",
    coordinates: [44.9900, -93.2400],
    bounds: { north: 45.0000, south: 44.9800, east: -93.2300, west: -93.2500 }
  },
  {
    name: "Zone G - Northwest",
    coordinates: [44.9900, -93.2900],
    bounds: { north: 45.0000, south: 44.9800, east: -93.2800, west: -93.3000 }
  },
  {
    name: "Zone H - Southeast",
    coordinates: [44.9500, -93.2400],
    bounds: { north: 44.9600, south: 44.9400, east: -93.2300, west: -93.2500 }
  },
  {
    name: "Zone I - Southwest",
    coordinates: [44.9500, -93.2900],
    bounds: { north: 44.9600, south: 44.9400, east: -93.2800, west: -93.3000 }
  },
  {
    name: "Zone J - Central Hub",
    coordinates: [44.9800, -93.2650],
    bounds: { north: 44.9900, south: 44.9700, east: -93.2550, west: -93.2750 }
  }
];

// Define primary path (10 coordinates across the city)
const PRIMARY_PATH: [number, number][] = [
  [44.9700, -93.2900], // Zone I start
  [44.9700, -93.2650], // Zone I to Zone E
  [44.9500, -93.2650], // Zone E
  [44.9500, -93.2400], // Zone E to Zone H
  [44.9700, -93.2400], // Zone H to Zone A
  [44.9778, -93.2650], // Zone A
  [44.9800, -93.2650], // Zone A to Zone J
  [45.0000, -93.2650], // Zone J to Zone B
  [45.0000, -93.2400], // Zone B to Zone F
  [44.9900, -93.2400], // Zone F end
];

// Define secondary path for rerouting (avoids congested zones)
const SECONDARY_PATH: [number, number][] = [
  [44.9700, -93.2900], // Zone I start
  [44.9700, -93.2800], // Alternative route
  [44.9600, -93.2800], // Avoid Zone E
  [44.9600, -93.2500], // Alternative to Zone H
  [44.9800, -93.2500], // Alternative to Zone A
  [44.9850, -93.2650], // Alternative to Zone J
  [44.9850, -93.2700], // Avoid Zone B
  [44.9850, -93.2500], // Alternative to Zone F
  [44.9800, -93.2500], // Final approach
  [44.9900, -93.2400], // Zone F end
];

const SmartRouteSimulator = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const pathPolylineRef = useRef<any>(null);
  const ambulanceMarkerRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [currentPath, setCurrentPath] = useState(PRIMARY_PATH);
  const [ambulancePosition, setAmbulancePosition] = useState<[number, number] | null>(null);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [liveData, setLiveData] = useState<TrafficUpdate[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [reroutedZones, setReroutedZones] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, {
        center: [44.9778, -93.2650], // Minneapolis center
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "Â© OpenStreetMap Â© CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      // Add zone markers
      ZONES.forEach((zone) => {
        const marker = L.circleMarker(zone.coordinates, {
          radius: 10,
          fillColor: "#3b82f6",
          color: "#1e40af",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindTooltip(zone.name, {
          permanent: false,
          direction: "top",
          className: "custom-tooltip",
        });

        markersRef.current[zone.name] = marker;
      });

      // Draw primary path
      const polyline = L.polyline(PRIMARY_PATH, {
        color: "#10b981",
        weight: 4,
        opacity: 0.8,
        dashArray: "10, 5",
      }).addTo(map);

      pathPolylineRef.current = polyline;
      mapInstanceRef.current = map;
    };

    initMap();
  }, []);

  // WebSocket connection for live data
  useEffect(() => {
    const connectSocket = async () => {
      const { io } = await import("socket.io-client");
      const socket = io("http://localhost:5000", { path: "/socket.io", transports: ["polling"] });

      socketRef.current = socket;

      socket.on("connect", () => setConnectionStatus("connected"));
      socket.on("disconnect", () => setConnectionStatus("disconnected"));

      socket.on("traffic_update", (data: TrafficUpdate) => {
        // Map the incoming data to our zones
        const mappedData = {
          ...data,
          zone: ZONES[Math.floor(Math.random() * ZONES.length)].name,
          lat: ZONES[Math.floor(Math.random() * ZONES.length)].coordinates[0],
          lng: ZONES[Math.floor(Math.random() * ZONES.length)].coordinates[1],
        };

        setLiveData((prev) => [mappedData, ...prev].slice(0, 20));
      });
    };

    connectSocket();
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Check if position is within zone bounds
  const getZoneForPosition = (position: [number, number]): Zone | null => {
    return ZONES.find(zone => 
      position[0] >= zone.bounds.south &&
      position[0] <= zone.bounds.north &&
      position[1] >= zone.bounds.west &&
      position[1] <= zone.bounds.east
    ) || null;
  };

  // Check for congestion in current zone
  const checkCongestion = (zone: Zone | null): boolean => {
    if (!zone) return false;
    
    const zoneData = liveData.find(data => data.zone === zone.name);
    return zoneData ? zoneData.predicted_volume > 3500 : false;
  };

  // Add notification
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev].slice(0, 5));
  };

  // Start emergency run
  const startEmergencyRun = () => {
    setIsSimulationActive(true);
    setCurrentPathIndex(0);
    setAmbulancePosition(PRIMARY_PATH[0]);
    setCurrentPath(PRIMARY_PATH);
    setReroutedZones(new Set());
    setNotifications([]);
    addNotification("Emergency run started - Smart-Path routing activated");
  };

  // Vehicle movement logic
  useEffect(() => {
    if (!isSimulationActive || currentPath.length === 0) return;

    const moveInterval = setInterval(() => {
      setCurrentPathIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % currentPath.length;
        const nextPosition = currentPath[nextIndex];
        
        setAmbulancePosition(nextPosition);
        
        // Check which zone we're entering
        const zone = getZoneForPosition(nextPosition);
        setCurrentZone(zone);
        
        if (zone) {
          // Check for congestion
          const hasCongestion = checkCongestion(zone);
          
          if (hasCongestion && !reroutedZones.has(zone.name)) {
            // Add rerouted zone to tracking
            setReroutedZones(prev => new Set([...prev, zone.name]));
            
            // Add notification
            addNotification(`High Congestion Detected in ${zone.name} - Rerouting Vehicle`);
            
            // Switch to secondary path
            setCurrentPath(SECONDARY_PATH);
            
            // Update map visualization asynchronously
            (async () => {
              if (mapInstanceRef.current && pathPolylineRef.current) {
                const L = await import("leaflet");
                mapInstanceRef.current.removeLayer(pathPolylineRef.current);
                
                const newPolyline = L.polyline(SECONDARY_PATH, {
                  color: "#ef4444", // Red for rerouted path
                  weight: 4,
                  opacity: 0.8,
                  dashArray: "10, 5",
                }).addTo(mapInstanceRef.current);
                
                pathPolylineRef.current = newPolyline;
              }
            })();
          }
        }
        
        return nextIndex;
      });
    }, 800); // Movement speed

    return () => clearInterval(moveInterval);
  }, [isSimulationActive, currentPath, liveData, reroutedZones]);

  // Update ambulance marker
  useEffect(() => {
    if (!ambulancePosition || !mapInstanceRef.current) return;

    const updateAmbulanceMarker = async () => {
      const L = await import("leaflet");
      
      // Remove existing marker
      if (ambulanceMarkerRef.current) {
        mapInstanceRef.current.removeLayer(ambulanceMarkerRef.current);
      }
      
      // Create ambulance icon
      const ambulanceIcon = L.divIcon({
        html: `<div style="color: #0066ff; font-size: 24px; background: white; border-radius: 50%; padding: 3px; border: 3px solid #0066ff; animation: pulse 1.5s infinite;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9h18v6h-2v-4H5v4H3V9zm2 2h2v2H5v-2zm4 0h2v2H9v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z"/>
          </svg>
        </div>`,
        className: 'custom-ambulance-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      const marker = L.marker(ambulancePosition, { icon: ambulanceIcon }).addTo(mapInstanceRef.current);
      ambulanceMarkerRef.current = marker;
    };

    updateAmbulanceMarker();
  }, [ambulancePosition]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart-Path Live Simulation</h1>
          <p className="text-gray-600 mt-2">Ghost Vehicle Logic - Real-time traffic-aware routing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${
            connectionStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`} />
          <span className="text-sm text-gray-600">{connectionStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Simulation Map - Minneapolis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div
                  ref={mapRef}
                  className="h-[500px] w-full rounded-lg"
                  style={{ backgroundColor: "#1a1a1a" }}
                >
                  {isSimulationActive && (
                    <div className="absolute top-4 right-4 z-[1000] bg-blue-600/90 text-white px-3 py-2 rounded-lg text-sm font-semibold animate-pulse">
                      Smart-Path Active
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={startEmergencyRun}
                disabled={isSimulationActive}
                className="w-full"
                size="lg"
              >
                <Ambulance className="w-4 h-4 mr-2" />
                {isSimulationActive ? "Simulation Active" : "Start Emergency Run"}
              </Button>
              
              <div className="text-sm text-gray-600">
                <p className="font-semibold mb-2">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>1. Ambulance follows primary path</li>
                  <li>2. Detects congestion (&gt;3500 volume)</li>
                  <li>3. Automatically reroutes to secondary path</li>
                  <li>4. Proves ML-driven routing effectiveness</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Zone:</span>
                <Badge variant={currentZone ? "default" : "secondary"}>
                  {currentZone?.name || "None"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Path Type:</span>
                <Badge variant={currentPath === PRIMARY_PATH ? "default" : "destructive"}>
                  {currentPath === PRIMARY_PATH ? "Primary" : "Rerouted"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress:</span>
                <span className="text-sm font-medium">
                  {currentPathIndex + 1}/{currentPath.length}
                </span>
              </div>
              
              {reroutedZones.size > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Rerouted Zones:</span>
                  <Badge variant="destructive">
                    {reroutedZones.size}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No notifications yet
                  </p>
                ) : (
                  notifications.map((notification, index) => (
                    <div
                      key={index}
                      className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800"
                    >
                      {notification}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SmartRouteSimulator;
