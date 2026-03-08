import { NextRequest, NextResponse } from 'next/server'

interface TrafficData {
  id: string
  road: string
  congestion: number
  vehicles: number
  speed: number
  status: 'critical' | 'warning' | 'normal'
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    // Generate mock real-time traffic data
    const roads = [
      'Highway 101 N',
      'Broadway St',
      'Market St',
      'Van Ness Ave',
      'Mission St',
      'Fremont St',
    ]

    const data: TrafficData[] = roads.map((road, index) => {
      const congestion = Math.max(20, Math.min(95, Math.random() * 80 + 20))
      const status =
        congestion > 70 ? 'critical' : congestion > 50 ? 'warning' : 'normal'

      return {
        id: `${index + 1}`,
        road,
        congestion: Math.round(congestion),
        vehicles: Math.floor(Math.random() * 2000 + 500),
        speed: Math.floor(Math.random() * 45 + 10),
        status,
        timestamp: new Date().toISOString(),
      }
    })

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch traffic data' },
      { status: 500 }
    )
  }
}
