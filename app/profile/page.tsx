"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User, Mail, Music, History, Clock, Play, Heart, Settings, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { ContentPreferenceOverlay } from "@/components/content-preference-overlay"
import { useAuth } from "@/contexts/auth-context"
import { usePlayer } from "@/contexts/player-context"
import { musicAPI, Track } from "@/lib/music-api"
import { useToast } from "@/components/ui/use-toast"
import { firebaseService } from "@/lib/firebase-service"
import { collection, getDocs, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { TruncatedArtists } from "@/components/ui/truncated-artists"
import { DonationButton } from "@/components/donation-button"

export default function ProfilePage() {
  const { 
    user, 
    isLoading, 
    historyTrackIds, 
    favoriteTrackIds, 
    refreshHistory, 
    deleteAccount,
    contentPreferences,
    updateContentPreferences
  } = useAuth()
  const player = usePlayer()
  const router = useRouter()
  const { toast } = useToast()
  const [historyTracks, setHistoryTracks] = useState<Array<{
    id: string
    name: string
    artist: string
    album: string
    image?: string
    duration?: string
    track?: Track
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isClearingHistory, setIsClearingHistory] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [showPreferencesOverlay, setShowPreferencesOverlay] = useState(false)
  
  // Check if user signed in with Google (Google users have photoURL from their Google account)
  const isGoogleUser = user?.photoURL?.includes('googleusercontent.com') || false

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in")
    }
  }, [user, isLoading, router])

  // Fetch track details for history
  useEffect(() => {
    const fetchHistoryTracks = async () => {
      if (!historyTrackIds.length) {
        setHistoryTracks([])
        return
      }

      setIsLoadingHistory(true)
      try {
        // Remove duplicate track IDs while preserving order (keep first occurrence)
        const uniqueTrackIds = historyTrackIds.filter((trackId, index, self) => 
          self.indexOf(trackId) === index
        ).slice(0, 20)
        
        const trackDetails = await Promise.all(
          uniqueTrackIds.map(async (trackId) => {
            try {
              const track = await musicAPI.getTrack(trackId)
              // Get album details for album name and better image
              let albumName = 'Unknown Album'
              let albumImage = track.album_images?.[0]?.url
              let album = null
              
              try {
                album = await musicAPI.getAlbum(track.album_id)
                albumName = album.name
                // Use album images if track doesn't have them or for better quality
                if (!albumImage && album.images?.length > 0) {
                  // Get medium-sized image (around 300px)
                  const bestImage = album.images.find(img => img.width >= 200 && img.width <= 400) || album.images[0]
                  albumImage = bestImage.url
                }
              } catch (error) {
                console.warn(`Could not fetch album for track ${trackId}`)
              }
              
              // Ensure the track object has album_images for the music player
              const trackWithImages = {
                ...track,
                album_images: album?.images || track.album_images || []
              }
              
              return {
                id: trackId,
                name: track.name,
                artist: track.artists?.[0] || 'Unknown Artist',
                album: albumName,
                image: albumImage,
                duration: track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}` : '0:00',
                track: trackWithImages
              }
            } catch (error) {
              console.warn(`Could not fetch track ${trackId}:`, error)
              return {
                id: trackId,
                name: 'Unknown Track',
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                duration: '0:00'
              }
            }
          })
        )
        setHistoryTracks(trackDetails)
      } catch (error) {
        console.error('Error fetching history tracks:', error)
        setHistoryTracks([])
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistoryTracks()
  }, [historyTrackIds])

  // Clear all listening history
  const handleClearHistory = async () => {
    if (!user) return

    setIsClearingHistory(true)
    try {
      // Delete all history documents for the user
      const historyRef = collection(db, 'users', user.uid, 'history')
      const querySnapshot = await getDocs(historyRef)
      const batch = writeBatch(db)
      
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      
      // Refresh the history in auth context
      await refreshHistory()
      
      // Clear local state
      setHistoryTracks([])
      
      toast({
        title: "History cleared",
        description: "Your listening history has been successfully deleted.",
      })
    } catch (error) {
      console.error('Error clearing history:', error)
      toast({
        title: "Error",
        description: "Failed to clear listening history. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClearingHistory(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone and will permanently delete:\n\n" +
      "• Your profile and preferences\n" +
      "• All playlists\n" +
      "• Listening history\n" +
      "• Favorite tracks\n" +
      "• Followed artists\n" +
      "• All personalization data\n\n" +
      "Type 'DELETE' to confirm:"
    )
    
    if (!confirmed) return
    
    const confirmation = window.prompt("Type 'DELETE' to confirm account deletion:")
    if (confirmation !== 'DELETE') {
      toast({
        title: "Account Deletion Cancelled",
        description: "Account deletion was cancelled.",
      })
      return
    }
    
    setIsDeletingAccount(true)
    try {
      await deleteAccount()
      
      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      })
      
      // Redirect to home page
      router.push("/")
    } catch (error: any) {
      console.error('Error deleting account:', error)
      
      let errorMessage = "Failed to delete account. Please try again."
      
      // Handle specific Firebase Auth errors
      if (error?.code === 'auth/requires-recent-login') {
        errorMessage = "For security reasons, please sign out and sign back in, then try deleting your account again."
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const handleOpenPreferences = () => {
    setShowPreferencesOverlay(true)
  }

  const handlePreferencesSet = async (preferences: {
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
  }) => {
    try {
      await updateContentPreferences({
        ...preferences,
        hasSetPreferences: true
      })
      setShowPreferencesOverlay(false)
      toast({
        title: "Preferences Updated",
        description: "Your music preferences have been updated successfully.",
      })
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePreferencesSkip = () => {
    setShowPreferencesOverlay(false)
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center bg-black text-white">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      {/* Content Preferences Overlay */}
      {showPreferencesOverlay && (
        <ContentPreferenceOverlay
          onPreferencesSet={handlePreferencesSet}
          onSkip={handlePreferencesSkip}
          existingPreferences={contentPreferences}
        />
      )}
      
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="bg-gradient-to-b from-purple-900 to-black">
          <div className="p-6 md:p-8 relative">

            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 pt-16 md:pt-0">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  width={192}
                  height={192}
                  className="rounded-full"
                />
              ) : (
                <div className="h-48 w-48 rounded-full bg-zinc-800 flex items-center justify-center">
                  <User className="h-24 w-24 text-zinc-500" />
                </div>
              )}
              <div>
                <p className="text-xs uppercase font-medium">Profile</p>
                <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-4">{user.displayName}</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <History className="h-4 w-4" />
                    <span>{historyTracks.length} unique tracks played</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex mt-10 left-6 rounded-full h-10 w-10 bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white border border-white/20 z-10"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="mt-8 space-y-6">
              {/* Content Preferences Section */}
              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-500" />
                  Music Preferences
                </h2>
                <div className="bg-zinc-900/50 rounded-xl p-6">
                  {contentPreferences?.hasSetPreferences && contentPreferences.preferredContinents ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Preference Type</h3>
                        <div className="flex items-center gap-2">
                          {contentPreferences.preferenceType === 'international' && (
                            <>
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>International Music</span>
                            </>
                          )}
                          {contentPreferences.preferenceType === 'local' && (
                            <>
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span>Local & African Music</span>
                            </>
                          )}
                          {contentPreferences.preferenceType === 'mixed' && (
                            <>
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>Mixed (International & Local)</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Preferred Regions</h3>
                        <div className="flex flex-wrap gap-2">
                          {contentPreferences.preferredContinents?.slice(0, 8).map((continent) => (
                            <span
                              key={continent}
                              className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300"
                            >
                              {continent}
                            </span>
                          ))}
                          {(contentPreferences.preferredContinents?.length || 0) > 8 && (
                            <span className="px-3 py-1 bg-zinc-700 rounded-full text-sm text-zinc-400">
                              +{(contentPreferences.preferredContinents?.length || 0) - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : contentPreferences?.hasSetPreferences ? (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Preferences Need Update</h3>
                      <p className="text-zinc-400 mb-4">
                        Your preferences need to be updated to the new continent-based system
                      </p>
                      <Button
                        onClick={handleOpenPreferences}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Update Preferences
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">No Preferences Set</h3>
                      <p className="text-zinc-400 mb-4">
                        Set your music preferences to get personalized recommendations
                      </p>
                      <Button
                        onClick={handleOpenPreferences}
                        className="bg-green-500 hover:bg-green-600 text-black"
                      >
                        Set Preferences
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-500" />
                  Recently Played
                </h2>
                {isLoadingHistory ? (
                  <div className="bg-zinc-900/50 rounded-xl p-8 text-center">
                    <p className="text-zinc-400">Loading your listening history...</p>
                  </div>
                ) : historyTracks.length > 0 ? (
                  <div className="bg-zinc-900/50 rounded-xl p-4 max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur-sm">
                        <tr className="text-zinc-400 text-left border-b border-zinc-800 text-sm">
                          <th className="pb-3 pl-4">#</th>
                          <th className="pb-3">Title</th>
                          <th className="pb-3 hidden md:table-cell">Album</th>
                          <th className="pb-3 text-right pr-4">
                            <Clock className="h-4 w-4 inline" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyTracks.map((track, index) => {
                          const isPlaying = player.current?.id === track.id
                          const canPlay = track.track
                          
                          return (
                            <tr 
                              key={`${track.id}-${index}`} 
                              className="group hover:bg-zinc-800/50 text-sm cursor-pointer"
                              onClick={() => {
                                if (canPlay) {
                                  const allTracks = historyTracks
                                    .filter(t => t.track)
                                    .map(t => t.track!)
                                  player.play(track.track!, { queue: allTracks, autoplay: true })
                                }
                              }}
                            >
                              <td className="py-3 pl-4">
                                <span className={`${isPlaying ? 'text-green-500' : 'text-zinc-400'}`}>
                                  {index + 1}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative w-10 h-10 bg-zinc-700 rounded flex items-center justify-center overflow-hidden group/image">
                                    {track.image ? (
                                      <Image
                                        src={track.image}
                                        alt={track.name}
                                        width={40}
                                        height={40}
                                        className="object-cover w-full h-full"
                                        unoptimized
                                      />
                                    ) : (
                                      <Music className="h-5 w-5 text-zinc-400" />
                                    )}
                                    {canPlay && (
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                          size="icon"
                                          variant="secondary"
                                          className="h-6 w-6 rounded-full"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            const allTracks = historyTracks
                                              .filter(t => t.track)
                                              .map(t => t.track!)
                                            player.play(track.track!, { queue: allTracks, autoplay: true })
                                          }}
                                        >
                                          <Play className="h-3 w-3 text-black" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className={`font-medium ${isPlaying ? 'text-green-500' : 'text-white'}`}>
                                      {track.name}
                                    </p>
                                    <TruncatedArtists 
                                      artists={[track.artist]}
                                      artistIds={track.track?.artist_ids}
                                      maxLength={20}
                                      className="text-zinc-400 text-xs"
                                      showLinks={true}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 hidden md:table-cell text-zinc-400">{track.album}</td>
                              <td className="py-3 text-right pr-4">
                                <div className="flex items-center justify-end gap-3">
                                  {canPlay && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const allTracks = historyTracks
                                          .filter(t => t.track)
                                          .map(t => t.track!)
                                        player.play(track.track!, { queue: allTracks, autoplay: true })
                                      }}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <span className="text-zinc-400">{track.duration}</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 rounded-xl p-8 text-center">
                    <History className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-xl font-medium mb-2">No listening history yet</h3>
                    <p className="text-zinc-400 mb-4">
                      Start listening to music to see your recently played tracks here
                    </p>
                    <Button onClick={() => router.push("/")}>Discover Music</Button>
                  </div>
                )}
              </section>

              <section className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Support MusicStream</h2>
                <div className="bg-zinc-900/50 rounded-xl p-6 space-y-4">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto">
                      <Heart className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">Help Keep MusicStream Free</h3>
                      <p className="text-zinc-400 text-sm mb-4">
                        Your support helps us maintain and improve the service for everyone. 
                        Consider making a donation to keep MusicStream ad-free and free for all users.
                      </p>
                    </div>
                    <DonationButton className="w-full" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
                <div className="bg-zinc-900/50 rounded-xl p-6 space-y-4">
                  {!isGoogleUser && (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          toast({
                            title: "Edit Profile",
                            description: "Profile editing feature coming soon!",
                          })
                        }}
                      >
                        Edit Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          toast({
                            title: "Change Password",
                            description: "Password change feature coming soon!",
                          })
                        }}
                      >
                        Change Password
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => {
                          toast({
                            title: "Notification Settings",
                            description: "Notification settings coming soon!",
                          })
                        }}
                      >
                        Notification Settings
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start text-blue-500 hover:text-blue-400 hover:bg-blue-950/20"
                    onClick={handleOpenPreferences}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Music Preferences
                  </Button>
                  {historyTrackIds.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-orange-500 hover:text-orange-400 hover:bg-orange-950/20"
                      onClick={handleClearHistory}
                      disabled={isClearingHistory}
                    >
                      {isClearingHistory ? "Clearing..." : "Clear Listening History"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-500 hover:text-red-400 hover:bg-red-950/20"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? "Deleting Account..." : "Delete Account"}
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
      <MusicPlayer />
    </div>
  )
}
