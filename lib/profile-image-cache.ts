// Cache user profile images in localStorage/IndexedDB for faster loading

const CACHE_PREFIX = 'profile_img_'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

interface CachedImage {
  dataUrl: string
  timestamp: number
  originalUrl: string
}

/**
 * Convert image URL to base64 data URL and cache it
 */
export async function cacheProfileImage(url: string, userId: string): Promise<string> {
  if (!url) return ''
  
  try {
    // Check if already cached and not expired
    const cached = getCachedImage(userId)
    if (cached && cached.originalUrl === url) {
      return cached.dataUrl
    }
    
    // Fetch and convert to blob
    const response = await fetch(url)
    const blob = await response.blob()
    
    // Convert to base64
    const dataUrl = await blobToDataUrl(blob)
    
    // Store in localStorage
    const cacheData: CachedImage = {
      dataUrl,
      timestamp: Date.now(),
      originalUrl: url
    }
    
    try {
      localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(cacheData))
    } catch (e) {
      // localStorage might be full, clear old caches
      clearExpiredCaches()
      try {
        localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(cacheData))
      } catch {
        // If still fails, just return the original URL
        console.warn('Failed to cache profile image')
      }
    }
    
    return dataUrl
  } catch (error) {
    console.error('Error caching profile image:', error)
    return url // Return original URL on error
  }
}

/**
 * Get cached profile image
 */
export function getCachedImage(userId: string): CachedImage | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + userId)
    if (!cached) return null
    
    const data: CachedImage = JSON.parse(cached)
    
    // Check if expired
    if (Date.now() - data.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + userId)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error reading cached image:', error)
    return null
  }
}

/**
 * Get profile image URL (cached or original)
 */
export function getProfileImageUrl(url: string | undefined, userId: string): string {
  if (!url) return ''
  
  const cached = getCachedImage(userId)
  if (cached && cached.originalUrl === url) {
    return cached.dataUrl
  }
  
  return url
}

/**
 * Clear expired caches
 */
export function clearExpiredCaches(): void {
  try {
    const keys = Object.keys(localStorage)
    const now = Date.now()
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const data: CachedImage = JSON.parse(localStorage.getItem(key) || '{}')
          if (now - data.timestamp > CACHE_EXPIRY) {
            localStorage.removeItem(key)
          }
        } catch {
          // Invalid data, remove it
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.error('Error clearing expired caches:', error)
  }
}

/**
 * Clear specific user's cached image
 */
export function clearCachedImage(userId: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + userId)
  } catch (error) {
    console.error('Error clearing cached image:', error)
  }
}

/**
 * Convert Blob to Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Preload and cache profile image in the background
 */
export function preloadProfileImage(url: string | undefined, userId: string): void {
  if (!url || !userId) return
  
  // Check if already cached
  const cached = getCachedImage(userId)
  if (cached && cached.originalUrl === url) {
    return // Already cached
  }
  
  // Cache in background (don't await)
  cacheProfileImage(url, userId).catch(err => {
    console.warn('Background image caching failed:', err)
  })
}
