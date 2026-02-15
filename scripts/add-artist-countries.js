const mysql = require('mysql2/promise');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Music-Api-Downloader/.env') });

// Gemini AI configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Add this to your .env file
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

console.log('🌍 Adding country data to artists using MusicBrainz API...');

// AI Configuration
const useOllama = false; // Set to true to use Ollama instead of Gemini
const OLLAMA_MODEL = 'qwen3-vl:4b';
const OLLAMA_BASE_URL = 'http://localhost:11434';



// Database connection config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
};

// MusicBrainz API configuration
const MUSICBRAINZ_BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'MusicStreamApp/1.0 (owusutm35@gmail.com)'; // Required by MusicBrainz
const RATE_LIMIT_DELAY = 1000; // 1 second between requests (MusicBrainz requirement)

// Function to detect artist country using Gemini AI with retry logic
async function detectCountryWithAI(artistName, retryCount = 0) {
    if (useOllama) {
        return await detectCountryWithOllama(artistName);
    } else {
        // For Gemini, we'll handle batching at a higher level
        // This function is kept for single artist fallback
        const results = await detectCountriesWithGeminiBatch([artistName], retryCount);
        return results[artistName] || null;
    }
}

// Function to detect artist country using Ollama
async function detectCountryWithOllama(artistName) {
    try {
        console.log(`🤖 Using Ollama (${OLLAMA_MODEL}) to detect country for: "${artistName}"`);
        
        const prompt = `You are a music expert with strict accuracy requirements. I need you to identify the country of origin for the artist "${artistName}".

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
- ONLY respond with a country name if you are 100% CERTAIN about the artist's origin
- If you have ANY doubt or uncertainty, respond with exactly "UNKNOWN"
- Do NOT guess or make assumptions based on name patterns or genres
- Do NOT provide multiple countries or explanations
- Use standard English country names only 
- Do NOT use abbreviations (US, UK, etc.)
- If the artist name seems made up, fictional, or you've never heard of them, respond "UNKNOWN"
- Better to say "UNKNOWN" than to guess incorrectly

EXAMPLES:
- If you know for certain: respond with just the country name
- If you're not sure: respond with "UNKNOWN"
- If you've never heard of the artist: respond with "UNKNOWN"

Artist name: "${artistName}"

Your response (country name or UNKNOWN):`;

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.0,  // Most conservative - no randomness
                top_p: 0.1,        // Very focused responses
                top_k: 1,          // Only consider the most likely token
                num_predict: 15    // Shorter responses to prevent elaboration
            }
        }, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const aiResponse = response.data?.response?.trim();
        
        if (!aiResponse) {
            console.log(`❌ Ollama: No response for "${artistName}"`);
            return null;
        }
        
        // Clean up the response
        const country = aiResponse
            .replace(/^Country:\s*/i, '')
            .replace(/[^\w\s]/g, '')
            .trim();
        
        if (country.toUpperCase() === 'UNKNOWN' || country.length === 0) {
            console.log(`❌ Ollama: Unknown country for "${artistName}"`);
            return null;
        }
        
        // Validate that it looks like a country name
        if (country.length > 50 || country.split(' ').length > 4) {
            console.log(`❌ Ollama: Invalid response format for "${artistName}": "${country}"`);
            return null;
        }
        
        console.log(`✅ Ollama detected: "${artistName}" -> ${country}`);
        return country;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Ollama: Connection refused - make sure Ollama is running on localhost:11434');
        } else {
            console.error(`❌ Ollama error for "${artistName}":`, error.message);
        }
        return null;
    }
}

// Function to detect artist countries using Gemini AI in batches
async function detectCountriesWithGeminiBatch(artistNames, retryCount = 0) {
    if (!GEMINI_API_KEY) {
        console.log('⚠️  Gemini API key not found, skipping AI detection');
        return {};
    }
    
    const maxRetries = 3;
    
    try {
        console.log(`🤖 Using Gemini to detect countries for ${artistNames.length} artists${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
        
        const artistList = artistNames.map((name, index) => `${index + 1}. ${name}`).join('\n');
        
        const prompt = `You are a music expert with strict accuracy requirements. I need you to identify the country of origin for each of these ${artistNames.length} artists.

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
- ONLY respond with a country name if you are 100% CERTAIN about the artist's origin
- If you have ANY doubt or uncertainty, respond with exactly "UNKNOWN"
- Do NOT guess or make assumptions based on name patterns or genres
- Use standard English country names only (e.g., "United States", "Nigeria", "United Kingdom", "Ghana", "South Africa")
- Do NOT use abbreviations (US, UK, etc.)
- If the artist name seems made up, fictional, or you've never heard of them, respond "UNKNOWN"
- Better to say "UNKNOWN" than to guess incorrectly

RESPONSE FORMAT - CRITICAL:
You MUST respond with exactly ${artistNames.length} lines, one for each artist.
Each line must be: [NUMBER]. [COUNTRY NAME OR UNKNOWN]

EXAMPLE FORMAT:
1. Ghana
2. United States
3. UNKNOWN
4. Nigeria
5. United Kingdom

Artists to identify:
${artistList}

Your response (MUST be ${artistNames.length} numbered lines):`;

      //  console.log(`📝 Sending prompt to Gemini:\n${prompt}\n`);

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 500, // Increased from 200 to handle more artists
                    topP: 0.8,
                    topK: 10
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        if (!aiResponse) {
            console.log(`❌ Gemini: No response for batch of ${artistNames.length} artists`);
            return {};
        }
        
        console.log(`📝 Gemini batch response:\n${aiResponse}`);
        console.log(`🔍 Debug - Raw response length: ${aiResponse.length} characters`);
        
        // Check if response seems complete (should have at least artistNames.length lines)
        const responseLines = aiResponse.split('\n').filter(line => line.trim());
        console.log(`🔍 Debug - Response lines (${responseLines.length}/${artistNames.length} expected):`, responseLines.map((line, i) => `${i}: "${line.trim()}"`));
        
        if (responseLines.length < artistNames.length) {
            console.log(`⚠️  Incomplete response: got ${responseLines.length} lines, expected ${artistNames.length}`);
            
            // If we have retries left and response is incomplete, retry
            if (retryCount < maxRetries) {
                console.log(`🔄 Retrying due to incomplete response...`);
                await sleep(2000);
                return await detectCountriesWithGeminiBatch(artistNames, retryCount + 1);
            } else {
                console.log(`❌ Max retries reached, processing partial response`);
            }
        }
        
        // Parse the response
        const results = {};
        const lines = aiResponse.split('\n').filter(line => line.trim());
        
        console.log(`🔍 Debug - Filtered lines (${lines.length}):`, lines);
        
        for (let i = 0; i < artistNames.length; i++) {
            const artistName = artistNames[i];
            let country = null;
            
            // Look for the numbered response - try multiple formats
            const expectedNumber = i + 1;
            let responseLine = lines.find(line => {
                const trimmed = line.trim();
                return (
                    trimmed.startsWith(`${expectedNumber}.`) || 
                    trimmed.startsWith(`${expectedNumber}:`) ||
                    trimmed.startsWith(`${expectedNumber} `) ||
                    trimmed.startsWith(`${expectedNumber})`)
                );
            });
            
            // If numbered format not found, try to match by position
            if (!responseLine && lines[i]) {
                responseLine = lines[i];
                console.log(`🔍 Debug - Using positional match for ${artistName}: "${responseLine}"`);
            }
            
            if (responseLine) {
                // Extract country from the line - try multiple extraction methods
                let countryMatch = responseLine
                    .replace(/^\d+[.:\s)]+/, '') // Remove number prefix
                    .trim();
                
                console.log(`🔍 Debug - Extracted for ${artistName}: "${countryMatch}"`);
                
                if (countryMatch && countryMatch.toUpperCase() !== 'UNKNOWN' && countryMatch.length > 0) {
                    // Clean up common response artifacts
                    countryMatch = countryMatch
                        .replace(/^(Country:|Answer:|Response:)/i, '')
                        .replace(/["""'']/g, '') // Remove quotes
                        .trim();
                    
                    // Validate that it looks like a country name
                    if (countryMatch.length <= 50 && countryMatch.split(' ').length <= 4 && !/^\d+$/.test(countryMatch)) {
                        country = countryMatch;
                    } else {
                        console.log(`🔍 Debug - Rejected "${countryMatch}" for ${artistName} (validation failed)`);
                    }
                } else {
                    console.log(`🔍 Debug - "${countryMatch}" treated as UNKNOWN for ${artistName}`);
                }
            } else {
                console.log(`🔍 Debug - No response line found for ${artistName}`);
            }
            
            results[artistName] = country;
            
            if (country) {
                console.log(`✅ Gemini batch result: "${artistName}" -> ${country}`);
            } else {
                console.log(`❌ Gemini batch result: "${artistName}" -> UNKNOWN/NULL`);
            }
        }
        
        return results;
        
    } catch (error) {
    console.log(error)
        if (error.response?.status === 429 && retryCount < maxRetries) {
            const waitTime = Math.pow(2, retryCount + 2) * 1000; // Exponential backoff: 4s, 8s, 16s
            console.log(`⏳ Gemini rate limit hit, waiting ${waitTime/1000}s before retry...`);
            await sleep(waitTime);
            return await detectCountriesWithGeminiBatch(artistNames, retryCount + 1);
        } else if (error.response?.status === 429) {
            console.log('❌ Gemini: Max retries reached for rate limit');
        } else if (error.response?.status === 403) {
            console.log('❌ Gemini: API key invalid or quota exceeded');
        } else {
            console.error(`❌ Gemini batch error:`, error.message);
        }
        return {};
    }
}

// Sleep function for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to search for artist in MusicBrainz
async function searchArtistInMusicBrainz(artistName, spotifyId = null) {
    try {
        // Clean artist name for better search results - preserve Unicode letters
        const cleanName = artistName
            .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove special chars but keep Unicode letters and numbers
            .replace(/\s+/g, ' ')             // Normalize spaces
            .trim();
        
            
        console.log(`🔍 Searching MusicBrainz for: "${cleanName}" (original: "${artistName}")`);
        
        // Search by artist name
        const searchUrl = `${MUSICBRAINZ_BASE_URL}/artist`;
        const params = {
            query: `artist:"${cleanName}"`,
            fmt: 'json',
            limit: 5
        };
        
        const response = await axios.get(searchUrl, {
            params,
            headers: {
                'User-Agent': USER_AGENT
            },
            timeout: 60000
        });
        
        const artists = response.data.artists || [];
        
        if (artists.length === 0 && cleanName !== artistName) {
            // Try again with original name if cleaning changed it
            console.log(`🔄 Retrying with original name: "${artistName}"`);
            const fallbackParams = {
                query: `artist:"${artistName}"`,
                fmt: 'json',
                limit: 5
            };
            
            const fallbackResponse = await axios.get(searchUrl, {
                params: fallbackParams,
                headers: {
                    'User-Agent': USER_AGENT
                },
                timeout: 10000
            });
            
            const fallbackArtists = fallbackResponse.data.artists || [];
            if (fallbackArtists.length > 0) {
                console.log(`✅ Found results with original name!`);
                return await processMusicBrainzResults(fallbackArtists, artistName);
            }
        }
        
        if (artists.length === 0) {
            console.log(`❌ No results found for "${artistName}" (tried both cleaned and original)`);
            return null;
        }
        
        return await processMusicBrainzResults(artists, cleanName);
    } catch (error) {
        if (error.response?.status === 503) {
            console.log('⏳ MusicBrainz rate limit hit, waiting longer...');
            await sleep(5000); // Wait 5 seconds on rate limit
            return null;
        }
        
        console.error(`❌ Error searching for "${artistName}":`, error.message);
        return null;
    }
}

// Helper function to process MusicBrainz search results
async function processMusicBrainzResults(artists, searchName) {
        
        // Try to find the best match
        let bestMatch = null;
        
        // First, try exact name match
        for (const artist of artists) {
            if (artist.name.toLowerCase() === searchName.toLowerCase()) {
                bestMatch = artist;
                break;
            }
        }
        
        // If no exact match, use the first result with highest score
        if (!bestMatch && artists.length > 0) {
            bestMatch = artists[0];
        }
        
        if (bestMatch) {
            const country = extractCountryFromArtist(bestMatch);
            console.log(`✅ Found match: "${bestMatch.name}" -> ${country || 'Unknown'}`);
            
            return {
                musicbrainz_id: bestMatch.id,
                name: bestMatch.name,
                country: country,
                score: bestMatch.score || 100,
                area: bestMatch.area
            };
        }
        
        return null;
}

// Function to extract country from MusicBrainz artist data
function extractCountryFromArtist(artist) {
    // Try different sources for country information
    if (artist.area) {
        // Check if area has country info
        if (artist.area.iso_3166_1_codes && artist.area.iso_3166_1_codes.length > 0) {
            return artist.area.iso_3166_1_codes[0]; // Return ISO country code
        }
        
        // Use area name as country
        if (artist.area.name) {
            return mapAreaToCountry(artist.area.name);
        }
    }
    
    // Check begin_area (birth place for persons)
    if (artist.begin_area) {
        if (artist.begin_area.iso_3166_1_codes && artist.begin_area.iso_3166_1_codes.length > 0) {
            return artist.begin_area.iso_3166_1_codes[0];
        }
        
        if (artist.begin_area.name) {
            return mapAreaToCountry(artist.begin_area.name);
        }
    }
    
    return null;
}

// Function to map area names to standard country names
function mapAreaToCountry(areaName) {
    const countryMappings = {
        // Common area name mappings
        'United States': 'United States',
        'United Kingdom': 'United Kingdom',
        'Canada': 'Canada',
        'Australia': 'Australia',
        'Germany': 'Germany',
        'France': 'France',
        'Italy': 'Italy',
        'Spain': 'Spain',
        'Netherlands': 'Netherlands',
        'Sweden': 'Sweden',
        'Norway': 'Norway',
        'Denmark': 'Denmark',
        'Finland': 'Finland',
        'Japan': 'Japan',
        'South Korea': 'South Korea',
        'China': 'China',
        'India': 'India',
        'Brazil': 'Brazil',
        'Mexico': 'Mexico',
        'Argentina': 'Argentina',
        'Chile': 'Chile',
        'Colombia': 'Colombia',
        'Peru': 'Peru',
        'Venezuela': 'Venezuela',
        'South Africa': 'South Africa',
        'Nigeria': 'Nigeria',
        'Ghana': 'Ghana',
        'Kenya': 'Kenya',
        'Egypt': 'Egypt',
        'Morocco': 'Morocco',
        'Tunisia': 'Tunisia',
        'Algeria': 'Algeria',
        'Jamaica': 'Jamaica',
        'Trinidad and Tobago': 'Trinidad and Tobago',
        'Barbados': 'Barbados',
        'Cuba': 'Cuba',
        'Puerto Rico': 'Puerto Rico',
        'Dominican Republic': 'Dominican Republic',
        'Haiti': 'Haiti',
        'Russia': 'Russia',
        'Ukraine': 'Ukraine',
        'Poland': 'Poland',
        'Czech Republic': 'Czech Republic',
        'Hungary': 'Hungary',
        'Romania': 'Romania',
        'Bulgaria': 'Bulgaria',
        'Greece': 'Greece',
        'Turkey': 'Turkey',
        'Israel': 'Israel',
        'Iran': 'Iran',
        'Iraq': 'Iraq',
        'Saudi Arabia': 'Saudi Arabia',
        'UAE': 'United Arab Emirates',
        'Lebanon': 'Lebanon',
        'Jordan': 'Jordan',
        'Syria': 'Syria',
        'Pakistan': 'Pakistan',
        'Bangladesh': 'Bangladesh',
        'Sri Lanka': 'Sri Lanka',
        'Thailand': 'Thailand',
        'Vietnam': 'Vietnam',
        'Malaysia': 'Malaysia',
        'Singapore': 'Singapore',
        'Indonesia': 'Indonesia',
        'Philippines': 'Philippines',
        'New Zealand': 'New Zealand'
    };
    
    // Direct mapping
    if (countryMappings[areaName]) {
        return countryMappings[areaName];
    }
    
    // Try partial matches for common cases
    const lowerArea = areaName.toLowerCase();
    
    if (lowerArea.includes('united states') || lowerArea.includes('usa') || lowerArea === 'us') {
        return 'United States';
    }
    if (lowerArea.includes('united kingdom') || lowerArea.includes('uk') || lowerArea === 'britain') {
        return 'United Kingdom';
    }
    if (lowerArea.includes('south africa')) {
        return 'South Africa';
    }
    
    // Return the original area name if no mapping found
    return areaName;
}

// Function to get artists without country data
async function getArtistsWithoutCountry(connection, limit = 50, offset = 0) {
    try {
        const [rows] = await connection.execute(`
            SELECT id, name, external_urls 
            FROM artists 
            WHERE country IS NULL OR country IN ('UNKNOWN', 'ERROR')
            ORDER BY id ASC 
            LIMIT ${limit} OFFSET ${offset}
        `);
        
        return rows;
    } catch (error) {
        console.error('Error in getArtistsWithoutCountry:', error.message);
        throw error;
    }
}

// Function to update artist country
async function updateArtistCountry(connection, artistId, country, musicbrainzId = null) {
    try {
        // First check current country value and log it
        const [existing] = await connection.execute(`
            SELECT country FROM artists WHERE id = ?
        `, [artistId]);
        
        const currentCountry = existing[0]?.country;
        console.log(`🔍 Artist ${artistId} - Current country: ${currentCountry === null ? 'NULL' : `"${currentCountry}"`} -> Updating to: "${country}"`);
        
        // Skip if artist already has a valid country (not NULL, UNKNOWN, or ERROR)
        if (existing[0] && existing[0].country && !['UNKNOWN', 'ERROR'].includes(existing[0].country)) {
            console.log(`⏭️  Skipping ${artistId} - already has valid country: ${existing[0].country}`);
            return false;
        }
        
        // Update the country (allows overwriting NULL, UNKNOWN, ERROR)
        const [result] = await connection.execute(`
            UPDATE artists 
            SET country = ? 
            WHERE id = ? AND (country IS NULL OR country IN ('UNKNOWN', 'ERROR'))
        `, [country, artistId]);
        
        if (result.affectedRows > 0) {
            console.log(`✅ Successfully updated artist ${artistId}: ${currentCountry === null ? 'NULL' : `"${currentCountry}"`} -> "${country}"`);
            return true;
        } else {
            console.log(`⚠️  No rows affected for artist ${artistId} (may have been updated by another process)`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error updating artist ${artistId}:`, error.message);
        return false;
    }
}

// Function to get statistics
async function getCountryStats(connection) {
    try {
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_artists,
                SUM(CASE WHEN country IS NOT NULL AND country NOT IN ('UNKNOWN', 'ERROR') THEN 1 ELSE 0 END) as artists_with_country,
                SUM(CASE WHEN country IS NULL OR country IN ('UNKNOWN', 'ERROR') THEN 1 ELSE 0 END) as artists_without_country,
                SUM(CASE WHEN country = 'UNKNOWN' THEN 1 ELSE 0 END) as artists_unknown,
                SUM(CASE WHEN country = 'ERROR' THEN 1 ELSE 0 END) as artists_error,
                SUM(CASE WHEN country IS NULL THEN 1 ELSE 0 END) as artists_null
            FROM artists
        `);
        
        const [topCountries] = await connection.execute(`
            SELECT country, COUNT(*) as count 
            FROM artists 
            WHERE country IS NOT NULL AND country NOT IN ('UNKNOWN', 'ERROR')
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 10
        `);
        
        return {
            stats: stats[0],
            topCountries
        };
    } catch (error) {
        console.error('Error in getCountryStats:', error.message);
        throw error;
    }
}

// Main function
async function addArtistCountries() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
        
        // Get initial statistics
        const initialStats = await getCountryStats(connection);
        console.log('\n📊 Initial Statistics:');
        console.log(`   Total artists: ${initialStats.stats.total_artists}`);
        console.log(`   With country: ${initialStats.stats.artists_with_country}`);
        console.log(`   Without country: ${initialStats.stats.artists_without_country}`);
        
        if (initialStats.stats.artists_without_country === 0) {
            console.log('✅ All artists already have country data!');
            return;
        }
        
        console.log('\n🚀 Starting MusicBrainz lookup process...');
        console.log('⏳ This may take a while due to API rate limits (1 request per second)');
        
        let processedCount = 0;
        let successCount = 0;
        let musicbrainzSuccessCount = 0;
        let aiSuccessCount = 0;
        let errorCount = 0;
        
        // Process artists in batches
        const batchSize = 10; // 50
        let offset = 0;
        let totalProcessedCount = 0;
        
        console.log(`\n🎯 Target: Process ${initialStats.stats.artists_without_country} artists without country data`);
        
        while (totalProcessedCount < initialStats.stats.artists_without_country) {
            const artists = await getArtistsWithoutCountry(connection, batchSize, offset);
            
            if (artists.length === 0) {
                console.log('✅ No more artists without country data found');
                break;
            }
            
            console.log(`\n📦 Processing batch ${Math.floor(offset/batchSize) + 1}: ${artists.length} artists (offset: ${offset})...`);
            
            let batchSuccessCount = 0;
            
            // Step 1: Try MusicBrainz for all artists first
            const musicbrainzResults = [];
            const failedArtists = [];
            
            for (const artist of artists) {
                processedCount++;
                totalProcessedCount++;
                
                console.log(`\n[${processedCount}] Processing: ${artist.name} (ID: ${artist.id})`);
                console.log(`📋 Artist Details - Name: "${artist.name}", ID: ${artist.id}, Current Country: checking...`);
                
                try {
                    // First try MusicBrainz API
                    const result = await searchArtistInMusicBrainz(artist.name, artist.id);
                    
                    if (result && result.country) {
                        // Update database with found country
                        const updated = await updateArtistCountry(connection, artist.id, result.country, result.musicbrainz_id);
                        if (updated) {
                            successCount++;
                            musicbrainzSuccessCount++;
                            batchSuccessCount++;
                            console.log(`✅ MusicBrainz SUCCESS: ${artist.name} -> ${result.country}`);
                        } else {
                            console.log(`⏭️  MusicBrainz SKIPPED: ${artist.name} - already has country or update failed`);
                        }
                    } else {
                        // MusicBrainz failed, add to AI processing queue
                        console.log(`🔄 MusicBrainz failed for "${artist.name}", queuing for AI batch processing...`);
                        failedArtists.push(artist);
                    }
                    
                    // Rate limiting for MusicBrainz
                    await sleep(RATE_LIMIT_DELAY);
                    
                } catch (error) {
                    console.error(`❌ Error processing ${artist.name}:`, error.message);
                    failedArtists.push(artist);
                }
            }
            
            // Step 2: Process failed artists with AI in batches (only for Gemini)
            if (failedArtists.length > 0) {
                if (useOllama) {
                    // Process individually with Ollama (no batching needed)
                    console.log(`\n🤖 Processing ${failedArtists.length} failed artists with Ollama individually...`);
                    
                    for (const artist of failedArtists) {
                        try {
                            const aiCountry = await detectCountryWithOllama(artist.name);
                            
                            if (aiCountry) {
                                const updated = await updateArtistCountry(connection, artist.id, aiCountry, null);
                                if (updated) {
                                    successCount++;
                                    aiSuccessCount++;
                                    batchSuccessCount++;
                                    console.log(`✅ Ollama SUCCESS: ${artist.name} -> ${aiCountry}`);
                                } else {
                                    console.log(`⏭️  Ollama SKIPPED: ${artist.name} - already has country or update failed`);
                                }
                            } else {
                                const updated = await updateArtistCountry(connection, artist.id, 'UNKNOWN', null);
                                if (updated) {
                                    console.log(`❌ MARKED UNKNOWN: ${artist.name} - Ollama couldn't determine country`);
                                }
                                errorCount++;
                            }
                            
                            await sleep(100); // Short delay for Ollama
                        } catch (error) {
                            console.error(`❌ Ollama error for ${artist.name}:`, error.message);
                            errorCount++;
                        }
                    }
                } else {
                    // Process in batches of 5 with Gemini (reduced from 10 for better reliability)
                    console.log(`\n🤖 Processing ${failedArtists.length} failed artists with Gemini in batches of 5...`);
                    
                    const AI_BATCH_SIZE = 5;
                    for (let i = 0; i < failedArtists.length; i += AI_BATCH_SIZE) {
                        const batch = failedArtists.slice(i, i + AI_BATCH_SIZE);
                        const artistNames = batch.map(a => a.name);
                        
                        console.log(`\n🔄 Processing AI batch ${Math.floor(i/AI_BATCH_SIZE) + 1}: ${batch.length} artists`);
                        
                        try {
                            const aiResults = await detectCountriesWithGeminiBatch(artistNames);
                            
                            // Process results
                            for (const artist of batch) {
                                const aiCountry = aiResults[artist.name];
                                
                                if (aiCountry) {
                                    const updated = await updateArtistCountry(connection, artist.id, aiCountry, null);
                                    if (updated) {
                                        successCount++;
                                        aiSuccessCount++;
                                        batchSuccessCount++;
                                        console.log(`✅ Gemini BATCH SUCCESS: ${artist.name} -> ${aiCountry}`);
                                    } else {
                                        console.log(`⏭️  Gemini BATCH SKIPPED: ${artist.name} - already has country or update failed`);
                                    }
                                } else {
                                    const updated = await updateArtistCountry(connection, artist.id, 'UNKNOWN', null);
                                    if (updated) {
                                        console.log(`❌ MARKED UNKNOWN: ${artist.name} - Gemini couldn't determine country`);
                                    }
                                    errorCount++;
                                }
                            }
                            
                            // Delay between batches
                            await sleep(2000);
                            
                        } catch (error) {
                            console.error(`❌ Gemini batch error:`, error.message);
                            // Mark all artists in failed batch as UNKNOWN
                            for (const artist of batch) {
                                try {
                                    await updateArtistCountry(connection, artist.id, 'UNKNOWN', null);
                                    console.log(`❌ MARKED UNKNOWN: ${artist.name} - Gemini batch failed`);
                                    errorCount++;
                                } catch (updateError) {
                                    console.error(`Failed to mark ${artist.name} as UNKNOWN:`, updateError.message);
                                }
                            }
                        }
                    }
                }
            }
            
            console.log(`\n✅ Batch completed: ${batchSuccessCount}/${artists.length} artists updated`);
            offset += batchSize;
            
            // Progress update every 10 artists
            if (processedCount % 10 === 0) {
                console.log(`\n📈 Progress: ${processedCount} processed, ${successCount} successful, ${errorCount} errors`);
                
                // Get updated stats to see progress
                const currentStats = await getCountryStats(connection);
                console.log(`📊 Current: ${currentStats.stats.artists_with_country} with country, ${currentStats.stats.artists_without_country} remaining`);
            }
            
            // Safety check: if we've processed more than expected, break
            if (totalProcessedCount >= initialStats.stats.artists_without_country * 1.2) {
                console.log('⚠️  Processed more artists than expected, stopping to avoid infinite loop');
                break;
            }
        }
        
        // Final statistics
        console.log('\n' + '='.repeat(60));
        console.log('🎉 PROCESS COMPLETED!');
        console.log('='.repeat(60));
        
        const finalStats = await getCountryStats(connection);
        console.log('\n📊 Final Statistics:');
        console.log(`   Total artists: ${finalStats.stats.total_artists}`);
        console.log(`   With valid country: ${finalStats.stats.artists_with_country}`);
        console.log(`   Without country (NULL): ${finalStats.stats.artists_null}`);
        console.log(`   Unknown (no data found): ${finalStats.stats.artists_unknown}`);
        console.log(`   Error (processing errors): ${finalStats.stats.artists_error}`);
        console.log(`   Total needing processing: ${finalStats.stats.artists_without_country}`);
        console.log(`   Processed: ${processedCount}`);
        console.log(`   Successful: ${successCount} (MusicBrainz: ${musicbrainzSuccessCount}, AI: ${aiSuccessCount})`);
        console.log(`   Errors: ${errorCount}`);
        
        if (finalStats.topCountries.length > 0) {
            console.log('\n🌍 Top Countries:');
            finalStats.topCountries.forEach((country, index) => {
                console.log(`   ${index + 1}. ${country.country}: ${country.count} artists`);
            });
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔒 Database connection closed');
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Process interrupted by user');
    process.exit(0);
});

// Test function for debugging AI responses
async function testAIResponse(artistName) {
    console.log(`\n🧪 Testing AI response for: ${artistName}`);
    
    if (useOllama) {
        const result = await detectCountryWithOllama(artistName);
        console.log(`🤖 Ollama result: ${result}`);
    } else {
        const results = await detectCountriesWithGeminiBatch([artistName]);
        console.log(`🤖 Gemini result: ${results[artistName]}`);
    }
}

// Run the script
addArtistCountries();