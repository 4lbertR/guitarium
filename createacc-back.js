const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'your_db_user',
  password: 'your_db_password',
  database: 'your_database_name'
};

async function createAccount(fullname, password, group) {
  if (!fullname || !password || !group) {
    return { success: false, message: 'Full name, password, and group are required.' };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const db = await mysql.createConnection(DB_CONFIG);

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

// THIS ENDPOINT SHOULD NOT HAVE authenticateToken MIDDLEWARE
app.post('/api/create-account', async (req, res) => {
  const { adminUsername, adminPassword, fullname, password, group } = req.body;

  if (adminUsername !== 'admin_user' || adminPassword !== 'admin_pass_123') {
    return res.status(403).json({ success: false, message: 'Unauthorized access: Invalid admin credentials.' });
  }

  const result = await createAccount(fullname, password, group);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'createacc.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});