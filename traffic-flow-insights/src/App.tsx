import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardLayout } from "@/components/DashboardLayout";
import PredictionPanel from "@/components/PredictionPanel";
import { getModelStats } from "@/lib/api";
import Dashboard from "./pages/Dashboard";
import Predict from "./pages/Predict";
import Analytics from "./pages/Analytics";
import DatasetInfo from "./pages/DatasetInfo";
import About from "./pages/About";
import ModelComparison from "./pages/ModelComparison";
import PeakHour from "./pages/PeakHour";
import Hotspots from "./pages/Hotspots";
import SmartRouteSimulator from "./components/SmartRouteSimulator";
import PredictiveSimulation from "./components/PredictiveSimulation";
import SustainableRoute from "./components/SustainableRoute";
import AITrafficWarden from "./components/AITrafficWarden";
import Audit from "./pages/Audit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();



// ── App ──────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <div className="space-y-8 px-4 py-6 lg:px-6">



            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/predict" element={<Predict />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/dataset" element={<DatasetInfo />} />
              <Route path="/about" element={<About />} />
              <Route path="/model-comparison" element={<ModelComparison />} />
              <Route path="/peak-hour" element={<PeakHour />} />
              <Route path="/hotspots" element={<Hotspots />} />
              <Route path="/baseline" element={<SustainableRoute />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="*" element={<NotFound />} />
            </Routes>

          </div>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;