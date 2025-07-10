const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

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

async function checkLogin(fullname, password) {
  const db = await mysql.createConnection(DB_CONFIG);
  const [rows] = await db.execute('SELECT password, grupp, id FROM users WHERE fullname = ? LIMIT 1', [fullname]);
  await db.end();
  if (rows.length === 0) return { match: false, grupp: null, id: null };
  return {
    match: bcrypt.compareSync(password, rows[0].password),
    grupp: rows[0].grupp,
    id: rows[0].id
  };
}

async function listEvents(groupFilter) {
  const months = {
    '01': 'jaanuar', '02': 'veebruar', '03': 'märts', '04': 'aprill',
    '05': 'mai', '06': 'juuni', '07': 'juuli', '08': 'august',
    '09': 'september', '10': 'oktoober', '11': 'november', '12': 'detsember'
  };

  const futevents = {};
  const pastevents = {};

  const auth = new google.auth.GoogleAuth({ credentials: key, scopes: SCOPES });
  const authClient = await auth.getClient();
  const calendar = google.calendar({ version: 'v3', auth: authClient });

  const now = new Date();
  const result = await calendar.events.list({
    calendarId,
    maxResults: 100,
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
    const target = startTime > now ? futevents : pastevents;
    if (!target[desc]) target[desc] = [];
    target[desc].push(when);
  });

  return {
    future: groupFilter ? futevents[groupFilter] || [] : futevents,
    past: groupFilter ? pastevents[groupFilter] || [] : pastevents
  };
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

  const db = await mysql.createConnection(DB_CONFIG);
  const [rows] = await db.execute('SELECT grupp FROM users WHERE id = ?', [userId]);
  const group = rows[0]?.grupp;
  await db.end();

  const max = config[group]?.max || Infinity;
  const ofEnabled = config[group]?.of === true;

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
    const start = event.start?.dateTime ? new Date(event.start.dateTime) : null;
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
  const newDescription = filtered.join('\n');

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: { description: newDescription }
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

function sucess(app) {
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24
    } 
  }));

  app.post('/login', async (req, res) => {
    const { fullname, password } = req.body;
    if (!fullname || !password) {
      return res.status(400).json({ success: false, message: 'Missing login fields' });
    }

    try {
      const result = await checkLogin(fullname, password);
      if (result.match) {
        req.session.user = fullname;
        req.session.group = result.grupp;
        req.session.userId = result.id;
      }
      res.json({ success: result.match, grupp: result.grupp });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
  });

  app.get('/success.html', (req, res) => {
    if (req.session.user) {
      res.sendFile(path.join(__dirname, 'success.html'));
    } else {
      res.redirect('/');
    }
  });

  app.get('/api/events', async (req, res) => {
    const group = req.session.group || null;
    try {
      const events = await listEvents(group);
      res.json(events);
    } catch (err) {
      console.error('Error fetching events:', err.message);
      res.status(500).json({ future: [], past: [], message: 'Error fetching events' });
    }
  });

  app.get('/api/join', async (req, res) => {
    const { eventId } = req.query;
    const userId = req.session.userId;

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

  app.get('/api/leave', async (req, res) => {
    const { eventId } = req.query;
    const userId = req.session.userId;

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

  app.get('/api/getParticipants', async (req, res) => {
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
    if (req.session?.userId && req.session.group) {
      res.json({ id: req.session.userId, group: req.session.group });
    } else {
      res.status(401).json({});
    }
  });

  app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });

  app.get('/config.json', (req, res) => {
    res.json(config);
  });
}

module.exports = { sucess };