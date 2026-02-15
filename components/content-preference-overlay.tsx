"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Music, Globe, MapPin, Check, Loader2 } from "lucide-react"
import { musicAPI } from "@/lib/music-api"

interface ContentPreferenceOverlayProps {
  onPreferencesSet: (preferences: {
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
  }) => void;
  onSkip: () => void;
  existingPreferences?: {
    preferredContinents: string[];
    preferenceType: 'international' | 'local' | 'mixed';
    hasSetPreferences: boolean;
  } | null;
}

export function ContentPreferenceOverlay({ onPreferencesSet, onSkip, existingPreferences }: ContentPreferenceOverlayProps) {
  const [selectedType, setSelectedType] = useState<'international' | 'local' | 'mixed'>(
    existingPreferences?.preferenceType || 'mixed'
  )
  const [selectedContinents, setSelectedContinents] = useState<string[]>(
    existingPreferences?.preferredContinents || []
  )

  // Define continent groups
  const continentGroups = {
    international: [
      'North America', 'Europe', 'Australia', 'Asia', 'South America', 'Caribbean'
    ],
    local: [
      'Africa'
    ]
  }

  // Continent details with countries for display (based on actual database countries)
  const continentDetails = {
    'North America': {
      name: 'North America',
      description: 'USA, Canada, Mexico, etc.',
      countries: ['United States', 'Canada', 'Mexico', 'Puerto Rico']
    },
    'Europe': {
      name: 'Europe',
      description: 'UK, Germany, France, etc.',
      countries: ['United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway']
    },
    'Australia': {
      name: 'Australia & Oceania',
      description: 'Australia, New Zealand',
      countries: ['Australia', 'New Zealand']
    },
    'Asia': {
      name: 'Asia',
      description: 'Japan, South Korea, India, etc.',
      countries: ['Japan', 'South Korea', 'India', 'Indonesia', 'Philippines', 'Israel']
    },
    'South America': {
      name: 'South America',
      description: 'Brazil, Argentina, Chile, etc.',
      countries: ['Brazil', 'Argentina', 'Chile', 'Colombia']
    },
    'Caribbean': {
      name: 'Caribbean',
      description: 'Jamaica, Virgin Islands, etc.',
      countries: ['Jamaica', 'British Virgin Islands', 'U.S. Virgin Islands', 'Saint Kitts and Nevis']
    },
    'Africa': {
      name: 'Africa',
      description: 'Ghana, Nigeria, South Africa, etc.',
      countries: ['Ghana', 'Nigeria', 'South Africa', 'Uganda', 'Senegal', 'Malawi', 'Democratic Republic of the Congo']
    }
  }

  useEffect(() => {
    // Always auto-select all continents in the selected category
    switch (selectedType) {
      case 'international':
        setSelectedContinents(continentGroups.international)
        break
      case 'local':
        setSelectedContinents(continentGroups.local)
        break
      case 'mixed':
        setSelectedContinents([...continentGroups.international, ...continentGroups.local])
        break
    }
  }, [selectedType]) // Removed existingPreferences dependency to always auto-select

  const handleContinentToggle = (continent: string) => {
    setSelectedContinents(prev => {
      if (prev.includes(continent)) {
        // Only allow removal if we'll still have at least 1 continent
        const newContinents = prev.filter(c => c !== continent)
        return newContinents.length >= 1 ? newContinents : prev
      } else {
        return [...prev, continent]
      }
    })
  }

  const handleContinue = () => {
    onPreferencesSet({
      preferredContinents: selectedContinents,
      preferenceType: selectedType
    })
  }

  const getContinentsToShow = () => {
    switch (selectedType) {
      case 'international':
        return continentGroups.international
      case 'local':
        return continentGroups.local
      case 'mixed':
        return [...continentGroups.international, ...continentGroups.local]
      default:
        return continentGroups.international
    }
  }

  const continentsToShow = getContinentsToShow()

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-500/20 rounded-full">
              <Music className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Your Music Journey!</CardTitle>
          <CardDescription className="text-zinc-400">
            Help us personalize your experience by selecting your music preferences based on regions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Preference Type Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">What type of music do you prefer?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant={selectedType === 'mixed' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedType === 'mixed' 
                    ? 'bg-green-500 hover:bg-green-600 text-black' 
                    : 'border-zinc-600 hover:bg-zinc-800'
                }`}
                onClick={() => setSelectedType('mixed')}
              >
                <div className="flex">
                  <Globe className="h-5 w-5" />
                  <MapPin className="h-5 w-5 -ml-1" />
                </div>
                <div className="text-center">
                  <div className="font-medium">Both</div>
                  <div className="text-xs opacity-80">Mix of international & local</div>
                </div>
              </Button>
              
              <Button
                variant={selectedType === 'international' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedType === 'international' 
                    ? 'bg-green-500 hover:bg-green-600 text-black' 
                    : 'border-zinc-600 hover:bg-zinc-800'
                }`}
                onClick={() => setSelectedType('international')}
              >
                <Globe className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">International</div>
                  <div className="text-xs opacity-80">Global hits & popular music</div>
                </div>
              </Button>
              
              <Button
                variant={selectedType === 'local' ? 'default' : 'outline'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  selectedType === 'local' 
                    ? 'bg-green-500 hover:bg-green-600 text-black' 
                    : 'border-zinc-600 hover:bg-zinc-800'
                }`}
                onClick={() => setSelectedType('local')}
              >
                <MapPin className="h-6 w-6" />
                <div className="text-center">
                  <div className="font-medium">Local</div>
                  <div className="text-xs opacity-80">African music</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Continent Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Select your preferred regions 
              <span className="text-sm font-normal text-zinc-400 ml-2">
                (Select at least 1 region - uncheck any you don't want)
              </span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {continentsToShow.map((continent) => {
                const details = continentDetails[continent]
                return (
                  <Card
                    key={continent}
                    className={`cursor-pointer transition-all border-2 ${
                      selectedContinents.includes(continent)
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-zinc-600 hover:border-zinc-500 bg-zinc-800/50'
                    }`}
                    onClick={() => handleContinentToggle(continent)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {selectedContinents.includes(continent) && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                            <h4 className="font-medium">{details.name}</h4>
                          </div>
                          <p className="text-sm text-zinc-400 mb-2">{details.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {details.countries.slice(0, 4).map((country) => (
                              <Badge key={country} variant="outline" className="text-xs border-zinc-600">
                                {country}
                              </Badge>
                            ))}
                            {details.countries.length > 4 && (
                              <Badge variant="outline" className="text-xs border-zinc-600">
                                +{details.countries.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {selectedContinents.length > 0 && (
              <p className="text-sm mt-3 text-green-400">
                {selectedContinents.length} region{selectedContinents.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onSkip}
              className="border-zinc-600 hover:bg-zinc-800"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleContinue}
              disabled={selectedContinents.length < 1}
              className="bg-green-500 hover:bg-green-600 text-black flex-1"
            >
              Continue with {selectedContinents.length} region{selectedContinents.length !== 1 ? 's' : ''}
            </Button>
          </div>
          
          <p className="text-xs text-zinc-500 text-center">
            You can always change these preferences later in your profile settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}