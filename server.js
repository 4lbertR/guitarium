require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { sucess } = require('./main');

const app = express();

app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());
app.use(session({
  secret: 'guitarium_super_secret',
  resave: false,
  saveUninitialized: true
}));

sucess(app);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});