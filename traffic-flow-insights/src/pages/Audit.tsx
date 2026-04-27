import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Database, Activity, Clock, TrendingUp, AlertCircle } from "lucide-react";
import PredictionPanel from "@/components/PredictionPanel";

const Audit = () => {
  const [selectedCity, setSelectedCity] = useState("Minneapolis");

  // Technical metrics data (hidden from main interface)
  const auditData = {
    Minneapolis: {
      r2: 0.9583,
      mae: 245.6,
      rmse: 389.2,
      accuracy: 95.8,
      trainingTime: "2.3s",
      records: 33750,
      drift: -1,
      model: "XGBoost",
      features: ["Hour", "Weather", "Holiday", "Temperature", "Humidity"],
      lastUpdated: "2025-04-21 19:24:00",
      dataQuality: 98.2,
      modelVersion: "v2.1.0",
      confidence: 94.2,
      precision: 92.8,
      recall: 89.5,
      f1Score: 91.1,
      validationLoss: 0.142,
      trainingLoss: 0.089,
      epochs: 150,
      batchSize: 32,
      learningRate: 0.01,
      optimization: "Adam",
      regularization: "L2",
      crossValidation: 5,
      testSplit: 0.2,
      randomSeed: 42,
      hyperparameters: {
        maxDepth: 6,
        minChildWeight: 1,
        subsample: 0.8,
        colsampleBytree: 0.8,
        gamma: 0,
        regAlpha: 0,
        regLambda: 1
      }
    },
    Bangalore: {
      r2: 0.844,
      mae: 1256.8,
      rmse: 1876.4,
      accuracy: 84.4,
      trainingTime: "1.8s",
      records: 8936,
      drift: 0,
      model: "Gradient Boosting",
      features: ["Weather", "Roadwork", "Incidents", "Environmental", "Parking"],
      lastUpdated: "2025-04-21 19:24:00",
      dataQuality: 96.8,
      modelVersion: "v1.8.0",
      confidence: 87.6,
      precision: 85.2,
      recall: 82.1,
      f1Score: 83.6,
      validationLoss: 0.278,
      trainingLoss: 0.156,
      epochs: 120,
      batchSize: 64,
      learningRate: 0.1,
      optimization: "Adam",
      regularization: "L1",
      crossValidation: 3,
      testSplit: 0.25,
      randomSeed: 123,
      hyperparameters: {
        maxDepth: 5,
        minChildWeight: 1,
        subsample: 0.9,
        colsampleBytree: 0.9,
        gamma: 0.1,
        regAlpha: 0.1,
        regLambda: 0.5
      }
    },
    "Chennai/Mumbai": {
      r2: 0.875,
      mae: 507.8,
      rmse: 699.8,
      accuracy: 87.5,
      trainingTime: "1.2s",
      records: 2000,
      drift: 0.5,
      model: "Gradient Boosting",
      features: ["Hour", "Temperature", "Humidity", "Weather", "City", "Road"],
      lastUpdated: "2025-04-21 19:24:00",
      dataQuality: 94.5,
      modelVersion: "v1.5.0",
      confidence: 82.3,
      precision: 80.8,
      recall: 78.9,
      f1Score: 79.8,
      validationLoss: 0.234,
      trainingLoss: 0.189,
      epochs: 100,
      batchSize: 48,
      learningRate: 0.15,
      optimization: "SGD",
      regularization: "ElasticNet",
      crossValidation: 4,
      testSplit: 0.3,
      randomSeed: 456,
      hyperparameters: {
        maxDepth: 4,
        minChildWeight: 2,
        subsample: 0.85,
        colsampleBytree: 0.85,
        gamma: 0.2,
        regAlpha: 0.2,
        regLambda: 0.8
      }
    }
  };

  const currentData = auditData[selectedCity as keyof typeof auditData];

  const getPerformanceColor = (value: number) => {
    if (value >= 0.9) return "text-green-600";
    if (value >= 0.8) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyColor = (value: number) => {
    if (value >= 90) return "text-green-600";
    if (value >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const radarData = [
    { metric: "Accuracy", value: currentData.accuracy },
    { metric: "Precision", value: currentData.precision },
    { metric: "Recall", value: currentData.recall },
    { metric: "F1 Score", value: currentData.f1Score },
    { metric: "Data Quality", value: currentData.dataQuality },
    { metric: "Confidence", value: currentData.confidence }
  ];

  const trainingMetrics = [
    { metric: "Training Loss", value: currentData.trainingLoss },
    { metric: "Validation Loss", value: currentData.validationLoss },
    { metric: "Epochs", value: currentData.epochs },
    { metric: "Batch Size", value: currentData.batchSize },
    { metric: "Learning Rate", value: currentData.learningRate }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Audit</h1>
            <p className="text-gray-400 mt-2">Technical metrics and model performance data</p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-lg text-white">Dataset Size</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentData.records.toLocaleString()}</div>
              <p className="text-sm text-gray-400">Records</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <CardTitle className="text-lg text-white">R² Score</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPerformanceColor(currentData.r2)}`}>
                {currentData.r2}
              </div>
              <p className="text-sm text-gray-400">Model Performance</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-400" />
                <CardTitle className="text-lg text-white">Peak Drift</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentData.drift === 0 ? "text-green-400" : currentData.drift > 0 ? "text-red-400" : "text-yellow-400"}`}>
                {currentData.drift > 0 ? "+" : ""}{currentData.drift}hr
              </div>
              <p className="text-sm text-gray-400">Temporal Drift</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-lg text-white">Model Version</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{currentData.modelVersion}</div>
              <p className="text-sm text-gray-400">Current Version</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis */}
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="bg-gray-800 border-gray-700">
            <TabsTrigger value="performance" className="text-gray-300">Performance Metrics</TabsTrigger>
            <TabsTrigger value="training" className="text-gray-300">Training Details</TabsTrigger>
            <TabsTrigger value="hyperparameters" className="text-gray-300">Hyperparameters</TabsTrigger>
            <TabsTrigger value="features" className="text-gray-300">Feature Analysis</TabsTrigger>
            <TabsTrigger value="prediction" className="text-gray-300">Traffic Prediction</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Performance Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: "#9CA3AF" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9CA3AF" }} />
                        <Radar name="Metrics" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Accuracy:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.accuracy)}`}>
                        {currentData.accuracy}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Precision:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.precision)}`}>
                        {currentData.precision}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Recall:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.recall)}`}>
                        {currentData.recall}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">F1 Score:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.f1Score)}`}>
                        {currentData.f1Score}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Confidence:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.confidence)}`}>
                        {currentData.confidence}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Data Quality:</span>
                      <span className={`font-bold ${getAccuracyColor(currentData.dataQuality)}`}>
                        {currentData.dataQuality}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Training Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trainingMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="metric" tick={{ fill: "#9CA3AF" }} />
                      <YAxis tick={{ fill: "#9CA3AF" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-700 rounded">
                    <div className="text-lg font-bold text-white">{currentData.epochs}</div>
                    <div className="text-xs text-gray-400">Epochs</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded">
                    <div className="text-lg font-bold text-white">{currentData.batchSize}</div>
                    <div className="text-xs text-gray-400">Batch Size</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded">
                    <div className="text-lg font-bold text-white">{currentData.learningRate}</div>
                    <div className="text-xs text-gray-400">Learning Rate</div>
                  </div>
                  <div className="text-center p-3 bg-gray-700 rounded">
                    <div className="text-lg font-bold text-white">{currentData.trainingTime}</div>
                    <div className="text-xs text-gray-400">Training Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hyperparameters" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Hyperparameters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(currentData.hyperparameters).map(([key, value]) => (
                    <div key={key} className="p-3 bg-gray-700 rounded">
                      <div className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-lg font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Optimization:</span>
                    <span className="text-white font-medium">{currentData.optimization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Regularization:</span>
                    <span className="text-white font-medium">{currentData.regularization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cross Validation:</span>
                    <span className="text-white font-medium">{currentData.crossValidation} folds</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Test Split:</span>
                    <span className="text-white font-medium">{currentData.testSplit * 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Random Seed:</span>
                    <span className="text-white font-medium">{currentData.randomSeed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Feature Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2">Features Used ({currentData.features.length}):</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentData.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="bg-gray-700 text-gray-300 border-gray-600">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white font-semibold mb-2">Model Information:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Model Type:</span>
                          <span className="text-white">{currentData.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Last Updated:</span>
                          <span className="text-white">{currentData.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2">Loss Metrics:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Training Loss:</span>
                          <span className="text-white">{currentData.trainingLoss}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Validation Loss:</span>
                          <span className="text-white">{currentData.validationLoss}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Traffic Prediction Model</CardTitle>
                <p className="text-sm text-gray-400">
                  Generate point forecasts, confidence ranges, and carbon metrics
                  for a specific timestamp and weather scenario.
                </p>
              </CardHeader>
              <CardContent className="text-black">
                <PredictionPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Audit;
