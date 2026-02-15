import type { NextRequest } from 'next/server'
import { config } from '@/lib/config'

// Use environment-based configuration instead of IP discovery
const TARGET_ORIGIN = process.env.PROXY_TARGET_URL || 
  process.env.BACKEND_URL || 
  `http://localhost:3000`

console.log('[Proxy] Target origin configured as:', TARGET_ORIGIN)

// Ensure Node.js runtime and no caching for this proxy route
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function buildTargetUrl(pathSegs: string[], req: NextRequest) {
  const path = pathSegs?.join('/') || ''
  const qs = req.nextUrl.searchParams
  const search = qs && [...qs.keys()].length > 0 ? `?${qs.toString()}` : ''
  return `${TARGET_ORIGIN}/${path}${search}`
}

async function proxy(req: NextRequest, paramsPromise: { path: string[] } | Promise<{ path: string[] }>) {
  const params = await paramsPromise
  const targetUrl = buildTargetUrl(params?.path || [], req)
  try { console.debug('[Proxy] ->', targetUrl) } catch {}

  const method = req.method || 'GET'
  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (['host', 'connection', 'content-length'].includes(k)) return
    headers[key] = value
  })

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    redirect: 'follow',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  try {
    const upstream = await fetch(targetUrl, init)
    const status = upstream.status
    const headersOut = new Headers()
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase()
      if (k === 'access-control-allow-origin') return
      if (k === 'content-encoding') return
      headersOut.set(key, value)
    })

    return new Response(upstream.body, { status, headers: headersOut })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy request failed', detail: String(err) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } } | Promise<{ params: { path: string[] } }>) {

  return proxy(req, (async () => (await ctx).params)())
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } } | Promise<{ params: { path: string[] } }>) {

  return proxy(req, (async () => (await ctx).params)())
}
