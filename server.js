require('dotenv').config();
const express = require('express');
const path = require('path');
// Removed: const session = require('express-session'); // No need to import here
const { sucess } = require('./main'); // Import the setup function from main.js

const app = express();

// Serve static files from the root of your project directory
// (Assuming index.html, success.html, styles.css, etc., are directly in the project root)
app.use(express.static(path.join(__dirname)));

app.use(express.json()); // For parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded request bodies

// CRITICAL: Removed the duplicate session middleware setup from here.
// The session middleware is now ONLY configured inside the 'sucess' function in main.js.

sucess(app); // This call sets up all your routes AND the session middleware

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});