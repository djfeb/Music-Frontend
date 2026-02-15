"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePlayer } from "@/contexts/player-context"
import { DonationOverlay } from "./donation-overlay"

interface DonationOverlayContextType {
  showDonationOverlay: () => void
  hideDonationOverlay: () => void
}

const DonationOverlayContext = createContext<DonationOverlayContextType | undefined>(undefined)

export function DonationOverlayProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const player = usePlayer()
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)
  const [hasShownOverlay, setHasShownOverlay] = useState(false)
  const [trackPlayCount, setTrackPlayCount] = useState(0)
  const previousTrackIdRef = useRef<string | null>(null)

  // Check if user has already seen the donation overlay
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeen = localStorage.getItem('musicstream_donation_overlay_shown')
      if (hasSeen === 'true') {
        setHasShownOverlay(true)
      }
    }
  }, [])

  // Track when user plays tracks
  useEffect(() => {
    if (!user || hasShownOverlay) return

    // Track when a new track starts playing
    if (player.current && player.isPlaying) {
      const currentTrackId = player.current.id
      
      // Only increment count when a new track starts (track ID changes)
      if (currentTrackId && currentTrackId !== previousTrackIdRef.current) {
        previousTrackIdRef.current = currentTrackId
        const newCount = trackPlayCount + 1
        setTrackPlayCount(newCount)
        
        // Show overlay after 5 tracks
        if (newCount >= 5 && !hasShownOverlay) {
          // Add a small delay to let the user enjoy the music first
          const timer = setTimeout(() => {
            setIsOverlayVisible(true)
            setHasShownOverlay(true)
            localStorage.setItem('musicstream_donation_overlay_shown', 'true')
          }, 2000) // Show after 2 seconds of playing the 5th track
          
          return () => clearTimeout(timer)
        }
      }
    }
  }, [user, hasShownOverlay, trackPlayCount, player.current?.id, player.isPlaying])

  // Reset track count when user changes
  useEffect(() => {
    if (user) {
      setTrackPlayCount(0)
      setHasShownOverlay(false)
      previousTrackIdRef.current = null
    }
  }, [user?.uid])

  const showDonationOverlay = () => {
    setIsOverlayVisible(true)
  }

  const hideDonationOverlay = () => {
    setIsOverlayVisible(false)
  }

  return (
    <DonationOverlayContext.Provider value={{ showDonationOverlay, hideDonationOverlay }}>
      {children}
      <DonationOverlay 
        isVisible={isOverlayVisible} 
        onClose={hideDonationOverlay} 
      />
    </DonationOverlayContext.Provider>
  )
}

export function useDonationOverlay() {
  const context = useContext(DonationOverlayContext)
  if (context === undefined) {
    throw new Error('useDonationOverlay must be used within a DonationOverlayProvider')
  }
  return context
}
