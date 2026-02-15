"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TruncatedArtistsProps {
  artists?: string[]
  artistIds?: string[]
  maxLength?: number
  className?: string
  showLinks?: boolean
  onClick?: (e: React.MouseEvent) => void
  hideWhenEmpty?: boolean
}

export function TruncatedArtists({ 
  artists, 
  artistIds,
  maxLength = 30, 
  className = "text-sm text-zinc-400 truncate",
  showLinks = false,
  onClick,
  hideWhenEmpty = false
}: TruncatedArtistsProps) {
  const router = useRouter()

  const handleArtistClick = (e: React.MouseEvent, artistName: string, artistId?: string) => {
    if (onClick) onClick(e)
    e.preventDefault()
    e.stopPropagation()
    
    if (artistId) {
      router.push(`/artist/${artistId}`)
    } else {
      // Fallback to search if no ID available
      router.push(`/search?q=${encodeURIComponent(artistName)}`)
    }
  }

  if (!artists || artists.length === 0) {
    if (hideWhenEmpty) return null
    return <span className={className}></span>
  }

  const fullArtistText = artists.join(', ')
  const isTruncated = fullArtistText.length > maxLength

  if (!isTruncated) {
    if (showLinks) {
      return (
        <span className={className}>
          {artists.map((artistName, artistIndex) => {
            const artistId = artistIds?.[artistIndex]
            const href = artistId ? `/artist/${artistId}` : `#`
            
            return (
              <span key={artistIndex}>
                <Link
                  href={href}
                  className="hover:text-white hover:underline transition-colors"
                  onClick={(e) => handleArtistClick(e, artistName, artistId)}
                >
                  {artistName}
                </Link>
                {artistIndex < artists.length - 1 && ', '}
              </span>
            )
          })}
        </span>
      )
    }
    
    return (
      <span className={className} onClick={onClick}>
        {fullArtistText}
      </span>
    )
  }

  // Smart truncation logic
  const truncateAtWordBoundary = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text
    
    // Try to find a good truncation point
    const truncated = text.substring(0, maxLen)
    const lastComma = truncated.lastIndexOf(',')
    const lastSpace = truncated.lastIndexOf(' ')
    
    // If we have a comma and it's not too early, truncate there
    if (lastComma > 0 && lastComma > maxLen * 0.5) {
      return text.substring(0, lastComma) + '...'
    }
    
    // If we have a space and it's not too early, truncate there
    if (lastSpace > 0 && lastSpace > maxLen * 0.4) {
      return text.substring(0, lastSpace) + '...'
    }
    
    // Last resort: truncate at max length but try to show more content
    return truncated + '...'
  }

  const truncatedText = truncateAtWordBoundary(fullArtistText, maxLength)

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className} onClick={onClick} style={{ display: 'inline' }}>
            {showLinks ? (
              <span>
                {(() => {
                  // For linked artists, we need to be more careful about truncation
                  let currentLength = 0
                  const visibleArtists: string[] = []
                  const visibleArtistIds: (string | undefined)[] = []
                  
                  // Determine which artists we can show fully
                  for (let i = 0; i < artists.length; i++) {
                    const artistName = artists[i]
                    const artistWithComma = i === 0 ? artistName : ', ' + artistName
                    
                    if (currentLength + artistWithComma.length <= maxLength) {
                      visibleArtists.push(artistName)
                      visibleArtistIds.push(artistIds?.[i])
                      currentLength += artistWithComma.length
                    } else {
                      // Try to show partial artist name if there's some space left
                      const remainingSpace = maxLength - currentLength
                      if (remainingSpace > 3 && artistName.length > 3) {
                        const partialArtist = artistName.substring(0, remainingSpace - 3) + '...'
                        visibleArtists.push(partialArtist)
                        visibleArtistIds.push(artistIds?.[i])
                      }
                      break
                    }
                  }
                  
                  // If we can't show any artists fully, show the first one truncated
                  if (visibleArtists.length === 0 && artists.length > 0) {
                    const firstArtist = artists[0]
                    const firstArtistId = artistIds?.[0]
                    const truncated = truncateAtWordBoundary(firstArtist, maxLength - 3)
                    return (
                      <span>
                        <Link
                          href={firstArtistId ? `/artist/${firstArtistId}` : `#`}
                          className="hover:text-white hover:underline transition-colors"
                          onClick={(e) => handleArtistClick(e, firstArtist, firstArtistId)}
                        >
                          {truncated}
                        </Link>
                        {truncated.endsWith('...') ? '' : '...'}
                      </span>
                    )
                  }
                  
                  // Show visible artists with links
                  return (
                    <>
                      {visibleArtists.map((artistName, artistIndex) => {
                        const isPartial = artistName.endsWith('...')
                        const originalArtistName = isPartial ? artists[artistIndex] : artistName
                        const artistId = visibleArtistIds[artistIndex]
                        
                        return (
                          <span key={artistIndex}>
                            <Link
                              href={artistId ? `/artist/${artistId}` : `#`}
                              className="hover:text-white hover:underline transition-colors"
                              onClick={(e) => handleArtistClick(e, originalArtistName, artistId)}
                            >
                              {artistName}
                            </Link>
                            {artistIndex < visibleArtists.length - 1 && !isPartial && ', '}
                          </span>
                        )
                      })}
                      {visibleArtists.length < artists.length && !visibleArtists[visibleArtists.length - 1]?.endsWith('...') && '...'}
                    </>
                  )
                })()}
              </span>
            ) : (
              truncatedText
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" sideOffset={6} className="bg-zinc-800 border-zinc-700 text-white max-w-xs">
          <p>{fullArtistText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
