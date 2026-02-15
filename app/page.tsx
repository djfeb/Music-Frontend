"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Play, Pause, Heart, MoreHorizontal, Loader2, Download, Share2, Clock, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/player-context"
import { useAuth } from "@/contexts/auth-context"
import { Sidebar } from "@/components/sidebar"
import { musicAPI, Album, Track, Artist } from "@/lib/music-api"
import { formatDate } from "@/lib/date-utils"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import { Skeleton } from "@/components/ui/skeleton"
import { ContentPreferenceOverlay } from "@/components/content-preference-overlay"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function HomePage() {
  const player = usePlayer()
  const { 
    user, 
    favoriteTrackIds, 
    addToFavorites, 
    removeFromFavorites, 
    // followedArtistIds,
    contentPreferences,
    updateContentPreferences,
    showPreferenceOverlay
  } = useAuth()
  
  // Content state
  const [featuredAlbums, setFeaturedAlbums] = useState<Album[]>([])
  const [gospelArtists, setGospelArtists] = useState<Artist[]>([])
  const [popularTracks, setPopularTracks] = useState<Track[]>([])
  const [topArtists, setTopArtists] = useState<Artist[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  const [jumpBackIn, setJumpBackIn] = useState<(Album | Artist)[]>([])
  const [heavyRotation, setHeavyRotation] = useState<Track[]>([])
  const [newMusicDaily, setNewMusicDaily] = useState<Album[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionsRef = useRef({ artists: 0, featured: 0, releases: 0, tracks: 0 })
  const lastFocusReloadAt = useRef(0)

  const clearRetryTimer = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }

  const scheduleRetryIfNeeded = (sections: { artists: boolean; featured: boolean; releases: boolean; tracks: boolean }) => {
    const needsRetry = !sections.artists || !sections.featured || !sections.releases || !sections.tracks
    if (needsRetry && retryCount < 20) {
      clearRetryTimer()
      const delay = Math.min(15000, 2000 * Math.pow(1.4, retryCount))
      retryTimer.current = setTimeout(() => {
        setRetryCount((c) => c + 1)
        loadFeaturedContent()
      }, delay)
    } else if (!needsRetry) {
      setRetryCount(0)
      clearRetryTimer()
    }
  }

  // Keep a ref of current section sizes for focus/visibility checks
  useEffect(() => {
    sectionsRef.current = {
      artists: topArtists.length,
      featured: featuredAlbums.length,
      releases: gospelArtists.length,
      tracks: popularTracks.length,
    }
  }, [topArtists.length, featuredAlbums.length, gospelArtists.length, popularTracks.length])

  useEffect(() => {
    loadFeaturedContent()
    setGreeting(getGreeting())
    
    // Set up global function for player to add to history
    if (typeof window !== 'undefined') {
      (window as any).addToHistoryGlobal = async (trackId: string) => {
        if (user) {
          try {
            const { firebaseService } = await import('@/lib/firebase-service')
            await firebaseService.addToHistory(user.uid, trackId)
            console.debug('[Homepage] Added to history:', trackId)
          } catch (error) {
            console.warn('[Homepage] Failed to add to history:', error)
          }
        }
      }
    }
    
    // Update greeting every minute
    const greetingInterval = setInterval(() => {
      setGreeting(getGreeting())
    }, 60000)
    
    // Refresh content every 5 minutes for dynamic updates
    const contentInterval = setInterval(() => {
      loadFeaturedContent()
    }, 300000)
    
    const handleVisibilityOrFocus = () => {
      const { artists, featured, releases, tracks } = sectionsRef.current
      const anyEmpty = artists === 0 || featured === 0 || releases === 0 || tracks === 0
      const now = Date.now()
      if (anyEmpty && now - lastFocusReloadAt.current > 5000) {
        lastFocusReloadAt.current = now
        loadFeaturedContent()
      }
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)

    return () => {
      clearInterval(greetingInterval)
      clearInterval(contentInterval)
      clearRetryTimer()
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      
      // Clean up global function
      if (typeof window !== 'undefined') {
        delete (window as any).addToHistoryGlobal
      }
    }
  }, [user])

  const getDayName = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[new Date().getDay()]
  }

  const getDailyMusicAlgorithm = (day: string, albums: Album[]) => {
    const dayAlgorithms = {
      'Monday': (albums: Album[]) => {
        // Monday Motivation - Mix of energetic popular and emerging artists
        const popular = albums.filter(album => album.popularity > 70)
        const emerging = albums.filter(album => album.popularity > 30 && album.popularity <= 70)
        return [
          ...popular.sort((a, b) => b.popularity - a.popularity).slice(0, 10),
          ...emerging.sort(() => Math.random() - 0.5).slice(0, 5)
        ].sort(() => Math.random() - 0.5).slice(0, 15)
      },
      'Tuesday': (albums: Album[]) => {
        // Tuesday Discoveries - Focus on mid-tier and emerging artists
        return albums
          .filter(album => album.popularity > 20 && album.popularity < 80)
          .sort(() => Math.random() - 0.5)
          .slice(0, 15)
      },
      'Wednesday': (albums: Album[]) => {
        // Wednesday Vibes - Balanced diversity across all popularity levels
        const high = albums.filter(album => album.popularity > 70).slice(0, 5)
        const mid = albums.filter(album => album.popularity > 40 && album.popularity <= 70).slice(0, 5)
        const emerging = albums.filter(album => album.popularity <= 40).slice(0, 5)
        return [...high, ...mid, ...emerging].sort(() => Math.random() - 0.5)
      },
      'Thursday': (albums: Album[]) => {
        // Thursday Throwbacks - Mix of older releases with diversity
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        const older = albums.filter(album => new Date(album.release_date) < oneYearAgo)
        
        // If not enough older albums, mix with lower popularity recent ones
        if (older.length < 10) {
          const recentEmerging = albums.filter(album => album.popularity <= 50)
          return [...older, ...recentEmerging].sort(() => Math.random() - 0.5).slice(0, 15)
        }
        
        return older.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()).slice(0, 15)
      },
      'Friday': (albums: Album[]) => {
        // Friday Fresh - Mix of newest releases with emerging artists
        const recent = albums.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
        const popular = recent.filter(album => album.popularity > 60).slice(0, 8)
        const emerging = recent.filter(album => album.popularity <= 60).slice(0, 7)
        return [...popular, ...emerging].sort(() => Math.random() - 0.5)
      },
      'Saturday': (albums: Album[]) => {
        // Saturday Shuffle - Completely diverse random selection
        return [...albums]
          .sort(() => Math.random() - 0.5)
          .slice(0, 15)
      },
      'Sunday': (albums: Album[]) => {
        // Sunday Chill - Mix of longer albums with diverse popularity
        const longAlbums = albums.filter(album => album.total_tracks >= 8)
        const shortAlbums = albums.filter(album => album.total_tracks < 8)
        
        // Prioritize longer albums but include diversity
        const diverseLong = [
          ...longAlbums.filter(album => album.popularity > 50).slice(0, 8),
          ...longAlbums.filter(album => album.popularity <= 50).slice(0, 4),
          ...shortAlbums.sort(() => Math.random() - 0.5).slice(0, 3)
        ]
        
        return diverseLong.sort(() => Math.random() - 0.5).slice(0, 15)
      }
    }

    return dayAlgorithms[day as keyof typeof dayAlgorithms]?.(albums) || albums.slice(0, 15)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    const userName = user?.displayName && user.displayName !== 'User' ? user.displayName : (user?.email?.split('@')[0] || '')
    
    let baseGreeting = ""
    
    if (hour < 6) {
      baseGreeting = "Up late"
    } else if (hour < 12) {
      baseGreeting = "Good morning"
    } else if (hour < 17) {
      baseGreeting = "Good afternoon"
    } else if (hour < 22) {
      baseGreeting = "Good evening"
    } else {
      baseGreeting = "Good night"
    }
    
    return userName ? `${baseGreeting}, ${userName}` : baseGreeting
  }

  // Helper function to get active preferences (user's or default Both/Mixed)
  const getActivePreferences = () => {
    const defaultPreferences = {
      preferredContinents: ['North America', 'Europe', 'Australia', 'Asia', 'South America', 'Caribbean', 'Africa'],
      preferenceType: 'mixed' as const,
      hasSetPreferences: false
    }
    if (contentPreferences) {
      console.log(`This is your content preference: ${contentPreferences}`)
    }
    
    return (contentPreferences && contentPreferences.hasSetPreferences) 
      ? contentPreferences 
      : defaultPreferences
  }

  // Enhanced content filtering based on artist countries/continents
  const filterContentByPreferences = (artists: Artist[], preferences: any) => {
    console.log('[FILTER] Artists - Input:', { 
      artistCount: artists.length, 
      preferences,
      sampleArtist: artists[0] ? { name: artists[0].name, country: artists[0].country } : null
    })
    
    if (!preferences || !preferences.hasSetPreferences || preferences.preferredContinents.length === 0) {
      console.log('[FILTER] Artists - No preferences set, returning all artists')
      return artists // Return all if no preferences set
    }

    const { preferredContinents, preferenceType } = preferences
    
    // Define continent mappings based on actual countries in database
    const continentMappings = {
      'North America': [
        'United States', 'Canada', 'Mexico', 'Puerto Rico', 'U.S. Virgin Islands', 'British Virgin Islands', 'Saint Kitts and Nevis'
      ],
      'Europe': [
        'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 
        'Austria', 'Ireland', 'Scotland', 'Iceland', 'Slovenia', 'Bosnia and Herzegovina', 'Poland', 'Russia'
      ],
      'Australia': [
        'Australia', 'New Zealand'
      ],
      'Asia': [
        'Japan', 'South Korea', 'Korea', 'India', 'Indonesia', 'Philippines', 'Israel'
      ],
      'South America': [
        'Argentina', 'Brazil', 'Chile', 'Colombia'
      ],
      'Africa': [
        'Ghana', 'Nigeria', 'South Africa', 'Uganda', 'Senegal', 'Malawi', 'Democratic Republic of the Congo'
      ],
      'Caribbean': [
        'Jamaica'
      ]
    }
    
    // Create reverse mapping: country -> continent
    const countryToContinent: { [key: string]: string } = {}
    Object.entries(continentMappings).forEach(([continent, countries]) => {
      countries.forEach(country => {
        countryToContinent[country] = continent
      })
    })
    
    const filtered = artists.filter(artist => {
      // Skip artists with no country data or invalid country data
      if (!artist.country || artist.country === 'UNKNOWN' || artist.country === 'ERROR') {
        const result = preferenceType === 'international' // Default to international if no country info
        console.log('[FILTER] Artist no country:', { name: artist.name, country: artist.country, preferenceType, result })
        return result
      }
      
      // Get the continent for this artist's country
      const artistContinent = artist.country ? countryToContinent[artist.country] : undefined
      
      if (!artistContinent) {
        // Country not in our mapping, try to categorize
        const isAfrican = artist.country?.toLowerCase().includes('africa') || 
                         ['Ghana', 'Nigeria', 'Kenya', 'Uganda', 'Tanzania', 'South Africa'].some(c => 
                           artist.country?.toLowerCase().includes(c.toLowerCase()))
        
        const result = isAfrican ? 
          (preferenceType === 'local' || preferenceType === 'mixed') :
          (preferenceType === 'international' || preferenceType === 'mixed')
        
        console.log('[FILTER] Artist unmapped country:', { 
          name: artist.name, 
          country: artist.country, 
          isAfrican, 
          preferenceType, 
          result 
        })
        return result
      }
      
      // Check if artist's continent is in user's preferred continents
      const isPreferredContinent = preferredContinents.includes(artistContinent)
      
      let result = false
      switch (preferenceType) {
        case 'local':
          // For local preference, only show African artists
          result = artistContinent === 'Africa'
          break
        case 'international':
          // For international preference, show non-African artists
          result = artistContinent !== 'Africa'
          break
        case 'mixed':
          // For mixed preference, show artists from preferred continents
          result = isPreferredContinent
          break
        default:
          result = true
      }
      
      console.log('[FILTER] Artist result:', { 
        name: artist.name, 
        country: artist.country,
        continent: artistContinent,
        preferenceType,
        preferredContinents,
        isPreferredContinent,
        result 
      })
      
      return result
    })
    
    console.log('[FILTER] Artists - Output:', { 
      inputCount: artists.length, 
      outputCount: filtered.length,
      preferenceType,
      preferredContinents
    })
    
    return filtered
  }

  // Simplified album filtering - returns all albums (continent filtering for albums not implemented yet)
  const filterAlbumsByPreferences = (albums: Album[], preferences: any) => {
    console.log('[FILTER] Albums - Returning all albums (continent filtering not yet implemented for albums)')
    return albums
  }

  // Track filtering based on artist countries/continents
  const filterTracksByPreferences = (tracks: Track[], preferences: any) => {
    console.log('[FILTER] Tracks - Input:', { 
      trackCount: tracks.length, 
      preferenceType: preferences.preferenceType,
      preferredContinents: preferences.preferredContinents
    })
    
    if (!preferences.preferenceType || preferences.preferenceType === 'mixed') {
      console.log('[FILTER] Tracks - Mixed preference, returning all tracks')
      return tracks
    }
    
    const { preferenceType, preferredContinents } = preferences
    
    // Define continent mappings (same as for artists)
    const continentMappings = {
      'North America': [
        'United States', 'Canada', 'Mexico', 'Puerto Rico', 'U.S. Virgin Islands', 'British Virgin Islands', 'Saint Kitts and Nevis'
      ],
      'Europe': [
        'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 
        'Austria', 'Ireland', 'Scotland', 'Iceland', 'Slovenia', 'Bosnia and Herzegovina', 'Poland', 'Russia'
      ],
      'Australia': [
        'Australia', 'New Zealand'
      ],
      'Asia': [
        'Japan', 'South Korea', 'Korea', 'India', 'Indonesia', 'Philippines', 'Israel'
      ],
      'South America': [
        'Argentina', 'Brazil', 'Chile', 'Colombia'
      ],
      'Africa': [
        'Ghana', 'Nigeria', 'South Africa', 'Uganda', 'Senegal', 'Malawi', 'Democratic Republic of the Congo'
      ],
      'Caribbean': [
        'Jamaica'
      ]
    }
    
    // Create reverse mapping: country -> continent
    const countryToContinent: { [key: string]: string } = {}
    Object.entries(continentMappings).forEach(([continent, countries]) => {
      countries.forEach(country => {
        countryToContinent[country] = continent
      })
    })
    
    const filtered = tracks.filter(track => {
      // For tracks, we need to check the artist's country
      // Tracks have artist_ids array, we'll check the first artist
      if (!track.artist_ids || track.artist_ids.length === 0) {
        // No artist info, default to international
        return preferenceType === 'international'
      }
      
      // For now, we'll use a simplified approach since we don't have artist country data loaded
      // In a real implementation, you'd fetch the artist data or have it pre-loaded
      // For now, let's return all tracks and log this limitation
      console.log('[FILTER] Track filtering by artist country not fully implemented - returning track:', track.name)
      return true
    })
    
    console.log('[FILTER] Tracks - Output:', { 
      inputCount: tracks.length, 
      outputCount: filtered.length,
      preferenceType,
      preferredContinents
    })
    
    return filtered
  }

  const loadFeaturedContent = async () => {
    console.log('[HOMEPAGE] ===== LOADING FEATURED CONTENT =====')
    console.log('[HOMEPAGE] User:', user ? { uid: user.uid, email: user.email } : 'Not logged in')
    console.log('[HOMEPAGE] Content Preferences:', contentPreferences)
    console.log('[HOMEPAGE] Show Preference Overlay:', showPreferenceOverlay)
    
    // Add visible debugging info to the page title temporarily
    if (typeof document !== 'undefined') {
      document.title = `Music App - User: ${user ? 'Logged In' : 'Not Logged'} - Prefs: ${contentPreferences ? 'Set' : 'None'}`
    }
    
    // Send debug info to server for logging
    if (contentPreferences && typeof fetch !== 'undefined') {
      try {
        fetch('/api/debug/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: user ? { uid: user.uid, email: user.email } : null,
            contentPreferences,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {}) // Ignore errors
      } catch (e) {}
    }
    
    try {
      const currentDate = new Date()
      const oneMonthAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      // Load content based ONLY on user preferences - no mixing or filtering afterward
      const activePrefs = getActivePreferences()
      console.log('[HOMEPAGE] Loading content for preference:', activePrefs.preferenceType)
      
      // For local preference: ONLY African content
      // For international preference: ONLY non-African content  
      // For mixed preference: Load both types
      
      let artistQueries = []
      let albumQueries = []
      let trackQueries = []
      
      if (activePrefs.preferenceType === 'local') {
        console.log('[HOMEPAGE] Loading ONLY African/Local content')
        // Load more artists with different sorting to find African ones
        artistQueries = [
          fetch('/api/proxy/artists?sort=popularity&order=desc&limit=50'),
          fetch('/api/proxy/artists?sort=followers_total&order=desc&limit=50'),
          fetch('/api/proxy/artists?sort=created_at&order=desc&limit=50'),
          fetch('/api/proxy/artists?sort=name&order=asc&limit=50'),
          // Add gospel-specific queries
          fetch('/api/proxy/artists?genre=African%20Gospel&limit=50'),
          fetch('/api/proxy/artists?genre=gospel&limit=50'),
          fetch('/api/proxy/artists?genre=christian&limit=50'),
          // fetch('/api/proxy/artists?search=gospel&limit=50'),
          // fetch('/api/proxy/artists?search=christian&limit=50'),
          fetch('/api/proxy/artists?genre=worship&limit=50')
        ]
        albumQueries = [
          fetch('/api/proxy/albums?sort=popularity&order=desc&limit=50'),
          fetch('/api/proxy/albums?sort=release_date&order=desc&limit=50')
        ]
        trackQueries = [
          fetch('/api/proxy/tracks?sort=popularity&order=desc&limit=50'),
          fetch('/api/proxy/tracks?sort=created_at&order=desc&limit=50')
        ]
      } else if (activePrefs.preferenceType === 'international') {
        console.log('[HOMEPAGE] Loading ONLY International content')
        artistQueries = [
          fetch('/api/proxy/artists?sort=popularity&order=desc&limit=50'),
          fetch('/api/proxy/artists?sort=followers_total&order=desc&limit=50'),
          // Add gospel-specific queries for international
          fetch('/api/proxy/artists?genre=gospel&limit=50'),
          fetch('/api/proxy/artists?genre=christian&limit=50'),
          fetch('/api/proxy/artists?search=gospel&limit=50'),
          fetch('/api/proxy/artists?search=christian&limit=50')
        ]
        albumQueries = [
          fetch('/api/proxy/albums?sort=popularity&order=desc&limit=30'),
          fetch('/api/proxy/albums?sort=release_date&order=desc&limit=30')
        ]
        trackQueries = [
          fetch('/api/proxy/tracks?sort=popularity&order=desc&limit=30')
        ]
      } else {
        console.log('[HOMEPAGE] Loading Mixed content (both local and international)')
        artistQueries = [
          fetch('/api/proxy/artists?sort=popularity&order=desc&limit=40'),
          fetch('/api/proxy/artists?sort=followers_total&order=desc&limit=40'),
          fetch('/api/proxy/artists?sort=created_at&order=desc&limit=40'),
          // Add gospel-specific queries for mixed
          fetch('/api/proxy/artists?genre=African%20Gospel&limit=60'),
         // fetch('/api/proxy/artists?genre=gospel&limit=60'),
          fetch('/api/proxy/artists?genre=christian&limit=60'),
          fetch('/api/proxy/artists?search=gospel&limit=60'),
          fetch('/api/proxy/artists?search=christian&limit=60'),
          fetch('/api/proxy/artists?search=worship&limit=60')
        ]
        albumQueries = [
          fetch('/api/proxy/albums?sort=popularity&order=desc&limit=40'),
          fetch('/api/proxy/albums?sort=release_date&order=desc&limit=40')
        ]
        trackQueries = [
          fetch('/api/proxy/tracks?sort=popularity&order=desc&limit=40')
        ]
      }
      
      const allResponses = await Promise.all([
        ...artistQueries,
        ...albumQueries,
        ...trackQueries
      ])
      
      // Parse responses based on the number of queries
      const artistResponses = allResponses.slice(0, artistQueries.length)
      const albumResponses = allResponses.slice(artistQueries.length, artistQueries.length + albumQueries.length)
      const trackResponses = allResponses.slice(artistQueries.length + albumQueries.length)
      
      // Parse all responses
      const artistResults = await Promise.all(
        artistResponses.map(response => response.json())
      )
      const albumResults = await Promise.all(
        albumResponses.map(response => response.json())
      )
      const trackResults = await Promise.all(
        trackResponses.map(response => response.json())
      )
      
      console.log('[HOMEPAGE] Raw data loaded:', {
        artistBatches: artistResults.length,
        albumBatches: albumResults.length,
        trackBatches: trackResults.length,
        totalArtists: artistResults.reduce((sum, result) => sum + (result.data?.length || 0), 0),
        totalAlbums: albumResults.reduce((sum, result) => sum + (result.data?.length || 0), 0),
        totalTracks: trackResults.reduce((sum, result) => sum + (result.data?.length || 0), 0),
        gospelQueriesUsed: activePrefs.preferenceType === 'local' ? 5 : activePrefs.preferenceType === 'international' ? 4 : 5
      })

      // Combine all loaded data
      const allArtistsData = artistResults.flatMap(result => result.data || [])
      const allAlbumsData = albumResults.flatMap(result => result.data || [])
      const allTracksData = trackResults.flatMap(result => result.data || [])
      
      // Remove duplicates
      const uniqueArtistsMap = new Map()
      const uniqueAlbumsMap = new Map()
      const uniqueTracksMap = new Map()
      
      allArtistsData.forEach(artist => {
        if (artist?.id && !uniqueArtistsMap.has(artist.id)) {
          uniqueArtistsMap.set(artist.id, artist)
        }
      })
      
      allAlbumsData.forEach(album => {
        if (album?.id && !uniqueAlbumsMap.has(album.id)) {
          uniqueAlbumsMap.set(album.id, album)
        }
      })
      
      allTracksData.forEach(track => {
        if (track?.id && !uniqueTracksMap.has(track.id)) {
          uniqueTracksMap.set(track.id, track)
        }
      })
      
      const uniqueArtists = Array.from(uniqueArtistsMap.values())
      const uniqueAlbums = Array.from(uniqueAlbumsMap.values())
      const uniqueTracks = Array.from(uniqueTracksMap.values())
      
      console.log('[HOMEPAGE] After deduplication:', {
        artists: uniqueArtists.length,
        albums: uniqueAlbums.length,
        tracks: uniqueTracks.length
      })
      
      // NOW filter by preference - keep ONLY what matches user's choice
      const filteredArtists = filterContentByPreferences(uniqueArtists, activePrefs)
      const filteredAlbums = filterAlbumsByPreferences(uniqueAlbums, activePrefs)
      const filteredTracks = filterTracksByPreferences(uniqueTracks, activePrefs)
      
      console.log('[HOMEPAGE] After preference filtering (ONLY matching content):', {
        artists: filteredArtists.length,
        albums: filteredAlbums.length,
        tracks: filteredTracks.length,
        preferenceType: activePrefs.preferenceType,
        sampleFilteredAlbums: filteredAlbums.slice(0, 3).map(album => ({
          name: album.name,
          artists: album.artists,
          releaseDate: album.release_date
        }))
      })
      
      // Set featured albums from filtered results
      const diverseFeatured = filteredAlbums
        .sort(() => Math.random() - 0.5)
        .slice(0, 9)
      setFeaturedAlbums(diverseFeatured)
      
      // Set gospel artists from filtered results (respecting user preferences)
      const gospelArtistsList = filteredArtists.filter(artist => {
        // Check if artist has gospel-related genres in their genres array
        const artistName = artist.name?.toLowerCase() || ''
        const artistGenres = (artist.genres || []).map(genre => genre.toLowerCase())
        
        const gospelTerms = [
          'african gospel', 'gospel', 'christian', 'worship', 'praise', 'hymn', 'spiritual', 
          'church', 'holy', 'blessed', 'prayer', 'faith', 'jesus', 'christ',
          'god', 'lord', 'hallelujah', 'amen', 'salvation', 'ministry',
          'pastor', 'bishop', 'elder', 'minister', 'choir', 'cathedral',
          'contemporary christian', 'traditional gospel', 'christian rock', 'christian pop'
        ]
        
        // Check if any of the artist's genres contains gospel terms
        const hasGospelGenre = artistGenres.some(genre => 
          gospelTerms.some(term => genre.includes(term))
        )
        
        // Also check artist name as fallback
        const hasGospelName = gospelTerms.some(term => artistName.includes(term))
        
        const isGospelArtist = hasGospelGenre || hasGospelName
        
        // Debug logging
        if (isGospelArtist) {
          console.log('[GOSPEL FILTER] Found gospel artist:', {
            name: artist.name,
            genres: artist.genres,
            matchedByGenre: hasGospelGenre,
            matchedByName: hasGospelName
          })
        }
        
        return isGospelArtist
      })
      
      console.log('[HOMEPAGE] Gospel Artists filtering:', {
        totalFilteredArtists: filteredArtists.length,
        gospelArtists: gospelArtistsList.length,
        preferenceType: activePrefs.preferenceType,
        endpointsUsed: [
          'Generic artist endpoints (popularity, followers, etc.)',
          'Gospel-specific endpoints (genre=gospel, genre=christian, search=gospel, etc.)'
        ],
        sampleGospelArtists: gospelArtistsList.slice(0, 3).map(artist => ({
          name: artist.name,
          genres: artist.genres
        }))
      })
      
      let gospelArtistsPick = gospelArtistsList
        .sort(() => Math.random() - 0.5)
        .slice(0, isMobile ? 6 : 12)
      
      // Fallback: if no gospel artists found, look for artists with spiritual themes
      if (gospelArtistsPick.length === 0) {
        console.log('[HOMEPAGE] No gospel artists found by name/genre, trying broader search')
        
        // Look for artists with religious/spiritual themes in their name
        const spiritualArtists = filteredArtists.filter(artist => {
          const content = artist.name.toLowerCase()
          return content.includes('praise') || 
                 content.includes('worship') || 
                 content.includes('church') ||
                 content.includes('christian') ||
                 content.includes('gospel') ||
                 content.includes('holy') ||
                 content.includes('blessed')
        })
        
        gospelArtistsPick = spiritualArtists
          .sort(() => Math.random() - 0.5)
          .slice(0, isMobile ? 6 : 12)
      }
      
      // Final fallback: if still no gospel artists, show random artists from filtered results
      if (gospelArtistsPick.length === 0) {
        console.log('[HOMEPAGE] No gospel artists found, using random artists as fallback')
        gospelArtistsPick = filteredArtists
          .sort(() => Math.random() - 0.5)
          .slice(0, isMobile ? 6 : 12)
      }
      
      setGospelArtists(gospelArtistsPick)
      
      console.log('[HOMEPAGE] Gospel Artists final selection:', {
        gospelArtistsFound: gospelArtistsList.length,
        gospelArtistsPicked: gospelArtistsPick.length,
        preferenceType: activePrefs.preferenceType,
        isMobile: isMobile,
        limit: isMobile ? 6 : 12
      })
      
      // Set artists from filtered results (excluding gospel/christian genres for Discover section)
      const excludedGenres = ['African Gospel', 'Gospel', 'Christian', 'Worship', 'Praise']
      
      // Filter out artists with excluded genres for the Discover artists section
      const nonGospelArtists = filteredArtists.filter(artist => {
        const artistGenres = (artist.genres || []).map(genre => genre.toLowerCase())
        const hasExcludedGenre = excludedGenres.some(excludedGenre => 
          artistGenres.some(genre => genre.includes(excludedGenre.toLowerCase()))
        )
        
        // Also check artist name for gospel/christian terms
        const artistName = artist.name?.toLowerCase() || ''
        const hasGospelName = excludedGenres.some(term => artistName.includes(term.toLowerCase()))
        
        const shouldExclude = hasExcludedGenre || hasGospelName
        
        if (shouldExclude) {
          console.log('[DISCOVER FILTER] Excluding artist from Discover section:', {
            name: artist.name,
            genres: artist.genres,
            reason: hasExcludedGenre ? 'genre match' : 'name match'
          })
        }
        
        return !shouldExclude
      })
      
      console.log('[DISCOVER FILTER] Artists filtering for Discover section:', {
        totalFiltered: filteredArtists.length,
        afterGospelExclusion: nonGospelArtists.length,
        excludedCount: filteredArtists.length - nonGospelArtists.length
      })
      
      let artistsToShow = []
      
      // if (user && followedArtistIds.length > 0) {
      //   // Prioritize followed artists from filtered results
      //   const followedArtistsData = nonGospelArtists.filter(artist => followedArtistIds.includes(artist.id))
      //   const otherArtists = nonGospelArtists.filter(artist => !followedArtistIds.includes(artist.id))
        
      //   artistsToShow = [
      //     ...followedArtistsData.slice(0, isMobile ? 2 : 4),
      //     ...otherArtists.sort(() => Math.random() - 0.5).slice(0, isMobile ? 4 : 8)
      //   ]
      // } else {
        // Random selection from non-gospel filtered artists
        artistsToShow = nonGospelArtists
          .sort(() => Math.random() - 0.5)
          .slice(0, isMobile ? 6 : 12)
      // }
      
      console.log('[HOMEPAGE] Final artist counts:', {
        totalArtistsToShow: artistsToShow.length,
        gospelArtistsPicked: gospelArtistsPick.length,
        // hasFollowedArtists: user && followedArtistIds.length > 0,
        isMobile: isMobile,
        discoverLimit: isMobile ? 6 : 12
      })
      
      setTopArtists(artistsToShow)
      
      // Load recently played tracks from user's history
      let userRecentlyPlayedTracks: Track[] = []
      
      if (user) {
        try {
          const { firebaseService } = await import('@/lib/firebase-service')
          const historyTrackIds = await firebaseService.getUserHistory(user.uid, 20)
          
          // Deduplicate track IDs while preserving order (most recent first)
          const uniqueTrackIds = Array.from(new Set(historyTrackIds))
          
          // Fetch track details for each unique ID (limit to 6)
          const recentTracksWithImages = await Promise.all(
            uniqueTrackIds.slice(0, 6).map(async (trackId: string) => {
              try {
                const track = await musicAPI.getTrack(trackId)
                const album = await musicAPI.getAlbum(track.album_id)
                return {
                  ...track,
                  album_images: album.images || []
                }
              } catch (error) {
                console.warn('Failed to load track from history:', trackId)
                return null
              }
            })
          )
          
          userRecentlyPlayedTracks = recentTracksWithImages.filter(track => track !== null) as Track[]
        } catch (error) {
          console.warn('Failed to load user history:', error)
        }
      }
      
      // If no history or not logged in, use filtered tracks as fallback
      if (userRecentlyPlayedTracks.length === 0) {
        const tracksWithImages = await Promise.all(
          filteredTracks.slice(0, 6).map(async (track: Track) => {
            try {
              const album = await musicAPI.getAlbum(track.album_id)
              return {
                ...track,
                album_images: album.images || []
              }
            } catch (error) {
              return track
            }
          })
        )
        userRecentlyPlayedTracks = tracksWithImages
      }
      
      setRecentlyPlayed(userRecentlyPlayedTracks)

      // Load recently played tracks from user's history
      let recentlyPlayedTracks: Track[] = []
      if (user) {
        try {
          // Get user's recent history (more track IDs to account for duplicates)
          const { firebaseService } = await import('@/lib/firebase-service')
          const historyTrackIds = await firebaseService.getUserHistory(user.uid, 20)
          
          // Deduplicate track IDs while preserving order (most recent first)
          const uniqueTrackIds = Array.from(new Set(historyTrackIds))
          
          // Fetch track details for each unique ID (limit to 6)
          const recentTracksWithImages = await Promise.all(
            uniqueTrackIds.slice(0, 6).map(async (trackId: string) => {
              try {
                const track = await musicAPI.getTrack(trackId)
                const album = await musicAPI.getAlbum(track.album_id)
                return {
                  ...track,
                  album_images: album.images || []
                }
              } catch (error) {
                console.warn('Failed to load track from history:', trackId)
                return null
              }
            })
          )
          
          recentlyPlayedTracks = recentTracksWithImages.filter(track => track !== null) as Track[]
        } catch (error) {
          console.warn('Failed to load user history:', error)
        }
      }
      

      
      // Set trending tracks from artists in "Discover artists" section
      // Fetch tracks from the artists shown in Discover section for a more personalized mix
      let tracksForPopular: Track[] = []
      
      if (artistsToShow.length > 0) {
        console.log('[HOMEPAGE] Fetching tracks from Discover artists for Your Diverse Mix')
        
        // Fetch tracks from each artist (limit to first 6 artists to avoid too many requests)
        const artistTracksPromises = artistsToShow.slice(0, 6).map(async (artist) => {
          try {
            const tracks = await musicAPI.getArtistTracks(artist.id)
            // Get top 3 tracks from each artist
            return tracks.slice(0, 3)
          } catch (error) {
            console.warn(`Failed to fetch tracks for artist ${artist.name}:`, error)
            return []
          }
        })
        
        const artistTracksResults = await Promise.all(artistTracksPromises)
        const allArtistTracks = artistTracksResults.flat()
        
        // Shuffle and take 10 tracks
        const shuffledTracks = allArtistTracks.sort(() => Math.random() - 0.5).slice(0, 10)
        
        // Add album images to tracks
        tracksForPopular = await Promise.all(
          shuffledTracks.map(async (track: Track) => {
            try {
              const album = await musicAPI.getAlbum(track.album_id)
              return {
                ...track,
                album_images: album.images || []
              }
            } catch (error) {
              return track
            }
          })
        )
        
        console.log('[HOMEPAGE] Your Diverse Mix tracks loaded from Discover artists:', {
          artistsUsed: Math.min(6, artistsToShow.length),
          totalTracks: allArtistTracks.length,
          finalTracks: tracksForPopular.length
        })
      } else {
        // Fallback to filtered tracks if no artists available
        tracksForPopular = await Promise.all(
          filteredTracks.slice(0, 10).map(async (track: Track) => {
            try {
              const album = await musicAPI.getAlbum(track.album_id)
              return {
                ...track,
                album_images: album.images || []
              }
            } catch (error) {
              return track
            }
          })
        )
      }
      
      setPopularTracks(tracksForPopular)
      setHeavyRotation(tracksForPopular.slice(6, 10))
      
      // Create Jump Back In mix (albums + artists) from filtered results
      const jumpBackInMix = [
        ...diverseFeatured.slice(0, 3),
        ...artistsToShow.slice(0, 3)
      ].sort(() => Math.random() - 0.5)
      setJumpBackIn(jumpBackInMix)

      // Set New Music Daily from filtered albums
      const dailyMusic = getDailyMusicAlgorithm(getDayName(), filteredAlbums)
      setNewMusicDaily(dailyMusic)

      scheduleRetryIfNeeded({
        artists: artistsToShow.length > 0,
        featured: diverseFeatured.length > 0,
        releases: gospelArtistsPick.length > 0,
        tracks: tracksForPopular.length > 0,
      })
    } catch (error) {
      console.error("Error loading featured content:", error)
      scheduleRetryIfNeeded({ artists: false, featured: false, releases: false, tracks: false })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleDownloadTrack = (track: Track) => {
    // Use the actual download API endpoint
    const downloadUrl = `/api/proxy/download/${track.id}`
    
    // Create a temporary link element to trigger download
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${track.name} - ${track.artists?.join(', ') || 'Unknown Artist'}.mp3`
    link.target = '_blank'
    
    // Append to body, click, and remove
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('Download started for track:', track.name)
  }

  const handleShareTrack = (track: Track) => {
    // Copy album deep-link that autoplays the specific track
    const url = `${window.location.origin}/album/${track.album_id}?track=${track.id}`
    navigator.clipboard.writeText(url).then(() => {
      console.log('Album deep-link copied to clipboard:', url)
    }).catch(() => {
      console.log('Failed to copy album link')
    })
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] text-white overflow-hidden relative">
      {/* Content Preference Overlay */}
      {showPreferenceOverlay && (
        <ContentPreferenceOverlay
          onPreferencesSet={(preferences) => {
            updateContentPreferences({
              ...preferences,
              hasSetPreferences: true
            })
          }}
          onSkip={() => {
            updateContentPreferences({
              preferredContinents: [],
              preferenceType: 'international',
              hasSetPreferences: true
            })
          }}
          existingPreferences={contentPreferences}
        />
      )}
      
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 animate-gradient-xy -z-10">
        {/* Animated gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-800/30 via-indigo-800/30 to-blue-800/30 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-800/20 via-gray-800/20 to-zinc-800/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-violet-800/25 via-purple-800/25 to-indigo-800/25 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating geometric elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-purple-600/15 to-indigo-600/15 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-r from-blue-600/15 to-cyan-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-violet-600/15 to-purple-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-gradient-to-r from-indigo-600/15 to-blue-600/15 rounded-full blur-xl animate-float" style={{ animationDelay: '1s' }}></div>
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      <Sidebar />
      <main className="flex-1 overflow-auto relative z-0">
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          {/* Greeting Header */}
          <div className="mb-4 sm:mb-4 mt-2 pl-16 lg:pl-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-2 truncate">{greeting}</h1>
          </div>
          
          <div className="mb-6 sm:mb-8 mt-8 lg:pl-0">
            {(topArtists.length === 0 && featuredAlbums.length === 0 && gospelArtists.length === 0 && popularTracks.length === 0) ? (
              <div className="mt-2">
                <div className="flex gap-2 items-center">
                  <Skeleton className="h-4 w-48 sm:w-64" />
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm sm:text-base text-zinc-400 mb-1">
                  {user ? 'Welcome back! Here\'s what\'s trending for you' : 'Discover new music and enjoy your favorites'}
                </p>
                <p className="text-xs sm:text-sm text-zinc-500">
                  {(() => {
                    const hour = new Date().getHours()
                    if (hour < 6) return "Perfect time for some chill music"
                    if (hour < 12) return "Start your day with great music"
                    if (hour < 17) return "Keep the energy going"
                    if (hour < 22) return "Wind down with your favorites"
                    return "Late night vibes"
                  })()}
                </p>

              </div>
            )}
          </div>

          {/* Recently Played Quick Access */}
          <section className="mb-6 sm:mb-8">
            {recentlyPlayed.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center bg-white/5 rounded-lg overflow-hidden">
                    <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-none" />
                    <div className="flex-1 px-3 sm:px-4 py-2 sm:py-3 min-w-0">
                      <Skeleton className="h-3 sm:h-4 w-2/3 mb-1 sm:mb-2" />
                      <Skeleton className="h-2.5 sm:h-3 w-1/3" />
                    </div>
                    <div className="pr-3 sm:pr-4 hidden sm:block">
                      <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {recentlyPlayed.slice(0, 6).map((track) => (
                  <div
                    key={track.id}
                    className="group flex items-center bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden cursor-pointer transition-all duration-300"
                    onClick={() => player.play(track, { queue: recentlyPlayed, autoplay: true })}
                  >
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 flex-shrink-0">
                      {track.album_images && track.album_images.length > 0 ? (
                        <Image
                          src={track.album_images[0].url}
                          alt={track.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 text-lg sm:text-xl">
                          🎵
                        </div>
                      )}
                    </div>
                    <div className="flex-1 px-3 sm:px-4 py-2 sm:py-3 min-w-0">
                      <p className="font-medium truncate text-sm sm:text-base">{track.name}</p>
                      <TruncatedArtists 
                        artists={track.artists}
                        artistIds={(track as any).artist_ids}
                        maxLength={20}
                        className="text-xs sm:text-sm text-zinc-400 truncate"
                        showLinks={true}
                        onClick={(e) => { e.stopPropagation() }}
                      />
                    </div>
                    <div className="pr-3 sm:pr-4 transition-opacity">
                      <Button size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 hover:scale-105 text-black shadow-lg transition-transform">
                        <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Jump Back In - Mixed Content */}
          <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Jump back in</h2>
            </div>
            {jumpBackIn.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-3 sm:p-4 rounded-lg">
                    <div className="mb-3 sm:mb-4">
                      <Skeleton className="aspect-square rounded-lg" />
                    </div>
                    <Skeleton className="h-3 sm:h-4 w-4/5 mb-1 sm:mb-2" />
                    <Skeleton className="h-2.5 sm:h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {jumpBackIn.map((item) => {
                  const isArtist = 'followers_total' in item
                  return (
                    <Link
                      key={item.id}
                      href={isArtist ? `/artist/${item.id}` : `/album/${item.id}`}
                      className="group p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className={`relative aspect-square mb-3 sm:mb-4 ${isArtist ? 'rounded-full' : 'rounded-lg'} overflow-hidden bg-zinc-800 shadow-lg`}>
                        {item.images && item.images.length > 0 ? (
                          <Image
                            src={item.images[0].url}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                            {isArtist ? '👤' : '🎵'}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg">
                            <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-semibold truncate mb-1 text-sm sm:text-base">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-zinc-400 truncate">
                        {isArtist ? 'Artist' : formatDate((item as Album).release_date, 'year')}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Gospel Music - Respecting User Preferences */}
          <section className="mb-6 sm:mb-8 ">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Gospel Artists</h2>
              <Link href="/gospel-music">
                <Button variant="ghost" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white">
                  Show all
                </Button>
              </Link>
            </div>
            {gospelArtists.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 ">
                {/* Display Skeleton */}
                {Array.from({ length: isMobile ? 6 : 12 }).map((_, idx) => (
                  <div key={idx} className="p-3 sm:p-4 rounded-lg">
                    <Skeleton className="aspect-square rounded-full mb-3 sm:mb-4" />
                    <Skeleton className="h-3 sm:h-4 w-4/5 mb-1 sm:mb-2 mx-auto" />
                    <Skeleton className="h-2.5 sm:h-3 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 ">
                {gospelArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.id}`}
                    className="group p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="relative aspect-square mb-3 sm:mb-4 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                      {artist.images && artist.images.length > 0 ? (
                        <Image
                          src={artist.images[0].url}
                          alt={artist.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                          �
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="font-medium text-sm sm:text-base mb-1 group-hover:text-white transition-colors line-clamp-2">
                        {artist.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-zinc-400">Artist</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Popular Artists - Circular Grid */}
          <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Discover artists</h2>
              <Link href="/artists">
                <Button variant="ghost" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white">
                  Show all
                </Button>
              </Link>
            </div>
            {topArtists.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: isMobile ? 6 : 12 }).map((_, idx) => (
                  <div key={idx} className="text-center p-3 sm:p-4">
                    <div className="mb-3 sm:mb-4">
                      <Skeleton className="aspect-square rounded-full mx-auto" />
                    </div>
                    <Skeleton className="h-3 sm:h-4 w-3/4 mx-auto mb-1 sm:mb-2" />
                    <Skeleton className="h-2.5 sm:h-3 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {topArtists.map((artist) => (
                  <Link
                    key={artist.id}
                    href={`/artist/${artist.id}`}
                    className="group text-center p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="relative aspect-square mb-3 sm:mb-4 rounded-full overflow-hidden bg-zinc-800 mx-auto">
                      {artist.images && artist.images.length > 0 ? (
                        <Image
                          src={artist.images[0].url}
                          alt={artist.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                          👤
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black">
                          <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1 text-sm sm:text-base">{artist.name}</h3>
                    <p className="text-xs sm:text-sm text-zinc-400">Artist</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Made for You */}
          <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                Made for {user?.displayName && user.displayName !== 'User' ? user.displayName : 'you'}
              </h2>
              <Link href="/albums">
                <Button variant="ghost" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white">
                  Show all
                </Button>
              </Link>
            </div>
            {featuredAlbums.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-3 sm:p-4 rounded-lg">
                    <div className="mb-3 sm:mb-4">
                      <Skeleton className="aspect-square rounded-lg" />
                    </div>
                    <Skeleton className="h-3 sm:h-4 w-4/5 mb-1 sm:mb-2" />
                    <Skeleton className="h-2.5 sm:h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {featuredAlbums.slice(0, 6).map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="relative aspect-square mb-3 sm:mb-4 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
                      {album.images && album.images.length > 0 ? (
                        <Image
                          src={album.images[0].url}
                          alt={album.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                          🎵
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg"
                          onClick={async (e) => {
                            e.preventDefault()
                            try {
                              const tracks = await musicAPI.getAlbumTracks(album.id)
                              if (tracks && tracks.length > 0) {
                                player.play(tracks[0], { queue: tracks, autoplay: true })
                              }
                            } catch (err) {
                              console.error('Failed to play album', err)
                            }
                          }}
                        >
                          <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1 text-sm sm:text-base">{album.name}</h3>
                    <p className="text-xs sm:text-sm text-zinc-400 truncate">
                      {formatDate(album.release_date, 'year')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Your Heavy Rotation - Compact Track List */}
          {/* <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Your heavy rotation</h2>
              <Button variant="ghost" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white">
                Show all
              </Button>
            </div>
            {heavyRotation.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-3 sm:h-4 w-2/3 mb-1 sm:mb-2" />
                      <Skeleton className="h-2.5 sm:h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-3 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {heavyRotation.map((track, index) => {
                  const isLiked = favoriteTrackIds.includes(track.id)
                  const isCurrent = player.current?.id === track.id

                  return (
                    <div
                      key={track.id}
                      className="group flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => player.play(track, { queue: heavyRotation, autoplay: true })}
                    >
                      <div className="relative w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                        {track.album_images && track.album_images.length > 0 ? (
                          <Image
                            src={track.album_images[0].url}
                            alt={track.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400">
                            🎵
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate text-sm sm:text-base ${isCurrent ? 'text-green-500' : 'text-white'}`}>
                          {track.name}
                        </div>
                        <TruncatedArtists 
                          artists={track.artists}
                          artistIds={(track as any).artist_ids}
                          maxLength={25}
                          className="text-xs sm:text-sm text-zinc-400 truncate"
                          showLinks={true}
                          onClick={(e) => { e.stopPropagation() }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 sm:h-8 sm:w-8 ${isLiked ? "text-green-500" : "text-zinc-400 hover:text-white"}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isLiked) {
                              removeFromFavorites(track.id)
                            } else {
                              addToFavorites(track.id)
                            }
                          }}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-zinc-400 w-10 sm:w-12 text-right">
                        {formatDuration(track.duration_ms)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section> */}

          {/* New Music Daily */}
          <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">New Music {getDayName()}</h2>
            </div>
            {newMusicDaily.length === 0 ? (
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {Array.from({ length: 15 }).map((_, idx) => (
                  <div key={idx} className="flex-shrink-0 w-40 sm:w-48 p-3 sm:p-4 rounded-lg">
                    <Skeleton className="aspect-square rounded-lg mb-3 sm:mb-4" />
                    <Skeleton className="h-3 sm:h-4 w-4/5 mb-1 sm:mb-2" />
                    <Skeleton className="h-2.5 sm:h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {newMusicDaily.map((album) => (
                  <Link
                    key={album.id}
                    href={`/album/${album.id}`}
                    className="group flex-shrink-0 w-40 sm:w-48 p-3 sm:p-4 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="relative aspect-square mb-3 sm:mb-4 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
                      {album.images && album.images.length > 0 ? (
                        <Image
                          src={album.images[0].url}
                          alt={album.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl sm:text-4xl">
                          🎵
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-green-500 hover:bg-green-400 text-black shadow-lg"
                          onClick={async (e) => {
                            e.preventDefault()
                            try {
                              const tracks = await musicAPI.getAlbumTracks(album.id)
                              if (tracks && tracks.length > 0) {
                                player.play(tracks[0], { queue: tracks, autoplay: true })
                              }
                            } catch (err) {
                              console.error('Failed to play album', err)
                            }
                          }}
                        >
                          <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold truncate mb-1 text-sm sm:text-base">{album.name}</h3>
                    <p className="text-xs sm:text-sm text-zinc-400 truncate">
                      {formatDate(album.release_date, 'year')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Trending Now */}
          <section className="mb-6 sm:mb-8">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                {user ? 'Your Diverse Mix' : 'Trending & Emerging'}
              </h2>
              <Link href="/trending">
                <Button variant="ghost" className="text-xs sm:text-sm font-medium text-zinc-400 hover:text-white">
                  Show all
                </Button>
              </Link>
            </div>
            {popularTracks.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg">
                    <div className="w-4 text-right">
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-3 sm:h-4 w-2/3 mb-1 sm:mb-2" />
                      <Skeleton className="h-2.5 sm:h-3 w-1/3" />
                    </div>
                    <div className="hidden sm:block w-20 sm:w-24">
                      <Skeleton className="h-8 w-full" />
                    </div>
                    <div className="w-10 sm:w-12 text-right">
                      <Skeleton className="h-3 w-8 sm:w-10 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {popularTracks.slice(0, 8).map((track, index) => {
                  const isLiked = favoriteTrackIds.includes(track.id)
                  const isCurrent = player.current?.id === track.id

                  return (
                    <div
                      key={track.id}
                      className="group flex items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => player.play(track, { queue: popularTracks, autoplay: true })}
                    >
                      <div className="w-4 text-right text-zinc-400 text-sm font-medium">
                        {!isCurrent && (
                          <span className="group-hover:hidden">{index + 1}</span>
                        )}
                        {isCurrent ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 text-green-500 hover:text-green-400"
                            onClick={(e) => { e.stopPropagation(); player.isPlaying ? player.pause() : player.resume() }}
                            aria-label={player.isPlaying ? 'Pause' : 'Play'}
                          >
                            {player.isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hidden group-hover:inline-flex text-white"
                            onClick={(e) => { e.stopPropagation(); player.play(track, { queue: popularTracks, autoplay: true }) }}
                            aria-label="Play"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                        {track.album_images && track.album_images.length > 0 ? (
                          <Image
                            src={track.album_images[0].url}
                            alt={track.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm sm:text-base">
                            🎵
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate text-sm sm:text-base ${isCurrent ? 'text-green-500' : 'text-white'}`}>
                          {track.name}
                        </div>
                        <TruncatedArtists 
                          artists={track.artists}
                          artistIds={(track as any).artist_ids}
                          maxLength={20}
                          className="text-xs sm:text-sm text-zinc-400 truncate"
                          showLinks={true}
                          onClick={(e) => { e.stopPropagation() }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 sm:h-8 sm:w-8 ${isLiked ? "text-green-500" : "text-zinc-400 hover:text-white"}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isLiked) {
                              removeFromFavorites(track.id)
                            } else {
                              addToFavorites(track.id)
                            }
                          }}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-40 sm:w-48 bg-zinc-800 border-zinc-700 text-white">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShareTrack(track)
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                              Share Track
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadTrack(track)
                              }}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-zinc-400 w-10 sm:w-12 text-right">
                        {formatDuration(track.duration_ms)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      {/* Global MusicPlayer is rendered in app/layout.tsx */}
    </div>
  )
}
