const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin', 12);
console.log(hash);