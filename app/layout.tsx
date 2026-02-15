import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { PlayerProvider } from "@/contexts/player-context"
import { MusicPlayer } from "@/components/music-player"
import { FirebaseNetwork } from "@/components/firebase-network"
import { DonationOverlayProvider } from "@/components/donation-overlay-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MusicStream - Your Music Streaming App",
  description: "Stream your favorite music anytime, anywhere",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <PlayerProvider>
              <DonationOverlayProvider>
                <div className="pb-20 sm:pb-24 lg:pb-20">
                  {children}
                </div>
                <MusicPlayer />
                <FirebaseNetwork />
                <Toaster />
              </DonationOverlayProvider>
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
