const express = require('express');
const router = express.Router();
const { verifierToken, autoriser } = require('../middleware/auth');
const {
  creerDemande,
  getMesDemandes,
  getDemandesResponsable,
  getDemandesTraiteesParInterim,
  getDemandesTraiteesParInterimRH,
  getDemandesRH,
  getDemandesDirecteur,
  getDemandesDirecteurTraitees,
  decisionResponsable,
  visaRH,
  signerDirecteur,
  verifierResponsableAbsent
} = require('../controllers/demandeController');

// Employé
router.post('/', verifierToken, autoriser('employe', 'responsable', 'rh'), creerDemande);
router.get('/mes-demandes', verifierToken, autoriser('employe', 'responsable', 'rh', 'directeur'), getMesDemandes);
router.get('/responsable-absent', verifierToken, autoriser('employe', 'responsable'), verifierResponsableAbsent);

// Responsable
router.get('/responsable', verifierToken, autoriser('responsable', 'rh'), getDemandesResponsable);
router.get('/responsable/traitees-par-interim', verifierToken, autoriser('responsable', 'rh'), getDemandesTraiteesParInterim);
router.put('/:id/decision-responsable', verifierToken, autoriser('responsable', 'rh'), decisionResponsable);

// Admin RH (ou intérimaire RH)
router.get('/rh', verifierToken, autoriser('rh', 'responsable'), getDemandesRH);
router.get('/rh/traitees-par-interim', verifierToken, autoriser('rh'), getDemandesTraiteesParInterimRH);
router.put('/:id/visa-rh', verifierToken, autoriser('rh', 'responsable'), visaRH);

// Directeur
router.get('/directeur', verifierToken, autoriser('directeur'), getDemandesDirecteur);
router.get('/directeur/traitees', verifierToken, autoriser('directeur'), getDemandesDirecteurTraitees);
router.put('/:id/signer', verifierToken, autoriser('directeur'), signerDirecteur);

module.exports = router;
