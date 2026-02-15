import { NextRequest, NextResponse } from "next/server"

// Ensure Node.js runtime (so process.env is available) and disable static optimization
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Simple in-memory cache (note: resets on serverless cold starts)
const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 6 hours
const cache = new Map<string, { lyrics: string | null; synced: false; ts: number }>()

// Get Genius token with fallback
const getGeniusToken = () => {
  return process.env.GENIUS_ACCESS_TOKEN || 
         process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN || 
         'dexbGLGUioHh86mxhKllbVrHmhtD9mRFzz3qb72lZObWxymZ70uFJhnv3frWAqhV'
}

// GET /api/lyrics?track=Blinding%20Lights&artist=The%20Weeknd
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const track = searchParams.get("track")?.trim()
  const artist = searchParams.get("artist")?.trim()
  const noCache = searchParams.get("nocache")

  console.log('[Lyrics API] Request received:', { track, artist, noCache })

  if (!track) {
    return NextResponse.json({ error: "Missing track" }, { status: 400 })
  }

  // Check if Genius token is available
  const token = getGeniusToken()
  console.log('[Lyrics API] Token check:', { hasToken: !!token, tokenLength: token?.length })
  
  if (!token) {
    const geniusKeys = Object.keys(process.env).filter((k) => k.includes("GENIUS"))
    console.warn("Lyrics API: Genius token missing. Found GENIUS-like env keys:", geniusKeys)
    return NextResponse.json({ 
      error: "GENIUS_ACCESS_TOKEN not configured. Please add your Genius API token to environment variables.",
      setup: "Get your token from: https://genius.com/api-clients"
    }, { status: 500 })
  }

  try {
    const cacheKey = `${(track || "").toLowerCase()}|${(artist || "").toLowerCase()}`
    if (noCache) {
      cache.delete(cacheKey)
    }
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log('[Lyrics][cache] hit', cacheKey)
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
      })
    }

    // Search for the song using direct Genius API
    const query = artist ? `${track} ${artist}` : track
    console.log('[Lyrics][search] Query:', query)
    
    const searchResponse = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'MusicStreamApp/1.0'
      }
    })
    
    if (!searchResponse.ok) {
      throw new Error(`Genius API search failed: ${searchResponse.status} ${searchResponse.statusText}`)
    }
    
    const searchData = await searchResponse.json()
    const hits = searchData.response?.hits || []
    
    if (!hits.length) {
      console.log('[Lyrics][search] No results found for:', query)
      return NextResponse.json({ lyrics: null, synced: false }, { status: 200 })
    }

    // Get the first (most relevant) result
    const song = hits[0].result
    console.log('[Lyrics][found] song:', song.title, 'by', song.primary_artist.name)

    // Fetch lyrics from the song page
    let lyrics: string | null = null
    try {
      const songUrl = song.url
      if (songUrl) {
        console.log('[Lyrics][fetch] trying URL:', songUrl)
        const pageRes = await fetch(songUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
            Accept: "text/html",
          },
        })
        const html = await pageRes.text()

        // Parse lyrics from HTML
        let extractedLyrics = ""
        const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi
        const altContainerRegex = /<div[^>]*class="[^"]*Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
        let match: RegExpExecArray | null
        const chunks: string[] = []
        
        while ((match = containerRegex.exec(html))) {
          chunks.push(match[1])
        }
        while ((match = altContainerRegex.exec(html))) {
          chunks.push(match[1])
        }

        if (chunks.length) {
          const stripTags = (s: string) => s
            .replace(/<br\s*\/?>(?=\n|\r|\s|$)/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, " ")
            .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
            .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

          extractedLyrics = chunks.map(stripTags).join("\n").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
        }

        if (extractedLyrics) {
          lyrics = extractedLyrics
          console.log('[Lyrics][success] extracted lyrics length:', lyrics.length)
        }
      }
    } catch (lyricsError) {
      console.warn('[Lyrics][error] Failed to fetch lyrics for', song.title, lyricsError)
    }

    if (!lyrics) {
      console.log('[Lyrics][parse] empty for', query)
      return NextResponse.json({ lyrics: null, synced: false }, { status: 200 })
    }

    // Clean up lyrics
    const cleaned = lyrics
      .split(/\r?\n/)
      .filter((line) => {
        const l = line.trim()
        if (!l) return true
        if (/^\d+\s+Contributors?/i.test(l)) return false
        if (/^Translations$/i.test(l)) return false
        if (/^Embed$/i.test(l)) return false
        if (/Embed$/i.test(l)) return false
        if (/^\[.*\]$/i.test(l)) return false // Remove section headers like [Chorus]
        return true
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    const payload = { lyrics: cleaned, synced: false as const }
    cache.set(cacheKey, { ...payload, ts: Date.now() })
    
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=3600" },
    })
  } catch (err) {
    console.error("Lyrics API error", err)
    return NextResponse.json({ 
      error: "Failed to fetch lyrics",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }, { status: 500 })
  }
}