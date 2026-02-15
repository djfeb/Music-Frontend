"use client"

import { useState } from 'react'
import Image from 'next/image'

interface ImageWithFallbackProps {
  src: string
  alt: string
  fallbackSrc?: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  priority?: boolean
  sizes?: string
  quality?: number
  onError?: () => void
}

export function ImageWithFallback({
  src,
  alt,
  fallbackSrc,
  width,
  height,
  fill,
  className,
  priority,
  sizes,
  quality,
  onError,
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
      setHasError(true)
    }
    onError?.()
  }

  // If no src and no fallback, show placeholder
  if (!imgSrc && !fallbackSrc) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 ${className || ''}`}>
        <span className="text-4xl">🎵</span>
      </div>
    )
  }

  const imageProps = {
    src: imgSrc || fallbackSrc || '',
    alt,
    onError: handleError,
    className,
    priority,
    sizes,
    quality,
  }

  if (fill) {
    return <Image {...imageProps} fill />
  }

  return <Image {...imageProps} width={width} height={height} />
}
