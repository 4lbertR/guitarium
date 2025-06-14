const bcrypt = require('bcryptjs');

const newUsersByGroup = {
  B1: ['Kati Luik'],
};

const passwords = [
  'talu'
];

let index = 0;

for (const [group, names] of Object.entries(newUsersByGroup)) {
  names.forEach(fullname => {
    const pass = passwords[index++ % passwords.length];
    console.log(pass)
    const hash = bcrypt.hashSync(pass, 12);
    console.log(
      `INSERT INTO users (fullname, grupp, password) VALUES ('${fullname}', '${group}', '${hash}');\n`
    );
  });
}
