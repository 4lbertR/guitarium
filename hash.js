const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('Daphne123', 12);
console.log(hash);