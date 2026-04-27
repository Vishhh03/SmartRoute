import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface ModelStats {
  name: string;
  model: string;
  r2: number;
  mae: number;
  rmse: number;
  accuracy: number;
  trainingTime: string;
  records: number;
  city: string;
  country: string;
  features: string[];
  strengths: string[];
  weaknesses: string[];
}

const ModelComparison = () => {
  const [modelData, setModelData] = useState<ModelStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModelStats = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/model-stats");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setModelData(data);
      } catch (err) {
        console.error("Failed to fetch model stats:", err);
        setError("Failed to load model stats. Is the backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchModelStats();
  }, []);

  const radarData = modelData.map(model => ({
    model: model.name,
    accuracy: model.accuracy,
    robustness: model.r2 * 100,
  }));

  const performanceMetrics = modelData.map(model => ({
    name: model.name,
    "R2 Score": model.r2 * 100,
    "MAE": model.mae / 10,
    "RMSE": model.rmse / 10,
    "Accuracy": model.accuracy
  }));

  const getMetricColor = (value: number, metric: string) => {
    if (metric === "r2") return value >= 0.9 ? "text-green-600" : value >= 0.8 ? "text-yellow-600" : "text-red-600";
    if (metric === "accuracy") return value >= 90 ? "text-green-600" : value >= 80 ? "text-yellow-600" : "text-red-600";
    return "text-slate-600";
  };

  const getBadgeVariant = (value: number) => {
    if (value >= 0.9) return "default";
    if (value >= 0.8) return "secondary";
    return "destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading model stats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Comparison</h1>
          <p className="text-gray-600 mt-2">Compare performance metrics across different cities and models</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>Refresh Data</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modelData.map((model, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <Badge variant={getBadgeVariant(model.r2)}>
                  {model.r2 >= 0.9 ? "Excellent" : model.r2 >= 0.8 ? "Good" : "Fair"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{model.model} · {model.records?.toLocaleString()} records</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">R² Score</span>
                  <span className={`font-semibold ${getMetricColor(model.r2, "r2")}`}>{model.r2}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Accuracy</span>
                  <span className={`font-semibold ${getMetricColor(model.accuracy, "accuracy")}`}>{model.accuracy}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Training Time</span>
                  <span className="font-semibold">{model.trainingTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="features">Feature Analysis</TabsTrigger>
          <TabsTrigger value="radar">Radar Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card>
            <CardHeader><CardTitle>Performance Metrics Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="R2 Score" fill="#10b981" />
                    <Bar dataKey="Accuracy" fill="#3b82f6" />
                    <Bar dataKey="MAE" fill="#f59e0b" />
                    <Bar dataKey="RMSE" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modelData.map((model, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{model.name}</CardTitle>
                  <p className="text-sm text-gray-600">Features: {model.features?.length}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Features Used:</h4>
                      <div className="flex flex-wrap gap-1">
                        {model.features?.map((feature, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Strengths:</h4>
                      <ul className="text-xs text-green-600 space-y-1">
                        {model.strengths?.map((s, i) => <li key={i}>+ {s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Weaknesses:</h4>
                      <ul className="text-xs text-red-600 space-y-1">
                        {model.weaknesses?.map((w, i) => <li key={i}>- {w}</li>)}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader><CardTitle>Radar Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="model" />
                    <PolarRadiusAxis />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Radar name="Robustness" dataKey="robustness" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelComparison;
