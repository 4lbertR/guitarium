// SQLite version for offline development
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

// For offline development - disable Google Calendar integration
const OFFLINE_MODE = true;

// SQLite database connection
const db = new sqlite3.Database('./guitarium.db');

const admins = ['Julia Reinman', 'admin'];

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'offline-dev-secret';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.userId = user.userId;
        req.group = user.group;
        req.fullname = user.fullname;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.fullname && admins.includes(req.fullname)) {
        next();
    } else {
        return res.status(403).json({ message: 'Admin access required' });
    }
}

async function checkLogin(fullname, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT password, grupp, id, fullname FROM users WHERE fullname = ? LIMIT 1', [fullname], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve({ match: false });

            const passwordMatch = bcrypt.compareSync(password, row.password);
            if (passwordMatch) {
                const token = jwt.sign(
                    { userId: row.id, group: row.grupp, fullname: row.fullname },
                    JWT_SECRET,
                    { expiresIn: '1h' }
                );
                resolve({ match: true, token: token });
            } else {
                resolve({ match: false });
            }
        });
    });
}

// Mock Google Calendar functions for offline development
async function listEvents(groupFilter) {
    // Return mock events for testing
    const mockEvents = {
        future: {
            'E1': [
                ['2024', 'jaanuar', '15', '14:00', '15:00', 'mock1', []],
                ['2024', 'jaanuar', '22', '14:00', '15:00', 'mock2', []]
            ]
        },
        past: {}
    };
    
    return {
        future: groupFilter ? mockEvents.future[groupFilter] || [] : mockEvents.future,
        past: groupFilter ? mockEvents.past[groupFilter] || [] : mockEvents.past
    };
}

function setupAppRoutes(app) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('static'));

    app.post('/login', async(req, res) => {
        const { fullname, password } = req.body;
        if (!fullname || !password) {
            return res.status(400).json({ success: false, message: 'Missing login fields' });
        }

        try {
            const result = await checkLogin(fullname, password);
            if (result.match) {
                if (admins.includes(fullname)) {
                    res.json({ success: true, token: result.token, admin: true });
                } else {
                    res.json({ success: true, token: result.token });
                }
            } else {
                res.json({ success: false, message: 'Vale nimi või parool' });
            }
        } catch (err) {
            console.error('Login error:', err.message);
            res.status(500).json({ success: false, message: 'Internal server error during login' });
        }
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'index.html'));
    });

    // Authentication required below
    app.use(authenticateToken);

    app.get('/api/isadmin', (req, res) => {
        if (admins.includes(req.fullname)) {
            res.json({ admin: true });
        } else {
            res.status(403).json({ admin: false });
        }
    });

    app.get('/success.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'success.html'));
    });

    app.get('/api/events', async(req, res) => {
        const group = req.group || null;
        try {
            const events = await listEvents(group);
            res.json(events);
        } catch (err) {
            console.error('Error fetching events:', err.message);
            res.status(500).json({ future: [], past: [], message: 'Error fetching events' });
        }
    });

    // Admin routes
    app.use(requireAdmin);

    app.get('/api/getusers', (req, res) => {
        db.all('SELECT fullname FROM users', (err, rows) => {
            if (err) return res.status(500).json([]);
            const users = rows.map(row => row.fullname);
            res.json(users);
        });
    });

    app.post('/api/create-account', (req, res) => {
        const { fullname, password, group } = req.body;
        if (!fullname || !password || !group) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const hashedPassword = bcrypt.hashSync(password, 12);
        
        db.run('INSERT INTO users (fullname, password, grupp) VALUES (?, ?, ?)', 
            [fullname, hashedPassword, group], 
            function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return res.status(400).json({ success: false, message: 'User already exists' });
                    }
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                res.json({ success: true, message: 'Konto on loodud', userId: this.lastID });
            }
        );
    });

    // Serve admin pages
    app.get('/admin/index.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'index.html'));
    });
    
    app.get('/admin/createacc', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'createacc.html'));
    });

    // Add other admin routes as needed...
}

module.exports = { success: setupAppRoutes };