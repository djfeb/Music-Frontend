"use client"

import { Heart, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DonationButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showIcon?: boolean
  showText?: boolean
}

export function DonationButton({ 
  variant = "default", 
  size = "default", 
  className = "",
  showIcon = true,
  showText = true
}: DonationButtonProps) {
  const handleDonate = () => {
    // Open PayPal donation link in new tab
    window.open('https://www.paypal.com/paypalme/neonflix', '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white border-0 ${className}`}
      onClick={handleDonate}
    >
      {showIcon && <Heart className="h-4 w-4 mr-2" />}
      {showText && "Support Us"}
      <ExternalLink className="h-3 w-3 ml-1" />
    </Button>
  )
}
