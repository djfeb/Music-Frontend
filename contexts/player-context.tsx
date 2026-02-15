"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { musicAPI, Track } from "@/lib/music-api"

interface PlayerContextValue {
  current: Track | null
  queue: Track[]
  isPlaying: boolean
  volume: number
  streamUrl: string | null
  currentTime: number
  duration: number
  isShuffled: boolean
  loopMode: 'none' | 'one' | 'all'
  play: (track: Track, opts?: { queue?: Track[]; autoplay?: boolean }) => Promise<void>
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>
  pause: () => void
  resume: () => void
  next: () => Promise<void>
  prev: () => Promise<void>
  setVolume: (v: number) => void
  seek: (timeSeconds: number) => void
  toggleShuffle: () => void
  toggleLoop: () => void
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [current, setCurrent] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [index, setIndex] = useState<number>(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.8)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isShuffled, setIsShuffled] = useState(false)
  const [loopMode, setLoopMode] = useState<'none' | 'one' | 'all'>('none')
  const [originalQueue, setOriginalQueue] = useState<Track[]>([])
  const [hasTrackedCurrentSong, setHasTrackedCurrentSong] = useState(false)

  // Restore last played track (metadata only, no autoplay)
  useEffect(() => {
    try {
      const lastId = typeof window !== 'undefined' ? localStorage.getItem('last_track_id') : null
      if (!lastId) return
      ;(async () => {
        try {
          const t = await musicAPI.getTrack(lastId)
          // Best-effort attach album images
          try {
            const album = await musicAPI.getAlbum(t.album_id)
            ;(t as any).album_images = album.images || []
          } catch {}
          setCurrent(t)
          setQueue([t])
          setIndex(0)
        } catch (e) {
          console.warn('[Player] Failed to restore last track', e)
        }
      })()
    } catch {}
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
  }, [volume])

  const loadAndMaybePlay = useCallback(async (track: Track, autoplay = true) => {
    try {
      console.debug('[Player] loadAndMaybePlay', { trackId: track.id, name: track.name, autoplay })
      const url = await musicAPI.playTrack(track.id)
      setStreamUrl(url)
      if (audioRef.current) {
        audioRef.current.src = url
        if (autoplay) {
          await audioRef.current.play()
          setIsPlaying(true)
        }
      }
      // Reset tracking flag when loading a new track
      setHasTrackedCurrentSong(false)
    } catch (e) {
      console.error("Failed to load stream", e)
    }
  }, [])

  const play = useCallback(async (track: Track, opts?: { queue?: Track[]; autoplay?: boolean }) => {
    const autoplay = opts?.autoplay ?? true
    console.debug('[Player] play', { trackId: track.id, name: track.name, autoplay, queueLen: opts?.queue?.length })
    
    if (opts?.queue) {
      const newQueue = opts.queue
      setOriginalQueue(newQueue)
      
      // Always start with shuffled queue (default behavior)
      let finalQueue = [...newQueue].sort(() => Math.random() - 0.5)
      setQueue(finalQueue)
      setIsShuffled(true) // Start with shuffle enabled
      
      const idx = finalQueue.findIndex(t => t.id === track.id)
      setIndex(idx >= 0 ? idx : 0)
    }
    setCurrent(track)
    try { localStorage.setItem('last_track_id', track.id) } catch {}
    await loadAndMaybePlay(track, autoplay)
  }, [loadAndMaybePlay])

  const playQueue = useCallback(async (tracks: Track[], startIndex = 0) => {
    if (!tracks.length) return
    console.debug('[Player] playQueue', { startIndex, tracks: tracks.map(t => ({ id: t.id, name: t.name })) })
    
    setOriginalQueue(tracks)
    
    // Always start with shuffled queue (default behavior)
    let finalQueue = [...tracks].sort(() => Math.random() - 0.5)
    setIsShuffled(true) // Start with shuffle enabled
    
    // Find the new index of the start track after shuffling
    const startTrack = tracks[startIndex]
    const newStartIndex = finalQueue.findIndex(t => t.id === startTrack.id)
    startIndex = newStartIndex >= 0 ? newStartIndex : 0
    
    setQueue(finalQueue)
    const i = Math.max(0, Math.min(startIndex, finalQueue.length - 1))
    setIndex(i)
    const t = finalQueue[i]
    setCurrent(t)
    await loadAndMaybePlay(t, true)
  }, [loadAndMaybePlay])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const resume = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    // If we have no source loaded (e.g., restored last track), load current first
    if ((!el.src || el.src.length === 0) && current) {
      void loadAndMaybePlay(current, true)
      return
    }
    el.play().then(() => setIsPlaying(true)).catch(() => {})
  }, [current, loadAndMaybePlay])

  const next = useCallback(async () => {
    if (queue.length === 0) return
    
    let nextIndex = index + 1
    
    // Handle loop modes
    if (nextIndex >= queue.length) {
      if (loopMode === 'all') {
        // Loop entire queue
        nextIndex = 0
      } else {
        // No loop or loop one - stop at end
        return
      }
    }
    
    setIndex(nextIndex)
    const nextTrack = queue[nextIndex]
    setCurrent(nextTrack)
    await loadAndMaybePlay(nextTrack, true)
  }, [queue, index, loopMode, loadAndMaybePlay])

  const prev = useCallback(async () => {
    if (queue.length === 0) return
    
    let prevIndex = index - 1
    
    // Handle loop modes
    if (prevIndex < 0) {
      if (loopMode === 'all') {
        // Loop entire queue
        prevIndex = queue.length - 1
      } else {
        // No loop or loop one - stop at beginning
        return
      }
    }
    
    setIndex(prevIndex)
    const prevTrack = queue[prevIndex]
    setCurrent(prevTrack)
    await loadAndMaybePlay(prevTrack, true)
  }, [queue, index, loopMode, loadAndMaybePlay])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
  }, [])

  const seek = useCallback((timeSeconds: number) => {
    const el = audioRef.current
    if (!el) return
    const t = Math.max(0, Math.min(timeSeconds, isFinite(el.duration) ? el.duration : timeSeconds))
    el.currentTime = t
    setCurrentTime(t)
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      const newShuffled = !prev
      
      if (newShuffled) {
        // Resume shuffling: shuffle the current queue
        if (queue.length > 0) {
          const shuffledQueue = [...queue].sort(() => Math.random() - 0.5)
          setQueue(shuffledQueue)
          
          // Find current track in shuffled queue and update index
          if (current) {
            const newIndex = shuffledQueue.findIndex(t => t.id === current.id)
            if (newIndex >= 0) {
              setIndex(newIndex)
            }
          }
        }
      } else {
        // Pause shuffling: keep current queue order but mark as not shuffled
        // The queue order stays the same, we just mark it as not actively shuffling
        console.log('[Player] Shuffle paused - keeping current queue order')
      }
      
      return newShuffled
    })
  }, [queue, current])

  const toggleLoop = useCallback(() => {
    setLoopMode(prev => {
      // Cycle through: none -> all -> one -> none
      if (prev === 'none') return 'all'
      if (prev === 'all') return 'one'
      return 'none'
    })
  }, [])

  // Wire audio events - moved here after function definitions
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => {
      const currentTime = el.currentTime || 0
      setCurrentTime(currentTime)
      
      // Track to history when song has played for at least 30 seconds or 50% of the song
      if (current && !hasTrackedCurrentSong && currentTime > 30 && 
          (currentTime > el.duration * 0.5 || currentTime > 30)) {
        setHasTrackedCurrentSong(true)
        
        // Add to history using a global function we'll create
        if (typeof window !== 'undefined' && (window as any).addToHistoryGlobal) {
          (window as any).addToHistoryGlobal(current.id)
        }
      }
    }
    const onMeta = () => setDuration(el.duration && isFinite(el.duration) ? el.duration : 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      // Auto-advance to next track when current track ends
      if (queue.length > 0) {
        if (loopMode === 'one') {
          // Loop current track
          if (current) {
            loadAndMaybePlay(current, true)
          }
        } else if (isShuffled) {
          // Only auto-advance if shuffle is active
          next()
        } else {
          // Shuffle is paused - stop playing, don't advance, but keep track info
          console.log('[Player] Shuffle paused - stopping playback after track ends')
          setIsPlaying(false)
          // Don't clear current track - keep artist info and image visible
          // Don't clear queue - just stop playback
        }
      }
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [queue, loopMode, current, next, loadAndMaybePlay, isShuffled, hasTrackedCurrentSong])

  const value = useMemo<PlayerContextValue>(() => ({
    current,
    queue,
    isPlaying,
    volume,
    streamUrl,
    currentTime,
    duration,
    isShuffled,
    loopMode,
    play,
    playQueue,
    pause,
    resume,
    next,
    prev,
    setVolume,
    seek,
    toggleShuffle,
    toggleLoop,
  }), [current, queue, isPlaying, volume, streamUrl, currentTime, duration, isShuffled, loopMode, play, playQueue, pause, resume, next, prev, setVolume, seek, toggleShuffle, toggleLoop])

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element used for playback */}
      <audio ref={audioRef} />
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider")
  return ctx
}
