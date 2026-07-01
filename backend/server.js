const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const demandeRoutes = require('./routes/demandeRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const signatureRoutes = require('./routes/signatureRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/demandes', demandeRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/signatures', signatureRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'API MODEP fonctionne !' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
