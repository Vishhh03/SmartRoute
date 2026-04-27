import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { Clock, TrendingUp, AlertTriangle, Calendar } from "lucide-react";

const PeakHour = () => {
  const [selectedCity, setSelectedCity] = useState("Minneapolis");
  const [timeRange, setTimeRange] = useState("24h");

  // Peak hour analysis data
  const peakHourData = {
    Minneapolis: {
      detectedPeak: "16:00",
      historicalPeak: "17:00",
      drift: -1,
      confidence: 94.2,
      volume: 4850,
      factors: ["Weather", "Day of Week", "Holiday"],
      hourlyData: [
        { hour: "00:00", volume: 1200, baseline: 1100, predicted: 1150 },
        { hour: "06:00", volume: 2100, baseline: 2000, predicted: 2050 },
        { hour: "08:00", volume: 3800, baseline: 3600, predicted: 3700 },
        { hour: "12:00", volume: 3200, baseline: 3100, predicted: 3150 },
        { hour: "16:00", volume: 4850, baseline: 4200, predicted: 4500 },
        { hour: "17:00", volume: 4600, baseline: 4500, predicted: 4550 },
        { hour: "18:00", volume: 3900, baseline: 3800, predicted: 3850 },
        { hour: "20:00", volume: 2800, baseline: 2700, predicted: 2750 },
        { hour: "23:00", volume: 1500, baseline: 1400, predicted: 1450 },
      ],
      weeklyPattern: [
        { day: "Mon", peak: "16:00", volume: 4500 },
        { day: "Tue", peak: "16:00", volume: 4600 },
        { day: "Wed", peak: "17:00", volume: 4700 },
        { day: "Thu", peak: "16:00", volume: 4800 },
        { day: "Fri", peak: "17:00", volume: 5200 },
        { day: "Sat", peak: "14:00", volume: 3500 },
        { day: "Sun", peak: "15:00", volume: 2800 },
      ],
      seasonalData: [
        { month: "Jan", peakVolume: 4200, avgTemp: -5 },
        { month: "Feb", peakVolume: 4300, avgTemp: -2 },
        { month: "Mar", peakVolume: 4500, avgTemp: 5 },
        { month: "Apr", peakVolume: 4600, avgTemp: 12 },
        { month: "May", peakVolume: 4700, avgTemp: 18 },
        { month: "Jun", peakVolume: 4800, avgTemp: 23 },
        { month: "Jul", peakVolume: 4900, avgTemp: 26 },
        { month: "Aug", peakVolume: 4850, avgTemp: 25 },
        { month: "Sep", peakVolume: 4700, avgTemp: 20 },
        { month: "Oct", peakVolume: 4500, avgTemp: 13 },
        { month: "Nov", peakVolume: 4300, avgTemp: 5 },
        { month: "Dec", peakVolume: 4100, avgTemp: -2 },
      ]
    },
    Bangalore: {
      detectedPeak: "19:00",
      historicalPeak: "18:00",
      drift: +1,
      confidence: 87.6,
      volume: 5200,
      factors: ["Weather", "Roadwork", "Events"],
      hourlyData: [
        { hour: "00:00", volume: 800, baseline: 750, predicted: 775 },
        { hour: "07:00", volume: 2800, baseline: 2600, predicted: 2700 },
        { hour: "09:00", volume: 4200, baseline: 4000, predicted: 4100 },
        { hour: "13:00", volume: 3800, baseline: 3600, predicted: 3700 },
        { hour: "19:00", volume: 5200, baseline: 4800, predicted: 5000 },
        { hour: "20:00", volume: 4800, baseline: 4600, predicted: 4700 },
        { hour: "21:00", volume: 3500, baseline: 3400, predicted: 3450 },
        { hour: "23:00", volume: 1800, baseline: 1700, predicted: 1750 },
      ],
      weeklyPattern: [
        { day: "Mon", peak: "19:00", volume: 5000 },
        { day: "Tue", peak: "19:00", volume: 5100 },
        { day: "Wed", peak: "18:00", volume: 4900 },
        { day: "Thu", peak: "19:00", volume: 5200 },
        { day: "Fri", peak: "20:00", volume: 5500 },
        { day: "Sat", peak: "16:00", volume: 4200 },
        { day: "Sun", peak: "17:00", volume: 3800 },
      ],
      seasonalData: [
        { month: "Jan", peakVolume: 4800, avgTemp: 24 },
        { month: "Feb", peakVolume: 4900, avgTemp: 26 },
        { month: "Mar", peakVolume: 5000, avgTemp: 28 },
        { month: "Apr", peakVolume: 5100, avgTemp: 30 },
        { month: "May", peakVolume: 5200, avgTemp: 29 },
        { month: "Jun", peakVolume: 5300, avgTemp: 27 },
        { month: "Jul", peakVolume: 5400, avgTemp: 26 },
        { month: "Aug", peakVolume: 5350, avgTemp: 26 },
        { month: "Sep", peakVolume: 5200, avgTemp: 27 },
        { month: "Oct", peakVolume: 5100, avgTemp: 27 },
        { month: "Nov", peakVolume: 5000, avgTemp: 26 },
        { month: "Dec", peakVolume: 4900, avgTemp: 25 },
      ]
    },
    "Chennai/Mumbai": {
      detectedPeak: "18:30",
      historicalPeak: "18:00",
      drift: +0.5,
      confidence: 82.3,
      volume: 4100,
      factors: ["Temperature", "Humidity", "City"],
      hourlyData: [
        { hour: "00:00", volume: 600, baseline: 550, predicted: 575 },
        { hour: "06:00", volume: 2200, baseline: 2000, predicted: 2100 },
        { hour: "09:00", volume: 3500, baseline: 3300, predicted: 3400 },
        { hour: "13:00", volume: 3200, baseline: 3100, predicted: 3150 },
        { hour: "18:30", volume: 4100, baseline: 3800, predicted: 3950 },
        { hour: "19:00", volume: 3900, baseline: 3700, predicted: 3800 },
        { hour: "20:00", volume: 3000, baseline: 2900, predicted: 2950 },
        { hour: "22:00", volume: 1600, baseline: 1500, predicted: 1550 },
      ],
      weeklyPattern: [
        { day: "Mon", peak: "18:30", volume: 3900 },
        { day: "Tue", peak: "18:00", volume: 4000 },
        { day: "Wed", peak: "18:30", volume: 4100 },
        { day: "Thu", peak: "18:00", volume: 3950 },
        { day: "Fri", peak: "19:00", volume: 4200 },
        { day: "Sat", peak: "15:00", volume: 3500 },
        { day: "Sun", peak: "16:00", volume: 3200 },
      ],
      seasonalData: [
        { month: "Jan", peakVolume: 3800, avgTemp: 28 },
        { month: "Feb", peakVolume: 3900, avgTemp: 29 },
        { month: "Mar", peakVolume: 4000, avgTemp: 31 },
        { month: "Apr", peakVolume: 4100, avgTemp: 33 },
        { month: "May", peakVolume: 4200, avgTemp: 35 },
        { month: "Jun", peakVolume: 4300, avgTemp: 36 },
        { month: "Jul", peakVolume: 4350, avgTemp: 35 },
        { month: "Aug", peakVolume: 4300, avgTemp: 35 },
        { month: "Sep", peakVolume: 4200, avgTemp: 34 },
        { month: "Oct", peakVolume: 4100, avgTemp: 33 },
        { month: "Nov", peakVolume: 4000, avgTemp: 31 },
        { month: "Dec", peakVolume: 3900, avgTemp: 29 },
      ]
    }
  };

  const currentData = peakHourData[selectedCity as keyof typeof peakHourData];

  const getDriftColor = (drift: number) => {
    if (drift === 0) return "text-green-600";
    if (Math.abs(drift) <= 1) return "text-yellow-600";
    return "text-red-600";
  };

  const getDriftIcon = (drift: number) => {
    if (drift > 0) return "later";
    if (drift < 0) return "earlier";
    return "stable";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Peak Hour Analysis</h1>
          <p className="text-gray-600 mt-2">Analyze traffic peak patterns and temporal drift across cities</p>
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
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Peak Hour Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Detected Peak</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentData.detectedPeak}</div>
            <p className="text-sm text-gray-600">Current analysis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Historical Peak</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentData.historicalPeak}</div>
            <p className="text-sm text-gray-600">Historical average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Peak Drift</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getDriftColor(currentData.drift)}`}>
              {currentData.drift > 0 ? "+" : ""}{currentData.drift}hr
            </div>
            <p className="text-sm text-gray-600">{getDriftIcon(currentData.drift)} than historical</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Confidence</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{currentData.confidence}%</div>
            <p className="text-sm text-gray-600">Model confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hourly">Hourly Pattern</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Analysis</TabsTrigger>
          <TabsTrigger value="factors">Influencing Factors</TabsTrigger>
        </TabsList>

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Traffic Volume Pattern</CardTitle>
              <p className="text-sm text-gray-600">Comparison of baseline, predicted, and actual traffic volumes</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="baseline" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="predicted" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="volume" stackId="3" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span>Baseline</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Predicted</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Actual</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Peak Hour Pattern</CardTitle>
              <p className="text-sm text-gray-600">Peak hour and volume variations throughout the week</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentData.weeklyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="volume" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {currentData.weeklyPattern.map((day, index) => (
                  <div key={index} className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-xs font-semibold">{day.day}</div>
                    <div className="text-xs text-gray-600">{day.peak}</div>
                    <div className="text-xs font-bold text-blue-600">{day.volume}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Peak Volume Analysis</CardTitle>
              <p className="text-sm text-gray-600">Monthly peak volumes and temperature correlations</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentData.seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="peakVolume" stroke="#ef4444" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="avgTemp" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Peak Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Average Temperature</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Influencing Factors Analysis</CardTitle>
              <p className="text-sm text-gray-600">Key factors affecting peak hour timing and volume</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Primary Factors</h4>
                  <div className="space-y-2">
                    {currentData.factors.map((factor, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <span className="font-medium">{factor}</span>
                        <Badge variant="outline">High Impact</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Peak Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Peak Volume:</span>
                      <span className="font-bold">{currentData.volume.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Drift Direction:</span>
                      <span className={`font-bold ${getDriftColor(currentData.drift)}`}>
                        {getDriftIcon(currentData.drift)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Analysis Confidence:</span>
                      <span className="font-bold">{currentData.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Data Points:</span>
                      <span className="font-bold">33,750 records</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PeakHour;
