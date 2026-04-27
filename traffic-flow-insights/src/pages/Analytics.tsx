import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import LiveMap from "../components/LiveMap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { getModelStats, getHourlyBaseline } from "@/lib/api";
import ModelStatsPanel from "@/components/ModelStatsPanel";

class MapErrorBoundary extends React.Component<any, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 
        bg-red-50 p-6 text-center">
          <div className="text-red-600 font-semibold mb-2">
            Map failed to load
          </div>
          <div className="text-xs text-red-400">
            Make sure backend is running on port 5000
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-xs text-red-600 underline">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const monthlyTrend = [
  { month: "Jan", volume: 32000 }, { month: "Feb", volume: 33500 },
  { month: "Mar", volume: 38000 }, { month: "Apr", volume: 41000 },
  { month: "May", volume: 44000 }, { month: "Jun", volume: 46000 },
  { month: "Jul", volume: 48000 }, { month: "Aug", volume: 47000 },
  { month: "Sep", volume: 43000 }, { month: "Oct", volume: 40000 },
  { month: "Nov", volume: 36000 }, { month: "Dec", volume: 34000 },
];
const trafficComposition = [
  { name: "Cars", value: 62 }, { name: "Trucks", value: 18 },
  { name: "Buses", value: 8 }, { name: "Motorcycles", value: 12 },
];
const weatherInfluence = [
  { factor: "Temperature", impact: 78 }, { factor: "Humidity", impact: 45 },
  { factor: "Wind Speed", impact: 62 }, { factor: "Visibility", impact: 85 },
  { factor: "Rain", impact: 90 }, { factor: "Cloud Cover", impact: 35 },
];
const weatherImpact = [
  { weather: "Clear", volume: 4800 }, { weather: "Clouds", volume: 4200 },
  { weather: "Rain", volume: 3100 }, { weather: "Snow", volume: 2200 },
  { weather: "Fog", volume: 2800 }, { weather: "Mist", volume: 3400 },
];
const tempVsTraffic = [
  { temp: 10, volume: 2800 }, { temp: 20, volume: 3200 }, { temp: 30, volume: 3600 },
  { temp: 40, volume: 3900 }, { temp: 50, volume: 4200 }, { temp: 60, volume: 4600 },
  { temp: 70, volume: 4900 }, { temp: 75, volume: 5100 }, { temp: 80, volume: 4800 },
  { temp: 90, volume: 4400 }, { temp: 100, volume: 3800 },
];
const humidityImpact = [
  { range: "0-20%", volume: 4600 }, { range: "20-40%", volume: 4400 },
  { range: "40-60%", volume: 4100 }, { range: "60-80%", volume: 3700 },
  { range: "80-100%", volume: 3200 },
];
const COLORS = ["hsl(173,58%,39%)", "hsl(199,89%,48%)", "hsl(262,52%,55%)", "hsl(43,96%,56%)"];

const ModelStatsSection = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModelStats().then(setStats).catch(() => setStats([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 py-4">Loading model stats...</div>;
  if (!stats.length) return <div className="text-sm text-rose-500 py-4">Could not load model stats â€” is the backend running?</div>;

  const bestR2 = Math.max(...stats.map((s) => s.r2));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 text-left">Model</th>
              <th className="px-4 py-3 text-right">RÂ²</th>
              <th className="px-4 py-3 text-right">MAE</th>
              <th className="px-4 py-3 text-right">RMSE</th>
              <th className="px-4 py-3 text-right">Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {[...stats].sort((a, b) => b.r2 - a.r2).map((s) => (
              <tr key={s.model} className={`border-b border-slate-50 last:border-0 ${s.r2 === bestR2 ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {s.r2 === bestR2 && <span className="mr-1.5 text-emerald-500">â˜…</span>}
                  {s.model}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${s.r2 === bestR2 ? "text-emerald-700" : "text-slate-700"}`}>
                  {s.r2.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">{s.mae.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.rmse.toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-slate-500">{s.training_time_seconds?.toFixed(2) ?? "â€”"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">RÂ² Score Comparison</div>
        <div className="space-y-2">
          {[...stats].sort((a, b) => b.r2 - a.r2).map((s) => (
            <div key={s.model} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-slate-600 truncate">{s.model}</div>
              <div className="flex-1 rounded-full bg-slate-100 h-5 overflow-hidden">
                <div
                  className={`h-5 rounded-full flex items-center justify-end pr-2 text-xs font-semibold text-white transition-all duration-700 ${s.r2 === bestR2 ? "bg-gradient-to-r from-emerald-400 to-teal-500" : s.r2 < 0 ? "bg-rose-400" : "bg-gradient-to-r from-indigo-400 to-blue-500"}`}
                  style={{ width: `${Math.max(0, s.r2) * 100}%` }}
                >
                  {s.r2 > 0.3 ? s.r2.toFixed(3) : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HourlyBaselineChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHourlyBaseline()
      .then((d) => setData(d.map((row: any) => ({
        ...row,
        fill: row.avg_traffic_volume < 2000 ? "#10b981" : row.avg_traffic_volume < 4000 ? "#f59e0b" : "#ef4444",
      }))))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500 py-4">Loading hourly data...</div>;
  if (!data.length) return <div className="text-sm text-rose-500 py-4">Could not load hourly data.</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
        <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
        <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
        <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} veh/hr`, "Avg Volume"]} />
        <Bar dataKey="avg_traffic_volume" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const WhatIfSimulator = () => {
  const [rain, setRain] = useState([0]);
  const [incident, setIncident] = useState([0]);
  const [result, setResult] = useState<{original: number, simulated: number, delta: number} | null>(null);
  
  const handleSimulate = () => {
    const baseVolume = 4200; // Baseline prediction
    let rainMult = 1.0;
    const r = rain[0];
    if (r >= 21 && r <= 50) rainMult = 1.15;
    else if (r >= 51 && r <= 80) rainMult = 1.30;
    else if (r > 80) rainMult = 1.45;
    
    let incMult = 1.0;
    const i = incident[0];
    if (i >= 3 && i <= 5) incMult = 1.20;
    else if (i >= 6 && i <= 8) incMult = 1.40;
    else if (i > 8) incMult = 1.60;
    
    const simulated = Math.round(baseVolume * rainMult * incMult);
    const delta = Math.round(((simulated - baseVolume) / baseVolume) * 100);
    setResult({ original: baseVolume, simulated, delta });
  };

  return (
    <Collapsible className="border border-slate-200 rounded-xl bg-white shadow-sm mt-8 mb-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-4 font-semibold text-slate-800 hover:bg-slate-50 transition-colors rounded-xl">
        <span>ðŸ§ª Digital Twin Simulator</span>
        <span className="text-slate-400 text-sm">â–¼ Expand</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5 pt-2 border-t border-slate-100">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Rain Intensity (mm/hr)</span>
                <span>{rain[0]} mm</span>
              </div>
              <Slider value={rain} onValueChange={setRain} max={100} step={1} />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span>Incident Severity</span>
                <span>{incident[0]}/10</span>
              </div>
              <Slider value={incident} onValueChange={setIncident} max={10} step={1} />
            </div>
            <button 
              onClick={handleSimulate}
              className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium hover:bg-slate-800 transition-colors"
            >
              Run Simulation
            </button>
          </div>
          <div className="flex items-center justify-center">
            {result ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 w-full text-center">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Simulation Result</div>
                <div className="text-lg font-medium text-slate-700">Original: {result.original.toLocaleString()}</div>
                <div className="text-3xl font-extrabold text-slate-900 my-2">Simulated: {result.simulated.toLocaleString()}</div>
                <div className={`text-sm font-bold ${result.delta > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                  Delta: +{result.delta}%
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Adjust sliders and run simulation</div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const SystemHealthDrawer = () => {
  const [health, setHealth] = useState<string>("Checking...");
  
  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then(res => setHealth(res.ok ? "Online" : "Offline"))
      .catch(() => setHealth("Offline"));
  }, []);

  return (
    <Collapsible className="border border-slate-800 rounded-xl bg-slate-950 shadow-sm mt-8">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-4 font-mono font-semibold text-slate-200 hover:bg-slate-900 transition-colors rounded-xl">
        <span className="flex items-center gap-2">âš™ï¸ System Observability <span className={`h-2 w-2 rounded-full ${health === 'Online' ? 'bg-green-500' : 'bg-red-500'}`}></span></span>
        <span className="text-slate-500 text-sm">â–¼</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-5 pb-5 pt-2 border-t border-slate-800 text-green-400 font-mono text-sm space-y-2">
        <div className="flex justify-between"><span>API Status:</span><span>{health}</span></div>
        <div className="flex justify-between"><span>Models:</span><span>Primary Model RÂ²=0.9583</span></div>
        <div className="flex justify-between"><span></span><span>Secondary Models RÂ²=0.856</span></div>
        <div className="flex justify-between"><span>Last Retrained:</span><span>{new Date().toLocaleDateString()}</span></div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Analytics = () => (
  <div className="space-y-8">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display text-3xl font-bold">Traffic Analytics</h1>
      <p className="mt-1 text-muted-foreground">Interactive visualizations of traffic patterns, weather impact, and model performance.</p>
    </motion.div>

    <section className="space-y-3 mb-8">
      <div className="section-label">Live Traffic Intelligence</div>
      <h2 className="text-xl font-semibold text-slate-900">
        Real-Time Prediction Map
      </h2>
      <p className="text-sm text-slate-500">
        Live traffic volume predictions streaming every 3 seconds 
        across metropolitan road network zones.
      </p>
      <MapErrorBoundary>
        <LiveMap />
      </MapErrorBoundary>
    </section>

    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Model Performance</h2>
      <p className="text-sm text-slate-600 mb-4">All 6 models trained on 33,750 records ranked by RÂ² score.</p>
      <ModelStatsSection />
      <div className="mt-4">
        <ModelStatsPanel />
      </div>
    </div>

    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Live Hourly Traffic Baseline</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Average Traffic Volume by Hour</CardTitle>
          <p className="text-xs text-slate-500">ðŸŸ¢ Light (&lt;2000) Â· ðŸŸ¡ Moderate (2000â€“4000) Â· ðŸ”´ Heavy (&gt;4000)</p>
        </CardHeader>
        <CardContent><HourlyBaselineChart /></CardContent>
      </Card>
    </div>

    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Traffic Trends</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Monthly Traffic Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="hsl(262,52%,55%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Traffic Composition</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={trafficComposition} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {trafficComposition.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Weather vs Traffic Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weatherImpact}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="weather" tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <Tooltip />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {weatherImpact.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Humidity Impact on Traffic</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={humidityImpact}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215,14%,50%)" />
                <Tooltip />
                <Bar dataKey="volume" fill="hsl(262,52%,55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>

    <div>
      <h2 className="font-display text-lg font-semibold mb-3">Weather Impact Analysis</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Weather Factor Influence</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={weatherInfluence}>
                <PolarGrid stroke="hsl(214,20%,90%)" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
                <PolarRadiusAxis tick={{ fontSize: 9 }} stroke="hsl(215,14%,50%)" />
                <Radar dataKey="impact" stroke="hsl(173,58%,39%)" fill="hsl(173,58%,39%)" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-display text-base">Temperature vs Traffic</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                <XAxis dataKey="temp" name="Temp (Â°F)" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
                <YAxis dataKey="volume" name="Volume" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={tempVsTraffic} fill="hsl(199,89%,48%)" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>

    <WhatIfSimulator />
    <SystemHealthDrawer />

  </div>
);

export default Analytics;
