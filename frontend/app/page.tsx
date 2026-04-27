'use client'

import { useState } from 'react'
import Navbar from '@/components/navbar'
import DashboardMetrics from '@/components/dashboard-metrics'
import AnalyticsGrid from '@/components/analytics-grid'
import ModelPerformance from '@/components/model-performance'
import RouteRecommendations from '@/components/route-recommendations'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Metrics Row */}
        <DashboardMetrics />

        {/* Analytics Grid */}
        <AnalyticsGrid />

        {/* Model Performance and Routing */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ModelPerformance />
          </div>
          <div className="xl:col-span-1">
            <RouteRecommendations />
          </div>
        </div>

        {/* Footer Badge */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="rounded-lg border backdrop-blur-sm px-4 py-2 text-xs text-muted-foreground font-mono" style={{ borderColor: 'rgba(71, 85, 105, 0.5)', backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
            Powered by Gradient Boosting ML • SmartRoute v1.0
          </div>
        </div>
      </main>
    </div>
  )
}
