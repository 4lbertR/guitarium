const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('talu', 12);
console.log(hash);