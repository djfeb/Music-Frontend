/**
 * Utility functions for formatting dates and times in a user-friendly way
 */

/**
 * Format a date string or Date object to a user-friendly format
 * @param date - Date string (ISO format) or Date object
 * @param format - Format type: 'short', 'medium', 'long', 'year'
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: 'short' | 'medium' | 'long' | 'year' = 'medium'): string {
  if (!date) return 'Unknown date'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  switch (format) {
    case 'year':
      return dateObj.getFullYear().toString()
    
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    
    case 'medium':
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    
    default:
      return dateObj.toLocaleDateString('en-US')
  }
}

/**
 * Format a date to show relative time (e.g., "2 days ago", "1 week ago")
 * @param date - Date string (ISO format) or Date object
 * @returns Relative time string
 */
export function formatRelativeDate(date: string | Date): string {
  if (!date) return 'Unknown time'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date'
  }
  
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - dateObj.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
  return `${Math.ceil(diffDays / 365)} years ago`
}

/**
 * Format album release date with additional info
 * @param releaseDate - Release date string
 * @param albumType - Type of album (album, single, EP, etc.)
 * @param trackCount - Number of tracks (optional)
 * @returns Formatted string with release info
 */
export function formatAlbumInfo(releaseDate: string, albumType?: string, trackCount?: number): string {
  const year = formatDate(releaseDate, 'year')
  const parts = [year]
  
  if (albumType) {
    parts.push(albumType.charAt(0).toUpperCase() + albumType.slice(1))
  }
  
  if (trackCount) {
    parts.push(`${trackCount} tracks`)
  }
  
  return parts.join(' • ')
}

/**
 * Format duration from milliseconds to MM:SS format
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
