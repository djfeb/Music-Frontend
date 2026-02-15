export interface CoverImage {
  id: string
  url: string
  name: string
  category: 'abstract' | 'nature' | 'music' | 'geometric' | 'gradient'
}

export const coverImages: CoverImage[] = [
  // Abstract covers
  {
    id: 'abstract-1',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop&crop=center',
    name: 'Abstract Waves',
    category: 'abstract'
  },
  {
    id: 'abstract-2',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center',
    name: 'Color Burst',
    category: 'abstract'
  },
  {
    id: 'abstract-3',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=400&fit=crop&crop=center',
    name: 'Neon Glow',
    category: 'abstract'
  },
  {
    id: 'abstract-4',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    name: 'Liquid Metal',
    category: 'abstract'
  },

  // Nature covers
  {
    id: 'nature-1',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center',
    name: 'Mountain Peak',
    category: 'nature'
  },
  {
    id: 'nature-2',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop&crop=center',
    name: 'Forest Path',
    category: 'nature'
  },
  {
    id: 'nature-3',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center',
    name: 'Ocean Waves',
    category: 'nature'
  },
  {
    id: 'nature-4',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&crop=center',
    name: 'Desert Sunset',
    category: 'nature'
  },

  // Music covers
  {
    id: 'music-1',
    url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    name: 'Vinyl Record',
    category: 'music'
  },
  {
    id: 'music-2',
    url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop&crop=center',
    name: 'Studio Equipment',
    category: 'music'
  },
  {
    id: 'music-3',
    url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&crop=center',
    name: 'Guitar Strings',
    category: 'music'
  },
  {
    id: 'music-4',
    url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop&crop=center',
    name: 'Piano Keys',
    category: 'music'
  },

  // Geometric covers
  {
    id: 'geometric-1',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center',
    name: 'Hexagon Pattern',
    category: 'geometric'
  },
  {
    id: 'geometric-2',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    name: 'Triangle Grid',
    category: 'geometric'
  },
  {
    id: 'geometric-3',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop&crop=center',
    name: 'Circle Array',
    category: 'geometric'
  },
  {
    id: 'geometric-4',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=400&fit=crop&crop=center',
    name: 'Square Lattice',
    category: 'geometric'
  },

  // Gradient covers
  {
    id: 'gradient-1',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=400&fit=crop&crop=center',
    name: 'Blue to Purple',
    category: 'gradient'
  },
  {
    id: 'gradient-2',
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&crop=center',
    name: 'Sunset Orange',
    category: 'gradient'
  },
  {
    id: 'gradient-3',
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=center',
    name: 'Green to Blue',
    category: 'gradient'
  },
  {
    id: 'gradient-4',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&h=400&fit=crop&crop=center',
    name: 'Pink to Red',
    category: 'gradient'
  }
]

export const getCoverImageById = (id: string): CoverImage | undefined => {
  return coverImages.find(img => img.id === id)
}

export const getCoverImagesByCategory = (category: CoverImage['category']): CoverImage[] => {
  return coverImages.filter(img => img.category === category)
}

