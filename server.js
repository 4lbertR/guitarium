require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { sucess } = require('./main');

const app = express();

app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'guitarium_super_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // ⚠️ Set to true if running behind HTTPS
  }
}));

sucess(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});