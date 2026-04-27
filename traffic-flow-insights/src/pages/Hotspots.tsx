import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { MapPin, AlertTriangle, TrendingUp, Clock, Activity } from "lucide-react";

const Hotspots = () => {
  const [selectedCity, setSelectedCity] = useState("Minneapolis");
  const [severity, setSeverity] = useState("all");

  // Hotspot analysis data
  const hotspotData = {
    Minneapolis: {
      totalHotspots: 12,
      criticalHotspots: 3,
      averageSeverity: 7.2,
      peakHours: ["07:00-09:00", "16:00-18:00"],
      hotspots: [
        { id: 1, name: "I-35W & 46th St", severity: 9.2, frequency: 85, avgVolume: 5200, coordinates: [44.9445, -93.2623], factors: ["High volume", "Weather sensitive"], incidents: 23 },
        { id: 2, name: "Downtown Core", severity: 8.7, frequency: 78, avgVolume: 4800, coordinates: [44.9778, -93.2650], factors: ["Events", "Rush hour"], incidents: 18 },
        { id: 3, name: "US-169 & 39th Ave", severity: 8.1, frequency: 72, avgVolume: 4500, coordinates: [44.9500, -93.2800], factors: ["Construction", "Weather"], incidents: 15 },
        { id: 4, name: "I-94 & 35th St", severity: 7.5, frequency: 68, avgVolume: 4200, coordinates: [44.9600, -93.2400], factors: ["Weekend traffic", "Events"], incidents: 12 },
        { id: 5, name: "Hennepin Ave", severity: 6.8, frequency: 65, avgVolume: 3800, coordinates: [44.9800, -93.2700], factors: ["Urban density", "Transit"], incidents: 10 },
        { id: 6, name: "University Ave", severity: 6.2, frequency: 62, avgVolume: 3500, coordinates: [44.9720, -93.2400], factors: ["Campus area", "Student traffic"], incidents: 8 },
      ],
      hourlyPattern: [
        { hour: "00:00", incidents: 2, severity: 3.2 },
        { hour: "06:00", incidents: 8, severity: 6.5 },
        { hour: "08:00", incidents: 15, severity: 8.7 },
        { hour: "12:00", incidents: 10, severity: 6.8 },
        { hour: "16:00", incidents: 18, severity: 9.2 },
        { hour: "18:00", incidents: 12, severity: 7.5 },
        { hour: "20:00", incidents: 6, severity: 5.2 },
        { hour: "22:00", incidents: 3, severity: 4.1 },
      ],
      severityDistribution: [
        { severity: "Critical", count: 3, percentage: 25 },
        { severity: "High", count: 4, percentage: 33 },
        { severity: "Medium", count: 3, percentage: 25 },
        { severity: "Low", count: 2, percentage: 17 },
      ],
      factorAnalysis: [
        { factor: "Weather", impact: 85, frequency: 78 },
        { factor: "Events", impact: 72, frequency: 45 },
        { factor: "Construction", impact: 68, frequency: 32 },
        { factor: "Rush Hour", impact: 92, frequency: 95 },
        { factor: "Weekend", impact: 45, frequency: 68 },
        { factor: "Holidays", impact: 38, frequency: 25 },
      ]
    },
    Bangalore: {
      totalHotspots: 15,
      criticalHotspots: 5,
      averageSeverity: 8.1,
      peakHours: ["08:00-10:00", "18:00-20:00"],
      hotspots: [
        { id: 1, name: "MG Brigade Road", severity: 9.5, frequency: 88, avgVolume: 5500, coordinates: [12.9698, 77.6030], factors: ["Commercial hub", "Metro work"], incidents: 28 },
        { id: 2, name: "Electronic City", severity: 9.1, frequency: 85, avgVolume: 5200, coordinates: [12.8450, 77.6760], factors: ["IT corridor", "High density"], incidents: 24 },
        { id: 3, name: "Whitefield", severity: 8.8, frequency: 82, avgVolume: 4900, coordinates: [12.9690, 77.7480], factors: ["Tech park", "Shuttle buses"], incidents: 20 },
        { id: 4, name: "Koramangala", severity: 8.3, frequency: 78, avgVolume: 4600, coordinates: [12.9340, 77.6240], factors: ["Residential-commercial", "Narrow roads"], incidents: 17 },
        { id: 5, name: "Indiranagar", severity: 7.9, frequency: 75, avgVolume: 4300, coordinates: [12.9780, 77.6400], factors: ["Entertainment", "Dining"], incidents: 15 },
        { id: 6, name: "HSR Layout", severity: 7.2, frequency: 70, avgVolume: 4000, coordinates: [12.9120, 77.6380], factors: ["Residential", "Schools"], incidents: 12 },
      ],
      hourlyPattern: [
        { hour: "00:00", incidents: 3, severity: 4.1 },
        { hour: "07:00", incidents: 12, severity: 7.8 },
        { hour: "09:00", incidents: 18, severity: 9.1 },
        { hour: "13:00", incidents: 14, severity: 8.2 },
        { hour: "19:00", incidents: 20, severity: 9.5 },
        { hour: "21:00", incidents: 15, severity: 7.9 },
        { hour: "23:00", incidents: 6, severity: 5.8 },
      ],
      severityDistribution: [
        { severity: "Critical", count: 5, percentage: 33 },
        { severity: "High", count: 4, percentage: 27 },
        { severity: "Medium", count: 4, percentage: 27 },
        { severity: "Low", count: 2, percentage: 13 },
      ],
      factorAnalysis: [
        { factor: "Weather", impact: 78, frequency: 82 },
        { factor: "Metro Work", impact: 88, frequency: 65 },
        { factor: "IT Traffic", impact: 92, frequency: 88 },
        { factor: "Rush Hour", impact: 85, frequency: 95 },
        { factor: "Weekend", impact: 55, frequency: 72 },
        { factor: "Festivals", impact: 68, frequency: 35 },
      ]
    },
    "Chennai/Mumbai": {
      totalHotspots: 10,
      criticalHotspots: 2,
      averageSeverity: 6.8,
      peakHours: ["08:00-09:00", "17:00-19:00"],
      hotspots: [
        { id: 1, name: "Chennai Central", severity: 8.5, frequency: 80, avgVolume: 4800, coordinates: [13.0827, 80.2707], factors: ["Railway station", "Bus terminal"], incidents: 20 },
        { id: 2, name: "Mumbai CST", severity: 8.2, frequency: 78, avgVolume: 4500, coordinates: [18.9750, 72.8258], factors: ["Railway hub", "Market area"], incidents: 18 },
        { id: 3, name: "T Nagar", severity: 7.8, frequency: 75, avgVolume: 4200, coordinates: [13.0400, 80.2430], factors: ["Shopping", "Commercial"], incidents: 16 },
        { id: 4, name: "Andheri", severity: 7.1, frequency: 70, avgVolume: 3800, coordinates: [19.1136, 72.8697], factors: ["Suburban railway", "Business hub"], incidents: 12 },
        { id: 5, name: "Mount Road", severity: 6.5, frequency: 65, avgVolume: 3500, coordinates: [13.0800, 80.2700], factors: [" arterial road", "Government offices"], incidents: 10 },
        { id: 6, name: "Marine Drive", severity: 6.0, frequency: 62, avgVolume: 3200, coordinates: [18.9440, 72.8220], factors: ["Tourist area", "Evening traffic"], incidents: 8 },
      ],
      hourlyPattern: [
        { hour: "00:00", incidents: 2, severity: 3.5 },
        { hour: "07:00", incidents: 10, severity: 7.2 },
        { hour: "09:00", incidents: 16, severity: 8.5 },
        { hour: "13:00", incidents: 12, severity: 7.8 },
        { hour: "18:00", incidents: 18, severity: 8.2 },
        { hour: "20:00", incidents: 14, severity: 7.1 },
        { hour: "22:00", incidents: 8, severity: 5.5 },
      ],
      severityDistribution: [
        { severity: "Critical", count: 2, percentage: 20 },
        { severity: "High", count: 3, percentage: 30 },
        { severity: "Medium", count: 3, percentage: 30 },
        { severity: "Low", count: 2, percentage: 20 },
      ],
      factorAnalysis: [
        { factor: "Weather", impact: 82, frequency: 85 },
        { factor: "Railway", impact: 78, frequency: 72 },
        { factor: "Markets", impact: 75, frequency: 68 },
        { factor: "Rush Hour", impact: 88, frequency: 92 },
        { factor: "Weekend", impact: 48, frequency: 65 },
        { factor: "Monsoon", impact: 92, frequency: 45 },
      ]
    }
  };

  const currentData = hotspotData[selectedCity as keyof typeof hotspotData];

  const getSeverityColor = (severity: number) => {
    if (severity >= 8.5) return "text-red-600 bg-red-50 border-red-200";
    if (severity >= 7.0) return "text-orange-600 bg-orange-50 border-orange-200";
    if (severity >= 5.5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getSeverityBadge = (severity: number) => {
    if (severity >= 8.5) return "destructive";
    if (severity >= 7.0) return "default";
    if (severity >= 5.5) return "secondary";
    return "outline";
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  const filteredHotspots = currentData.hotspots.filter(hotspot => {
    if (severity === "all") return true;
    if (severity === "critical") return hotspot.severity >= 8.5;
    if (severity === "high") return hotspot.severity >= 7.0 && hotspot.severity < 8.5;
    if (severity === "medium") return hotspot.severity >= 5.5 && hotspot.severity < 7.0;
    if (severity === "low") return hotspot.severity < 5.5;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Traffic Hotspots Analysis</h1>
          <p className="text-gray-600 mt-2">Identify and analyze high-traffic congestion zones across cities</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Minneapolis">Minneapolis</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Chennai/Mumbai">Chennai/Mumbai</option>
          </select>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (8.5+)</option>
            <option value="high">High (7.0-8.5)</option>
            <option value="medium">Medium (5.5-7.0)</option>
            <option value="low">Low (&lt;5.5)</option>
          </select>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Hotspot Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">Total Hotspots</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentData.totalHotspots}</div>
            <p className="text-sm text-gray-600">Active zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Critical Hotspots</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{currentData.criticalHotspots}</div>
            <p className="text-sm text-gray-600">High priority zones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Avg Severity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentData.averageSeverity}</div>
            <p className="text-sm text-gray-600">Severity score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Peak Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900">
              {currentData.peakHours[0]}
            </div>
            <p className="text-sm text-gray-600">{currentData.peakHours[1]}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="hotspots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hotspots">Hotspot Locations</TabsTrigger>
          <TabsTrigger value="patterns">Traffic Patterns</TabsTrigger>
          <TabsTrigger value="severity">Severity Analysis</TabsTrigger>
          <TabsTrigger value="factors">Influencing Factors</TabsTrigger>
        </TabsList>

        <TabsContent value="hotspots" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHotspots.map((hotspot) => (
              <Card key={hotspot.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{hotspot.name}</CardTitle>
                    <Badge variant={getSeverityBadge(hotspot.severity)}>
                      {hotspot.severity >= 8.5 ? "Critical" : 
                       hotspot.severity >= 7.0 ? "High" : 
                       hotspot.severity >= 5.5 ? "Medium" : "Low"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Severity Score</span>
                      <span className={`font-semibold px-2 py-1 rounded border ${getSeverityColor(hotspot.severity)}`}>
                        {hotspot.severity}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Frequency</span>
                      <span className="font-semibold">{hotspot.frequency}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg Volume</span>
                      <span className="font-semibold">{hotspot.avgVolume.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Incidents</span>
                      <span className="font-semibold text-red-600">{hotspot.incidents}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Factors:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hotspot.factors.map((factor, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Incident Pattern</CardTitle>
              <p className="text-sm text-gray-600">Incident frequency and severity throughout the day</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData.hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="severity" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Avg Severity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="severity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentData.severityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ severity, percentage }) => `${severity}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                      >
                        {currentData.severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.severityDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">{item.severity}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{item.count}</span>
                        <span className="text-sm text-gray-600">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Influencing Factors Analysis</CardTitle>
              <p className="text-sm text-gray-600">Impact and frequency of factors affecting hotspot formation</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={currentData.factorAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="frequency" name="Frequency (%)" />
                    <YAxis dataKey="impact" name="Impact (%)" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Factors" dataKey="impact" fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentData.factorAnalysis.map((factor, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded">
                    <div className="font-semibold text-sm">{factor.factor}</div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-600">Impact: {factor.impact}%</span>
                      <span className="text-gray-600">Freq: {factor.frequency}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Hotspots;
