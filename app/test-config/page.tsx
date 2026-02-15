"use client"

import { useAppConfig } from '@/hooks/use-app-config'

export default function TestConfigPage() {
  const { apiUrl, environment, port, isLoading, error } = useAppConfig()

  return (
    <div className="p-8 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">App Configuration Test</h1>
      
      {isLoading && (
        <div className="text-zinc-400">Loading configuration...</div>
      )}
      
      {error && (
        <div className="text-red-400 mb-4">
          Error: {error}
        </div>
      )}
      
      {!isLoading && (
        <div className="space-y-2">
          <div>
            <strong>API URL:</strong> {apiUrl}
          </div>
          <div>
            <strong>Environment:</strong> {environment}
          </div>
          <div>
            <strong>Port:</strong> {port}
          </div>
          <div>
            <strong>Status:</strong> {error ? 'Failed' : 'Success'}
          </div>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Secure Configuration System:</h2>
        <ul className="list-disc list-inside space-y-1 text-zinc-400">
          <li>Uses environment variables for configuration (no IP discovery)</li>
          <li>Secure: No system command execution or network scanning</li>
          <li>Production-ready: Works in containers and cloud environments</li>
          <li>Configurable: Set API_BASE_URL and PROXY_TARGET_URL in .env</li>
          <li>Client-side requests use /api/proxy for security</li>
        </ul>
      </div>
    </div>
  )
}
