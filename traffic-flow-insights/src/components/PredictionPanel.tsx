import { useState, useRef, useEffect } from "react";
import { getPrediction, PredictionInput, PredictionResponse } from "@/lib/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";

type WeatherPreset = {
  id: string; icon: string; label: string;
  rain_p_h: number; wind_speed: number; clouds_all: number;
  weather_description: string; weather_type: string;
};

const WEATHER_PRESETS: WeatherPreset[] = [
  { id: "clear", icon: "☀️", label: "Clear", rain_p_h: 0, wind_speed: 5, clouds_all: 10, weather_description: "sky is clear", weather_type: "Clear" },
  { id: "cloudy", icon: "🌤", label: "Cloudy", rain_p_h: 0, wind_speed: 10, clouds_all: 60, weather_description: "scattered clouds", weather_type: "Clouds" },
  { id: "rainy", icon: "🌧", label: "Rainy", rain_p_h: 2.5, wind_speed: 20, clouds_all: 90, weather_description: "light rain", weather_type: "Rain" },
  { id: "stormy", icon: "⛈", label: "Stormy", rain_p_h: 8, wind_speed: 40, clouds_all: 100, weather_description: "thunderstorm", weather_type: "Thunderstorm" },
];

const HOLIDAYS = [
  "None", "Columbus Day", "Veterans Day", "Thanksgiving Day", "Christmas Day",
  "New Years Day", "Washington's Birthday", "Memorial Day", "Independence Day",
  "State Fair", "Labor Day", "Martin Luther King Jr Day",
];

const LOADING_STEPS = [
  "Analyzing weather patterns...",
  "Encoding temporal features...",
  "Running XGBoost Model...",
  "Calculating confidence intervals...",
  "Computing carbon metrics...",
];

function toBackendDateTime(localValue: string): string {
  if (!localValue) return "";
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue.replace("T", " ") + ":00";
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function formatDisplayDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function generate24hrData(preset: WeatherPreset, predictionHour?: number, predictionVolume?: number) {
  const base = preset.id === "stormy" ? 2500 : preset.id === "rainy" ? 3000 : preset.id === "cloudy" ? 3800 : 4200;
  return Array.from({ length: 24 }, (_, h) => {
    let vol = base * 0.3;
    if (h >= 7 && h <= 9) vol = base * (0.7 + 0.3 * Math.sin(((h - 7) / 2) * Math.PI));
    else if (h >= 10 && h <= 15) vol = base * 0.65;
    else if (h >= 16 && h <= 19) vol = base * (0.8 + 0.2 * Math.sin(((h - 16) / 3) * Math.PI));
    else if (h >= 20) vol = base * Math.max(0.2, 0.65 - (h - 20) * 0.1);
    if (predictionHour !== undefined && h === predictionHour && predictionVolume !== undefined) {
      vol = predictionVolume;
    }
    return { hour: `${h}:00`, volume: Math.round(vol), h };
  });
}

// ── Skeleton Loader ──────────────────────────────────────────────────────────
const SkeletonLoader = ({ step, progress }: { step: string; progress: number }) => (
  <div className="mt-6 space-y-4 animate-pulse">
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        <span className="text-sm font-medium text-teal-600">{step}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "linear-gradient(90deg, #14b8a6, #3b82f6)" }} />
      </div>
      <div className="mt-1 text-right text-xs text-slate-400">{progress}%</div>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="h-3 w-20 rounded bg-slate-200 mb-3" />
          <div className="h-8 w-28 rounded bg-slate-200 mb-2" />
          <div className="h-2 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="h-3 w-32 rounded bg-slate-200 mb-4" />
      <div className="h-40 rounded bg-slate-100" />
    </div>
  </div>
);

// ── CO2 Humanizer Tooltip ────────────────────────────────────────────────────
const Co2Tooltip = ({ grams }: { grams: number }) => {
  const [show, setShow] = useState(false);
  const kg = grams / 1000;
  const homeDays = (kg / 0.9).toFixed(1);
  const drivingKm = (kg / 0.21).toFixed(0);
  const phoneDays = Math.round(kg / 0.005);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-500 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 transition-colors"
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 0a5 5 0 100 10A5 5 0 005 0zm.5 7.5h-1v-3h1v3zm0-4h-1v-1h1v1z" />
        </svg>
      </button>
      {show && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-left">
          <div className="text-xs font-semibold text-slate-700 mb-2">🌍 What does this mean?</div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>🏠</span>
              <span>Powers an avg home for <strong>{homeDays} days</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>🚗</span>
              <span>Equal to driving <strong>{drivingKm} km</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>📱</span>
              <span>Charges a phone for <strong>{phoneDays} days</strong></span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] text-slate-400">
            Based on avg US household energy use
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-slate-200 bg-white" />
        </div>
      )}
    </div>
  );
};

// ── Download Report Button ───────────────────────────────────────────────────
const DownloadReportButton = ({ result }: { result: PredictionResponse | null }) => {
  const [state, setState] = useState<"idle" | "generating" | "done">("idle");

  const handleDownload = () => {
    if (!result) return;
    setState("generating");
    setTimeout(() => {
      setState("done");
      const report = `
TRAFFICIQ — PREDICTION REPORT
Generated: ${new Date().toLocaleString()}
${"=".repeat(50)}

TRAFFIC VOLUME PREDICTION
Predicted Volume:     ${result.prediction.toLocaleString()} vehicles/hour
Confidence Range:     ${result.lower_bound.toLocaleString()} – ${result.upper_bound.toLocaleString()} veh/hr
Confidence Level:     ${result.confidence_pct}%
Model Used:           ${result.model_used}

CARBON & SUSTAINABILITY
CO2 Saved:            ${result.co2_saved_grams.toFixed(0)}g vs worst-case
Sustainability Score: ${result.sustainability_score.toFixed(1)} / 100
Trees Equivalent:     ${result.trees_equivalent.toFixed(4)}
Badge:                ${result.badge}

NOTES
${result.message || "No additional notes."}

${"=".repeat(50)}
TrafficIQ | SmartRoute ML Framework
Powered by XGBoost · R² 0.9583
`.trim();

      const blob = new Blob([report], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trafficiq_report_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setTimeout(() => setState("idle"), 3000);
    }, 1800);
  };

  if (!result) return null;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={state === "generating"}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-105"
      style={state === "done" ? {
        borderColor: "#10b981", color: "#10b981", background: "#f0fdf4",
      } : {
        borderColor: "#14b8a6", color: "#14b8a6", background: "transparent",
      }}
    >
      {state === "idle" && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Report
        </>
      )}
      {state === "generating" && (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          Generating...
        </>
      )}
      {state === "done" && (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Downloaded!
        </>
      )}
    </button>
  );
};

// ── Neumorphic Slider ────────────────────────────────────────────────────────
const NeuSlider = ({
  label, value, min, max, step, unit, tickStep, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; tickStep: number;
  onChange: (v: number) => void;
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const ticks: number[] = [];
  for (let t = min; t <= max; t += tickStep) ticks.push(t);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold px-2 py-0.5 rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)" }}>
          {value}{unit}
        </span>
      </div>
      <div className="relative pt-1 pb-5">
        <div className="relative h-3 rounded-full"
          style={{
            background: `linear-gradient(to right, #14b8a6 ${pct}%, #e2e8f0 ${pct}%)`,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.15)",
          }}>
          <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-2 border-teal-400 shadow-md"
            style={{ left: `calc(${pct}% - 10px)` }} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-3 top-1"
          style={{ margin: 0 }} />
        <div className="flex justify-between mt-2 px-0.5">
          {ticks.map((t) => (
            <div key={t} className="flex flex-col items-center">
              <div className="h-1.5 w-px bg-slate-300" />
              <span className="text-[9px] text-slate-400 mt-0.5">{t}</span>
            </div>
          ))}
          </div>
        </div>
      </div>
  );
};

// ── Holiday Select ───────────────────────────────────────────────────────────
const HolidaySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-slate-700">Is holiday</label>
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer"
        style={{ paddingRight: "2.5rem" }}>
        {HOLIDAYS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  </div>
);

// ── DateTime Picker ──────────────────────────────────────────────────────────
const DateTimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-sm font-medium text-slate-700">Date &amp; time</label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors text-left">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-teal-500">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className={value ? "text-slate-800" : "text-slate-400"}>
            {value ? formatDisplayDateTime(value) : "Pick a date & time"}
          </span>
        </button>
        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <p className="text-xs text-slate-500 mb-2 font-medium">Select date & time</p>
            <input type="datetime-local" value={value}
              onChange={(e) => { onChange(e.target.value); setOpen(false); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              autoFocus />
            <div className="mt-3 flex gap-2">
              <button type="button"
                onClick={() => {
                  const now = new Date();
                  onChange(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                  setOpen(false);
                }}
                className="flex-1 rounded-lg border border-teal-200 bg-teal-50 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition-colors">
                Use Now
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── 24hr Chart ───────────────────────────────────────────────────────────────
const TrafficChart = ({
  preset, currentHour, predictionHour, predictionVolume,
}: {
  preset: WeatherPreset; currentHour: number;
  predictionHour?: number; predictionVolume?: number;
}) => {
  const data = generate24hrData(preset, predictionHour, predictionVolume);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-700">24-Hour Traffic Forecast</div>
          <div className="text-xs text-slate-400">Based on {preset.label} weather conditions</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          <span className="text-xs text-slate-500">Volume (veh/hr)</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="#94a3b8" interval={2} />
          <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "11px" }}
            formatter={(v: any) => [`${Number(v).toLocaleString()} veh/hr`, "Volume"]}
          />
          <ReferenceLine x={`${currentHour}:00`} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={2}
            label={{ value: "Now", position: "top", fontSize: 9, fill: "#3b82f6" }} />
          {predictionHour !== undefined && (
            <ReferenceLine x={`${predictionHour}:00`} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={2}
              label={{ value: "Pred", position: "top", fontSize: 9, fill: "#f59e0b" }} />
          )}
          <Area type="monotone" dataKey="volume" stroke="#14b8a6" strokeWidth={2.5}
            fill="url(#trafficGrad)" dot={false} activeDot={{ r: 4, fill: "#14b8a6" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Result Grid ──────────────────────────────────────────────────────────────
const ResultGrid = ({ result }: { result: PredictionResponse }) => {
  const getTrafficStatus = (volume: number) => {
    if (volume < 2000) return { label: "🟢 Light Traffic", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (volume < 4000) return { label: "🟡 Moderate Traffic", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "🔴 Heavy Traffic", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  const status = getTrafficStatus(result.prediction);
  const delay = Math.round(result.prediction / 1000) * 3;
  const score = Math.max(0, Math.min(100, result.sustainability_score));
  const co2Intensity = result.co2_saved_grams === 0 ? "red" : result.co2_saved_grams > 300 ? "green" : "amber";
  const leafColor = co2Intensity === "green" ? "#10b981" : co2Intensity === "amber" ? "#f59e0b" : "#ef4444";
  const confidence95Range = Math.round((result.upper_bound - result.lower_bound) / 2);
  let scoreColor = "from-emerald-400 to-emerald-500";
  if (score < 60) scoreColor = "from-rose-400 to-rose-500";
  else if (score < 80) scoreColor = "from-amber-400 to-amber-500";

  return (
    <div className="mt-6 space-y-4">
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${status.color}`}>
        {status.label}
      </div>
      <div className="grid gap-3 md:grid-cols-3">

        {/* Card 1: Traffic Volume */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Traffic Volume</div>
          <div className="text-5xl font-extrabold text-slate-900 leading-none">
            {result.prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-sm text-slate-500 mt-1">vehicles / hour</div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-medium text-slate-700">95% range:</span> ±{confidence95Range.toLocaleString()} veh/hr
          </div>
          <div className="text-xs text-slate-400">
            {result.lower_bound.toLocaleString(undefined, { maximumFractionDigits: 0 })} –{" "}
            {result.upper_bound.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Card 2: Carbon with humanizer tooltip */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Carbon Footprint</div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={leafColor}>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2-11 2.5V8" />
            </svg>
          </div>
          <div className="flex items-end gap-1">
            <div className="text-4xl font-extrabold leading-none" style={{ color: leafColor }}>
              {result.co2_saved_grams.toFixed(0)}g
            </div>
            <Co2Tooltip grams={result.co2_saved_grams} />
          </div>
          <div className="text-sm text-slate-500 mt-1">CO₂ saved vs worst-case</div>
          {result.trees_equivalent > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              🌳 Equivalent to planting {result.trees_equivalent.toFixed(4)} trees
            </div>
          )}
          {result.message && <div className="mt-1 text-xs text-slate-400">{result.message}</div>}
        </div>

        {/* Card 3: Sustainability */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Sustainability</div>
          <div className="text-4xl font-extrabold text-slate-900 leading-none">
            {score.toFixed(0)}<span className="text-lg font-medium text-slate-400">/100</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-2 rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-700`}
              style={{ width: `${score}%` }} />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              🕐 Est. delay: ~{delay} mins
            </div>
            <div className="mt-1 text-xs text-slate-400">Model: {result.model_used}</div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
      {(() => {
        const hour = new Date().getHours();
        let recommendation = '';
        if (result.prediction > 4000) {
          recommendation = `High congestion predicted. Recommend deploying 2 additional traffic officers between ${hour - 1}:00 and ${hour + 1}:00. Consider activating alternate route signage on parallel corridors.`;
        } else if (result.prediction >= 2000 && result.prediction <= 4000) {
          recommendation = `Moderate traffic expected. Standard signal timing adequate. Monitor from ${hour}:00 onwards for potential escalation toward peak threshold.`;
        } else {
          recommendation = `Light traffic forecast. Optimal window for road maintenance or infrastructure work. Carbon efficiency at maximum.`;
        }
        return (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 mt-3">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">🧠 Automated Insight</h3>
            <p className="text-sm text-blue-700 leading-relaxed">{recommendation}</p>
            <p className="text-xs text-blue-400 mt-2 italic">
              Generated by XGBoost · Confidence: {result.confidence_pct}%
            </p>
          </div>
        );
      })()}
      </div>
    </div>
  );
};

// ── Main Panel ───────────────────────────────────────────────────────────────
const PredictionPanel = ({ emptyState }: { emptyState?: React.ReactNode }) => {
  const now = new Date();
  const localDefault = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16);

  const [dateTime, setDateTime] = useState(localDefault);
  const [isHoliday, setIsHoliday] = useState("None");
  const [tempCelsius, setTempCelsius] = useState(15);
  const [humidity, setHumidity] = useState(60);
  const [selectedPreset, setSelectedPreset] = useState<string>("clear");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const activePreset = WEATHER_PRESETS.find((p) => p.id === selectedPreset) ?? WEATHER_PRESETS[0];
  const currentHour = new Date().getHours();
  const predictionHour = dateTime ? new Date(dateTime).getHours() : undefined;

  const runLoadingAnimation = () => {
    let step = 0;
    const interval = setInterval(() => {
      if (step < LOADING_STEPS.length) {
        setLoadingStep(LOADING_STEPS[step]);
        setLoadingProgress(Math.round(((step + 1) / LOADING_STEPS.length) * 90));
        step++;
      } else {
        clearInterval(interval);
      }
    }, 500);
    return interval;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingProgress(0);
    setLoadingStep(LOADING_STEPS[0]);
    const interval = runLoadingAnimation();

    const payload: PredictionInput = {
      date_time: toBackendDateTime(dateTime),
      is_holiday: isHoliday,
      air_pollution_index: 50,
      humidity,
      wind_speed: activePreset.wind_speed,
      wind_direction: 180,
      visibility_in_miles: 10,
      dew_point: 280,
      temperature: tempCelsius + 273.15,
      rain_p_h: activePreset.rain_p_h,
      snow_p_h: 0,
      clouds_all: activePreset.clouds_all,
      weather_type: activePreset.weather_type,
      weather_description: activePreset.weather_description,
    };

    try {
      const res = await getPrediction(payload);
      clearInterval(interval);
      setLoadingProgress(100);
      setLoadingStep("Complete!");
      setTimeout(() => { setResult(res); setLoading(false); }, 400);
    } catch (err: any) {
      clearInterval(interval);
      setError(err?.message ?? "Prediction failed");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">

      {/* Header row with download button */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-xs text-slate-400">Configure parameters below</div>
        <DownloadReportButton result={result} />
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <DateTimePicker value={dateTime} onChange={setDateTime} />
          <HolidaySelect value={isHoliday} onChange={setIsHoliday} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <NeuSlider label="Temperature (°C)" value={tempCelsius} min={-20} max={50} step={1} unit="°C" tickStep={10} onChange={setTempCelsius} />
          <NeuSlider label="Humidity" value={humidity} min={0} max={100} step={1} unit="%" tickStep={20} onChange={setHumidity} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Weather Condition</label>
          <div className="grid grid-cols-4 gap-3">
            {WEATHER_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button key={preset.id} type="button" onClick={() => setSelectedPreset(preset.id)}
                  className="relative flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-sm font-medium transition-all duration-200"
                  style={isSelected ? {
                    background: "linear-gradient(135deg, #f0fdfa, #eff6ff)",
                    border: "2px solid transparent",
                    boxShadow: "0 0 0 2px #14b8a6, 0 4px 16px rgba(20,184,166,0.2)",
                    color: "#0f766e",
                  } : { background: "white", border: "2px solid #e2e8f0", color: "#64748b" }}>
                  {isSelected && (
                    <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full"
                      style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)" }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <span className="text-2xl">{preset.icon}</span>
                  <span className="text-xs font-semibold">{preset.label}</span>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Wind: {activePreset.wind_speed} km/h · Rain: {activePreset.rain_p_h} mm/h · Clouds: {activePreset.clouds_all}%
          </div>
        </div>

        <TrafficChart
          preset={activePreset}
          currentHour={currentHour}
          predictionHour={predictionHour}
          predictionVolume={result?.prediction}
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)" }}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing...
            </span>
          ) : "🚦 Predict traffic & carbon"}
        </button>
      </form>

      {loading && <SkeletonLoader step={loadingStep} progress={loadingProgress} />}
      {!loading && !result && emptyState}
      {!loading && result && <ResultGrid result={result} />}
    </div>
  );
};

export default PredictionPanel;