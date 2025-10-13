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
    if (req.group== 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Admin access required' });
    }
}

async function checkLogin(fullname, password) {
    const db = await mysql.createConnection(DB_CONFIG);
    const [rows] = await db.execute('SELECT password, grupp, id, fullname FROM users WHERE fullname = ? LIMIT 1', [fullname]);
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

async function listEvents(groupFilter, userId = null) {
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
        const eventDescription = event.description || '';
        
        // Check if event is cancelled
        const isCancelled = eventDescription.trim() === 'TÜHISTATUD';
        
        const joined = isCancelled ? [] : eventDescription
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
            joined,
            isCancelled
        ];

        const startTime = new Date(start);
        const target = startTime > now ? futevents : pastevents;
        
        // If userId is provided, show lessons from user's group AND lessons where user is registered
        if (userId && groupFilter) {
            // Always include lessons from user's main group
            if (desc === groupFilter) {
                if (!target[desc]) target[desc] = [];
                target[desc].push(when);
            }
            // Also include lessons from other groups where user is registered
            else if (joined.includes(userId)) {
                const crossGroupKey = `${groupFilter}_cross_${desc}`;
                if (!target[crossGroupKey]) target[crossGroupKey] = [];
                // Add group name to the event data for display
                const crossGroupWhen = [...when];
                crossGroupWhen[8] = desc; // Add original group name as 9th element
                target[crossGroupKey].push(crossGroupWhen);
            }
        } else {
            // Original logic for admin or non-user-specific requests
            if (!target[desc]) target[desc] = [];
            target[desc].push(when);
        }
    });

    // For user-specific requests, flatten cross-group events into main group
    if (userId && groupFilter) {
        const flattenEvents = (events) => {
            const mainGroupEvents = events[groupFilter] || [];
            const crossGroupEvents = [];
            
            Object.keys(events).forEach(key => {
                if (key.startsWith(`${groupFilter}_cross_`)) {
                    crossGroupEvents.push(...events[key]);
                    delete events[key];
                }
            });
            
            return [...mainGroupEvents, ...crossGroupEvents];
        };

        const futureFlattened = flattenEvents(futevents);
        const pastFlattened = flattenEvents(pastevents);

        return {
            future: futureFlattened,
            past: pastFlattened
        };
    }

    return {
        future: groupFilter ? futevents[groupFilter] || [] : futevents,
        past: groupFilter ? pastevents[groupFilter] || [] : pastevents
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

    // Get the specific event first to check its group and current participants
    const res = await calendar.events.get({ calendarId, eventId });
    const event = res.data;
    
    // Get the lesson group from the event summary
    const lessonGroup = event.summary;
    const lessonMax = config[lessonGroup]?.max || Infinity;
    
    let ids = (event.description || '')
        .split(/\s+/)
        .filter(x => /^\d+$/.test(x.trim()))
        .map(Number);

    if (ids.includes(userId)) {
        return { success: true };
    }
    
    // Check if the lesson is already at capacity
    if (ids.length >= lessonMax) {
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

    const start = new Date(event.start?.dateTime);
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
        return { participants: [], max: 0, group: '' };
    }

    const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
    const authClient = await auth.getClient();
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const res = await calendar.events.get({ calendarId, eventId });
    const event = res.data;
    const lessonGroup = event.summary;
    const lessonMax = config[lessonGroup]?.max || Infinity;
    const eventDescription = event.description || '';
    
    // Check if event is cancelled
    if (eventDescription.trim() === 'TÜHISTATUD') {
        return { cancelled: true, participants: [], max: lessonMax, group: lessonGroup };
    }
    
    const ids = eventDescription
        .split(/\s+/)
        .filter(x => /^\d+$/.test(x.trim()))
        .map(Number);

    if (ids.length === 0) {
        return { participants: [], max: lessonMax, group: lessonGroup };
    }

    const db = await mysql.createConnection(DB_CONFIG);
    const [rows] = await db.query(
        `SELECT id, fullname FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
    );
    await db.end();

    const participants = rows.map(row => {
        const trimmed = row.fullname.replace(/(^\S+)\s(\S)\S*/, '$1 $2');
        return { fullname: trimmed };
    });

    return { participants, max: lessonMax, group: lessonGroup };
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
                if (admins.includes(fullname)) { res.json({ success: true, token: result.token, admin: true }); } else { res.json({ success: true, token: result.token }); }
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
            res.status(403).json({ admin: false });
        }
    });

    app.get('/success.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'success.html'));
    });

    app.get('/api/events', async(req, res) => {
        const group = req.group || null;
        const userId = req.userId || null;
        try {
            const events = await listEvents(group, userId);
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
            return res.status(400).json({ cancelled: false, participants: [], max: 0, group: '' });
        }
        try {
            const result = await getParticipants(eventId);
            if (result == "TÜHISTATUD") {
                return res.json({ cancelled: true, participants: [], max: 0, group: '' });
            }
            res.json(result);
        } catch (err) {
            console.error('Participant fetch failed:', err.message);
            res.status(500).json({ participants: [], max: 0, group: '' });
        }
    });

    app.post('/api/getBulkParticipants', async(req, res) => {
        const { eventIds } = req.body;
        if (!eventIds || !Array.isArray(eventIds)) {
            return res.status(400).json({ error: 'eventIds array is required' });
        }
        
        try {
            const results = {};
            await Promise.all(eventIds.map(async (eventId) => {
                try {
                    const result = await getParticipants(eventId);
                    results[eventId] = result;
                } catch (err) {
                    console.error(`Error fetching participants for event ${eventId}:`, err);
                    results[eventId] = { participants: [], max: 0, group: '', cancelled: false };
                }
            }));
            
            res.json(results);
        } catch (err) {
            console.error('Bulk participant fetch failed:', err.message);
            res.status(500).json({ error: 'Failed to fetch participants' });
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

    app.get('/api/displaymax', async(req, res) => {
        res.json({ ic: false, max: 0 });
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

    app.post('/api/deletegroup', async(req, res) => {
        const { group } = req.body;

        const db = await mysql.createConnection(DB_CONFIG);
        const [result] = await db.execute('DELETE FROM users WHERE grupp = ?', [group]);
        await db.end();
        if (result.affectedRows >= 1) {
            res.json({ success: true, message: 'Kontod, grupp on kustutatud' });
        }
    });
    app.get('/api/getusers', async(req, res) => {
        const db = await mysql.createConnection(DB_CONFIG);
        const [rows] = await db.execute('SELECT fullname FROM users');
        await db.end();
        const users = rows.map(row => row.fullname);
        res.json(users);
    });
    
    app.post('/api/getuser', async(req, res) => {
        const { user } = req.body;
        const db = await mysql.createConnection(DB_CONFIG);
        const [rows] = await db.execute('SELECT id, fullname, grupp FROM users WHERE fullname = ?', [user]);
        await db.end();
        if (rows.length > 0) {
            res.json({ 
                success: true, 
                userId: rows[0].id,
                fullname: rows[0].fullname, 
                group: rows[0].grupp 
            });
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    });
    app.post('/api/delete-account', async(req, res) => {
        const { user } = req.body;

        const db = await mysql.createConnection(DB_CONFIG);
        const [result] = await db.execute('DELETE FROM users WHERE fullname = ?', [user]);
        await db.end();
        if (result.affectedRows >= 1) {
            res.json({ success: true, message: 'Konto on kustutatud' });
        }
    });
    app.post('/api/create-lesson', async(req, res) => {
        const { group, date, startTime, endTime, repeatOption } = req.body;
        
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const event = {
            summary: group,
            start: { 
                dateTime: `${date}T${startTime}:00`,
                timeZone: 'Europe/Tallinn'
            },
            end: { 
                dateTime: `${date}T${endTime}:00`,
                timeZone: 'Europe/Tallinn'
            },
        };
        if (repeatOption && repeatOption !== 'none') {
            const recurrenceRules = {
                'daily': 'RRULE:FREQ=DAILY',
                'weekly': 'RRULE:FREQ=WEEKLY',
                'monthly': 'RRULE:FREQ=MONTHLY'
            };
            
            if (recurrenceRules[repeatOption]) {
                event.recurrence = [recurrenceRules[repeatOption]];
            }
        }

        // Create the event in Google Calendar
        const result = await calendar.events.insert({
            calendarId,
            requestBody: event
        });

        res.json({ 
            success: true, 
            message: `Tund grupi "${group}" jaoks on edukalt loodud`,
            eventId: result.data.id
        });
    });

    app.get('/api/getevents-admin', async(req, res) => {
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const result = await calendar.events.list({
            calendarId,
            maxResults: 100,
            singleEvents: false,
            orderBy: 'startTime'
        });

        const events = (result.data.items || []).map(event => ({
            id: event.id,
            group: event.summary,
            start: event.start?.dateTime,
            end: event.end?.dateTime,
            recurring: event.recurrence ? event.recurrence[0].includes('DAILY') ? 'daily' : 
                      event.recurrence[0].includes('WEEKLY') ? 'weekly' : 
                      event.recurrence[0].includes('MONTHLY') ? 'monthly' : null : null
        }));

        res.json(events);
    });

    app.get('/api/getevents-by-group', async(req, res) => {
        const { group } = req.query;
        if (!group) {
            return res.status(400).json({ error: 'Group parameter is required' });
        }
        
        try {
            const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
            const authClient = await auth.getClient();
            const calendar = google.calendar({ version: 'v3', auth: authClient });

            const now = new Date();
            const result = await calendar.events.list({
                calendarId,
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime',
                timeMin: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString(),
            });

            const months = {
                '01': 'jaanuar', '02': 'veebruar', '03': 'märts', '04': 'aprill',
                '05': 'mai', '06': 'juuni', '07': 'juuli', '08': 'august',
                '09': 'september', '10': 'oktoober', '11': 'november', '12': 'detsember'
            };

            const futureEvents = (result.data.items || [])
                .filter(event => event.summary === group)
                .map(event => {
                    const start = event.start?.dateTime;
                    const end = event.end?.dateTime;
                    const eventId = event.id;
                    const eventDescription = event.description || '';
                    const isCancelled = eventDescription.trim() === 'TÜHISTATUD';
                    
                    if (!start || !end) return null;
                    
                    const year = start.slice(0, 4);
                    const month = months[start.slice(5, 7)];
                    const day = start.slice(8, 10);
                    const startTime = start.slice(11, 16);
                    const endTime = end.slice(11, 16);
                    
                    return {
                        eventId: eventId,
                        year: year,
                        month: month,
                        day: day,
                        startTime: startTime,
                        endTime: endTime,
                        dateString: `${day}. ${month} ${year}, ${startTime}-${endTime}`,
                        isCancelled: isCancelled
                    };
                })
                .filter(event => event !== null);

            res.json(futureEvents);
        } catch (error) {
            console.error('Error fetching events by group:', error);
            res.status(500).json({ error: 'Failed to fetch events' });
        }
    });

    app.post('/api/getrecurring-instances', async(req, res) => {
        const { eventId } = req.body;
        
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const now = new Date();
        const future = new Date();
        future.setFullYear(now.getFullYear() + 1);

        const result = await calendar.events.instances({
            calendarId,
            eventId,
            timeMin: now.toISOString(),
            timeMax: future.toISOString(),
            maxResults: 20
        });

        const instances = (result.data.items || []).map(instance => ({
            id: instance.id,
            start: instance.start?.dateTime,
            end: instance.end?.dateTime
        }));

        res.json(instances);
    });

    app.post('/api/delete-lesson', async(req, res) => {
        const { eventId, deleteType, instanceId, afterDate } = req.body;
        
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        if (deleteType === 'single' && instanceId) {
            await calendar.events.delete({
                calendarId,
                eventId: instanceId
            });
            res.json({ success: true, message: 'Üks tund on edukalt kustutatud' });
        } else if (deleteType === 'after' && afterDate) {
            const event = await calendar.events.get({ calendarId, eventId });
            const originalRecurrence = event.data.recurrence[0];
            const untilDate = new Date(afterDate);
            untilDate.setDate(untilDate.getDate() - 1);
            const untilString = untilDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            
            await calendar.events.patch({
                calendarId,
                eventId,
                requestBody: {
                    recurrence: [originalRecurrence + ';UNTIL=' + untilString]
                }
            });
            res.json({ success: true, message: 'Tunnid alates valitud kuupäevast on edukalt kustutatud' });
        } else {
            await calendar.events.delete({
                calendarId,
                eventId
            });
            res.json({ success: true, message: 'Tund on edukalt kustutatud' });
        }
    });
    app.post('/api/edit-account', async(req, res) => {
        const { userId, fullname, password, group } = req.body;
        if (!userId || !fullname || !group) {
            return res.status(400).json({ success: false, message: 'User ID, full name, and group are required.' });
        }
        try{
            //IMplement the change logic, if password is provided, hash it, if not, keep the old one
            const db = await mysql.createConnection(DB_CONFIG);
            let hashedPassword = null;
            if (password) {
                hashedPassword = await bcrypt.hash(password, 12);
            }
            const [result] = await db.execute(
                'UPDATE users SET fullname = ?, grupp = ?' + (hashedPassword ? ', password = ?' : '') + ' WHERE id = ?',
                [fullname, group].concat(hashedPassword ? [hashedPassword] : []).concat([userId])
            );
            await db.end();
            if (result.affectedRows === 1) {
                res.json({ success: true, message: 'Kasutaja andmed on muudetud' });
            }   else {
                res.status(400).json({ success: false, message: 'Failed to update account.' });
            } 

        } catch (error) {
            console.error('Error updating account:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });

    app.post('/api/register-for-lesson', async(req, res) => {
        const { userId, eventId } = req.body;
        if (!userId || !eventId) {
            return res.status(400).json({ success: false, message: 'User ID and event ID are required.' });
        }
        try {
            const joined = await join(eventId, userId);
            if (joined.success) {
                res.json({ success: true, message: '' });
            } else {
                res.status(400).json({ success: false, message: 'Registreerimine ebaõnnestus' });
            }
        } catch (error) {
            console.error('Error registering for lesson:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });
    app.post('/api/getuserlessons', async(req, res) => {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
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
            const userFutureJoins = (allEvents.data.items || []).filter(event => {
                const joined = (event.description || '')
                    .split(/\s+/)
                    .filter(x => /^\d+$/.test(x.trim()))
                    .map(Number);
                const start = event.start?.dateTime ? new Date(event.start.dateTime) : null
                return start && joined.includes(userId) && start > new Date();
            }).map(event => {
                return {
                    id: event.id,
                    group: event.summary,
                    start: event.start?.dateTime,
                    end: event.end?.dateTime
                };
            });
            res.json(userFutureJoins);
            
        });
    
    app.post('/api/bulk-load-accounts', async (req, res) => {
        const { fullnameColumn, passwordColumn, groupColumn, spreadsheetId } = req.body;

        if (!fullnameColumn || !passwordColumn || !groupColumn || !spreadsheetId) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required'
            });
        }

        try {
            const auth = new google.auth.GoogleAuth({
                credentials: key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });
            
            const authClient = await auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });

            const range = `${fullnameColumn}:${groupColumn}`;
            const result = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range
            });

            const rows = result.data.values;

            if (!rows || rows.length <= 1) {
                return res.json({ 
                    success: false, 
                    message: 'No data found in spreadsheet'
                });
            }

            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;
            const errors = [];

            // Skip header row
            for (let i = 1; i < rows.length; i++) {
                const currentRow = rows[i];
                const fullname = currentRow[0];
                const password = currentRow[1];
                const group = currentRow[2];

                if (!fullname || !password || !group) {
                    errorCount++;
                    errors.push(`Row ${i + 1}: Missing required fields`);
                    continue;
                }

                try {
                    const result = await createAccount(fullname, password, group);
                    if (result.success) {
                        successCount++;
                    } else if (result.message === 'User with this full name already exists.') {
                        // Skip duplicates without treating as error
                        skippedCount++;
                    } else {
                        errorCount++;
                        errors.push(`Row ${i + 1}: ${result.message}`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push(`Row ${i + 1}: ${error.message}`);
                }
            }

            res.json({
                success: true,
                count: successCount,
                skipped: skippedCount,
                errors: errorCount,
                errorDetails: errors,
                message: `Loaded ${successCount} accounts successfully. ${skippedCount} accounts skipped (already exist). ${errorCount} errors.`
            });
        } catch (error) {
            res.status(500).json({ 
                success: false, 
                message: 'Failed to load accounts from Google Sheets'
            });
        }
    });

    app.get('/admin/createacc', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'createacc.html'));
    });

    app.get('/admin/index.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'index.html'));
    });
    app.get('/admin/delacc.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'delacc.html'));
    });
    app.get('/admin/createlesson.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'createlesson.html'));
    });
    app.get('/api/getgroups', async(req, res) => {
        const db = await mysql.createConnection(DB_CONFIG);
        const [rows] = await db.query('SELECT DISTINCT grupp FROM users');
        await db.end();
        const groups = rows.map(row => row.grupp);
        res.json(groups);
    }); 

    app.get('/admin/delgroup.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'delgroup.html'));
    });
    
    app.get('/admin/delreplesson.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'delreplesson.html'));
    });
    app.get('/admin/editacc.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'editacc.html'));
    });
    
    app.get('/admin/bulkregister.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'bulkregister.html'));
    });

    app.get('/api/getuserlessons', async(req, res) => {
        const { user } = req.query;

        // Get user info
        const db = await mysql.createConnection(DB_CONFIG);
        const [userRows] = await db.execute('SELECT id, grupp FROM users WHERE fullname = ?', [user]);
        await db.end();

        if (userRows.length === 0) {
            return res.json([]);
        }

        const userId = userRows[0].id;
        const userGroup = userRows[0].grupp;

        // Get events from Google Calendar for this user's group
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const now = new Date();
        let allEvents = [];
        let pageToken = undefined;
        do {
            const result = await calendar.events.list({
                calendarId,
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime',
                timeMin: now.toISOString(),
                pageToken
            });
            allEvents = allEvents.concat(result.data.items || []);
            pageToken = result.data.nextPageToken;
        } while (pageToken);

        // Filter events for this user's group and format them
        const lessons = allEvents
            .filter(event => event.summary === userGroup)
            .map(event => {
                const start = new Date(event.start?.dateTime);
                const end = new Date(event.end?.dateTime);

                // Convert to Estonian time (EEST/EET)
                const estonianStart = new Date(start.toLocaleString("en-US", {timeZone: "Europe/Tallinn"}));
                const estonianEnd = new Date(end.toLocaleString("en-US", {timeZone: "Europe/Tallinn"}));

                const joined = (event.description || '')
                    .split(/\s+/)
                    .filter(x => /^\d+$/.test(x.trim()))
                    .map(Number);

                return {
                    id: event.id,
                    name: `${estonianStart.getDate().toString().padStart(2, '0')}.${(estonianStart.getMonth() + 1).toString().padStart(2, '0')}.${estonianStart.getFullYear()} ${estonianStart.getHours().toString().padStart(2, '0')}:${estonianStart.getMinutes().toString().padStart(2, '0')}-${estonianEnd.getHours().toString().padStart(2, '0')}:${estonianEnd.getMinutes().toString().padStart(2, '0')}`,
                    isJoined: joined.includes(userId)
                };
            }); // Return ALL lessons, not just unjoined ones

        res.json(lessons);
    });

    app.get('/api/getregisteredlessons', async(req, res) => {
        const { user } = req.query;
        
        // Get user info
        const db = await mysql.createConnection(DB_CONFIG);
        const [userRows] = await db.execute('SELECT id, grupp FROM users WHERE fullname = ?', [user]);
        await db.end();
        
        if (userRows.length === 0) {
            return res.json([]);
        }
        
        const userId = userRows[0].id;
        const userGroup = userRows[0].grupp;
        
        // Get events from Google Calendar for this user's group
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const now = new Date();
        const result = await calendar.events.list({
            calendarId,
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
            timeMin: now.toISOString()
        });

        // Filter events for this user's group where user is already registered
        const registeredLessons = (result.data.items || [])
            .filter(event => event.summary === userGroup)
            .map(event => {
                const start = new Date(event.start?.dateTime);
                const end = new Date(event.end?.dateTime);
                
                // Convert to Estonian time (EEST/EET)
                const estonianStart = new Date(start.toLocaleString("en-US", {timeZone: "Europe/Tallinn"}));
                const estonianEnd = new Date(end.toLocaleString("en-US", {timeZone: "Europe/Tallinn"}));
                
                const joined = (event.description || '')
                    .split(/\s+/)
                    .filter(x => /^\d+$/.test(x.trim()))
                    .map(Number);
                
                return {
                    id: event.id,
                    name: `${estonianStart.getDate().toString().padStart(2, '0')}.${(estonianStart.getMonth() + 1).toString().padStart(2, '0')}.${estonianStart.getFullYear()} ${estonianStart.getHours().toString().padStart(2, '0')}:${estonianStart.getMinutes().toString().padStart(2, '0')}-${estonianEnd.getHours().toString().padStart(2, '0')}:${estonianEnd.getMinutes().toString().padStart(2, '0')}`,
                    isJoined: joined.includes(userId)
                };
            })
            .filter(lesson => lesson.isJoined); // Only show lessons user has already joined

        res.json(registeredLessons);
    });

    app.post('/api/registerforlesson', async(req, res) => {
        const { user, lessons } = req.body;
        
        // Get user ID
        const db = await mysql.createConnection(DB_CONFIG);
        const [userRows] = await db.execute('SELECT id, grupp FROM users WHERE fullname = ?', [user]);
        await db.end();
        
        if (userRows.length === 0) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        
        const userId = userRows[0].id;
        
        // Register user for each selected lesson
        const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
        const authClient = await auth.getClient();
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        
        let successCount = 0;
        let errorCount = 0;
        let errorMessages = [];
        
        for (const eventId of lessons) { 
            try {
                // Get current event
                const res = await calendar.events.get({ calendarId, eventId });
                const event = res.data;
                
                // Get the lesson group from the event summary
                const lessonGroup = event.summary;
                const lessonMax = config[lessonGroup]?.max || Infinity;
                
                let ids = (event.description || '')
                    .split(/\s+/)
                    .filter(x => /^\d+$/.test(x.trim()))
                    .map(Number);
                
                // Check if user is already registered
                if (ids.includes(userId)) {
                    continue; // Skip if already registered
                }
                
                // Check if lesson is at capacity
                if (ids.length >= lessonMax) {
                    errorCount++;
                    errorMessages.push(`Lesson ${eventId} is full`);
                    continue;
                }
                
                // Add user to lesson
                ids.push(userId);
                const newDescription = ids.join('\n');
                
                await calendar.events.patch({
                    calendarId,
                    eventId,
                    requestBody: { description: newDescription }
                });
                successCount++;
            } catch (error) {
                console.error('Error registering for lesson:', error);
                errorCount++;
                errorMessages.push(`Error with lesson ${eventId}: ${error.message}`);
            }
        }
        
        res.json({ 
            success: true, 
            message: `Successfully registered for ${successCount} lessons${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            errors: errorMessages
        });
    });
    app.get('/admin/registerforlesson.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'registerforlesson.html'));
    });
    app.get('/admin/bulkadd.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'bulkadd.html'));
    });
    app.get('/admin/lessoninfo.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'static', 'admin', 'lessoninfo.html'));
    });
}

module.exports = { success: setupAppRoutes };
