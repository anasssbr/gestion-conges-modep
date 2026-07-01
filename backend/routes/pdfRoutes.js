const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { genererDemande, genererTitre } = require('../controllers/pdfController');

// Middleware spécial PDF : accepte le token depuis l'URL ou le header
const verifierTokenPDF = (req, res, next) => {
  const token = req.query.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token invalide' });
    req.utilisateur = decoded;
    next();
  });
};

// Demande de congé — accessible dès la soumission
router.get('/demande/:id', verifierTokenPDF, genererDemande);

// Titre de congé — accessible seulement après signature directeur
router.get('/titre/:id', verifierTokenPDF, genererTitre);

module.exports = router;