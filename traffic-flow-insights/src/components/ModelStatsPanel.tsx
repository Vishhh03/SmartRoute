import { useEffect, useState } from "react";
import { getModelStats, ModelStatsItem } from "@/lib/api";

const ModelStatsPanel = () => {
  const [data, setData] = useState<ModelStatsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getModelStats()
      .then((res) => { if (mounted) setData(res); })
      .catch((err: any) => { if (mounted) setError(err?.message ?? "Failed to load model stats"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading && !data) return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
      Loading model statistics...
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
      {error}
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
      No model statistics available.
    </div>
  );

  const safeNum = (v: any) => (typeof v === "number" && !isNaN(v) ? v : 0);
  const bestR2 = Math.max(...data.map((d) => safeNum(d.r2)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2 font-semibold text-slate-700">Model</th>
              <th className="px-3 py-2 font-semibold text-slate-700">R²</th>
              <th className="px-3 py-2 font-semibold text-slate-700">MAE</th>
              <th className="px-3 py-2 font-semibold text-slate-700">RMSE</th>
              <th className="px-3 py-2 font-semibold text-slate-700">Time (s)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const r2 = safeNum(row.r2);
              const mae = safeNum(row.mae);
              const rmse = safeNum(row.rmse);
              const time = safeNum(row.training_time_seconds);
              const isBest = r2 === bestR2;
              return (
                <tr key={row.model} className={`border-b border-slate-100 ${isBest ? "bg-emerald-50/80" : "bg-white"}`}>
                  <td className="px-3 py-2 text-slate-800">{row.model}</td>
                  <td className="px-3 py-2 text-slate-700">{r2.toFixed(3)}</td>
                  <td className="px-3 py-2 text-slate-700">{mae.toFixed(1)}</td>
                  <td className="px-3 py-2 text-slate-700">{rmse.toFixed(1)}</td>
                  <td className="px-3 py-2 text-slate-700">{time.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2">
        {data.map((row) => {
          const r2 = safeNum(row.r2);
          const isBest = r2 === bestR2;
          const widthPercent = Math.max(0, Math.min(100, r2 * 100));
          return (
            <div key={row.model} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{row.model}</span>
                <span className={isBest ? "font-semibold text-emerald-700" : ""}>
                  R² {r2.toFixed(3)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${isBest ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-indigo-400"}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModelStatsPanel;
