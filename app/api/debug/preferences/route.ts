import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // This is a debug endpoint to check preferences
    return NextResponse.json({
      message: 'Debug endpoint for checking preferences',
      timestamp: new Date().toISOString(),
      note: 'Check browser console and page for debug info'
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Debug endpoint error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[DEBUG API] Received client data:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({
      message: 'Debug data received',
      timestamp: new Date().toISOString(),
      received: body
    })
  } catch (error) {
    console.error('[DEBUG API] Error:', error)
    return NextResponse.json(
      { error: 'Debug endpoint error' },
      { status: 500 }
    )
  }
}