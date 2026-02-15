import { useState, useEffect } from 'react'

interface ImageData {
  url: string
  width?: number
  height?: number
}

interface UseImageWithFallbackOptions {
  localImages?: ImageData[]
  spotifyImages?: ImageData[]
  images?: ImageData[]
  preferredSize?: 'large' | 'medium' | 'small'
}

export function useImageWithFallback({
  localImages,
  spotifyImages,
  images,
  preferredSize = 'large'
}: UseImageWithFallbackOptions) {
  const [primarySrc, setPrimarySrc] = useState<string>('')
  const [fallbackSrc, setFallbackSrc] = useState<string>('')

  useEffect(() => {
    // Priority: localImages > images > spotifyImages
    const primaryImages = localImages || images || []
    const backupImages = spotifyImages || images || []

    // Get image by size preference
    const getImageBySize = (imgs: ImageData[]) => {
      if (!imgs || imgs.length === 0) return null

      const sizeMap = {
        large: 640,
        medium: 300,
        small: 64
      }

      const targetSize = sizeMap[preferredSize]
      
      // Find closest match
      const sorted = [...imgs].sort((a, b) => {
        const aDiff = Math.abs((a.width || 0) - targetSize)
        const bDiff = Math.abs((b.width || 0) - targetSize)
        return aDiff - bDiff
      })

      return sorted[0]?.url || imgs[0]?.url || null
    }

    const primary = getImageBySize(primaryImages)
    const fallback = getImageBySize(backupImages)

    setPrimarySrc(primary || '')
    setFallbackSrc(fallback || '')
  }, [localImages, spotifyImages, images, preferredSize])

  return {
    src: primarySrc,
    fallbackSrc,
    hasImage: !!(primarySrc || fallbackSrc)
  }
}
