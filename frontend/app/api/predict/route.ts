import { NextRequest, NextResponse } from 'next/server'

interface PredictionRequest {
  location: string
  hour: number
  dayOfWeek: string
  weatherCondition: string
}

interface PredictionResponse {
  success: boolean
  data?: {
    location: string
    hour: number
    dayOfWeek: string
    weatherCondition: string
    congestion: number
    confidence: number
    riskLevel: 'low' | 'medium' | 'high'
    estimatedTravelTime: number
    timestamp: string
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<PredictionResponse>> {
  try {
    const body = await request.json() as PredictionRequest

    // Validate input
    if (!body.location || body.hour === undefined || !body.dayOfWeek || !body.weatherCondition) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Simple prediction logic based on inputs
    let baseCongestion = 50

    // Time-based adjustment
    if ((body.hour >= 7 && body.hour <= 10) || (body.hour >= 16 && body.hour <= 19)) {
      baseCongestion += 20 // Peak hours
    }

    // Day of week adjustment
    if (body.dayOfWeek === 'friday' || body.dayOfWeek === 'monday') {
      baseCongestion += 5
    } else if (body.dayOfWeek === 'saturday' || body.dayOfWeek === 'sunday') {
      baseCongestion -= 10
    }

    // Weather adjustment
    if (body.weatherCondition === 'rainy') {
      baseCongestion += 15
    } else if (body.weatherCondition === 'snowy') {
      baseCongestion += 25
    } else if (body.weatherCondition === 'foggy') {
      baseCongestion += 10
    }

    // Add some randomness
    const congestion = Math.max(
      20,
      Math.min(95, baseCongestion + (Math.random() - 0.5) * 20)
    )
    const confidence = Math.max(0.6, Math.min(0.99, 0.8 + Math.random() * 0.19))

    const riskLevel =
      congestion > 70 ? 'high' : congestion > 50 ? 'medium' : 'low'

    const estimatedTravelTime = Math.round(
      (congestion / 100) * 60 + Math.random() * 20
    )

    return NextResponse.json({
      success: true,
      data: {
        location: body.location,
        hour: body.hour,
        dayOfWeek: body.dayOfWeek,
        weatherCondition: body.weatherCondition,
        congestion: Math.round(congestion),
        confidence: Math.round(confidence * 100),
        riskLevel,
        estimatedTravelTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process prediction' },
      { status: 500 }
    )
  }
}
