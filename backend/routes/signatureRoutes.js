const express = require('express');
const router = express.Router();
const { verifierToken, autoriser } = require('../middleware/auth');
const { getSignatures, ajouterSignature, toggleSignature, supprimerSignature } = require('../controllers/signatureController');

// Directeur — voir les signatures disponibles
router.get('/', verifierToken, autoriser('directeur', 'rh'), getSignatures);

// Admin RH — gérer les signatures
router.post('/', verifierToken, autoriser('rh'), ajouterSignature);
router.put('/:id/toggle', verifierToken, autoriser('rh'), toggleSignature);
router.delete('/:id', verifierToken, autoriser('rh'), supprimerSignature);

module.exports = router;