"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Search, Bell, Settings, User, Menu, Mic, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"

interface HeaderProps {
  onMobileMenuOpen: () => void
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search page with query
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left Section - Mobile Menu Button + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5"
            onClick={onMobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo - Hidden on mobile when menu button is shown */}
          <Link 
            href="/" 
            className="flex items-center gap-3 font-bold text-xl text-white hover:opacity-80 transition-opacity"
          >
            <span className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0">♪</span>
            <span className="hidden sm:block">Music Stream</span>
            <span className="sm:hidden">MS</span>
          </Link>
        </div>

        {/* Center Section - Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search for songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400 focus:bg-zinc-800 focus:border-zinc-600 focus:ring-zinc-600"
            />
            {/* Voice Search Button - Hidden on very small screens */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5 hidden sm:flex"
            >
              <Mic className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Right Section - User Actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Volume Control - Hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5 hidden lg:flex"
          >
            <Volume2 className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5 hidden sm:flex"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          {user ? (
            <Link href="/profile">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/5"
              >
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full h-8 w-8 object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </Link>
          ) : (
            <Link href="/sign-in">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-zinc-300 hover:text-white border-zinc-700 hover:border-zinc-600 hidden sm:flex"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
