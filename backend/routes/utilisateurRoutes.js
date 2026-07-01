const express = require('express');
const router = express.Router();
const { verifierToken, autoriser } = require('../middleware/auth');
const db = require('../config/database');

// Récupérer tous les employés (admin RH et responsable)
router.get('/', verifierToken, autoriser('rh', 'responsable', 'directeur'), (req, res) => {
  db.query(
    'SELECT id, nom, prenom, email, cin, matricule, fonction, departement, role, solde_conge, reliquat, responsable_id FROM utilisateurs',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
});

// Récupérer le profil de l'utilisateur connecté
router.get('/profil', verifierToken, (req, res) => {
  db.query(
    'SELECT id, nom, prenom, email, cin, matricule, fonction, departement, role, solde_conge, reliquat, responsable_id, interim_rh_id FROM utilisateurs WHERE id = ?',
    [req.utilisateur.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results[0]);
    }
  );
});

// Récupérer les intérimaires possibles pour un employé
// - Inclut : uniquement les responsables (pas les employés, pas le directeur)
// - Exclut : l'employé lui-même + responsables en congé sur la période donnée
router.get('/interimaires', verifierToken, (req, res) => {
  const employe_id = req.utilisateur.id;
  const { date_debut, date_fin } = req.query;

  db.query('SELECT responsable_id FROM utilisateurs WHERE id = ?', [employe_id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    const responsable_id = results[0]?.responsable_id || 0;

    const query = date_debut && date_fin
      ? `SELECT u.id, u.nom, u.prenom, u.fonction, u.departement, u.role
         FROM utilisateurs u
         WHERE u.id != ?
           AND u.id != ?
           AND u.role = 'responsable'
           AND u.id NOT IN (
             SELECT c.utilisateur_id FROM conges c
             WHERE c.statut = 'signe_directeur'
               AND c.date_debut <= ? AND c.date_fin >= ?
           )`
      : `SELECT id, nom, prenom, fonction, departement, role FROM utilisateurs
         WHERE id != ? AND id != ? AND role = 'responsable'`;

    const params = date_debut && date_fin
      ? [employe_id, responsable_id, date_fin, date_debut]
      : [employe_id, responsable_id];

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    });
  });
});

// Récupérer les intérimaires RH disponibles (pour l'Admin RH qui fait une nouvelle demande)
// - Inclut : responsables et autres RH (sauf soi-même)
// - Exclut : ceux en congé sur la période donnée
router.get('/interimaires-rh', verifierToken, autoriser('rh'), (req, res) => {
  const rh_id = req.utilisateur.id;
  const { date_debut, date_fin } = req.query;

  const query = date_debut && date_fin
    ? `SELECT u.id, u.nom, u.prenom, u.fonction, u.departement, u.role
       FROM utilisateurs u
       WHERE u.id != ?
         AND u.role IN ('responsable', 'rh')
         AND u.id NOT IN (
           SELECT c.utilisateur_id FROM conges c
           WHERE c.statut = 'signe_directeur'
             AND c.date_debut <= ? AND c.date_fin >= ?
         )`
    : `SELECT id, nom, prenom, fonction, departement, role FROM utilisateurs
       WHERE id != ? AND role IN ('responsable', 'rh')`;

  const params = date_debut && date_fin
    ? [rh_id, date_fin, date_debut]
    : [rh_id];

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(results);
  });
});

// Vérifier si le responsable de l'employé est en congé sur une période donnée
router.get('/responsable-absent', verifierToken, (req, res) => {
  const { date_debut, date_fin } = req.query;
  const employe_id = req.utilisateur.id;

  if (!date_debut || !date_fin) return res.json({ absent: false });

  db.query(
    'SELECT responsable_id FROM utilisateurs WHERE id = ?',
    [employe_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      const responsable_id = results[0]?.responsable_id;
      if (!responsable_id) return res.json({ absent: false });

      db.query(
        `SELECT id FROM conges
         WHERE utilisateur_id = ?
           AND statut = 'signe_directeur'
           AND date_debut <= ?
           AND date_fin   >= ?
         LIMIT 1`,
        [responsable_id, date_fin, date_debut],
        (err, conges) => {
          if (err) return res.status(500).json({ message: 'Erreur serveur' });
          res.json({ absent: conges.length > 0 });
        }
      );
    }
  );
});

// Modifier son propre profil (tous les rôles)
router.put('/profil/modifier', verifierToken, (req, res) => {
  const { nom, prenom, email } = req.body;
  db.query(
    'UPDATE utilisateurs SET nom=?, prenom=?, email=? WHERE id=?',
    [nom, prenom, email, req.utilisateur.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Profil mis à jour avec succès' });
    }
  );
});

// Changer son mot de passe (tous les rôles)
router.put('/profil/mot-de-passe', verifierToken, (req, res) => {
  const { mot_de_passe_actuel, nouveau_mot_de_passe } = req.body;
  const bcrypt = require('bcryptjs');

  db.query('SELECT mot_de_passe FROM utilisateurs WHERE id = ?', [req.utilisateur.id], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    const valide = await bcrypt.compare(mot_de_passe_actuel, results[0].mot_de_passe);
    if (!valide) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
    db.query('UPDATE utilisateurs SET mot_de_passe=? WHERE id=?', [hash, req.utilisateur.id], (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Mot de passe modifié avec succès' });
    });
  });
});

// Désigner son intérimaire RH (Admin RH seulement)
router.put('/profil/interim-rh', verifierToken, autoriser('rh'), (req, res) => {
  const { interim_rh_id } = req.body;
  db.query(
    'UPDATE utilisateurs SET interim_rh_id = ? WHERE id = ?',
    [interim_rh_id || null, req.utilisateur.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Intérimaire RH désigné avec succès' });
    }
  );
});

// Modifier un employé (admin RH)
router.put('/:id', verifierToken, autoriser('rh'), (req, res) => {
  const { nom, prenom, email, cin, matricule, fonction, departement, solde_conge, reliquat } = req.body;
  db.query(
    'UPDATE utilisateurs SET nom=?, prenom=?, email=?, cin=?, matricule=?, fonction=?, departement=?, solde_conge=?, reliquat=? WHERE id=?',
    [nom, prenom, email, cin, matricule, fonction, departement, solde_conge, reliquat ?? 0, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Employé modifié avec succès' });
    }
  );
});

module.exports = router;
