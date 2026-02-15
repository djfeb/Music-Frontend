import { useState, useEffect } from 'react'

interface AppConfigResult {
  apiUrl: string
  environment: string
  port: number
  isLoading: boolean
  error: string | null
}

export function useAppConfig(): AppConfigResult {
  const [result, setResult] = useState<AppConfigResult>({
    apiUrl: '/api/proxy',
    environment: 'development',
    port: 3001,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config')
        const data = await response.json()
        
        setResult({
          apiUrl: data.apiUrl || '/api/proxy',
          environment: data.environment || 'development',
          port: data.port || 3001,
          isLoading: false,
          error: null
        })
      } catch (error) {
        setResult(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to fetch app configuration'
        }))
      }
    }

    fetchConfig()
  }, [])

  return result
}
