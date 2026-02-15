const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../Music-Api-Downloader/.env') });

console.log('🔧 Adding country column to artists table...');

// Database connection config
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
};

async function addCountryColumn() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL database');
        
        // Check if country column already exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'country'
        `, [process.env.DB_NAME]);
        
        if (columns.length > 0) {
            console.log('✅ Country column already exists');
            return;
        }
        
        // Add country column
        await connection.execute(`
            ALTER TABLE artists 
            ADD COLUMN country VARCHAR(100) NULL AFTER genres,
            ADD INDEX idx_country (country)
        `);
        
        console.log('✅ Successfully added country column with index');
        
        // Verify the column was added
        const [newColumns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'country'
        `, [process.env.DB_NAME]);
        
        if (newColumns.length > 0) {
            console.log('✅ Column verification successful:', newColumns[0]);
        }
        
    } catch (error) {
        console.error('❌ Error adding country column:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔒 Database connection closed');
        }
    }
}

addCountryColumn();