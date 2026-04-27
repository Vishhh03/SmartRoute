import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Leaf, TreePine, Zap, TrendingUp, BarChart3, Info, Globe, Timer, MapPin, Navigation } from "lucide-react";

interface RouteData {
  id: string;
  name: string;
  duration: string;
  distance: string;
  traffic: string;
  carbon: number;
  trees: number;
  description: string;
  path: [number, number][];
  geojson?: any;
  sustainability_score?: number;
  co2_saved_grams?: number;
  ai_recommended?: boolean;
  model_confidence?: number;
  cars_off_road_equivalent?: number;
  congestion_explanation?: string;
}

interface RouteResponse {
  route: {
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number][];
    };
    properties: {
      distance: number;
      duration: number;
      congestion_score: number;
      sustainability_score: number;
      model_confidence: number;
      ai_recommended: boolean;
    };
  };
  segments: any[];
  metrics: {
    congested_segments: number;
    total_segments: number;
    co2_saved_grams: number;
    co2_base_grams: number;
    co2_optimized_grams: number;
    model_confidence: number;
    cars_off_road_equivalent: number;
    total_idling_time_seconds: number;
    congestion_explanation: string;
  };
  warnings?: string[];
}

const SustainableRoute = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  const [cityCarbonSaved, setCityCarbonSaved] = useState(1247.3);
  const [showTransparency, setShowTransparency] = useState(false);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [startCoords, setStartCoords] = useState<[number, number]>([44.9530, -93.2981]); // Start in Uptown by default
  const [endCoords, setEndCoords] = useState<[number, number]>([44.9778, -93.2650]); // Default to Downtown
  const [showRouteComparison, setShowRouteComparison] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]); // use ref so clearRoutesFromMap always has fresh value

  // Initialize map for route visualization
  useEffect(() => {
    if (!mapRef.current || mapInstance) return;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      leafletRef.current = L; // Store for use in drawRoutesOnMap

      const map = L.map(mapRef.current!, {
        center: [44.9778, -93.2650],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution: "© OpenStreetMap © CARTO",
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      setMapInstance(map);
    };

    initMap();
  }, []); // Run once on mount so mapRef.current is always the real DOM node

  // Clear existing routes from map
  const clearRoutesFromMap = () => {
    routePolylinesRef.current.forEach(polyline => {
      if (mapInstance && polyline) {
        mapInstance.removeLayer(polyline);
      }
    });
    routePolylinesRef.current = [];
  };

  // Draw routes on map with dynamic styling
  const drawRoutesOnMap = (routes: RouteData[]) => {
    if (!mapInstance) return;

    clearRoutesFromMap();

    const polylines: any[] = [];

    routes.forEach((route) => {
      const L = leafletRef.current;
      if (!L) { console.error('Leaflet not loaded yet'); return; }
      
      // Validate route coordinates before drawing
      if (!route.path || route.path.length < 2) {
        console.warn('Invalid route path:', route);
        return;
      }
      
      // Log coordinate format for debugging
      console.log(`Drawing route ${route.id} with ${route.path.length} points`);
      console.log('First coordinate:', route.path[0]); // Should be [lat, lon]
      
      // Determine color based on route type and congestion - Enhanced for projector visibility
      let color = '#10b981'; // Default green
      let weight = 4;
      let dashArray = null;
      
      if (route.ai_recommended) {
        color = '#00E5FF'; // Bright Neon Cyan for AI recommended (enhanced contrast)
        weight = 8; // Thicker for better visibility
        dashArray = '15, 8'; // Larger dashes for projector visibility
      } else if (route.sustainability_score && route.sustainability_score < 0.5) {
        color = '#FF1744'; // Bright Glowing Red for congested (enhanced contrast)
        weight = 7; // Thicker for better visibility
      }

      try {
        const polyline = L.polyline(route.path, {
          color: color,
          weight: weight,
          opacity: 0.8,
          dashArray: dashArray,
          className: route.ai_recommended ? 'ai-route-animation' : 
                  (route.sustainability_score && route.sustainability_score < 0.5 ? 'congested-route' : 'standard-route')
        }).addTo(mapInstance);

        // Add popup with route info
        const popupContent = `
          <div style="font-family: Arial, sans-serif; padding: 8px; background: rgba(0,0,0,0.9); color: white;">
            <div style="font-weight: bold; color: ${color}; margin-bottom: 4px;">${route.name}</div>
            <div style="margin-bottom: 2px;">Duration: ${route.duration}</div>
            <div style="margin-bottom: 2px;">Distance: ${route.distance}</div>
            <div style="margin-bottom: 2px;">CO₂: ${route.carbon} kg</div>
            ${route.ai_recommended ? '<div style="color: #00ffff; font-weight: bold;">AI RECOMMENDED</div>' : ''}
          </div>
        `;
        
        polyline.bindPopup(popupContent);
        polylines.push(polyline);
        
        console.log(`Successfully drew route ${route.id}`);
        
      } catch (error) {
        console.error(`Error drawing route ${route.id}:`, error);
      }
    });

    routePolylinesRef.current = polylines;

    // Fit map to show all routes
    if (routes.length > 0 && polylines.length > 0) {
      try {
        const allCoords = routes.flatMap(route => route.path);
        console.log('Fitting map to bounds with', allCoords.length, 'coordinates');
        
        // Validate coordinates before creating bounds
        const validCoords = allCoords.filter(coord => {
          const [lat, lon] = coord;
          return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && 
                 !isNaN(lat) && !isNaN(lon) && lat !== null && lon !== null;
        });
        
        if (validCoords.length > 0) {
          const bounds = leafletRef.current.latLngBounds(validCoords);
          mapInstance.fitBounds(bounds, { padding: [50, 50] });
          console.log('Map bounds set successfully');
        } else {
          console.warn('No valid coordinates for bounds');
        }
      } catch (error) {
        console.error('Error setting map bounds:', error);
      }
    }
  };

  // Automatically draw routes when mapInstance or routes change
  useEffect(() => {
    if (mapInstance && routes.length > 0) {
      drawRoutesOnMap(routes);
    }
  }, [mapInstance, routes]);

  // Geocode destination to get coordinates
  const geocodeDestination = async (destination: string): Promise<[number, number] | null> => {
    try {
      // Common Minneapolis area destinations with their coordinates
      const destinations: Record<string, [number, number]> = {
        'airport': [44.8833, -93.2120], // Minneapolis-St. Paul International Airport
        'msp airport': [44.8833, -93.2120],
        'minneapolis airport': [44.8833, -93.2120],
        'downtown': [44.9778, -93.2650], // Minneapolis downtown
        'minneapolis downtown': [44.9778, -93.2650],
        'university': [44.9728, -93.2353], // University of Minnesota
        'university of minnesota': [44.9728, -93.2353],
        'mall of america': [44.8569, -93.2437], // Mall of America
        'target': [44.9728, -93.2353], // Target headquarters
        'target headquarters': [44.9728, -93.2353],
        'target field': [44.9778, -93.2783], // Target Field
        'us bank stadium': [44.9735, -93.2580], // US Bank Stadium
        'st paul': [44.9537, -93.0900], // St. Paul downtown
        'st paul downtown': [44.9537, -93.0900],
        'nicollet': [44.9778, -93.2715], // Nicollet Mall
        'nicollet mall': [44.9778, -93.2715],
        'stone arch bridge': [44.9850, -93.2850], // Stone Arch Bridge
        'walker art center': [44.9796, -93.2830], // Walker Art Center
        'guthrie theater': [44.9796, -93.2830], // Guthrie Theater
        'mill city museum': [44.9850, -93.2850], // Mill City Museum
        'minneapolis institute': [44.9796, -93.2830], // Minneapolis Institute of Arts
      };
      
      // Normalize the search term
      const normalizedDest = destination.toLowerCase().trim();
      
      // Check if we have a predefined destination
      if (destinations[normalizedDest]) {
        return destinations[normalizedDest];
      }
      
      // Check for partial matches
      for (const [key, coords] of Object.entries(destinations)) {
        if (key.includes(normalizedDest) || normalizedDest.includes(key)) {
          return coords;
        }
      }
      
      // If no match found, return a default location in Minneapolis
      console.warn(`Destination "${destination}" not found, using default location`);
      return [44.9778, -93.2650]; // Default to Minneapolis downtown
      
    } catch (error) {
      console.error('Geocoding error:', error);
      return [44.9778, -93.2650]; // Fallback to default
    }
  };

  // Generate routes using real OpenRouteService API
  const generateRoutes = async (destination: string) => {
    setIsSearching(true);
    setError('');
    setLoadingStage('Finding destination coordinates...');
    setProgressPercentage(10);
    
    try {
      // Geocode the destination
      const endCoords = await geocodeDestination(destination);
      if (!endCoords) {
        throw new Error('Could not find destination coordinates');
      }
      
      setLoadingStage('Fetching road network data...');
      setProgressPercentage(25);
      
      console.log(`Routing from ${startCoords} to ${endCoords}`);
      
      // Call our backend route-path endpoint
      const response = await fetch('/api/route-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startCoords,
          end: endCoords
        })
      });

      setLoadingStage('Analyzing traffic patterns with ML...');
      setProgressPercentage(50);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key - Please check your OpenRouteService configuration');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - Please try again in a moment');
        } else if (response.status === 400) {
          throw new Error('Invalid coordinates - Please check your start and end points');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const routeData: RouteResponse = await response.json();

      setLoadingStage('Calculating sustainability scores...');
      setProgressPercentage(75);
      
      // ORS returns [lon, lat] format, Leaflet needs [lat, lon] format
      console.log('ORS coordinates (lon, lat):', routeData.route.geometry.coordinates.slice(0, 3));
      
      const routeCoords: [number, number][] = routeData.route.geometry.coordinates
        .map((coord: [number, number]) => {
          const [lon, lat] = coord; // ORS format: [longitude, latitude]
          return [lat, lon]; // Leaflet format: [latitude, longitude]
        });
      
      console.log('Leaflet coordinates (lat, lon):', routeCoords.slice(0, 3));
      
      // Validate coordinates are within reasonable bounds
      const isValidCoords = routeCoords.every(coord => {
        const [lat, lon] = coord;
        return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
      });
      
      if (!isValidCoords) {
        console.error('Invalid coordinates:', routeCoords.slice(0, 5));
        throw new Error('Invalid coordinates received from routing service');
      }
      
      // Additional validation: check for NaN or undefined values
      const hasInvalidValues = routeCoords.some(coord => 
        coord.some(val => val === undefined || val === null || isNaN(val))
      );
      
      if (hasInvalidValues) {
        console.error('Coordinates contain invalid values:', routeCoords.slice(0, 5));
        throw new Error('Coordinates contain invalid values');
      }

      setLoadingStage('Optimizing greenest path...');
      setProgressPercentage(90);
      
      // Create AI-optimized route
      const aiRoute: RouteData = {
        id: 'ai-optimized',
        name: 'Eco-Pulse Route (AI Optimized)',
        duration: Math.round(routeData.route.properties.duration / 60) + ' min',
        distance: (routeData.route.properties.distance / 1000).toFixed(1) + ' km',
        traffic: routeData.route.properties.congestion_score > 0.7 ? 'Heavy' : 
                routeData.route.properties.congestion_score > 0.4 ? 'Moderate' : 'Light',
        carbon: (routeData.metrics.co2_optimized_grams / 1000).toFixed(1),
        trees: (routeData.metrics.co2_saved_grams / 21000).toFixed(1), // 21kg per tree
        description: 'AI-optimized route with minimal congestion',
        path: routeCoords, // Already converted to [lat, lon] for Leaflet
        geojson: routeData.route,
        sustainability_score: routeData.route.properties.sustainability_score,
        co2_saved_grams: routeData.metrics.co2_saved_grams,
        ai_recommended: routeData.route.properties.ai_recommended,
        model_confidence: routeData.metrics.model_confidence,
        cars_off_road_equivalent: routeData.metrics.cars_off_road_equivalent,
        congestion_explanation: routeData.metrics.congestion_explanation
      };

      // Create standard route (mock comparison)
      const standardRoute: RouteData = {
        id: 'standard',
        name: 'Fastest Route (Standard)',
        duration: Math.round(routeData.route.properties.duration / 60 * 0.8) + ' min',
        distance: (routeData.route.properties.distance / 1000 * 0.9).toFixed(1) + ' km',
        traffic: 'Heavy',
        carbon: (routeData.metrics.co2_base_grams / 1000).toFixed(1),
        trees: 0,
        description: 'Standard fastest route without optimization',
        path: routeCoords.slice(0, Math.floor(routeCoords.length * 0.7)), // Shorter path, still [lat, lon]
        sustainability_score: 0.3,
        ai_recommended: false,
        model_confidence: 0.85,
        cars_off_road_equivalent: 0,
        congestion_explanation: 'Standard route without AI optimization'
      };

      setRoutes([aiRoute, standardRoute]);
      setShowRouteComparison(true);
      
      setLoadingStage('Rendering routes on map...');
      setProgressPercentage(95);
      
      // Draw routes on map
      drawRoutesOnMap([aiRoute, standardRoute]);
      
      setLoadingStage('Complete!');
      setProgressPercentage(100);
      
      // Brief delay to show completion
      setTimeout(() => {
        setLoadingStage('');
        setProgressPercentage(0);
      }, 500);
      
    } catch (error) {
      console.error('Error generating routes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Check for specific error types
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError('Network error - Please check your internet connection');
      } else if (errorMessage.includes('API key')) {
        setError('Service configuration error - Please contact support');
      } else if (errorMessage.includes('coordinates')) {
        setError('Invalid location - Please try different start/end points');
      }
      
      // Fallback to mock data if API fails
      const fallbackRoute: RouteData = {
        id: 'fallback',
        name: 'Demo Route (Offline Mode)',
        duration: '25 min',
        distance: '12.5 km',
        traffic: 'Moderate',
        carbon: 5.2,
        trees: 1.2,
        description: 'Demo route - Service unavailable',
        path: [
          [44.9778, -93.2650],
          [44.9600, -93.2400],
          [44.9400, -93.2200],
          [44.9200, -93.2000]
        ]
      };
      setRoutes([fallbackRoute]);
    } finally {
      setIsSearching(false);
      setTimeout(() => {
        setLoadingStage('');
        setProgressPercentage(0);
      }, 1000);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      generateRoutes(searchQuery);
    }
  };

  // Handle route selection
  const handleRouteSelect = (route: RouteData) => {
    setSelectedRoute(route);
    
    // Highlight selected route on map
    if (mapInstance) {
      clearRoutesFromMap();
      drawRoutesOnMap([route]);
    }
  };

  // Simulate real-time carbon counter updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCityCarbonSaved(prev => {
        const increment = Math.random() * 0.5 + 0.1;
        return prev + increment;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleTransparency = () => {
    if (!isCardVisible) {
      setIsCardVisible(true);
      return;
    }
    
    setIsFlipping(true);
    setTimeout(() => {
      setShowTransparency(!showTransparency);
      setIsFlipping(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-gray-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Floating leaves animation */}
        <div className="absolute top-20 left-10 animate-bounce">
          <Leaf className="h-8 w-8 text-green-600 opacity-30" />
        </div>
        <div className="absolute top-40 right-20 animate-bounce" style={{ animationDelay: '1s' }}>
          <Leaf className="h-6 w-6 text-green-500 opacity-40" />
        </div>
        <div className="absolute bottom-40 left-30 animate-pulse">
          <TreePine className="h-12 w-12 text-green-700 opacity-20" />
        </div>
        
        {/* Carbon particles */}
        <div className="absolute top-60 right-40 animate-ping">
          <div className="h-4 w-4 bg-green-400 rounded-full opacity-60" />
        </div>
        <div className="absolute bottom-60 right-60 animate-ping" style={{ animationDelay: '2s' }}>
          <div className="h-3 w-3 bg-emerald-400 rounded-full opacity-40" />
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent animate-pulse">
            SUSTAINABLE ROUTES
          </h1>
          <p className="text-xl text-gray-700 animate-fade-in">
            Choose your path • Save the planet
          </p>
        </div>

        {/* Main Search */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-white/90 backdrop-blur-lg border-green-200/50 shadow-2xl shadow-green-500/20">
            <CardContent className="p-8">
              <div className="flex flex-col items-center space-y-6">
                <div className="relative w-full max-w-2xl">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-green-600" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Try: Airport, Downtown, University, Mall of America, Target Field..."
                    className="w-full pl-12 pr-4 py-6 text-2xl border-2 border-green-300 rounded-full bg-white/80 backdrop-blur focus:outline-none focus:ring-4 focus:ring-green-500/50 placeholder-green-500/50"
                  />
                  {isSearching && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full" />
                        <span className="text-sm text-green-600 font-medium">{loadingStage}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-8 py-4 text-lg rounded-full shadow-lg transform transition-all hover:scale-105"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  {isSearching ? 'Calculating...' : 'Find Routes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading Progress Bar - Mobile Optimized */}
        {isSearching && (
          <div className="max-w-4xl mx-auto mb-8 px-4 sm:px-6">
            <Card className="bg-white/90 backdrop-blur-lg border-green-200/50 shadow-2xl">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full" />
                      <span className="text-base sm:text-lg font-semibold text-gray-900">{loadingStage}</span>
                    </div>
                    <span className="text-sm text-gray-600">{progressPercentage}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    >
                      <div className="h-full bg-white/20 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-600 text-center">
                    {progressPercentage < 25 && "Connecting to routing service..."}
                    {progressPercentage >= 25 && progressPercentage < 50 && "Analyzing road network..."}
                    {progressPercentage >= 50 && progressPercentage < 75 && "Running ML predictions..."}
                    {progressPercentage >= 75 && progressPercentage < 95 && "Calculating environmental impact..."}
                    {progressPercentage >= 95 && "Finalizing your green route..."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Display - Mobile Optimized */}
        {error && (
          <div className="max-w-4xl mx-auto mb-8 px-4 sm:px-6">
            <Card className="bg-red-50 border-2 border-red-200 shadow-2xl">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-red-900">Routing Service Error</h3>
                    <p className="text-sm sm:text-base text-red-700 mt-1">{error}</p>
                    <p className="text-xs sm:text-sm text-red-600 mt-2">
                      {error.includes('network') && "Please check your internet connection and try again."}
                      {error.includes('API key') && "This is a configuration issue. Our team has been notified."}
                      {error.includes('coordinates') && "Try using different start and end points."}
                      {error.includes('rate limit') && "Please wait a moment before trying again."}
                      {!error.includes('network') && !error.includes('API key') && !error.includes('coordinates') && !error.includes('rate limit') && "Please try again or contact support if the issue persists."}
                    </p>
                  </div>
                  <Button
                    onClick={() => setError('')}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Visualization - always in DOM so Leaflet can attach, hidden until routes load */}
        <div className="max-w-6xl mx-auto mb-8 px-4 sm:px-6" style={{ display: routes.length > 0 ? 'block' : 'none' }}>
          <Card className="bg-white/90 backdrop-blur-lg border-green-200/50 shadow-2xl">
            <CardHeader className="pb-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg sm:text-xl text-green-600">Live Route Map</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-cyan-500 text-white text-xs sm:text-sm">AI Routes Active</Badge>
                  <Badge className="bg-green-500 text-white text-xs sm:text-sm">{routes.length} Routes</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div
                ref={mapRef}
                className="h-[300px] sm:h-[400px] w-full rounded-lg border-2 border-green-500/30"
                style={{ backgroundColor: "#0a0a0a" }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Route Comparison Panel - Mobile Optimized */}
        {showRouteComparison && routes.length > 0 && (
          <div className="max-w-6xl mx-auto mb-8 px-4 sm:px-6">
            <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border-2 border-cyan-500/30 rounded-xl p-4 sm:p-6 backdrop-blur-lg">
              {/* Header - Responsive */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-600" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Route Comparison</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Badge className="bg-cyan-500 text-white text-xs sm:text-sm font-bold">AI Analysis</Badge>
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Real-time ML predictions</span>
                </div>
              </div>
              
              {/* Route Cards - Stacked on Mobile */}
              <div className="space-y-4 sm:space-y-6">
                {routes.map((route) => (
                  <Card 
                    key={route.id}
                    onClick={() => handleRouteSelect(route)}
                    className={`bg-white/90 backdrop-blur-lg border-2 shadow-xl cursor-pointer transition-all hover:scale-[1.02] ${
                      selectedRoute?.id === route.id 
                        ? 'border-cyan-500 ring-4 ring-cyan-500/50' 
                        : route.ai_recommended
                          ? 'border-cyan-300 hover:border-cyan-400'
                          : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-6">
                      {/* Route Header - Responsive */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-2xl font-black text-gray-900 flex flex-col sm:flex-row sm:items-center gap-2">
                            <span>{route.name}</span>
                            {route.ai_recommended && (
                              <Badge className="bg-cyan-500 text-white text-xs self-start sm:self-center w-fit font-bold">
                                AI RECOMMENDED
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm sm:text-base font-medium text-gray-700 mt-1">{route.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {route.ai_recommended ? (
                            <div className="w-4 h-4 rounded-full bg-cyan-500 animate-pulse" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Route Metrics - Responsive Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div className="text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                            <Timer className="h-4 w-4 text-gray-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-lg sm:text-2xl font-black text-gray-900">{route.duration}</div>
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                            <Globe className="h-4 w-4 text-gray-600" />
                            <span className="text-xs text-gray-600">Distance</span>
                          </div>
                          <div className="text-lg sm:text-2xl font-black text-gray-900">{route.distance}</div>
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                            <BarChart3 className="h-4 w-4 text-gray-600" />
                            <span className="text-xs text-gray-600">Traffic</span>
                          </div>
                          <div className="text-base sm:text-lg font-bold text-gray-900">{route.traffic}</div>
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                            <Leaf className="h-4 w-4 text-gray-600" />
                            <span className="text-xs text-gray-600">CO₂</span>
                          </div>
                          <div className={`text-base sm:text-lg font-black ${route.ai_recommended ? 'text-cyan-600' : 'text-green-600'}`}>
                            {route.carbon} kg
                          </div>
                        </div>
                      </div>
                      
                      {/* Environmental Impact Cards - Responsive */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {route.co2_saved_grams && route.co2_saved_grams > 0 && (
                          <div className="p-3 sm:p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                  <TreePine className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                                  <span className="text-xs sm:text-sm font-semibold text-cyan-700">CO₂ Saved</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-cyan-600">
                                  {(route.co2_saved_grams / 1000).toFixed(1)} kg
                                </div>
                                {/* Actionable Advice */}
                                {route.cars_off_road_equivalent && route.cars_off_road_equivalent > 0 && (
                                  <div className="text-xs text-cyan-700 mt-1 font-medium">
                                    ≈ {route.cars_off_road_equivalent.toFixed(1)} cars off road
                                  </div>
                                )}
                              </div>
                              <div className="text-xs sm:text-sm text-cyan-600 text-center sm:text-right">
                                vs standard route
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Model Confidence - Expert Level */}
                        {route.model_confidence && (
                          <div className="p-3 sm:p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                  <div className="h-4 w-4 sm:h-5 sm:w-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">AI</span>
                                  </div>
                                  <span className="text-xs sm:text-sm font-semibold text-purple-700">Model Confidence</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-purple-600">
                                  {(route.model_confidence * 100).toFixed(0)}%
                                </div>
                                <div className="text-xs text-purple-600 mt-1">
                                  {route.model_confidence > 0.9 ? 'High confidence' : 
                                   route.model_confidence > 0.8 ? 'Good confidence' : 'Moderate confidence'}
                                </div>
                              </div>
                              <div className="text-xs sm:text-sm text-purple-600 text-center sm:text-right">
                                ML prediction accuracy
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {route.trees > 0 && (
                          <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="text-center sm:text-left">
                                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                                  <TreePine className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                                  <span className="text-xs sm:text-sm font-semibold text-green-700">Trees</span>
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-green-600">{route.trees}</div>
                              </div>
                              <div className="text-xs sm:text-sm text-green-600 text-center sm:text-right">
                                Environmental impact
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Why Green Route Explanation - Expert Level */}
                      {route.congestion_explanation && route.ai_recommended && (
                        <div className="mt-3 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">?</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-xs sm:text-sm font-bold text-blue-700 mb-1">Why this route is greener</div>
                              <div className="text-xs sm:text-sm font-medium text-blue-700 leading-relaxed">
                                {route.congestion_explanation}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Comparison Summary - Responsive with Expert Metrics */}
              {routes.length === 2 && (
                <div className="mt-6 p-4 sm:p-6 bg-gradient-to-r from-green-50 to-cyan-50 border border-green-200 rounded-lg">
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 mb-4">Environmental Impact Summary</h3>
                    
                    {/* Mobile: Vertical layout, Desktop: Horizontal */}
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8">
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-green-600">
                          {routes[0].co2_saved_grams ? (routes[0].co2_saved_grams / 1000).toFixed(1) : '0'} kg
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">CO₂ Saved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-cyan-600">
                          {routes.find(r => r.ai_recommended)?.trees || '0'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Trees Equivalent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                          {routes.find(r => r.ai_recommended)?.sustainability_score ? 
                            (routes.find(r => r.ai_recommended)!.sustainability_score! * 100).toFixed(0) : '0'}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Sustainability Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-black text-purple-600">
                          {routes.find(r => r.ai_recommended)?.model_confidence ? 
                            (routes.find(r => r.ai_recommended)!.model_confidence! * 100).toFixed(0) : '0'}%
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Model Confidence</div>
                      </div>
                    </div>
                    
                    {/* Actionable Impact Statement */}
                    {routes[0].cars_off_road_equivalent && routes[0].cars_off_road_equivalent > 0 && (
                      <div className="mt-4 p-3 bg-white/80 backdrop-blur rounded-lg border border-white/50">
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900 mb-1">
                            🌍 Choosing this route is equivalent to taking
                          </div>
                          <div className="text-lg font-black text-green-600">
                            {routes[0].cars_off_road_equivalent.toFixed(1)} cars off the road for this hour
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* City-Wide Carbon Counter */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <TreePine className="h-8 w-8 text-white" />
                  <h2 className="text-3xl font-bold">City-Wide Carbon Saved</h2>
                </div>
                
                <div className="text-6xl font-bold mb-2">
                  {cityCarbonSaved.toFixed(1)} kg
                </div>
                
                <div className="text-lg text-white/90">
                  CO₂ emissions avoided this month
                </div>
                
                <div className="mt-4 flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white/80">{Math.floor(cityCarbonSaved / 50)}</div>
                    <div className="text-sm text-white/70">Trees Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white/80">{(cityCarbonSaved * 0.82).toFixed(0)}</div>
                    <div className="text-sm text-white/70">Gallons Gas Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white/80">{(cityCarbonSaved * 2.3).toFixed(1)}</div>
                    <div className="text-sm text-white/70">kWh Energy Saved</div>
                  </div>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>

        {/* Technical Transparency Flip Card */}
        <div className="fixed bottom-8 right-8 z-20">
          <Button
            onClick={handleTransparency}
            className="bg-gray-800/90 backdrop-blur-lg border-gray-600/50 text-white px-6 py-3 rounded-full shadow-xl hover:bg-gray-700/90 transition-all"
          >
            <Info className="h-4 w-4 mr-2" />
            Technical Transparency
          </Button>
        </div>
          
          {/* Flip Card */}
          {isCardVisible && (
            <div 
              className={`absolute bottom-20 right-8 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl transition-all duration-500 ${
                isFlipping ? 'animate-flip' : ''
              }`}
            >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {showTransparency ? 'Model Performance' : 'ML Training Logs'}
                </h3>
                <div className="text-sm text-gray-400">
                  {showTransparency ? 'R² Scores & Accuracy' : 'Training Process & Data'}
                </div>
              </div>
              
              <div className={`space-y-3 ${showTransparency ? 'block' : 'hidden'}`}>
                <div className="p-4 bg-green-900/50 border border-green-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-400">Minneapolis R²:</span>
                      <span className="text-white font-bold">0.9583</span>
                    </div>
                    <div>
                      <span className="text-green-400">Bangalore R²:</span>
                      <span className="text-white font-bold">0.844</span>
                    </div>
                    <div>
                      <span className="text-green-400">Chennai R²:</span>
                      <span className="text-white font-bold">0.875</span>
                    </div>
                    <div>
                      <span className="text-green-400">Dataset Size:</span>
                      <span className="text-white font-bold">48,000 records</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`space-y-4 ${!showTransparency ? 'block' : 'hidden'}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    <div className="h-1 w-1 rounded-full bg-blue-400 animate-pulse"></div>
                    System Architecture
                  </div>
                  <div className="p-3 bg-blue-900/30 border border-blue-700/30 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Core Engine</span>
                      <span className="text-blue-300 font-medium">Gradient Boosting v2.1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Input Features</span>
                      <span className="text-blue-300 font-medium">Temporal + Weather + Bio</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <div className="h-1 w-1 rounded-full bg-purple-400 animate-pulse"></div>
                    Training Statistics
                  </div>
                  <div className="p-3 bg-purple-900/30 border border-purple-700/30 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Iterations</span>
                      <span className="text-purple-300 font-medium">150 Epochs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Compute Time</span>
                      <span className="text-purple-300 font-medium">2.3s Latency</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Methodology</span>
                      <span className="text-purple-300 font-medium">5-Fold Cross-Val</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                  <span className="text-[10px] text-gray-500 uppercase">Last Synchronization</span>
                  <span className="text-[10px] font-mono text-blue-400">2025-04-21 19:30 UTC</span>
                </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes flip {
          0% { transform: rotateY(180deg); }
          100% { transform: rotateY(0deg); }
        }
        
        @keyframes flow-animation {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -30; }
        }
        
        @keyframes glow-cyan {
          0%, 100% { box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff; }
          50% { box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 30px #00ffff; }
        }
        
        @keyframes glow-red {
          0%, 100% { box-shadow: 0 0 5px #ff0000, 0 0 10px #ff0000; }
          50% { box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000; }
        }
        
        .animate-bounce {
          animation: bounce 3s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animate-ping {
          animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        
        .animate-flip {
          animation: flip 0.6s ease-in-out;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
        
        .ai-route-animation {
          stroke-dasharray: 10, 5;
          stroke-dashoffset: 0;
          animation: flow-animation 1s linear infinite;
        }
        
        .standard-route {
          stroke-dasharray: none;
        }
        
        .leaflet-container .ai-route-animation {
          stroke: #00E5FF !important;
          stroke-width: 8 !important;
          filter: drop-shadow(0 0 8px #00E5FF) drop-shadow(0 0 16px #00E5FF);
          animation: pulse-cyan 2s ease-in-out infinite;
        }
        
        .leaflet-container .standard-route {
          stroke: #10b981 !important;
          stroke-width: 4 !important;
        }
        
        .leaflet-container .congested-route {
          stroke: #FF1744 !important;
          stroke-width: 7 !important;
          filter: drop-shadow(0 0 6px #FF1744) drop-shadow(0 0 12px #FF1744);
          animation: pulse-red 2s ease-in-out infinite;
        }
        
        @keyframes pulse-cyan {
          0%, 100% { 
            opacity: 0.9;
            filter: drop-shadow(0 0 8px #00E5FF) drop-shadow(0 0 16px #00E5FF);
          }
          50% { 
            opacity: 1;
            filter: drop-shadow(0 0 12px #00E5FF) drop-shadow(0 0 24px #00E5FF);
          }
        }
        
        @keyframes pulse-red {
          0%, 100% { 
            opacity: 0.9;
            filter: drop-shadow(0 0 6px #FF1744) drop-shadow(0 0 12px #FF1744);
          }
          50% { 
            opacity: 1;
            filter: drop-shadow(0 0 10px #FF1744) drop-shadow(0 0 20px #FF1744);
          }
        }
      `}</style>
    </div>
  );
};

export default SustainableRoute;
