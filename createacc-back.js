const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // For password hashing
const path = require('path'); // For serving static files

const app = express();
const port = 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve static files from the current directory (where createacc.html will be)
app.use(express.static(__dirname));

// Database configuration (IMPORTANT: Replace with your actual database details)
const DB_CONFIG = {
  host: 'localhost', // e.g., 'localhost', '127.0.0.1'
  port: 3306,        // Default MySQL port
  user: 'your_db_user', // Your MySQL username
  password: 'your_db_password', // Your MySQL password
  database: 'your_database_name' // The name of your database
};

// Function to create a new user account (reused from previous discussion)
async function createAccount(fullname, password, group) {
  if (!fullname || !password || !group) {
    return { success: false, message: 'Full name, password, and group are required.' };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12); // Hash password with 12 salt rounds
    const db = await mysql.createConnection(DB_CONFIG);

    // Ensure your 'users' table has 'fullname', 'password', and 'grupp' columns
    const [result] = await db.execute(
      'INSERT INTO users (fullname, password, grupp) VALUES (?, ?, ?)',
      [fullname, hashedPassword, group]
    );

    await db.end();

    if (result.affectedRows === 1) {
      return { success: true, message: 'Account created successfully.', userId: result.insertId };
    } else {
      return { success: false, message: 'Failed to create account.' };
    }

  } catch (error) {
    console.error('Error creating account:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'User with this full name already exists.' };
    }
    return { success: false, message: 'An internal server error occurred.' };
  }
}

// NEW: API endpoint to handle account creation requests from the browser
app.post('/api/create-account', async (req, res) => {
  // !!! SECURITY WARNING !!!
  // This is a VERY INSECURE way to protect an admin endpoint if exposed publicly.
  // In a real application, you would implement proper administrative authentication
  // (e.g., an admin login that issues a special admin JWT) and protect this endpoint.
  const { adminUsername, adminPassword, fullname, password, group } = req.body;

  // Basic hardcoded admin check for demonstration ONLY
  if (adminUsername !== 'admin_user' || adminPassword !== 'admin_pass_123') {
    return res.status(403).json({ success: false, message: 'Unauthorized access: Invalid admin credentials.' });
  }
  // !!! END SECURITY WARNING !!!

  const result = await createAccount(fullname, password, group);
  if (result.success) {
    res.status(201).json(result); // 201 Created status for successful creation
  } else {
    res.status(400).json(result); // 400 Bad Request if creation fails (e.g., validation, duplicate)
  }
});

// Serve the createacc.html file when someone visits the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'createacc.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});