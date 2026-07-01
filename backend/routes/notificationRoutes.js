const express = require('express');
const router = express.Router();
const { verifierToken } = require('../middleware/auth');
const db = require('../config/database');

// Récupérer les notifications de l'utilisateur connecté
router.get('/', verifierToken, (req, res) => {
  db.query(
    `SELECT n.*, c.reference, c.type_conge 
     FROM notifications n 
     LEFT JOIN conges c ON n.conge_id = c.id 
     WHERE n.utilisateur_id = ? 
     ORDER BY n.created_at DESC`,
    [req.utilisateur.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
});

// Marquer une notification comme lue
router.put('/:id/lu', verifierToken, (req, res) => {
  db.query(
    'UPDATE notifications SET lu = TRUE WHERE id = ? AND utilisateur_id = ?',
    [req.params.id, req.utilisateur.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Notification marquée comme lue' });
    }
  );
});

// Marquer toutes les notifications comme lues
router.put('/tout-lire', verifierToken, (req, res) => {
  db.query(
    'UPDATE notifications SET lu = TRUE WHERE utilisateur_id = ?',
    [req.utilisateur.id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ message: 'Toutes les notifications marquées comme lues' });
    }
  );
});

// Compter les notifications non lues
router.get('/non-lues', verifierToken, (req, res) => {
  db.query(
    'SELECT COUNT(*) as count FROM notifications WHERE utilisateur_id = ? AND lu = FALSE',
    [req.utilisateur.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json({ count: results[0].count });
    }
  );
});

module.exports = router;