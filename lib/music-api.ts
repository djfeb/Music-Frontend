// Dynamic API base URL that adapts to environment
import { getApiBaseUrl } from './api-client'

// We'll get the base URL dynamically in the request method
// to ensure it's always valid when called

export interface Artist {
  id: string;
  name: string;
  popularity: number;
  followers_total: number;
  genres: string[];
  country?: string; // Artist's country of origin
  external_urls: { spotify: string };
  images: Array<{ url: string; width: number; height: number }>;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  name: string;
  album_type: string;
  total_tracks: number;
  release_date: string;
  popularity: number;
  external_urls: { spotify: string };
  images: Array<{ url: string; width: number; height: number }>;
  artist_genres?: string[]; // Genres from all artists on this album
  artists?: Artist[]; // Full artist objects
}

export interface Track {
  id: string;
  name: string;
  album_id: string;
  track_number: number;
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  preview_url: string;
  external_urls: { spotify: string };
  artists?: string[]; // Optional array of artist names
  artist_ids?: string[]; // Optional array of artist ids (aligned with artists)
  artist_genres?: string[]; // Genres from all artists on this track
  album_images?: Array<{ url: string; width: number; height: number }>; // Album images for display
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Stats {
  total_artists: number;
  total_albums: number;
  total_tracks: number;
  top_artists: Artist[];
  recent_albums: Album[];
}

class MusicAPI {
  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Get base URL dynamically to ensure it's always valid
    const baseUrl = getApiBaseUrl()
    
    // Debug logging
    console.log('[MusicAPI] Request details:', { endpoint, baseUrl, isClient: typeof window !== 'undefined' })
    
    // Ensure we have a valid base URL
    if (!baseUrl || baseUrl === 'undefined' || baseUrl.includes('undefined')) {
      throw new Error('Invalid API base URL. IP discovery may not have completed yet.')
    }
    
    // For client-side, ensure we're using the proxy
    if (typeof window !== 'undefined' && !baseUrl.startsWith('/api/proxy')) {
      console.warn('[MusicAPI] Client-side request not using proxy, forcing proxy usage')
      const url = new URL(`/api/proxy${endpoint}`)
      
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v))
        })
      }
      
      const response = await fetch(url.toString(), { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    }
    
    // Ensure we have a valid base URL and endpoint
    const fullUrl = `${baseUrl}${endpoint}`
    console.log('[MusicAPI] Constructing URL:', { baseUrl, endpoint, fullUrl })
    
    try {
      let fetchUrl: string
      let searchParams: URLSearchParams | null = null
      
      // Handle relative URLs (like /api/proxy) vs absolute URLs
      if (baseUrl.startsWith('/')) {
        // Relative URL - use directly with fetch, handle params separately
        fetchUrl = fullUrl
        if (params) {
          searchParams = new URLSearchParams()
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) searchParams!.append(k, String(v))
          })
          if (searchParams.toString()) {
            fetchUrl += `?${searchParams.toString()}`
          }
        }
      } else {
        // Absolute URL (server-side) - use URL constructor
        const url = new URL(fullUrl)
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.append(k, String(v))
          })
        }
        fetchUrl = url.toString()
      }
      
      console.log('[MusicAPI] Final fetch URL:', fetchUrl)
      const response = await fetch(fetchUrl, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return response.json();
    } catch (urlError) {
      console.error('[MusicAPI] URL construction failed:', { fullUrl, error: urlError })
      throw new Error(`Invalid URL construction: ${fullUrl}`)
    }
  }

  // Artists
  async getArtists(params?: {
    page?: number;
    limit?: number;
    sort?: 'name' | 'popularity' | 'followers_total' | 'created_at';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Artist>> {
    return this.request<PaginatedResponse<Artist>>('/artists', params);
  }

  async getArtist(id: string): Promise<Artist> {
    return this.request<Artist>(`/artists/${id}`);
  }

  async searchArtists(query: string): Promise<Artist[]> {
    return this.request<Artist[]>(`/artists/search/${encodeURIComponent(query)}`);
  }

  async getArtistAlbums(id: string): Promise<Album[]> {
    return this.request<Album[]>(`/artists/${id}/albums`);
  }

  async getArtistTracks(id: string): Promise<Track[]> {
    return this.request<Track[]>(`/artists/${id}/tracks`);
  }

  // Albums
  async getAlbums(params?: {
    page?: number;
    limit?: number;
    sort?: 'name' | 'popularity' | 'release_date' | 'total_tracks';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Album>> {
    return this.request<PaginatedResponse<Album>>('/albums', params);
  }

  async getAlbum(id: string): Promise<Album> {
    return this.request<Album>(`/albums/${id}`);
  }

  async searchAlbums(query: string): Promise<Album[]> {
    return this.request<Album[]>(`/albums/search/${encodeURIComponent(query)}`);
  }

  async getAlbumTracks(id: string): Promise<Track[]> {
    return this.request<Track[]>(`/albums/${id}/tracks`);
  }

  // Tracks
  async getTracks(params?: {
    page?: number;
    limit?: number;
    sort?: 'name' | 'popularity' | 'duration_ms' | 'created_at';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Track>> {
    return this.request<PaginatedResponse<Track>>('/tracks', params);
  }

  async getTrack(id: string): Promise<Track> {
    return this.request<Track>(`/tracks/${id}`);
  }

  async searchTracks(query: string): Promise<PaginatedResponse<Track>> {
    return this.request<PaginatedResponse<Track>>(`/tracks/search/${encodeURIComponent(query)}`);
  }

  async playTrack(id: string): Promise<string> {
    // Return a proxied URL the <audio> element can stream directly
    return `/api/proxy/play/${id}`
  }

  async downloadTrack(id: string): Promise<string> {
    // Return a proxied URL suitable for <a download> or fetch
    return `/api/proxy/download/${id}`
  }

  // Statistics
  async getStats(): Promise<Stats> {
    return this.request<Stats>('/stats');
  }

  // Helper method to get featured content
  async getFeaturedContent(): Promise<{
    featuredAlbums: Album[];
    popularTracks: Track[];
    topArtists: Artist[];
  }> {
    const [albumsResponse, tracksResponse, artistsResponse] = await Promise.all([
      this.getAlbums({ sort: 'popularity', order: 'desc', limit: 10 }),
      this.getTracks({ sort: 'popularity', order: 'desc', limit: 10 }),
      this.getArtists({ sort: 'popularity', order: 'desc', limit: 9 })
    ]);

    return {
      featuredAlbums: albumsResponse.data.slice(0, 5),
      popularTracks: tracksResponse.data.slice(0, 10),
      topArtists: artistsResponse.data.slice(0, 9)
    };
  }

  // Get all genres from the database
  async getGenres(): Promise<string[]> {
    const response = await this.request<{ data: string[]; total: number }>('/genres');
    return response.data;
  }

  // Get genres with counts
  async getGenresWithCounts(): Promise<Array<{ genre: string; count: number }>> {
    const response = await this.request<{ data: Array<{ genre: string; count: number }>; total: number }>('/genres/counts');
    return response.data;
  }
}

export const musicAPI = new MusicAPI();

