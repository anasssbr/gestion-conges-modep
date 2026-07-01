const db = require('../config/database');

// Récupérer toutes les signatures actives
const getSignatures = (req, res) => {
  db.query('SELECT id, label, image_data, active, created_at FROM signatures ORDER BY created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Ajouter une signature (admin RH)
const ajouterSignature = (req, res) => {
  const { label, image_data } = req.body;
  if (!label || !image_data) return res.status(400).json({ message: 'Label et image requis' });
  db.query('INSERT INTO signatures (label, image_data) VALUES (?, ?)',
    [label, image_data],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.status(201).json({ message: 'Signature ajoutée', id: result.insertId });
    }
  );
};

// Activer / désactiver une signature
const toggleSignature = (req, res) => {
  const { id } = req.params;
  db.query('UPDATE signatures SET active = NOT active WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    res.json({ message: 'Statut modifié' });
  });
};

// Supprimer une signature
const supprimerSignature = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM signatures WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    res.json({ message: 'Signature supprimée' });
  });
};

module.exports = { getSignatures, ajouterSignature, toggleSignature, supprimerSignature };