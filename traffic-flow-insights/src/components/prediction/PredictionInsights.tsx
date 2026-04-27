import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Shield, AlertTriangle, Navigation, Leaf, TrendingUp,
  Info, AlertCircle, XCircle,
} from "lucide-react";
import {
  PredictionInput, detectRushHour, assessTrafficRisk, generateAlerts,
  getTravelRecommendations, generateForecast, assessEnvironmentalImpact,
  classifyCongestion,
} from "@/lib/traffic-analysis";
import { CongestionBadge } from "./CongestionBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  volume: number;
  input: PredictionInput;
}

const riskColors = { low: "text-success", moderate: "text-warning", high: "text-destructive" };
const riskBg = { low: "bg-success/10", moderate: "bg-warning/10", high: "bg-destructive/10" };
const alertIcons = { info: Info, warning: AlertCircle, danger: XCircle };
const alertVariants = { info: "default" as const, warning: "default" as const, danger: "destructive" as const };
const congestionBarColors: Record<string, string> = {
  low: "hsl(152,60%,42%)", moderate: "hsl(38,92%,50%)", high: "hsl(0,72%,51%)", severe: "hsl(0,72%,40%)",
};

export function PredictionInsights({ volume, input }: Props) {
  const congestion = classifyCongestion(volume);
  const rushHour = detectRushHour();
  const risk = assessTrafficRisk(input);
  const alerts = generateAlerts(input, volume);
  const recommendations = getTravelRecommendations(input, volume);
  const forecast = generateForecast(input, volume);
  const envImpact = assessEnvironmentalImpact(input, volume);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Congestion + Rush Hour row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Congestion Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CongestionBadge volume={volume} />
            <div className="mt-3">
              <Progress
                value={Math.min((volume / 6000) * 100, 100)}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">{volume.toLocaleString()} / 6,000 capacity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-info" /> Rush Hour Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className={rushHour.type !== "normal" ? "border-warning/50 bg-warning/10 text-warning" : "border-success/50 bg-success/10 text-success"}>
              {rushHour.label}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">{rushHour.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk + Environmental row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-warning" /> Traffic Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-3 w-3 rounded-full ${riskBg[risk.level]}`}>
                <div className={`h-3 w-3 rounded-full ${risk.level === "high" ? "bg-destructive animate-pulse" : risk.level === "moderate" ? "bg-warning" : "bg-success"}`} />
              </div>
              <span className={`text-sm font-semibold ${riskColors[risk.level]}`}>{risk.label}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {risk.factors.map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Leaf className="h-4 w-4 text-success" /> Environmental Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${riskColors[envImpact.level]}`}>
                {envImpact.level.charAt(0).toUpperCase() + envImpact.level.slice(1)} Impact
              </span>
              <span className="text-xs text-muted-foreground">Score: {envImpact.score}/100</span>
            </div>
            <div className="space-y-2">
              {envImpact.factors.map((f, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                    <span>{f.label}</span>
                    <span>{Math.round((f.value / f.max) * 100)}%</span>
                  </div>
                  <Progress value={(f.value / f.max) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const Icon = alertIcons[a.type];
            return (
              <Alert key={i} variant={alertVariants[a.type]}>
                <Icon className="h-4 w-4" />
                <AlertTitle className="text-sm">{a.title}</AlertTitle>
                <AlertDescription className="text-xs">{a.message}</AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" /> Travel Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span>{r.icon}</span>
                <span className="text-muted-foreground">{r.recommendation}</span>
                {r.priority === "high" && <Badge variant="destructive" className="text-[10px] ml-auto shrink-0">Urgent</Badge>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Forecast */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-info" /> 6-Hour Traffic Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,14%,50%)" />
              <Tooltip />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {forecast.map((d, i) => (
                  <Cell key={i} fill={congestionBarColors[d.congestion]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Low</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Moderate</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> High+</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
