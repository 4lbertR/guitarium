const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const admins = ['Julia Reinman', 'admin'];

require('dotenv').config();

const key = {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
};

const config = require(path.join(__dirname, 'config.json'));

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const calendarId = process.env.GOOGLE_CALENDAR_ID;
const JWT_SECRET = process.env.JWT_SECRET;

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
    const db = await mysql.createConnection(DB_CONFIG);
    const [rows] = await db.execute('SELECT password, grupp, id, fullname FROM users WHERE fullname =?LIMIT 1', [fullname]);
    await db.end();
    if (rows.length === 0) return { match: false };

    const passwordMatch = bcrypt.compareSync(password, rows[0].password);
    if (passwordMatch) {
        const token = jwt.sign({ userId: rows[0].id, group: rows[0].grupp, fullname: rows[0].fullname },
            JWT_SECRET, { expiresIn: '1h' }
        );
        return { match: true, token: token };
    } else {
        return { match: false };
    }
}

async function listEvents(groupFilter) {
    const months = {
        '01': 'jaanuar',
        '02': 'veebruar',
        '03': 'märts',
        '04': 'aprill',
        '05': 'mai',
        '06': 'juuni',
        '07': 'juuli',
        '08': 'august',
        '09': 'september',
        '10': 'oktoober',
        '11': 'november',
        '12': 'detsember'
    };

    const futevents = {};
    const pastevents = {};

    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const result = await calendar.events.list({
        calendarId,
        maxResults: 130,
        singleEvents: true,
        orderBy: 'startTime'
    });

    (result.data.items || []).forEach(event => {
        const start = event.start?.dateTime;
        const end = event.end?.dateTime;
        const desc = event.summary;
        const eventId = event.id;
        const joined = (event.description || '')
            .split(/\s+/)
            .filter(x => /^\d+$/.test(x.trim()))
            .map(Number);

        if (!start || !end || !desc) return;

        const when = [
            start.slice(0, 4),
            months[start.slice(5, 7)],
            start.slice(8, 10),
            start.slice(11, 16),
            end.slice(11, 16),
            eventId,
            joined
        ];

        const startTime = new Date(start);
        const target = startTime > now?futevents : pastevents;
        if (!target[desc]) target[desc] = [];
        target[desc].push(when);
    });

    return {
        future: groupFilter?futevents[groupFilter] || [] : futevents,
        past: groupFilter?pastevents[groupFilter] || [] : pastevents
    };
}
async function createAccount(fullname, password, group) {
    if (!fullname || !password || !group) {
        return { success: false, message: 'Full name, password, and group are required.' };
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const db = await mysql.createConnection(DB_CONFIG);
        const [result] = await db.execute(
            'INSERT INTO users (fullname, password, grupp) VALUES (?, ?, ?)', [fullname, hashedPassword, group]
        );
        await db.end();

        if (result.affectedRows === 1) {
            return { success: true, message: 'Konto on loodud', userId: result.insertId };
        } else { return { success: false, message: 'Failed to create account.' }; }

    } catch (error) {
        console.error('Error creating account:', error.message);
        if (error.code === 'ER_DUP_ENTRY') { return { success: false, message: 'User with this full name already exists.' }; }
        return { success: false, message: 'An internal server error occurred.' };
    }
}
async function join(eventId, userId) {
    if (typeof userId !== 'number') {
        console.error('Error: userId is not a number in join function!', userId);
        return { success: false, reason: 'invalid_user_id_type' };
    }
    if (typeof eventId !== 'string') {
        console.error('Error: eventId is not a string in join function!', eventId);
        return { success: false, reason: 'invalid_event_id_type' };
    }

    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const allEvents = await calendar.events.list({
        calendarId,
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime'
    });

    const db = await mysql.createConnection(DB_CONFIG);
    const [rows] = await db.execute('SELECT grupp FROM users WHERE id = ?', [userId]);
    const group = rows[0]?.grupp;
    await db.end();

    const max = config[group]?.max || Infinity;
    const ofEnabled = config[group]?.of === true;

    const userFutureJoins = (allEvents.data.items || []).filter(event => {
        const joined = (event.description || '')
            .split(/\s+/)
            .filter(x => /^\d+$/.test(x.trim()))
            .map(Number);
        const start = event.start?.datetime?new Date(event.start.dateTime) : null;
        return start && joined.includes(userId) && start > new Date();
    }).length;

    if (!ofEnabled && userFutureJoins >= max) {
        return { success: false, reason: 'overflow' };
    }

    const res = await calendar.events.get({ calendarId, eventId });
    let ids = (res.data.description || '')
        .split(/\s+/)
        .filter(x => /^\d+$/.test(x.trim()))
        .map(Number);

    if (ids.includes(userId)) {
        return { success: true };
    }
    if (ids.length >= max) {
        return { success: false, reason: 'full' };
    }

    ids.push(userId);
    const newDescription = ids.join('\n');

    await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: { description: newDescription }
    });

    return { success: true };
}

async function leave(eventId, userId) {
    if (typeof userId !== 'number') {
        console.error('Error: userId is not a number in leave function!', userId);
        return { success: false, reason: 'invalid_user_id_type' };
    }
    if (typeof eventId !== 'string') {
        console.error('Error: eventId is not a string in leave function!', eventId);
        return { success: false, reason: 'invalid_event_id_type' };
    }

    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const res = await calendar.events.get({ calendarId, eventId });
    const event = res.data;

    const start = new Date(event.start?.datetime);
    const now = new Date();
    const diffMins = (start - now) / 60000;

    if (diffMins < 1440) {
        return { success: false, reason: 'too_late' };
    }

    const ids = (event.description || '')
        .split(/\s+/)
        .filter(x => /^\d+$/.test(x.trim()))
        .map(Number);

    const filtered = ids.filter(x => x !== userId);
    const newDescription = filtered.join('\n');

    await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: { description: filtered.join('\n') }
    });

    return { success: true };
}

async function getParticipants(eventId) {
    if (typeof eventId !== 'string') {
        console.error('Error: eventId is not a string in getParticipants function!', eventId);
        return [];
    }

    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const res = await calendar.events.get({ calendarId, eventId });
    const ids = (res.data.description || '')
        .split(/\s+/)
        .filter(x => /^\d+$/.test(x.trim()))
        .map(Number);

    if (ids.length === 0) {
        return [];
    }

    const db = await mysql.createConnection(DB_CONFIG);
    const [rows] = await db.query(
        `SELECT id, fullname FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
    );
    await db.end();

    return rows.map(row => {
        const trimmed = row.fullname.replace(/(^\S+)\s(\S)\S*/, '$1 $2');
        return { fullname: trimmed };
    });
}

function setupAppRoutes(app) {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static('static'));
    app.use(express.static(__dirname));

    app.post('/login', async(req, res) => {
        const { fullname, password } = req.body;
        if (!fullname || !password) {
            return res.status(400).json({ success: false, message: 'Missing login fields' });
        }

        try {
            const result = await checkLogin(fullname, password);
            if (result.match) {
                if (admins.includes(fullname)) { res.json({ success: true, token: result.token, admin: true }); } else { res.json({ success: true, token: result.token }) }
            } else {
                res.json({ success: false, message: 'Vale nimi või parool' });
            }
        } catch (err) {
            console.error('Login error:', err.message);
            res.status(500).json({ success: false, message: 'Internal server error during login' });
        }
    });

    app.get('/config.json', (req, res) => {
        res.json(config);
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'index.html'));
    });

    // Apply authentication to all routes below this point
    app.use(authenticateToken);

    // This API endpoint allows any authenticated user to check their admin status
    app.get('/api/isadmin', (req, res) => {
        if (admins.includes(req.fullname)) {
            res.json({ admin: true });
        } else {
            res.status(403).json({ admin: false })
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

    app.get('/api/join', async(req, res) => {
        const { eventId } = req.query;
        const userId = req.userId;

        if (!userId) {
            return res.status(403).json({ success: false, reason: 'not_authenticated' });
        }
        if (!eventId) {
            return res.status(400).json({ success: false, reason: 'missing_event_id' });
        }

        try {
            const joined = await join(eventId, userId);
            res.json(joined);
        } catch (err) {
            console.error('Join failed:', err.message);
            res.status(500).json({ success: false, reason: 'internal_error', message: err.message });
        }
    });

    app.get('/api/leave', async(req, res) => {
        const { eventId } = req.query;
        const userId = req.userId;

        if (!userId) {
            return res.status(403).json({ success: false, reason: 'not_authenticated' });
        }
        if (!eventId) {
            return res.status(400).json({ success: false, reason: 'missing_event_id' });
        }

        try {
            const result = await leave(eventId, userId);
            res.json(result);
        } catch (err) {
            console.error('Leave failed:', err.message);
            res.status(500).json({ success: false, reason: 'internal_error', message: err.message });
        }
    });

    app.get('/api/getParticipants', async(req, res) => {
        const { eventId } = req.query;
        if (!eventId) {
            return res.status(400).json([]);
        }
        try {
            const participants = await getParticipants(eventId);
            res.json(participants);
        } catch (err) {
            console.error('Participant fetch failed:', err.message);
            res.status(500).json([]);
        }
    });

    app.get('/api/me', (req, res) => {
        if (req.userId && req.group) {
            res.json({ id: req.userId, group: req.group });
        } else {
            res.status(401).json({});
        }
    });

    app.post('/logout', (req, res) => {
        res.json({ success: true, message: 'Logged out successfully' });
    });

    // Apply requireAdmin middleware to all routes below this point
    // This ensures only admins can access these resources.
    app.use(requireAdmin);

    app.post('/api/create-account', async(req, res) => {
        const { fullname, password, group } = req.body;
        const result = await createAccount(fullname, password, group);
        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    });

    app.get('/admin/createacc', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'createacc.html'));
    });

    app.get('/admin/index.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'index.html'));
    });
}

module.exports = { sucess: setupAppRoutes };