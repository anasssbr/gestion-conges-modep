const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login
const login = (req, res) => {
  const { email, mot_de_passe } = req.body;

  db.query(
    'SELECT * FROM utilisateurs WHERE email = ?',
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      if (results.length === 0) return res.status(401).json({ message: 'Email incorrect' });

      const utilisateur = results[0];
      const motDePasseValide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

      if (!motDePasseValide) return res.status(401).json({ message: 'Mot de passe incorrect' });

      const token = jwt.sign(
        { id: utilisateur.id, role: utilisateur.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        utilisateur: {
          id: utilisateur.id,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          email: utilisateur.email,
          role: utilisateur.role
        }
      });
    }
  );
};

module.exports = { login };