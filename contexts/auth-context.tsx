"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  deleteUser,
  User as FirebaseUser
} from "firebase/auth"
import { auth, googleProvider } from "@/lib/firebase"
import { firebaseService } from "@/lib/firebase-service"
import { preloadProfileImage, clearCachedImage } from "@/lib/profile-image-cache"

// Define user type
export interface User {
  uid: string
  displayName: string
  email: string
  photoURL?: string
}

// Define auth context type
interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (name: string, email: string, password: string) => Promise<boolean>
  signInWithGoogle: () => Promise<boolean>
  signOut: () => void
  deleteAccount: () => Promise<boolean>
  addToFavorites: (trackId: string) => Promise<void>
  removeFromFavorites: (trackId: string) => Promise<void>
  favoriteTrackIds: string[]
  refreshFavorites: () => Promise<void>
  followArtist: (artistId: string) => Promise<void>
  unfollowArtist: (artistId: string) => Promise<void>
  followedArtistIds: string[]
  refreshFollowedArtists: () => Promise<void>
  likeAlbum: (albumId: string) => Promise<void>
  unlikeAlbum: (albumId: string) => Promise<void>
  likedAlbumIds: string[]
  refreshLikedAlbums: () => Promise<void>
  addToHistory: (trackId: string) => Promise<void>
  historyTrackIds: string[]
  refreshHistory: () => Promise<void>
  contentPreferences: {
    preferredContinents: string[]
    preferenceType: 'international' | 'local' | 'mixed'
    hasSetPreferences: boolean
  } | null
  updateContentPreferences: (preferences: {
    preferredContinents: string[]
    preferenceType: 'international' | 'local' | 'mixed'
    hasSetPreferences: boolean
  }) => Promise<void>
  showPreferenceOverlay: boolean
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => false,
  signUp: async () => false,
  signInWithGoogle: async () => false,
  signOut: () => {},
  deleteAccount: async () => false,
  addToFavorites: async () => {},
  removeFromFavorites: async () => {},
  favoriteTrackIds: [],
  refreshFavorites: async () => {},
  followArtist: async () => {},
  unfollowArtist: async () => {},
  followedArtistIds: [],
  refreshFollowedArtists: async () => {},
  likeAlbum: async () => {},
  unlikeAlbum: async () => {},
  likedAlbumIds: [],
  refreshLikedAlbums: async () => {},
  addToHistory: async () => {},
  historyTrackIds: [],
  refreshHistory: async () => {},
  contentPreferences: null,
  updateContentPreferences: async () => {},
  showPreferenceOverlay: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>([])
  const [followedArtistIds, setFollowedArtistIds] = useState<string[]>([])
  const [likedAlbumIds, setLikedAlbumIds] = useState<string[]>([])
  const [historyTrackIds, setHistoryTrackIds] = useState<string[]>([])
  const [contentPreferences, setContentPreferences] = useState<{
    preferredContinents: string[]
    preferenceType: 'international' | 'local' | 'mixed'
    hasSetPreferences: boolean
  } | null>(null)
  const [showPreferenceOverlay, setShowPreferenceOverlay] = useState(false)

  // Listen for Firebase auth state changes
  useEffect(() => {
    let mounted = true
    
    console.log('[Auth] Setting up auth state listener...')
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('[Auth] Auth state changed:', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      } : null)
      
      if (!mounted) {
        console.log('[Auth] Component unmounted, skipping state update')
        return
      }
      if (firebaseUser) {
        const userProfile = await firebaseService.getUserProfile(firebaseUser.uid)
        
        // Always use the latest data from Firebase Auth for display name and photo
        const latestDisplayName = firebaseUser.displayName || userProfile?.displayName || 'User'
        const latestPhotoURL = firebaseUser.photoURL || userProfile?.photoURL || undefined
        const latestEmail = firebaseUser.email || userProfile?.email || ''
        
        if (userProfile) {
          // Update existing profile with latest Firebase Auth data if it has changed
          const needsUpdate = 
            userProfile.displayName !== latestDisplayName ||
            userProfile.photoURL !== latestPhotoURL ||
            userProfile.email !== latestEmail
          
          if (needsUpdate) {
            await firebaseService.updateUserProfile(firebaseUser.uid, {
              displayName: latestDisplayName,
              email: latestEmail,
              photoURL: latestPhotoURL,
            })
          }
          
          setUser({
            uid: firebaseUser.uid,
            displayName: latestDisplayName,
            email: latestEmail,
            photoURL: latestPhotoURL,
          })
          
          // Preload and cache profile image in background
          if (latestPhotoURL) {
            preloadProfileImage(latestPhotoURL, firebaseUser.uid)
          }
          
          // Load user favorites and followed artists
          const favorites = await firebaseService.getUserFavorites(firebaseUser.uid)
          setFavoriteTrackIds(favorites)
          
          const followedArtists = await firebaseService.getUserLibrary(firebaseUser.uid, 'artist')
          setFollowedArtistIds(followedArtists.map(item => item.itemId))
          
          const likedAlbums = await firebaseService.getUserLibrary(firebaseUser.uid, 'album')
          setLikedAlbumIds(likedAlbums.map(item => item.itemId))
          
          const history = await firebaseService.getUserHistory(firebaseUser.uid)
          setHistoryTrackIds(history)
          
          // Load content preferences
          const preferences = await firebaseService.getUserContentPreferences(firebaseUser.uid)
          setContentPreferences(preferences)
          
          // Show preference overlay if user hasn't set preferences yet
          if (!preferences || !preferences.hasSetPreferences) {
            setShowPreferenceOverlay(true)
          }
        } else {
          // Create user profile if it doesn't exist
          await firebaseService.createUserProfile({
            uid: firebaseUser.uid,
            displayName: latestDisplayName,
            email: latestEmail,
            photoURL: latestPhotoURL,
          })
          
          setUser({
            uid: firebaseUser.uid,
            displayName: latestDisplayName,
            email: latestEmail,
            photoURL: latestPhotoURL,
          })
          
          // Preload and cache profile image in background
          if (latestPhotoURL) {
            preloadProfileImage(latestPhotoURL, firebaseUser.uid)
          }
          
          // Show preference overlay for new users
          setShowPreferenceOverlay(true)
        }
      } else {
        setUser(null)
        setFavoriteTrackIds([])
        setFollowedArtistIds([])
        setLikedAlbumIds([])
        setHistoryTrackIds([])
      }
      
      setIsLoading(false)
    })

    return () => {
      console.log('[Auth] Cleaning up auth listener')
      mounted = false
      unsubscribe()
    }
  }, [])

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (error) {
      console.error('Sign in error:', error)
      throw error // Re-throw the error so the UI can handle it
    }
  }

  // Sign up function
  const signUp = async (name: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      
      // Create user profile
      await firebaseService.createUserProfile({
        uid: firebaseUser.uid,
        displayName: name,
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || undefined,
      })
      
      return true
    } catch (error) {
      console.error('Sign up error:', error)
      return false
    }
  }

  // Google sign in function with popup
  const signInWithGoogle = async () => {
    try {
      console.log('[Auth] Starting Google sign-in with popup...')
      const result = await signInWithPopup(auth, googleProvider)
      const firebaseUser = result.user
      
      console.log('[Auth] Google sign-in successful:', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      })
      
      // Check if user profile exists, if not create one
      const existingProfile = await firebaseService.getUserProfile(firebaseUser.uid)
      if (!existingProfile) {
        console.log('[Auth] Creating new user profile...')
        await firebaseService.createUserProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
        })
      }
      
      return true
    } catch (error: any) {
      // User closed the popup
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('[Auth] User closed the sign-in popup')
        return false
      }
      // Popup blocked
      if (error.code === 'auth/popup-blocked') {
        console.error('[Auth] Popup was blocked by browser')
        throw new Error('Please allow popups for this site to sign in with Google')
      }
      console.error('[Auth] Google sign-in error:', error)
      throw error
    }
  }

  // Sign out function
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Delete account function
  const deleteAccount = async () => {
    if (!user) return false
    
    try {
      // First delete all Firestore data
      await firebaseService.deleteUserAccount(user.uid)
      
      // Then delete the Firebase Auth account
      const currentUser = auth.currentUser
      if (currentUser) {
        await deleteUser(currentUser)
      }
      
      // Clear local state
      setUser(null)
      setFavoriteTrackIds([])
      setFollowedArtistIds([])
      setLikedAlbumIds([])
      setHistoryTrackIds([])
      setContentPreferences(null)
      setShowPreferenceOverlay(false)
      
      return true
    } catch (error) {
      console.error('Delete account error:', error)
      throw error
    }
  }

  // Add to favorites
  const addToFavorites = async (trackId: string) => {
    if (!user) return
    
    try {
      await firebaseService.addToFavorites(user.uid, trackId)
      if (!favoriteTrackIds.includes(trackId)) {
        setFavoriteTrackIds((prev) => [...prev, trackId])
      }
    } catch (error) {
      console.error('Error adding to favorites:', error)
    }
  }

  // Remove from favorites
  const removeFromFavorites = async (trackId: string) => {
    if (!user) return
    
    try {
      await firebaseService.removeFromFavorites(user.uid, trackId)
      setFavoriteTrackIds((prev) => prev.filter((id) => id !== trackId))
    } catch (error) {
      console.error('Error removing from favorites:', error)
    }
  }

  // Refresh favorites
  const refreshFavorites = async () => {
    if (!user) return
    
    try {
      const favorites = await firebaseService.getUserFavorites(user.uid)
      setFavoriteTrackIds(favorites)
    } catch (error) {
      console.error('Error refreshing favorites:', error)
    }
  }

  // Follow artist
  const followArtist = async (artistId: string) => {
    if (!user) return
    
    try {
      await firebaseService.addToLibrary(user.uid, 'artist', artistId)
      if (!followedArtistIds.includes(artistId)) {
        setFollowedArtistIds((prev) => [...prev, artistId])
      }
    } catch (error) {
      console.error('Error following artist:', error)
    }
  }

  // Unfollow artist
  const unfollowArtist = async (artistId: string) => {
    if (!user) return
    
    try {
      await firebaseService.removeFromLibrary(user.uid, 'artist', artistId)
      setFollowedArtistIds((prev) => prev.filter((id) => id !== artistId))
    } catch (error) {
      console.error('Error unfollowing artist:', error)
    }
  }

  // Refresh followed artists
  const refreshFollowedArtists = async () => {
    if (!user) return
    
    try {
      const followedArtists = await firebaseService.getUserLibrary(user.uid, 'artist')
      setFollowedArtistIds(followedArtists.map(item => item.itemId))
    } catch (error) {
      console.error('Error refreshing followed artists:', error)
    }
  }

  // Like album
  const likeAlbum = async (albumId: string) => {
    if (!user) return
    
    try {
      await firebaseService.addToLibrary(user.uid, 'album', albumId)
      if (!likedAlbumIds.includes(albumId)) {
        setLikedAlbumIds((prev) => [...prev, albumId])
      }
    } catch (error) {
      console.error('Error liking album:', error)
    }
  }

  // Unlike album
  const unlikeAlbum = async (albumId: string) => {
    if (!user) return
    
    try {
      await firebaseService.removeFromLibrary(user.uid, 'album', albumId)
      setLikedAlbumIds((prev) => prev.filter((id) => id !== albumId))
    } catch (error) {
      console.error('Error unliking album:', error)
    }
  }

  // Refresh liked albums
  const refreshLikedAlbums = async () => {
    if (!user) return
    
    try {
      const likedAlbums = await firebaseService.getUserLibrary(user.uid, 'album')
      setLikedAlbumIds(likedAlbums.map(item => item.itemId))
    } catch (error) {
      console.error('Error refreshing liked albums:', error)
    }
  }

  // Add to history
  const addToHistory = async (trackId: string) => {
    if (!user) return
    
    try {
      await firebaseService.addToHistory(user.uid, trackId)
      // Add to the beginning of the array (most recent first)
      setHistoryTrackIds((prev) => [trackId, ...prev.filter(id => id !== trackId)])
    } catch (error) {
      console.error('Error adding to history:', error)
    }
  }

  // Refresh history
  const refreshHistory = async () => {
    if (!user) return
    
    try {
      const history = await firebaseService.getUserHistory(user.uid)
      setHistoryTrackIds(history)
    } catch (error) {
      console.error('Error refreshing history:', error)
    }
  }

  // Update content preferences
  const updateContentPreferences = async (preferences: {
    preferredContinents: string[]
    preferenceType: 'international' | 'local' | 'mixed'
    hasSetPreferences: boolean
  }) => {
    if (!user) return
    
    try {
      await firebaseService.updateContentPreferences(user.uid, preferences)
      setContentPreferences(preferences)
      setShowPreferenceOverlay(false)
    } catch (error) {
      console.error('Error updating content preferences:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        deleteAccount,
        addToFavorites,
        removeFromFavorites,
        favoriteTrackIds,
        refreshFavorites,
        followArtist,
        unfollowArtist,
        followedArtistIds,
        refreshFollowedArtists,
        likeAlbum,
        unlikeAlbum,
        likedAlbumIds,
        refreshLikedAlbums,
        addToHistory,
        historyTrackIds,
        refreshHistory,
        contentPreferences,
        updateContentPreferences,
        showPreferenceOverlay,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  return useContext(AuthContext)
}
