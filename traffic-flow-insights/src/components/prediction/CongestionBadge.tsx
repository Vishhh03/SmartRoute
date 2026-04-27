import { classifyCongestion } from "@/lib/traffic-analysis";
import { Badge } from "@/components/ui/badge";

const bgMap: Record<string, string> = {
  low: "bg-success/10 text-success border-success/30",
  moderate: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
  severe: "bg-destructive/20 text-destructive border-destructive/50",
};

export function CongestionBadge({ volume }: { volume: number }) {
  const c = classifyCongestion(volume);
  return (
    <div className="flex items-center gap-3">
      <Badge className={`${bgMap[c.level]} text-xs px-3 py-1`}>{c.label} Congestion</Badge>
      <span className="text-xs text-muted-foreground">{c.description}</span>
    </div>
  );
}
