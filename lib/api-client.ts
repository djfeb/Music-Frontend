// Configuration-based API URL management
import { config, getApiUrl } from './config'

export function getApiBaseUrl(): string {
  // For client-side, use the proxy or configured base URL
  if (typeof window !== 'undefined') {
    // Client-side: use proxy for API calls
    return '/api/proxy'
  } else {
    // Server-side: use configured target URL
    const targetUrl = process.env.PROXY_TARGET_URL || 
      process.env.BACKEND_URL || 
      'http://localhost:3000'
    return targetUrl
  }
}

// Get the full app URL (for redirects, etc.)
export function getAppBaseUrl(): string {
  return config.apiBaseUrl
}

// Helper to build API URLs
export function buildApiUrl(path: string = ''): string {
  const baseUrl = getApiBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}
