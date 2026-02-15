"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import Image from "next/image"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Maximize2,
  Heart,
  Mic2,
  ListMusic,
  MonitorSpeaker,
  Share2,
  Download,
} from "lucide-react"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { usePlayer } from "@/contexts/player-context"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import { firebaseService } from "@/lib/firebase-service"
import { useToast } from "@/components/ui/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"

export function MusicPlayer() {
  const player = usePlayer()
  const isMobile = useIsMobile()
  const [volume, setVolumeUi] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [previousVolume, setPreviousVolume] = useState(80)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lyricsRaw, setLyricsRaw] = useState<string | null>(null)
  const [lyricsSynced, setLyricsSynced] = useState<boolean>(false)
  const [activeLine, setActiveLine] = useState<number>(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const { user, favoriteTrackIds, addToFavorites, removeFromFavorites, addToHistory } = useAuth()
  const { toast } = useToast()
  const [historyLoggedTrackId, setHistoryLoggedTrackId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const fullscreenRef = useRef<HTMLDivElement>(null)

  // Persist lyrics state across page navigation
  useEffect(() => {
    const savedLyricsState = localStorage.getItem('musicPlayer_showLyrics')
    if (savedLyricsState !== null) {
      setShowLyrics(JSON.parse(savedLyricsState))
    }
  }, [])

  // Save lyrics state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('musicPlayer_showLyrics', JSON.stringify(showLyrics))
  }, [showLyrics])

  const currentTrack = player.current
  const currentTitle = currentTrack?.name ?? ""
  const currentArtist = currentTrack?.artists?.join(", ") ?? ""
  const cover = currentTrack?.album_images?.[0]?.url || ""
  const duration = player.duration || 0
  const currentTime = player.currentTime || 0


  function truncateText(text: string, maxLength: number) {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
  }

  // Reset history flag when track changes
  useEffect(() => {
    setHistoryLoggedTrackId(null)
  }, [currentTrack?.id])

  // Log play to user history once per track when playback starts
  useEffect(() => {
    const shouldLog = player.isPlaying && currentTime <= 0.5 && historyLoggedTrackId !== currentTrack?.id
    if (shouldLog && user && currentTrack?.id) {
      addToHistory(currentTrack.id).catch((e) => {
        console.error("Failed to add to history", e)
      }).finally(() => {
        setHistoryLoggedTrackId(currentTrack.id)
      })
    }
  }, [player.isPlaying, currentTime, currentTrack?.id, user, historyLoggedTrackId, addToHistory])

  const isLiked = currentTrack ? favoriteTrackIds.includes(currentTrack.id) : false

  const handleLikeToggle = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save tracks to your favorites",
        variant: "destructive",
      })
      return
    }

    if (!currentTrack) return
    if (isLiked) {
      removeFromFavorites(currentTrack.id)
      toast({
        title: "Removed from favorites",
        description: `"${currentTitle}" has been removed from your favorites`,
      })
    } else {
      addToFavorites(currentTrack.id)
      toast({
        title: "Added to favorites",
        description: `"${currentTitle}" has been added to your favorites`,
      })
    }
  }

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (isMuted) {
      // Unmute: restore previous volume
      setIsMuted(false)
      player.setVolume(previousVolume / 100)
      setVolumeUi(previousVolume)
    } else {
      // Mute: store current volume and set to 0
      setPreviousVolume(volume)
      setIsMuted(true)
      player.setVolume(0)
    }
  }

  // Handle shuffle toggle
  const handleShuffleToggle = () => {
    player.toggleShuffle()
  }

  // Handle loop mode toggle
  const handleLoopToggle = () => {
    player.toggleLoop()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Sync UI volume with player context volume (0-1 <-> 0-100)
  useEffect(() => {
    setVolumeUi(Math.round((player.volume ?? 0.8) * 100))
  }, [player.volume])

  // Fetch lyrics from our proxy API
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (!currentTitle || !currentArtist) { 
        //  console.debug('[Lyrics] Missing title/artist', { currentTitle, currentArtist })
          setLyricsRaw(null); setLyricsSynced(false); return 
        }
        const params = new URLSearchParams({ track: currentTitle, artist: currentArtist })
        const clientToken = process.env.NEXT_PUBLIC_GENIUS_ACCESS_TOKEN
        let localToken: string | null = null
        try { localToken = localStorage.getItem('genius_token') } catch {}
        if (localToken) {
          params.set('token', localToken)
          console.debug('[Lyrics] Using token from localStorage (genius_token)')
        } else if (clientToken) {
          params.set('token', clientToken)
          console.debug('[Lyrics] Using NEXT_PUBLIC_GENIUS_ACCESS_TOKEN')
        } else {
          console.warn('[Lyrics] No client token found; relying on server-side GENIUS_ACCESS_TOKEN')
        }
        const url = `/api/lyrics?${params.toString()}`
       // console.debug('[Lyrics] Fetching', { url, title: currentTitle, artist: currentArtist })
        const res = await fetch(url)
        const data = await res.json()
        console.debug('[Lyrics] Response', { status: res.status, ok: res.ok, hasLyrics: Boolean(data?.lyrics), synced: data?.synced })
        // if (!res.ok) {
        //   console.error('[Lyrics] Fetch failed', { status: res.status, data })
        // }
        if (!cancelled) {
          setLyricsRaw(data?.lyrics ?? null)
          setLyricsSynced(Boolean(data?.synced))
          // if (!data?.lyrics) {
          //   console.info('[Lyrics] No lyrics returned for', { title: currentTitle, artist: currentArtist })
          // }
        }
      } catch (e) {
        console.error('[Lyrics] Error', e)
        if (!cancelled) {
          setLyricsRaw(null)
          setLyricsSynced(false)
        }
      }
    }
    console.debug('[Lyrics] Effect start', { currentTitle, currentArtist })
    load()
    return () => { cancelled = true }
  }, [currentTitle, currentArtist])

  // Parse LRC to [{ time, text }]
  const parsedLrc = useMemo(() => {
    if (!lyricsRaw || !lyricsSynced) return [] as { time: number; text: string }[]
    const lines = lyricsRaw.split(/\r?\n/)
    const out: { time: number; text: string }[] = []
    const timeRe = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,2}))?\]/g
    for (const line of lines) {
      let match: RegExpExecArray | null
      const times: number[] = []
      timeRe.lastIndex = 0
      while ((match = timeRe.exec(line))) {
        const m = Number(match[1])
        const s = Number(match[2])
        const cs = match[3] ? Number(match[3]) : 0
        const sec = m * 60 + s + cs / 100
        times.push(sec)
      }
      const text = line.replace(timeRe, "").trim()
      if (times.length && text) {
        for (const t of times) out.push({ time: t, text })
      }
    }
    return out.sort((a, b) => a.time - b.time)
  }, [lyricsRaw, lyricsSynced])

  // Parse static lyrics into styled lines with section headers like [Chorus]
  const staticParsed = useMemo(() => {
    if (!lyricsRaw || lyricsSynced) return [] as { kind: 'header' | 'line'; text: string }[]
    const lines = lyricsRaw.split(/\r?\n/)
    const out: { kind: 'header' | 'line'; text: string }[] = []
    for (let raw of lines) {
      const line = raw.trimEnd()
      if (!line.length) {
        out.push({ kind: 'line', text: '' })
        continue
      }
      const m = line.match(/^\[([^\]]+)\]$/)
      if (m) {
        out.push({ kind: 'header', text: m[1] })
      } else {
        out.push({ kind: 'line', text: line })
      }
    }
    return out
  }, [lyricsRaw, lyricsSynced])

  // Update active line with currentTime
  useEffect(() => {
    if (!parsedLrc.length) return
    let idx = parsedLrc.findIndex((l) => l.time > currentTime)
    if (idx === -1) idx = parsedLrc.length
    setActiveLine(Math.max(0, idx - 1))
  }, [currentTime, parsedLrc])

  // Auto-scroll lyrics to keep active line centered
  useEffect(() => {
    if (!showLyrics) return
    const el = lineRefs.current[activeLine]
    const container = scrollRef.current
    if (el && container) {
      const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
      container.scrollTo({ top, behavior: "smooth" })
    }
  }, [activeLine, showLyrics])

  // Fullscreen API handlers
  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true)
    // Auto-show lyrics in fullscreen mode
    setShowLyrics(true)
    setTimeout(() => {
      if (fullscreenRef.current && fullscreenRef.current.requestFullscreen) {
        fullscreenRef.current.requestFullscreen()
      }
    }, 10)
  }, [])
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    setIsFullscreen(false)
  }, [])
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  return (
    <>
      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div ref={fullscreenRef} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden animate-fade-in">
          {/* Animated/blurred background */}
          <div className="absolute inset-0 -z-10">
            {cover && (
              <Image src={cover} alt="bg" fill className="object-cover w-full h-full blur-2xl scale-110 opacity-60 transition-all duration-700" />
            )}
            <div className="absolute inset-0 bg-black/60" />
          </div>
          {/* Top bar */}
          <div className="w-full flex justify-between items-center px-4 sm:px-8 pt-4 sm:pt-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-white" onClick={exitFullscreen}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9L5 5M5 5v4M5 5h4"/><path d="M15 9l4-4m0 0v4m0-4h-4"/><path d="M15 15l4 4m0 0v-4m0 4h-4"/><path d="M9 15l-4 4m0 0v-4m0 4h4"/></svg>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className={`text-white ${isLiked ? "text-red-500" : ""}`} onClick={handleLikeToggle}><Heart className="h-6 w-6" /></Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowLyrics((v) => !v)}>
                <Mic2 className="h-6 w-6" />
                {lyricsRaw && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={exitFullscreen}><Maximize2 className="h-6 w-6 rotate-180" /></Button>
            </div>
          </div>
          {/* Main content */}
          <div className="flex flex-col lg:flex-row flex-1 w-full max-w-5xl items-center justify-center gap-6 sm:gap-8 lg:gap-12 px-4 sm:px-8">
            {/* Cover and info */}
            <div className="flex flex-col items-center gap-6 sm:gap-8 w-full lg:w-1/2">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-zinc-800">
                {cover ? (
                  <Image src={cover} alt={currentTitle} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl">🎵</div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2 drop-shadow-lg truncate max-w-[28ch] mx-auto" title={currentTitle}>{currentTitle}</h2>
                <TruncatedArtists 
                  artists={currentTrack?.artists}
                  artistIds={currentTrack?.artist_ids}
                  maxLength={40}
                  className="text-lg sm:text-xl text-zinc-200 mb-1 truncate max-w-[36ch] mx-auto block"
                  showLinks={true}
                />
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={() => {
                      try {
                        if (!currentTrack?.id || !currentTrack?.album_id) return
                        const url = `${window.location.origin}/album/${currentTrack.album_id}?track=${currentTrack.id}`
                        navigator.clipboard.writeText(url)
                        toast({ title: 'Link copied', description: 'Track link copied to clipboard' })
                      } catch {}
                    }}
                    aria-label="Share track"
                  >
                    <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white"
                    onClick={() => {
                      if (!currentTrack?.id) return
                      const downloadUrl = `/api/proxy/download/${currentTrack.id}`
                      const link = document.createElement('a')
                      link.href = downloadUrl
                      link.download = `${currentTitle || 'track'}.mp3`
                      link.target = '_blank'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    aria-label="Download track"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
              {/* Waveform visualizer placeholder */}
              <div className="w-full flex items-center justify-center mt-4">
                <div className="w-48 sm:w-64 h-10 sm:h-12 bg-zinc-800/60 rounded-lg flex items-end gap-1 overflow-hidden">
                  {[...Array(32)].map((_, i) => (
                    <div key={i} className="w-1 rounded bg-green-400/80 animate-pulse" style={{ height: `${Math.random() * 48 + 8}px`, animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Fullscreen player controls */}
          <div className="w-full flex flex-col items-center gap-4 pb-8 sm:pb-12 pt-6 sm:pt-8">
            <div className="flex items-center gap-6 sm:gap-8">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-white ${player.isShuffled ? 'text-green-500' : ''}`}
                onClick={handleShuffleToggle}
                aria-label={player.isShuffled ? 'Shuffle On' : 'Shuffle Off'}
              >
                <Shuffle className="h-6 w-6 sm:h-7 sm:w-7" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={player.prev}><SkipBack className="h-8 w-8 sm:h-9 sm:w-9" /></Button>
              <Button size="icon" variant="secondary" className="rounded-full h-14 w-14 sm:h-16 sm:w-16 bg-white text-black hover:bg-zinc-200 text-3xl sm:text-4xl" onClick={() => (player.isPlaying ? player.pause() : player.resume())}>
                {player.isPlaying ? <Pause className="h-8 w-8 sm:h-10 sm:w-10" /> : <Play className="h-8 w-8 sm:h-10 sm:w-10" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-white" onClick={player.next}><SkipForward className="h-8 w-8 sm:h-9 sm:w-9" /></Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-white relative ${player.loopMode !== 'none' ? 'text-green-500' : ''}`}
                onClick={handleLoopToggle}
                aria-label={`Loop ${player.loopMode === 'none' ? 'off' : player.loopMode === 'one' ? 'one track' : 'all tracks'}`}
                title={`Loop ${player.loopMode === 'none' ? 'off' : player.loopMode === 'one' ? 'one track' : 'all tracks'}`}
              >
                {player.loopMode === 'one' ? (
                  <Repeat1 className="h-6 w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Repeat className="h-6 w-6 sm:h-7 sm:w-7" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-4 w-full max-w-2xl px-4">
              <span className="text-sm sm:text-base text-zinc-200 w-12 sm:w-14 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[duration ? Math.min(currentTime, duration) : 0]}
                max={duration || 0}
                step={1}
                onValueChange={(value) => player.seek(value[0])}
                className="cursor-pointer flex-1"
              />
              <span className="text-sm sm:text-base text-zinc-200 w-12 sm:w-14">{formatTime(duration || 0)}</span>
            </div>
          </div>
        </div>
      )}
      {/* Main player bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 px-3 sm:px-4 py-2 sm:py-3 z-50">
        {/* Lyrics Panel */}
        {showLyrics && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-20 sm:bottom-24 w-[min(95vw,600px)] rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-md shadow-lg z-50">
            <div className="px-3 sm:px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-xs sm:text-sm text-zinc-400">Lyrics {lyricsSynced ? "(Synced)" : "(Static)"} - Click the mic button to toggle</div>
              <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => setShowLyrics(false)}>Close</Button>
            </div>
            <div ref={scrollRef} className="max-h-48 sm:max-h-56 overflow-auto px-3 sm:px-4 py-3 whitespace-pre-wrap break-words">
              {lyricsRaw ? (
                lyricsSynced && parsedLrc.length ? (
                  <div>
                    {parsedLrc.map((line, i) => (
                      <div
                        key={`${line.time}-${i}`}
                        ref={(el) => { lineRefs.current[i] = el }}
                        className={
                          i === activeLine
                            ? "text-white font-semibold text-sm sm:text-base transition-colors"
                            : "text-zinc-400 text-xs sm:text-sm"
                        }
                      >
                        {line.text}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {staticParsed.map((item, i) => (
                      item.kind === 'header' ? (
                        <div key={`h-${i}`} className="pt-2 text-zinc-200 font-semibold text-sm sm:text-base">[{item.text}]</div>
                      ) : (
                        <div key={`l-${i}`} className="text-xs sm:text-sm text-zinc-300 break-words">{item.text || '\u00A0'}</div>
                      )
                    ))}
                  </div>
                )
              ) : (
                <div className="text-xs sm:text-sm text-zinc-500 text-center py-4">
                  <p>No lyrics available for this track.</p>
                  <p className="text-xs text-zinc-600 mt-1">Try searching for a different song or check back later.</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Currently playing */}
          <div className="flex items-center gap-2 sm:gap-4 w-1/3 sm:w-1/4">
            {cover ? (
              <Image
                src={cover}
                alt={truncateText(currentTitle, 13)}
                width={isMobile ? 40 : 56}
                height={isMobile ? 40 : 56}
                className="rounded"
              />
            ) : (
              <div className={`${isMobile ? 'h-10 w-10' : 'h-14 w-14'} rounded bg-zinc-800 flex items-center justify-center ${isMobile ? 'text-lg' : 'text-2xl'}`}>🎵</div>
            )}
            <div className="hidden sm:block min-w-0">
              <p className="font-medium text-sm truncate max-w-[24ch]" title={currentTitle}>{currentTitle || "Nothing playing"}</p>
              <TruncatedArtists 
                artists={currentTrack?.artists}
                artistIds={currentTrack?.artist_ids}
                maxLength={24}
                className="text-xs text-zinc-400 truncate max-w-[28ch] block"
                hideWhenEmpty
                showLinks={true}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`text-zinc-400 hover:text-white ${isLiked ? "text-red-500" : ""} ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
              onClick={handleLikeToggle}
            >
              <Heart className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4'}`} />
            </Button>
          </div>

          {/* Player controls */}
          <div className="flex flex-col items-center gap-1 sm:gap-2 w-1/3 sm:w-2/4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-zinc-400 hover:text-white ${player.isShuffled ? 'text-green-500' : ''} ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
                onClick={handleShuffleToggle}
                aria-label={player.isShuffled ? 'Shuffle On' : 'Shuffle Off'}
              >
                <Shuffle className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              </Button>
              <Button variant="ghost" size="icon" className={`text-zinc-400 hover:text-white ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`} onClick={player.prev}>
                <SkipBack className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className={`rounded-full bg-white text-black hover:bg-zinc-200 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`}
                onClick={() => (player.isPlaying ? player.pause() : player.resume())}
              >
                {player.isPlaying ? <Pause className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> : <Play className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} ml-0.5`} />}
              </Button>
              <Button variant="ghost" size="icon" className={`text-zinc-400 hover:text-white ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`} onClick={player.next}>
                <SkipForward className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-zinc-400 hover:text-white relative ${player.loopMode !== 'none' ? 'text-green-500' : ''} ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`}
                onClick={handleLoopToggle}
                aria-label={`Loop ${player.loopMode === 'none' ? 'off' : player.loopMode === 'one' ? 'one track' : 'all tracks'}`}
                title={`Loop ${player.loopMode === 'none' ? 'off' : player.loopMode === 'one' ? 'one track' : 'all tracks'}`}
              >
                {player.loopMode === 'one' ? (
                  <Repeat1 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                ) : (
                  <Repeat className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 w-full max-w-md px-2">
              <span className="text-xs text-zinc-400 w-8 sm:w-10 text-right">{formatTime(currentTime)}</span>
              <Slider
                value={[duration ? Math.min(currentTime, duration) : 0]}
                max={duration || 0}
                step={1}
                onValueChange={(value) => player.seek(value[0])}
                className="cursor-pointer"
              />
              <span className="text-xs text-zinc-400 w-8 sm:w-10">{formatTime(duration || 0)}</span>
            </div>
          </div>

          {/* Volume and other controls */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 w-1/3 sm:w-1/4">
            <Button variant="ghost" size="icon" className={`text-zinc-400 hover:text-white ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`} onClick={() => setShowLyrics((v) => !v)}>
              <Mic2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              {lyricsRaw && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
              )}
            </Button>
            <div className="flex items-center gap-2 w-20 sm:w-28 hidden sm:flex">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:text-white"
                onClick={handleMuteToggle}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(value) => {
                  setVolumeUi(value[0])
                  if (!isMuted) {
                    player.setVolume(value[0] / 100)
                  }
                }}
                className="cursor-pointer"
              />
            </div>
            <Button variant="ghost" size="icon" className={`text-zinc-400 hover:text-white hidden lg:flex ${isMobile ? 'h-8 w-8' : 'h-9 w-9'}`} onClick={enterFullscreen}>
              <Maximize2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
