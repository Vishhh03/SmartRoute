import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, FileText, Target, Columns, Clock, TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const features = [
  "temperature", "humidity", "wind_speed", "wind_direction",
  "visibility_in_miles", "air_pollution_index", "cloud_coverage",
  "rain_per_hour", "snow_per_hour", "weather_type", "weather_description",
];

const featureImportance = [
  { name: "temperature", importance: 0.23 }, { name: "rain_per_hour", importance: 0.18 },
  { name: "visibility", importance: 0.15 }, { name: "wind_speed", importance: 0.12 },
  { name: "humidity", importance: 0.10 }, { name: "cloud_coverage", importance: 0.08 },
  { name: "snow_per_hour", importance: 0.06 }, { name: "air_pollution", importance: 0.04 },
  { name: "wind_direction", importance: 0.02 }, { name: "weather_type", importance: 0.01 },
  { name: "weather_desc", importance: 0.01 },
];

const volumeDistribution = [
  { range: "0-1k", count: 4200 }, { range: "1k-2k", count: 7800 },
  { range: "2k-3k", count: 9600 }, { range: "3k-4k", count: 11200 },
  { range: "4k-5k", count: 8900 }, { range: "5k-6k", count: 4500 },
  { range: "6k+", count: 2004 },
];

const weatherSplit = [
  { name: "Clear", value: 38 }, { name: "Clouds", value: 28 },
  { name: "Rain", value: 15 }, { name: "Snow", value: 8 },
  { name: "Other", value: 11 },
];

const COLORS = ["hsl(173,58%,39%)", "hsl(199,89%,48%)", "hsl(262,52%,55%)", "hsl(43,96%,56%)", "hsl(349,70%,56%)"];

const stats = [
  { icon: Database, label: "Total Records", value: "48,204", color: "text-primary", bg: "bg-primary/10" },
  { icon: Columns, label: "Features", value: "11", color: "text-info", bg: "bg-info/10" },
  { icon: Target, label: "Target Variable", value: "traffic_volume", color: "text-warning", bg: "bg-warning/10" },
  { icon: TrendingUp, label: "Avg Volume", value: "3,260", color: "text-success", bg: "bg-success/10" },
  { icon: Clock, label: "Peak Hour", value: "5:00 PM", color: "text-destructive", bg: "bg-destructive/10" },
  { icon: BarChart3, label: "Max Volume", value: "7,280", color: "text-primary", bg: "bg-primary/10" },
];

const DatasetInfo = () => (
  <div className="space-y-6">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="font-display text-3xl font-bold">Dataset Insights</h1>
      <p className="mt-1 text-muted-foreground">Comprehensive statistics and analysis of the training dataset.</p>
    </motion.div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex items-center gap-3 p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-display text-xl font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Features Used for Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {features.map((f) => <Badge key={f} variant="secondary" className="font-mono text-xs">{f}</Badge>)}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="font-display text-base">Feature Importance</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {featureImportance.map((f) => (
            <div key={f.name}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground font-mono">{f.name}</span>
                <span className="font-semibold">{(f.importance * 100).toFixed(0)}%</span>
              </div>
              <Progress value={f.importance * 100 / 0.23} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Traffic Volume Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={volumeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(173,58%,39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">Weather Type Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={weatherSplit} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                {weatherSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display text-base">About the Dataset</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            The dataset (<strong>Train.csv</strong>) contains hourly traffic volume records collected from
            metropolitan interstate highways. Each record includes weather conditions, environmental
            measurements, and the corresponding traffic volume.
          </p>
          <p>
            Weather features such as temperature, humidity, wind speed, visibility, and precipitation
            are key predictors. The model learns patterns between environmental conditions
            and traffic flow to generate accurate predictions.
          </p>
          <p>
            The target variable <strong>traffic_volume</strong> represents the number of vehicles
            passing a given point per hour, with values ranging from <strong>0 to 7,280</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default DatasetInfo;
