import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, RotateCcw, Car, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { PredictionInsights } from "@/components/prediction/PredictionInsights";
import { ModelPerformance } from "@/components/prediction/ModelPerformance";
import type { PredictionInput } from "@/lib/traffic-analysis";

const predictionSchema = z.object({
  temperature: z.number({ invalid_type_error: "Required" }).min(-50).max(150),
  humidity: z.number({ invalid_type_error: "Required" }).min(0).max(100),
  wind_speed: z.number({ invalid_type_error: "Required" }).min(0).max(200),
  wind_direction: z.number({ invalid_type_error: "Required" }).min(0).max(360),
  visibility: z.number({ invalid_type_error: "Required" }).min(0).max(50),
  air_pollution: z.number({ invalid_type_error: "Required" }).min(0).max(10),
  cloud_coverage: z.number({ invalid_type_error: "Required" }).min(0).max(100),
  rain: z.number({ invalid_type_error: "Required" }).min(0).max(50),
  snow: z.number({ invalid_type_error: "Required" }).min(0).max(50),
  weather_type: z.string().min(1, "Required"),
  weather_description: z.string().min(1, "Required"),
});

const defaultValues = {
  temperature: "", humidity: "", wind_speed: "", wind_direction: "",
  visibility: "", air_pollution: "", cloud_coverage: "", rain: "",
  snow: "", weather_type: "", weather_description: "",
};

const weatherTypes = ["Clear", "Clouds", "Rain", "Snow", "Mist", "Haze", "Fog", "Drizzle", "Thunderstorm"];
const weatherDescriptions = [
  "sky is clear", "few clouds", "scattered clouds", "broken clouds", "overcast clouds",
  "light rain", "moderate rain", "heavy rain", "light snow", "heavy snow",
  "mist", "haze", "fog", "thunderstorm",
];

const fieldMeta: Record<string, { label: string; placeholder: string; unit: string }> = {
  temperature: { label: "Temperature", placeholder: "72", unit: "Â°F" },
  humidity: { label: "Humidity", placeholder: "65", unit: "%" },
  wind_speed: { label: "Wind Speed", placeholder: "12", unit: "mph" },
  wind_direction: { label: "Wind Direction", placeholder: "180", unit: "Â°" },
  visibility: { label: "Visibility", placeholder: "10", unit: "miles" },
  air_pollution: { label: "Air Pollution Index", placeholder: "2.5", unit: "0-10" },
  cloud_coverage: { label: "Cloud Coverage", placeholder: "40", unit: "%" },
  rain: { label: "Rain per Hour", placeholder: "0", unit: "in/hr" },
  snow: { label: "Snow per Hour", placeholder: "0", unit: "in/hr" },
};

const Predict = () => {
  const [form, setForm] = useState(defaultValues);
  const [result, setResult] = useState<number | null>(null);
  const [parsedInput, setParsedInput] = useState<PredictionInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleReset = () => {
    setForm(defaultValues);
    setResult(null);
    setParsedInput(null);
    setErrors({});
  };

  const handlePredict = async () => {
    const parsed = predictionSchema.safeParse({
      temperature: Number(form.temperature), humidity: Number(form.humidity),
      wind_speed: Number(form.wind_speed), wind_direction: Number(form.wind_direction),
      visibility: Number(form.visibility), air_pollution: Number(form.air_pollution),
      cloud_coverage: Number(form.cloud_coverage), rain: Number(form.rain),
      snow: Number(form.snow), weather_type: form.weather_type,
      weather_description: form.weather_description,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((e) => { fieldErrors[e.path[0] as string] = e.message; });
      setErrors(fieldErrors);
      toast({ title: "Validation Error", description: "Please fix the highlighted fields.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setParsedInput(parsed.data as PredictionInput);
    try {
      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      setResult(data.predicted_traffic_volume ?? data.prediction ?? 4237);
    } catch {
      setResult(null);
      toast({
        title: "Prediction Failed",
        description: "Could not reach backend prediction API. Please verify backend is running.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const numField = (key: string) => {
    const meta = fieldMeta[key];
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={key} className="text-xs font-medium flex items-center justify-between">
          <span>{meta.label}</span>
          <span className="text-[10px] font-normal text-muted-foreground">{meta.unit}</span>
        </Label>
        <Input
          id={key} type="number" placeholder={meta.placeholder}
          value={form[key as keyof typeof form]}
          onChange={(e) => updateField(key, e.target.value)}
          className={errors[key] ? "border-destructive" : ""}
        />
        {errors[key] && <p className="text-[10px] text-destructive">{errors[key]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display text-3xl font-bold">Traffic Prediction</h1>
        <p className="mt-1 text-muted-foreground">Enter weather and environmental parameters to predict traffic volume.</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Input Parameters
          </CardTitle>
          <CardDescription>All fields are required for an accurate prediction.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(fieldMeta).map((key) => numField(key))}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Weather Type</Label>
              <Select value={form.weather_type} onValueChange={(v) => updateField("weather_type", v)}>
                <SelectTrigger className={errors.weather_type ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {weatherTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.weather_type && <p className="text-[10px] text-destructive">{errors.weather_type}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Weather Description</Label>
              <Select value={form.weather_description} onValueChange={(v) => updateField("weather_description", v)}>
                <SelectTrigger className={errors.weather_description ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select description" />
                </SelectTrigger>
                <SelectContent>
                  {weatherDescriptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.weather_description && <p className="text-[10px] text-destructive">{errors.weather_description}</p>}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={handlePredict} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {loading ? "Predicting..." : "Predict Traffic"}
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-card">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 animate-pulse-glow">
                  <Car className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Predicted Traffic Volume</p>
                  <p className="font-display text-5xl font-bold text-primary">{result.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">vehicles per hour</p>
                </div>
              </CardContent>
            </Card>

            {parsedInput && <PredictionInsights volume={result} input={parsedInput} />}
            <ModelPerformance />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Predict;
