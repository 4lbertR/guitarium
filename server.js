require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { sucess } = require('./main');

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use(session({
  secret: 'guitarium_super_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false // change to true if using HTTPS
  }
}));

// Mount routes
sucess(app);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});