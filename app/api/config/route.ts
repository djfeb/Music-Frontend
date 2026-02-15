import { NextResponse } from 'next/server'
import { config, getApiUrl } from '@/lib/config'

export async function GET() {
  // Return configuration-based API URL instead of discovered IP
  return NextResponse.json({ 
    apiUrl: config.apiBaseUrl,
    environment: config.environment,
    port: config.port
  })
}
