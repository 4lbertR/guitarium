// Setup SQLite database for offline development
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Create/open database
const db = new sqlite3.Database('./guitarium.db');

// Create users table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        grupp TEXT NOT NULL
    )`);

    // Create some sample users
    const hashedPassword = bcrypt.hashSync('password123', 12);
    
    db.run(`INSERT OR IGNORE INTO users (fullname, password, grupp) VALUES 
        ('Julia Reinman', ?, 'admin'),
        ('Test User', ?, 'E1'),
        ('Another User', ?, 'B2')
    `, [hashedPassword, hashedPassword, hashedPassword]);

    console.log('SQLite database setup complete!');
});

db.close();