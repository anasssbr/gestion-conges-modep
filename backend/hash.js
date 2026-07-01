const bcrypt = require('bcryptjs');

async function genererHash() {
  const hash = await bcrypt.hash('password', 10);
  console.log(hash);
}

genererHash();