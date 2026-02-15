"use client"

import Link from "next/link"
import Image from "next/image"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Home, Search, Library, PlusCircle, Heart, Download, LogIn, LogOut, User, Menu, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/contexts/auth-context"
import { musicAPI } from "@/lib/music-api"
import { useIsMobile } from "@/hooks/use-mobile"

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
      return text;
  }
  return text.slice(0, maxLength) + '...';
}

export function Sidebar() {
  const { user, signOut, isLoading, followedArtistIds } = useAuth()
  const isMobile = useIsMobile()
  
  // Resizable width state (desktop only)
  const [width, setWidth] = useState<number>(240)
  const isResizingRef = useRef(false)
  const [minWidth, setMinWidth] = useState<number>(180)

  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Followed artists state
  const [followedArtists, setFollowedArtists] = useState<Array<{
    id: string;
    name: string;
    image?: string;
    popularity: number;
  }>>([])
  const [isLoadingArtists, setIsLoadingArtists] = useState(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const lastFocusReloadAt = useRef(0)
  const artistsDataRef = useRef<Array<{
    id: string;
    name: string;
    image?: string;
    popularity: number;
  }>>([])

  const getBounds = (vw: number) => {
    const min = 80
    const max = 234
    const def = vw < 640 ? 180 : 234
    return { min, max, def }
  }

  const clampWidth = (w: number, vw: number) => {
    const { min, max } = getBounds(vw)
    return Math.min(Math.max(w, min), max)
  }

  // Determine defaults and restore from localStorage (desktop only)
  useEffect(() => {
    if (isMobile) return
    
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('sidebarWidth') : null
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
    const { min, def } = getBounds(vw)
    setMinWidth(min)
    const initial = stored ? Number(stored) : def
    setWidth(clampWidth(initial, vw))

    const onResize = () => {
      const newVw = window.innerWidth
      const { min: m } = getBounds(newVw)
      setMinWidth(m)
      setWidth((w) => clampWidth(w, newVw))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isMobile])

  const clearRetry = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }

  const scheduleRetryIfNeeded = (hasData: boolean) => {
    if (!hasData && retryCount < 20) {
      clearRetry()
      const delay = Math.min(15000, 2000 * Math.pow(1.4, retryCount))
      retryTimer.current = setTimeout(() => {
        setRetryCount((c) => c + 1)
        void fetchFollowedArtists()
      }, delay)
    } else if (hasData) {
      setRetryCount(0)
      clearRetry()
    }
  }

  // Fetch followed artists from music API
  const fetchFollowedArtists = async () => {
    if (!user || followedArtistIds.length === 0) {
      setFollowedArtists([])
      artistsDataRef.current = []
      return
    }

    try {
      setIsLoadingArtists(true)
      
      const artistsWithDetails = await Promise.all(
        followedArtistIds.map(async (artistId: string) => {
          try {
            const artist = await musicAPI.getArtist(artistId)
            
                         // Get a consistent image size for sidebar display
             const bestImage = artist.images?.reduce((best, current) => {
               // Prefer images closest to our target size (48px for desktop, 40px for mobile)
               const targetSize = 48 // We'll scale this down with CSS
               const currentDiff = Math.abs(current.width - targetSize)
               const bestDiff = best ? Math.abs(best.width - targetSize) : Infinity
               return currentDiff < bestDiff ? current : best
             }) || artist.images?.[0]
            
            return {
              id: artistId,
              name: artist.name,
              image: bestImage?.url,
              popularity: artist.popularity
            }
          } catch (error) {
            console.warn(`Could not fetch artist ${artistId}`)
            return {
              id: artistId,
              name: 'Unknown Artist',
              image: undefined,
              popularity: 0
            }
          }
        })
      )
      
             // Filter out "Unknown Artist" entries - only show artists we successfully fetched
       const validArtists = artistsWithDetails.filter((artist: any) => artist.name !== 'Unknown Artist')
       setFollowedArtists(validArtists)
       artistsDataRef.current = validArtists
       
       const hasData = validArtists.length > 0
       scheduleRetryIfNeeded(hasData)
      
    } catch (error) {
      console.error('Error fetching followed artists:', error)
      // NEVER clear existing data when there's an API error
      // This prevents the sidebar from going blank when the API is down
      console.log('API error - preserving existing data, not clearing sidebar')
      scheduleRetryIfNeeded(false)
    } finally {
      setIsLoadingArtists(false)
    }
  }

  // Fetch followed artists when user or followedArtistIds change
  useEffect(() => {
    if (!user || followedArtistIds.length === 0) {
      setFollowedArtists([])
      artistsDataRef.current = []
      return
    }

    fetchFollowedArtists()

    const onFocusOrVisible = () => {
      if (!user) return
      const now = Date.now()
      // Only refresh if we have no data and it's been a reasonable time
      const hasData = artistsDataRef.current.length > 0
      if (!hasData && now - lastFocusReloadAt.current > 5000) {
        lastFocusReloadAt.current = now
        void fetchFollowedArtists()
      }
    }

    window.addEventListener('focus', onFocusOrVisible)
    document.addEventListener('visibilitychange', onFocusOrVisible)

    return () => {
      clearRetry()
      window.removeEventListener('focus', onFocusOrVisible)
      document.removeEventListener('visibilitychange', onFocusOrVisible)
    }
  }, [user, followedArtistIds])

  const onMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return
    e.preventDefault()
    isResizingRef.current = true

    const startX = e.clientX
    const startWidth = width
    const vw = window.innerWidth

    const onMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return
      const delta = ev.clientX - startX
      const next = clampWidth(startWidth + delta, vw)
      setWidth(next)
    }

    const onUp = () => {
      isResizingRef.current = false
      try { window.localStorage.setItem('sidebarWidth', String(width)) } catch {}
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Collapse behavior when width is at or near the min width (desktop only)
  const collapsed = !isMobile && width <= (minWidth + 34)
  const iconSize = collapsed ? "h-12 w-12" : "h-5 w-5"
  const gapClass = collapsed ? "gap-2" : "gap-3"

  const MScollapsed = !isMobile && width <= (minWidth + 79)
  const text = MScollapsed ? 'MS' : 'Music Stream'

  // Mobile menu trigger
  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed top-4 left-4 z-50 lg:hidden bg-zinc-900/80 backdrop-blur-sm border border-zinc-800"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 bg-zinc-900 border-r border-zinc-800">
          <div className="flex h-full flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="mb-8">
                <Link href="/" className="flex items-center gap-3 font-bold text-xl" onClick={() => setIsMobileOpen(false)}>
                  <span className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center">♪</span>
                  <span>Music Stream</span>
                </Link>
              </div>
              
              <nav className="space-y-6">
                <div className="space-y-3">
                  <Link 
                    href="/" 
                    className="flex items-center gap-3 text-zinc-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link 
                    href="/search" 
                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Search className="h-5 w-5" />
                    <span>Search</span>
                  </Link>
                  <Link 
                    href="/library" 
                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Library className="h-5 w-5" />
                    <span>Your Library</span>
                  </Link>
                </div>
                <div className="space-y-3">
                  <Link
                    href={user ? "/create-playlist" : "/sign-in"}
                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <PlusCircle className="h-5 w-5" />
                    <span>Create Playlist</span>
                  </Link>
                  <Link
                    href={user ? "/liked-songs" : "/sign-in"}
                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                    onClick={() => setIsMobileOpen(false)}
                  >
                    <Heart className="h-5 w-5" />
                    <span>Liked Songs</span>
                  </Link>
                </div>
              </nav>
            </div>
            
                         <div className="h-px bg-zinc-800 mb-4" />
             
             <ScrollArea className="flex-1 px-6 border-b border-zinc-800 pb-4">
               <div className="space-y-2 pb-6">
                                 {user ? (
                   (() => {
                     if (isLoadingArtists) {
                       return (
                         <div className="space-y-2">
                           {Array.from({ length: 6 }).map((_, idx) => (
                             <div key={idx} className="flex items-center gap-3 py-2">
                               <Skeleton className="h-10 w-10 rounded-full" />
                               <div className="min-w-0 flex-1">
                                 <Skeleton className="h-4 w-32 mb-2" />
                                 <Skeleton className="h-3 w-24" />
                               </div>
                             </div>
                           ))}
                         </div>
                       )
                     }
                     if (followedArtists.length === 0) {
                       return (
                         <div className="py-2 text-sm text-zinc-500">No followed artists yet</div>
                       )
                     }
                     return (
                       followedArtists.map((artist) => (
                         <Link
                           key={artist.id}
                           href={`/artist/${artist.id}`}
                           className="flex items-center gap-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                           onClick={() => setIsMobileOpen(false)}
                         >
                           {artist.image ? (
                             <Image
                               src={artist.image}
                               alt={artist.name}
                               width={40}
                               height={40}
                               className="rounded-full flex-shrink-0 object-cover w-10 h-10"
                             />
                           ) : (
                             <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                               <Users className="h-5 w-5" />
                             </div>
                           )}
                           <div className="min-w-0 flex-1">
                             <div className="whitespace-normal leading-tight truncate font-semibold text-white">{truncateText(artist.name, 13)}</div>
                             <div className="text-xs text-white truncate font-medium">Artist</div>
                           </div>
                         </Link>
                       ))
                     )
                   })()
                 ) : (
                   <div className="py-2 text-sm text-zinc-500">Sign in to view your followed artists</div>
                 )}
              </div>
            </ScrollArea>
            
            <div className="mt-auto p-6 space-y-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Link href="/profile" className="flex-shrink-0" onClick={() => setIsMobileOpen(false)}>
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          width={32}
                          height={32}
                          className="rounded-full hover:ring-2 hover:ring-zinc-600 transition-all cursor-pointer"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-600 transition-colors cursor-pointer">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </Link>
                    <div className="overflow-hidden">
                      <Link href="/profile" className="font-medium text-sm hover:underline truncate block">
                        {user.displayName}
                      </Link>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-3 text-zinc-400 hover:text-white border-zinc-700"
                    onClick={signOut}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-3 text-zinc-400 hover:text-white border-zinc-700"
                    asChild
                  >
                    <Link href="/sign-in" onClick={() => setIsMobileOpen(false)}>
                      <LogIn className="h-5 w-5" />
                      <span>Sign In</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-3 text-zinc-400 hover:text-white border-zinc-700"
                    asChild
                  >
                    <Link href="/sign-up" onClick={() => setIsMobileOpen(false)}>
                      <User className="h-5 w-5" />
                      <span>Sign Up</span>
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-3 text-zinc-400 hover:text-white border-zinc-700"
              >
                <Download className="h-5 w-5" />
                <span>Install App</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar
  return (
    <div
      className="hidden lg:flex h-[calc(100vh-5rem)] flex-col bg-zinc-900 border-r border-zinc-800 overflow-hidden relative"
      style={{ width }}
    >
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-6 flex-shrink-0">
          <Link href="/" className={`flex items-center ${gapClass} font-bold text-xl mb-8 min-w-0`}>
            <span className={`${collapsed ? 'h-9 w-9' : 'h-8 w-8'} rounded-full bg-white text-black flex items-center justify-center flex-shrink-0`}>♪</span>
            <span className={`min-w-0 whitespace-normal leading-tight ${collapsed ? 'hidden' : 'block'}`}>{text}</span>
          </Link>
          <nav className="space-y-6">
            <div className="space-y-3">
              <Link href="/" className={`flex items-center ${gapClass} text-zinc-200 hover:text-white transition-colors`}>
                <Home className={iconSize} />
                <span className={`${collapsed ? 'hidden' : 'block'}`}>Home</span>
              </Link>
              <Link href="/search" className={`flex items-center ${gapClass} text-zinc-400 hover:text-white transition-colors`}>
                <Search className={iconSize} />
                <span className={`${collapsed ? 'hidden' : 'block'}`}>Search</span>
              </Link>
              <Link href="/library" className={`flex items-center ${gapClass} text-zinc-400 hover:text-white transition-colors`}>
                <Library className={iconSize} />
                <span className={`${collapsed ? 'hidden' : 'block'}`}>Your Library</span>
              </Link>
            </div>
            <div className="space-y-3">
              <Link
                href={user ? "/create-playlist" : "/sign-in"}
                className={`flex items-center ${gapClass} text-zinc-400 hover:text-white transition-colors`}
              >
                <PlusCircle className={iconSize} />
                <span className={`${collapsed ? 'hidden' : 'block'}`}>Create Playlist</span>
              </Link>
              <Link
                href={user ? "/liked-songs" : "/sign-in"}
                className={`flex items-center ${gapClass} text-zinc-400 hover:text-white transition-colors`}
              >
                <Heart className={iconSize} />
                <span className={`${collapsed ? 'hidden' : 'block'}`}>Liked Songs</span>
              </Link>
            </div>
          </nav>
        </div>
                 <div className="h-px bg-zinc-800 mb-4" />
         <ScrollArea className={`flex-1 border-b border-zinc-800 pb-4 ${collapsed ? 'px-2' : 'px-6'}`}>
           <div className="space-y-2 pb-6">
                         {user ? (
               (() => {
                 if (isLoadingArtists) {
                   return (
                     <div className={`${collapsed ? 'hidden' : 'block'}`}>
                       {Array.from({ length: 8 }).map((_, idx) => (
                         <div key={idx} className={`flex items-center ${gapClass} py-1.5`}>
                           <Skeleton className="h-8 w-8 rounded-full" />
                           <div className="min-w-0 flex-1">
                             <Skeleton className="h-3 w-24 mb-1" />
                             <Skeleton className="h-2.5 w-16" />
                           </div>
                         </div>
                       ))}
                     </div>
                   )
                 }
                 if (followedArtists.length === 0) {
                   return (
                     <div className={`py-2 text-sm text-zinc-500 ${collapsed ? 'hidden' : 'block'}`}>No followed artists yet</div>
                   )
                 }
                 return (
                   followedArtists.map((artist) => (
                                           <Link
                        key={artist.id}
                        href={`/artist/${artist.id}`}
                        className={`flex items-center ${collapsed ? 'justify-center' : ''} ${gapClass} py-1.5 text-sm text-zinc-400 hover:text-white transition-colors`}
                      >
                                               {artist.image ? (
                          <Image
                            src={artist.image}
                            alt={artist.name}
                            width={48}
                            height={48}
                            className="rounded-full flex-shrink-0 object-cover w-12 h-12"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <Users className="h-6 w-6" />
                          </div>
                        )}
                        <div className={`min-w-0 flex-1 ${collapsed ? 'hidden' : 'block'}`}>
                          <div className="whitespace-normal leading-tight truncate font-semibold text-white">{truncateText(artist.name, 13)}</div>
                          <div className="text-xs  text-zinc-500 truncate font-medium">Artist</div>
                        </div>
                     </Link>
                   ))
                 )
               })()
             ) : (
               <div className={`py-2 text-sm text-zinc-500 ${collapsed ? 'hidden' : 'block'}`}>Sign in to view your followed artists</div>
             )}
          </div>
        </ScrollArea>
        <div className="mt-auto p-6 space-y-3">
          {user ? (
            <>
              <div className={`flex items-center ${gapClass} mb-3`}>
                <Link href="/profile" className="flex-shrink-0">
                  {user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full hover:ring-2 hover:ring-zinc-600 transition-all cursor-pointer"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors cursor-pointer">
                      <User className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                    </div>
                  )}
                </Link>
                <div className={`overflow-hidden ${collapsed ? 'hidden' : 'block'}`}>
                  <Link href="/profile" className="font-medium text-sm hover:underline truncate block">
                    {user.displayName}
                  </Link>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={`w-full ${gapClass} text-zinc-400 hover:text-white border-zinc-700`}
                onClick={signOut}
              >
                <LogOut className={collapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                <span className={`${MScollapsed ? 'hidden' : 'inline'}`}>Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className={`w-full ${gapClass} text-zinc-400 hover:text-white border-zinc-700`}
                asChild
              >
                <Link href="/sign-in">
                  <LogIn className={MScollapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                  <span className={`${MScollapsed ? 'hidden' : 'inline'}`}>Sign In</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`w-full ${gapClass} text-zinc-400 hover:text-white border-zinc-700`}
                asChild
              >
                <Link href="/sign-up">
                  <User className={MScollapsed ? 'h-5 w-5' : 'h-4 w-4'} />
                  <span className={`${MScollapsed ? 'hidden' : 'inline'}`}>Sign Up</span>
                </Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className={`w-full ${gapClass} text-zinc-400 hover:text-white border-zinc-700`}
          >
            <Download className={MScollapsed ? 'h-5 w-5' : 'h-4 w-4'} />
            <span className={`${MScollapsed ? 'hidden' : 'inline'}`}>Install App</span>
          </Button>
        </div>
        {/* Drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-zinc-700/40 active:bg-zinc-700/60"
          aria-label="Resize sidebar"
        />
      </div>
    </div>
  )
}
