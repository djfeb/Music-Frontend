// Production-ready configuration management
export interface AppConfig {
  apiBaseUrl: string
  environment: 'development' | 'production' | 'staging'
  port: number
}

function getConfig(): AppConfig {
  const environment = (process.env.NODE_ENV || 'development') as AppConfig['environment']
  const port = parseInt(process.env.PORT || '3001', 10)
  
  // Use environment variables for configuration
  const apiBaseUrl = process.env.API_BASE_URL || 
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
    process.env.NEXT_PUBLIC_APP_URL ||
    `http://localhost:${port}`

  return {
    apiBaseUrl,
    environment,
    port
  }
}

export const config = getConfig()

// Helper to get the full API URL for a given path
export function getApiUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${config.apiBaseUrl}${cleanPath}`
}

// Helper to determine if we're in production
export function isProduction(): boolean {
  return config.environment === 'production'
}

// Helper to determine if we're in development
export function isDevelopment(): boolean {
  return config.environment === 'development'
}