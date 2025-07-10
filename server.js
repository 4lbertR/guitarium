require('dotenv').config();
const express = require('express');
const path = require('path');
const { sucess } = require('./main');

const app = express();

// Serve static files from the 'static' subdirectory
// This means requests for /index.html, /styles.css, /logo.png etc.
// will look inside the 'static' folder.
app.use(express.static(path.join(__dirname, 'static')));

app.use(express.json()); // For parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded request bodies

// The 'sucess' function from main.js sets up session middleware and other routes.
sucess(app);

// Serve the main login page (index.html) for the root URL
// Now explicitly points to index.html inside the 'static' folder
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});