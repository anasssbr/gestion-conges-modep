const bcrypt = require('bcryptjs');

const hash = '$2b$10$jCZAr0lVpQApp/LHB8irZu4AtqzLp7NfcMWpoP/viwny8nbhN04/.';
const motDePasse = 'password';

bcrypt.compare(motDePasse, hash, (err, result) => {
  console.log('Résultat:', result);
});