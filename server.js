require('dotenv').config();
const express = require('express');
const path = require('path');
const { success } = require('./main'); // Import the setup function from main.js

const app = express();

// Serve static files from the 'static' subdirectory
app.use(express.static(path.join(__dirname, 'static')));

app.use(express.json()); // For parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded request bodies

// The 'success' function from main.js sets up all your routes, including JWT authentication.
success(app);

// Serve the main login page (index.html) for the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});