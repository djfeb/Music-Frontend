"use client"

import { useState } from "react"
import { Plus, Music, X, Image as ImageIcon, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sidebar } from "@/components/sidebar"
import { MusicPlayer } from "@/components/music-player"
import { useAuth } from "@/contexts/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { coverImages, CoverImage } from "@/lib/cover-images"

export default function CreatePlaylistPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCoverImage, setSelectedCoverImage] = useState<CoverImage | null>(null)
  const [showCoverModal, setShowCoverModal] = useState(false)

  const handleCreatePlaylist = async () => {
    if (!user || !name.trim()) return

    setIsCreating(true)
    try {
      const playlistId = await firebaseService.createPlaylist({
        name: name.trim(),
        description: description.trim() || undefined,
        coverImage: selectedCoverImage?.url || null,
        tracks: [],
        isPublic,
        createdBy: user.uid,
        trackCount: 0,
      })

      router.push(`/playlist/${playlistId}`)
    } catch (error) {
      console.error("Error creating playlist:", error)
      setIsCreating(false)
    }
  }

  if (!user) {
    router.push("/sign-in")
    return null
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-black text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Playlist</h1>
            <p className="text-zinc-400">Build your perfect music collection</p>
          </div>

          <div className="space-y-6">
            {/* Playlist Cover */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Playlist Cover</Label>
              <div 
                className="w-48 h-48 bg-zinc-800 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-colors cursor-pointer overflow-hidden"
                onClick={() => setShowCoverModal(true)}
              >
                {selectedCoverImage ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={selectedCoverImage.url}
                      alt={selectedCoverImage.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 text-white" />
                        <p className="text-xs text-white">Change Cover</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-400">Add Cover Image</p>
                  </div>
                )}
              </div>
              {selectedCoverImage && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Selected:</span>
                  <span className="text-xs text-white">{selectedCoverImage.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCoverImage(null)}
                    className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Playlist Name */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">
                Playlist Name *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-400"
                maxLength={100}
              />
              <p className="text-xs text-zinc-500">{name.length}/100 characters</p>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's your playlist about?"
                className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-400"
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-zinc-500">{description.length}/300 characters</p>
            </div>

            {/* Privacy Setting */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Public Playlist</Label>
                <p className="text-xs text-zinc-400">
                  Anyone can search for and view this playlist
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleCreatePlaylist}
                disabled={!name.trim() || isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Playlist
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </main>
      <MusicPlayer />

      {/* Cover Image Selection Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Choose Cover Image</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCoverModal(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {coverImages.map((cover) => (
                  <div
                    key={cover.id}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedCoverImage?.id === cover.id
                        ? 'border-green-500 ring-2 ring-green-500/20'
                        : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                    onClick={() => {
                      setSelectedCoverImage(cover)
                      setShowCoverModal(false)
                    }}
                  >
                    <Image
                      src={cover.url}
                      alt={cover.name}
                      fill
                      className="object-cover"
                    />
                    {selectedCoverImage?.id === cover.id && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <Check className="h-8 w-8 text-green-500 bg-black/50 rounded-full p-1" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate">{cover.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

