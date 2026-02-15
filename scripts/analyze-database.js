const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Music-Api-Downloader/.env') });

console.log('🔍 Analyzing MySQL Database Structure...');
console.log('Database:', process.env.DB_NAME);
console.log('Host:', process.env.DB_HOST);
console.log('=' .repeat(60));

// Database connection config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
};

// Function to get all tables
async function getTables(connection) {
    const [rows] = await connection.execute('SHOW TABLES');
    return rows.map(row => Object.values(row)[0]);
}

// Function to get table schema
async function getTableSchema(connection, tableName) {
    const [rows] = await connection.execute(`DESCRIBE ${tableName}`);
    return rows;
}

// Function to get table row count
async function getTableCount(connection, tableName) {
    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    return rows[0].count;
}

// Function to get sample data
async function getSampleData(connection, tableName, limit = 3) {
    const [rows] = await connection.execute(`SELECT * FROM ${tableName} LIMIT ${limit}`);
    return rows;
}

// Function to check if column exists
async function columnExists(connection, tableName, columnName) {
    const [rows] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [process.env.DB_NAME, tableName, columnName]);
    return rows.length > 0;
}

// Main analysis function
async function analyzeDatabase() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
        
        // Get all tables
        const tables = await getTables(connection);
        console.log(`📊 Found ${tables.length} tables: ${tables.join(', ')}`);
        
        for (const tableName of tables) {
            console.log(`\n🔸 TABLE: ${tableName}`);
            console.log('-'.repeat(40));
            
            // Get row count
            const count = await getTableCount(connection, tableName);
            console.log(`📈 Row count: ${count.toLocaleString()}`);
            
            // Get schema
            const schema = await getTableSchema(connection, tableName);
            console.log('📋 Schema:');
            schema.forEach(column => {
                const nullable = column.Null === 'YES' ? 'NULL' : 'NOT NULL';
                const defaultVal = column.Default ? ` DEFAULT ${column.Default}` : '';
                const key = column.Key ? ` ${column.Key}` : '';
                const extra = column.Extra ? ` ${column.Extra}` : '';
                console.log(`   ${column.Field}: ${column.Type}${key} ${nullable}${defaultVal}${extra}`);
            });
            
            // Get sample data (only for smaller tables or limit for large ones)
            if (count > 0 && count < 100) {
                console.log('📄 Sample data:');
                const samples = await getSampleData(connection, tableName, 2);
                samples.forEach((row, index) => {
                    console.log(`   Row ${index + 1}:`, JSON.stringify(row, null, 2));
                });
            } else if (count > 0) {
                console.log('📄 Sample data (first 2 rows):');
                const samples = await getSampleData(connection, tableName, 2);
                samples.forEach((row, index) => {
                    // For large tables, show only key fields
                    const keyFields = {};
                    Object.keys(row).slice(0, 5).forEach(key => {
                        keyFields[key] = row[key];
                    });
                    console.log(`   Row ${index + 1}:`, JSON.stringify(keyFields, null, 2));
                });
            }
        }
        
        // Focus on artists table
        console.log('\n' + '='.repeat(60));
        console.log('🎤 ARTISTS TABLE DETAILED ANALYSIS');
        console.log('='.repeat(60));
        
        const artistsExists = tables.includes('artists');
        if (artistsExists) {
            const artistCount = await getTableCount(connection, 'artists');
            console.log(`📊 Total artists: ${artistCount.toLocaleString()}`);
            
            // Check if country column already exists
            const hasCountry = await columnExists(connection, 'artists', 'country');
            
            if (hasCountry) {
                console.log('✅ Country column already exists');
                
                // Check how many artists have country data
                const [countryStats] = await connection.execute(`
                    SELECT 
                        COUNT(*) as total,
                        COUNT(country) as with_country,
                        COUNT(*) - COUNT(country) as without_country
                    FROM artists
                `);
                
                console.log('📈 Country data stats:');
                console.log(`   Total artists: ${countryStats[0].total}`);
                console.log(`   With country: ${countryStats[0].with_country}`);
                console.log(`   Without country: ${countryStats[0].without_country}`);
                
                // Show country distribution
                const [countryDist] = await connection.execute(`
                    SELECT country, COUNT(*) as count 
                    FROM artists 
                    WHERE country IS NOT NULL 
                    GROUP BY country 
                    ORDER BY count DESC 
                    LIMIT 10
                `);
                
                if (countryDist.length > 0) {
                    console.log('\n📍 Top countries:');
                    countryDist.forEach(row => {
                        console.log(`   ${row.country}: ${row.count} artists`);
                    });
                }
                
            } else {
                console.log('❌ No country column found - needs to be created');
                console.log('💡 Will need to add: ALTER TABLE artists ADD COLUMN country VARCHAR(100);');
            }
            
            // Show sample artist data
            console.log('\n📄 Sample artists:');
            const sampleArtists = await getSampleData(connection, 'artists', 5);
            sampleArtists.forEach((artist, index) => {
                console.log(`\n   Artist ${index + 1}:`);
                console.log(`     ID: ${artist.id}`);
                console.log(`     Name: ${artist.name}`);
                console.log(`     Popularity: ${artist.popularity || 'N/A'}`);
                if (artist.country) {
                    console.log(`     Country: ${artist.country}`);
                }
                if (artist.genres) {
                    try {
                        const genres = JSON.parse(artist.genres);
                        console.log(`     Genres: ${genres.slice(0, 3).join(', ')}${genres.length > 3 ? '...' : ''}`);
                    } catch (e) {
                        console.log(`     Genres: ${artist.genres}`);
                    }
                }
            });
            
            // Check for external URLs (needed for MusicBrainz matching)
            const artistSchema = await getTableSchema(connection, 'artists');
            const hasExternalUrls = artistSchema.find(col => col.Field.toLowerCase().includes('external'));
            
            console.log('\n🔗 External URL data:');
            if (hasExternalUrls) {
                console.log(`✅ Found external URLs column: ${hasExternalUrls.Field}`);
                
                // Check sample external URLs
                const [urlSamples] = await connection.execute(`
                    SELECT name, ${hasExternalUrls.Field} 
                    FROM artists 
                    WHERE ${hasExternalUrls.Field} IS NOT NULL 
                    LIMIT 3
                `);
                
                urlSamples.forEach((artist, index) => {
                    console.log(`   Artist ${index + 1}: ${artist.name}`);
                    try {
                        const urls = JSON.parse(artist[hasExternalUrls.Field]);
                        console.log(`     URLs:`, urls);
                    } catch (e) {
                        console.log(`     URLs: ${artist[hasExternalUrls.Field]}`);
                    }
                });
            } else {
                console.log('❌ No external URLs found - will need to use artist names for MusicBrainz search');
            }
            
        } else {
            console.log('❌ Artists table not found!');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ Database analysis complete!');
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Create country column if it doesn\'t exist');
        console.log('2. Use MusicBrainz API to fetch artist countries');
        console.log('3. Update artists table with country data');
        console.log('4. Modify content filtering to use country + genre');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Check your database credentials in .env file');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Database connection closed');
        }
    }
}

// Run the analysis
analyzeDatabase();