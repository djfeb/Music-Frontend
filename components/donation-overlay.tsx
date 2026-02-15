"use client"

import { useState, useEffect } from "react"
import { X, Heart, Music, Star, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DonationButton } from "./donation-button"

interface DonationOverlayProps {
  isVisible: boolean
  onClose: () => void
}

export function DonationOverlay({ isVisible, onClose }: DonationOverlayProps) {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
      setIsClosing(false)
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
      isClosing ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Content */}
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <Star className="h-4 w-4 text-black" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Enjoying MusicStream?
            </h2>
            <p className="text-zinc-400 text-sm">
              You've just played your first 5 tracks! 🎵
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-left">
              <Music className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-zinc-300 text-sm">Unlimited music streaming</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span className="text-zinc-300 text-sm">Create and share playlists</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <Heart className="h-5 w-5 text-pink-500 flex-shrink-0" />
              <span className="text-zinc-300 text-sm">Save your favorite tracks</span>
            </div>
          </div>

          {/* Message */}
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-zinc-300 text-sm leading-relaxed">
              If you're enjoying the experience, consider supporting us to help keep MusicStream free and ad-free for everyone!
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <DonationButton className="w-full" />
            <Button
              variant="ghost"
              className="w-full text-zinc-400 hover:text-white"
              onClick={handleClose}
            >
              Maybe Later
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-zinc-500">
            Your support helps us maintain and improve the service
          </p>
        </div>
      </div>
    </div>
  )
}
