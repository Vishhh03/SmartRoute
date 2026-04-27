import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain } from "lucide-react";
import { MODEL_METRICS } from "@/lib/traffic-analysis";

export function ModelPerformance() {
  const m = MODEL_METRICS;
  const metrics = [
    { label: "MAE (Mean Abs Error)", value: m.mae.toFixed(1), bar: Math.max(0, 100 - (m.mae / 60)) },
    { label: "RMSE (Root Mean Sq Error)", value: m.rmse.toFixed(1), bar: Math.max(0, 100 - (m.rmse / 80)) },
    { label: "R² Score", value: m.r2.toFixed(3), bar: m.r2 * 100 },
    { label: "MAPE (%)", value: `${m.mape}%`, bar: 100 - m.mape },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Model Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-semibold text-foreground">{m.value}</span>
              </div>
              <Progress value={m.bar} className="h-1.5" />
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground border-t pt-3">
          <span>Training: <strong className="text-foreground">{m.trainingRecords.toLocaleString()}</strong> records</span>
          <span>Test: <strong className="text-foreground">{m.testRecords.toLocaleString()}</strong> records</span>
          <span>Accuracy: <strong className="text-foreground">{m.accuracy}%</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
