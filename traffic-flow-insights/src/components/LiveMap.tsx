import { useEffect, useRef, useState } from "react";
import { Info, Car, Ambulance } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

type City = {
  name: string;
  center: [number, number];
  zoom: number;
  flag: string;
  zones: Record<string, [number, number]>;
  avgVolume: number;
};

const CITIES: Record<string, City> = {
  Minneapolis: {
    name: "Minneapolis",
    center: [44.9778, -93.2650],
    zoom: 12,
    flag: "",
    avgVolume: 3800,
    zones: {
      "Downtown":       [44.9778, -93.2650],
      "North Sector":   [45.0200, -93.2650],
      "East Corridor":  [44.9778, -93.1800],
      "West Highway":   [44.9778, -93.3500],
      "South District": [44.9200, -93.2650],
    },
  },
  Bangalore: {
    name: "Bangalore",
    center: [12.9716, 77.5946],
    zoom: 12,
    flag: "",
    avgVolume: 4200,
    zones: {
      "Silk Board Junction": [12.9172, 77.6228],
      "Hebbal Flyover": [13.0354, 77.5971],
      "Whitefield (ITPL)": [12.9856, 77.7380],
      "MG Road/Trinity Circle": [12.9738, 77.6119],
      "Koramangala": [12.9279, 77.6271],
    },
  },
  Chennai: {
    name: "Chennai",
    center: [13.0827, 80.2707],
    zoom: 12,
    flag: "",
    avgVolume: 3500,
    zones: {
      "T. Nagar (Pondy Bazaar)": [13.0405, 80.2337],
      "Anna Salai (Mount Road)": [13.0604, 80.2618],
      "OMR IT Corridor": [12.9674, 80.2489],
      "Kathipara Junction": [13.0135, 80.2013],
      "Adyar": [13.0033, 80.2555],
    },
  },
  Mumbai: {
    name: "Mumbai",
    center: [19.0760, 72.8777],
    zoom: 12,
    flag: "",
    avgVolume: 4500,
    zones: {
      "BKC Business District": [19.0658, 72.8631],
      "Western Express Highway (Andheri)": [19.1136, 72.8697],
      "Bandra-Worli Sea Link": [19.0360, 72.8172],
      "CST Station Area": [18.9398, 72.8354],
      "Powai": [19.1176, 72.9060],
    },
  },
};

const getColor = (volume: number): string => {
  if (volume < 2000) return "#10b981";
  if (volume < 4000) return "#f59e0b";
  return "#ef4444";
};

const getBadge = (volume: number): string => {
  if (volume < 2000) return "Light";
  if (volume < 4000) return "Moderate";
  return "Heavy";
};

// NOTE: WebSocket must connect directly - cannot use Vite proxy for WebSocket
const SOCKET_URL = window.location.origin;

const LiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const socketRef = useRef<any>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [updates, setUpdates] = useState<TrafficUpdate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [selectedZone, setSelectedZone] = useState<TrafficUpdate | null>(null);
  const [selectedCity, setSelectedCity] = useState("Minneapolis");
  const [stats, setStats] = useState({
    total: 0, avgVolume: 0, heavyZones: 0, co2Saved: 0,
  });

  // Live Routing Layer state
  const [activeRoute, setActiveRoute] = useState<[number, number][]>([]);
  const [vehiclePosition, setVehiclePosition] = useState<[number, number] | null>(null);
  const [vehicleIndex, setVehicleIndex] = useState(0);
  const [vehicleColor, setVehicleColor] = useState("green");
  const [vehicleSpeed, setVehicleSpeed] = useState(1000);
  const [isVehicleActive, setIsVehicleActive] = useState(false);
  const [routePolyline, setRoutePolyline] = useState<any>(null);
  const [vehicleMarker, setVehicleMarker] = useState<any>(null);

  // Emergency Response state
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyPath, setEmergencyPath] = useState<[number, number][]>([]);
  const [ambulancePosition, setAmbulancePosition] = useState<[number, number] | null>(null);
  const [ambulanceIndex, setAmbulanceIndex] = useState(0);
  const [emergencyPolyline, setEmergencyPolyline] = useState<any>(null);
  const [ambulanceMarker, setAmbulanceMarker] = useState<any>(null);
  const [priorityZones, setPriorityZones] = useState<Set<string>>(new Set());
  const [trafficDiversion, setTrafficDiversion] = useState(false);

  // Feature 4: Anomaly Detection
  const volumeHistoryRef = useRef<number[]>([]);
  const [anomaly, setAnomaly] = useState<{ zone: string, deviation: number } | null>(null);
  const anomalyTimeoutRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const city = CITIES["Minneapolis"];
      const map = L.map(mapRef.current!, {
        center: city.center,
        zoom: city.zoom,
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

      Object.entries(city.zones).forEach(([zone, coords]) => {
        const marker = L.circleMarker(coords, {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#1e40af",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(map);

        marker.bindTooltip(zone, {
          permanent: false,
          direction: "top",
          className: "custom-tooltip",
        });

        markersRef.current[zone] = marker;
      });

      mapInstanceRef.current = map;
    };

    initMap();
  }, []);

  // Poll backend every 3 seconds when streaming
  useEffect(() => {
    setConnectionStatus("connected");
    if (!isStreaming) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:5000/api/stream/status");
        const data = await res.json();
        if (!data || !data.latest) return;
        const city = CITIES[selectedCity];
        const zoneNames = Object.keys(city.zones);
        const randomZone = zoneNames[Math.floor(Math.random() * zoneNames.length)];
        const mappedData: TrafficUpdate = {
          ...data.latest,
          zone: randomZone,
          lat: city.zones[randomZone][0],
          lng: city.zones[randomZone][1],
        };
        setUpdates((prev) => [mappedData, ...prev].slice(0, 50));
        setStats((prev) => ({
          total: prev.total + 1,
          avgVolume: Math.round((prev.avgVolume * prev.total + mappedData.predicted_volume) / (prev.total + 1)),
          heavyZones: mappedData.predicted_volume > 4000 ? prev.heavyZones + 1 : prev.heavyZones,
          co2Saved: Math.round(prev.co2Saved + (data.latest.co2_saved_grams ?? 0)),
        }));
        setSelectedZone(mappedData);
      } catch (err) { console.error("Poll error:", err); }
    }, 3000);
    return () => clearInterval(interval);
  }, [isStreaming, selectedCity]);

  // Uses relative path via Vite proxy for REST calls
  const handleStartStop = async () => {
    const endpoint = isStreaming ? "/api/stream/stop" : "/api/stream/start";
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: selectedCity }),
      });
      setIsStreaming(!isStreaming);
    } catch (err) {
      console.error("Stream control error:", err);
    }
  };

  // Handle city change - disconnect socket and reconnect for new city
  const handleCityChange = (city: string) => {
    if (isStreaming) {
      fetch('/api/stream/stop', { method: 'POST' });
      setIsStreaming(false);
    }
    socketRef.current?.disconnect();
    setSelectedCity(city);
    setUpdates([]);
    setStats({ total: 0, avgVolume: 0, heavyZones: 0, co2Saved: 0 });
  };

  // Deploy Test Vehicle function
  const deployTestVehicle = async () => {
    const city = CITIES[selectedCity];
    const zoneNames = Object.keys(city.zones);
    
    // Create a route through multiple zones
    const routeCoordinates: [number, number][] = [];
    zoneNames.forEach((zoneName) => {
      routeCoordinates.push(city.zones[zoneName]);
    });
    
    setActiveRoute(routeCoordinates);
    setVehiclePosition(routeCoordinates[0]);
    setVehicleIndex(0);
    setIsVehicleActive(true);
    
    // Draw route polyline on map
    if (mapInstanceRef.current) {
      const L = await import("leaflet");
      
      // Remove existing polyline if any
      if (routePolyline) {
        mapInstanceRef.current.removeLayer(routePolyline);
      }
      
      // Create new dashed polyline
      const polyline = L.polyline(routeCoordinates, {
        color: '#14b8a6', // Teal color for Cyber theme
        weight: 3,
        opacity: 0.7,
        dashArray: '10, 10', // Dashed line style
        dashOffset: '0'
      }).addTo(mapInstanceRef.current);
      
      setRoutePolyline(polyline);
    }
  };

  // Vehicle movement useEffect
  useEffect(() => {
    if (!isVehicleActive || activeRoute.length === 0) return;

    const moveInterval = setInterval(() => {
      setVehicleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % activeRoute.length;
        const nextPosition = activeRoute[nextIndex];
        
        setVehiclePosition(nextPosition);
        
        // ML Integration: Check congestion for current zone
        const currentZoneData = updates.find(update => {
          const city = CITIES[selectedCity];
          const zoneNames = Object.keys(city.zones);
          const currentZoneName = zoneNames[nextIndex];
          return update.zone === currentZoneName;
        });
        
        if (currentZoneData) {
          if (currentZoneData.predicted_volume > 4000) {
            setVehicleColor('red');
            setVehicleSpeed(2000); // Slow down for high congestion
          } else {
            setVehicleColor('green');
            setVehicleSpeed(500); // Speed up for low congestion
          }
        }
        
        return nextIndex;
      });
    }, vehicleSpeed);

    return () => clearInterval(moveInterval);
  }, [isVehicleActive, activeRoute, vehicleSpeed, updates, selectedCity]);

  // Update vehicle marker on map
  useEffect(() => {
    if (!vehiclePosition || !mapInstanceRef.current) return;

    const updateVehicleMarker = async () => {
      const L = await import("leaflet");
      
      // Remove existing vehicle marker if any
      if (vehicleMarker) {
        mapInstanceRef.current.removeLayer(vehicleMarker);
      }
      
      // Create custom car icon
      const carIcon = L.divIcon({
        html: `<div style="color: ${vehicleColor}; font-size: 20px; background: white; border-radius: 50%; padding: 2px; border: 2px solid ${vehicleColor};">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 11l-2 2h2l1-1h1l1 1h2l-2-2h-3zm14 0l-2 2h2l1-1h1l1 1h2l-2-2h-3zm-7 0l-2 2h2l1-1h1l1 1h2l-2-2h-3z"/>
          </svg>
        </div>`,
        className: 'custom-vehicle-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker(vehiclePosition, { icon: carIcon }).addTo(mapInstanceRef.current);
      setVehicleMarker(marker);
    };

    updateVehicleMarker();
  }, [vehiclePosition, vehicleColor, vehicleMarker]);

  // Emergency Response function
  const deployEmergencyResponse = async () => {
    const city = CITIES[selectedCity];
    const zoneNames = Object.keys(city.zones);
    
    // Create emergency path through all zones (optimized route)
    const emergencyCoordinates: [number, number][] = [];
    zoneNames.forEach((zoneName, index) => {
      emergencyCoordinates.push(city.zones[zoneName]);
    });
    
    setEmergencyPath(emergencyCoordinates);
    setAmbulancePosition(emergencyCoordinates[0]);
    setAmbulanceIndex(0);
    setEmergencyActive(true);
    setTrafficDiversion(true);
    
    // Draw emergency path on map
    if (mapInstanceRef.current) {
      const L = await import("leaflet");
      
      // Remove existing emergency polyline if any
      if (emergencyPolyline) {
        mapInstanceRef.current.removeLayer(emergencyPolyline);
      }
      
      // Create bright blue dashed polyline for emergency route
      const polyline = L.polyline(emergencyCoordinates, {
        color: '#0066ff', // Bright blue color
        weight: 4,
        opacity: 0.9,
        dashArray: '15, 10', // Dashed line style
        dashOffset: '0'
      }).addTo(mapInstanceRef.current);
      
      setEmergencyPolyline(polyline);
    }
  };

  // Ambulance movement useEffect
  useEffect(() => {
    if (!emergencyActive || emergencyPath.length === 0) return;

    const moveInterval = setInterval(() => {
      setAmbulanceIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % emergencyPath.length;
        const nextPosition = emergencyPath[nextIndex];
        
        setAmbulancePosition(nextPosition);
        
        // Add current zone to priority clearance
        const city = CITIES[selectedCity];
        const zoneNames = Object.keys(city.zones);
        const currentZoneName = zoneNames[nextIndex];
        
        setPriorityZones((prev) => new Set([...prev, currentZoneName]));
        
        // Remove priority clearance after 5 seconds
        setTimeout(() => {
          setPriorityZones((prev) => {
            const newSet = new Set(prev);
            newSet.delete(currentZoneName);
            return newSet;
          });
        }, 5000);
        
        return nextIndex;
      });
    }, 800); // Faster movement for emergency vehicle

    return () => clearInterval(moveInterval);
  }, [emergencyActive, emergencyPath, selectedCity]);

  // Update ambulance marker on map
  useEffect(() => {
    if (!ambulancePosition || !mapInstanceRef.current) return;

    const updateAmbulanceMarker = async () => {
      const L = await import("leaflet");
      
      // Remove existing ambulance marker if any
      if (ambulanceMarker) {
        mapInstanceRef.current.removeLayer(ambulanceMarker);
      }
      
      // Create custom ambulance icon
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
      setAmbulanceMarker(marker);
    };

    updateAmbulanceMarker();
  }, [ambulancePosition, ambulanceMarker]);

  return (
    <div className="space-y-4">

      {/* City selector */}
      <div className="flex gap-2 flex-wrap">
        {Object.values(CITIES).map((city) => {
          return (
            <button
              key={city.name}
              onClick={() => handleCityChange(city.name)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                selectedCity === city.name
                  ? "bg-teal-500 text-white border-teal-500 shadow-lg"
                  : "bg-white/10 text-gray-300 border-gray-600 hover:border-teal-400 hover:text-teal-300"
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* Map container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="relative rounded-xl overflow-hidden shadow-xl border border-gray-200">
            <div
              ref={mapRef}
              className="h-[500px] w-full"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              {/* Connection status indicator */}
              <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <div className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-slate-500"
                }`} />
                <span className="text-xs text-white font-medium capitalize">
                  {connectionStatus}
                </span>
              </div>

              {/* City label */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] rounded-full bg-black/60 px-4 py-1.5 backdrop-blur-sm">
                <span className="text-xs text-white font-semibold">
                  {CITIES[selectedCity].flag} {selectedCity}
                </span>
              </div>

              {isStreaming && (
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-red-500/80 px-3 py-1.5 ml-auto">
                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span className="text-xs text-white font-bold tracking-wider">LIVE</span>
                  </div>
                  {anomaly && (
                    <div className="rounded-lg bg-red-500/90 text-white px-4 py-2 text-xs font-bold shadow-lg animate-pulse border border-red-400">
                      Anomaly Detected in {anomaly.zone} - Deviation: +{anomaly.deviation}%
                    </div>
                  )}
                </div>
              )}

              {emergencyActive && (
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-600/90 px-3 py-1.5 ml-auto animate-pulse">
                    <div className="h-2 w-2 rounded-full bg-white animate-ping" />
                    <span className="text-xs text-white font-bold tracking-wider">EMERGENCY</span>
                  </div>
                  {trafficDiversion && (
                    <div className="rounded-lg bg-blue-600/90 text-white px-4 py-2 text-xs font-bold shadow-lg animate-pulse border border-blue-400">
                      Traffic Diversion Active - Priority Clearance
                    </div>
                  )}
                </div>
              )}

              <div className="absolute bottom-3 left-3 z-[1000] rounded-xl bg-black/60 px-3 py-2 backdrop-blur-sm">
                <div className="text-[10px] text-slate-300 font-semibold mb-1.5">TRAFFIC LEVEL</div>
                {[
                  { color: "#10b981", label: "Light < 2,000" },
                  { color: "#f59e0b", label: "Moderate 2-4k" },
                  { color: "#ef4444", label: "Heavy > 4,000" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-1 space-y-3">
          {/* Model indicator */}
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              Active Model
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-800 text-slate-100 text-xs border-slate-700">
                  {selectedCity === "Minneapolis" && "Hour 42% Â· Weather 31% Â· Holiday 15%"}
                  {selectedCity === "Bangalore" && "Weather 58% Â· Roadwork 24% Â· Incidents 18%"}
                  {(selectedCity === "Chennai" || selectedCity === "Mumbai") && "Hour 38% Â· Temp 28% Â· Peak 22% Â· City 12%"}
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="font-semibold text-teal-600">
              {selectedCity === "Minneapolis" ? "XGBoost RÂ²=0.9583" :
               selectedCity === "Bangalore" ? "GradBoost RÂ²=0.844" :
               "GradBoost RÂ²=0.875 (sim)"}
            </span>
          </div>

          <button
            onClick={handleStartStop}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: isStreaming
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #14b8a6, #3b82f6)",
            }}
          >
            {isStreaming ? "Stop Stream" : "Start Live Stream"}
          </button>

          <button
            onClick={deployTestVehicle}
            disabled={isVehicleActive}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isVehicleActive
                ? "linear-gradient(135deg, #6b7280, #4b5563)"
                : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            }}
          >
            <Car className="inline-block w-4 h-4 mr-2" />
            {isVehicleActive ? "Vehicle Active" : "Deploy Test Vehicle"}
          </button>

          <button
            onClick={deployEmergencyResponse}
            disabled={emergencyActive}
            className="w-full rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: emergencyActive
                ? "linear-gradient(135deg, #1e40af, #1e3a8a)"
                : "linear-gradient(135deg, #dc2626, #b91c1c)",
            }}
          >
            <Ambulance className="inline-block w-4 h-4 mr-2" />
            {emergencyActive ? "Emergency Active" : "Emergency Response"}
          </button>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Live Feed - {selectedCity}
                </span>
                {selectedCity === "Chennai" || selectedCity === "Mumbai" ? (
                  <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold ml-1">
                    [SIMULATED DATA - LANDMARK MODE]
                  </span>
                ) : (
                  <span className="text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-semibold ml-1">
                    [REAL DATASET]
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">{updates.length} updates</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
              {updates.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-slate-400">
                  Press Start to begin streaming
                </div>
              ) : (
                updates.slice(0, 8).map((u, i) => {
                  const isPriorityZone = priorityZones.has(u.zone);
                  return (
                  <div
                    key={i}
                    className={`px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors ${
                      isPriorityZone ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                    onClick={() => setSelectedZone(u)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: isPriorityZone ? '#0066ff' : getColor(u.predicted_volume) }} />
                        <span className="text-xs font-medium text-slate-700">
                          {isPriorityZone ? 'PRIORITY CLEARANCE' : u.zone}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{u.hour}:00</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-600">
                        Vol: {u.predicted_volume.toLocaleString()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        isPriorityZone ? 'bg-blue-100 text-blue-700' :
                        u.badge === "Light" ? "bg-green-100 text-green-700" :
                        u.badge === "Moderate" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {isPriorityZone ? 'PRIORITY' : u.badge}
                      </span>
                    </div>
                  </div>
                )})
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Statistics
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total Updates</span>
                <span className="font-semibold text-slate-700">{stats.total}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Avg Volume</span>
                <span className="font-semibold text-slate-700">{stats.avgVolume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Heavy Zones</span>
                <span className="font-semibold text-red-600">{stats.heavyZones}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CO2 Saved</span>
                <span className="font-semibold text-green-600">{stats.co2Saved.toLocaleString()}g</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected zone details */}
      {selectedZone && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Zone Details: {selectedZone.zone}</h3>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              Ã—
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Volume</span>
              <div className="font-semibold text-slate-700">{selectedZone.predicted_volume.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-slate-500">Weather</span>
              <div className="font-semibold text-slate-700">{selectedZone.weather_type}</div>
            </div>
            <div>
              <span className="text-slate-500">Temperature</span>
              <div className="font-semibold text-slate-700">{selectedZone.temperature_celsius}Â°C</div>
            </div>
            <div>
              <span className="text-slate-500">Humidity</span>
              <div className="font-semibold text-slate-700">{selectedZone.humidity}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMap;







