const jwt = require('jsonwebtoken');

const verifierToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token invalide' });
    req.utilisateur = decoded;
    next();
  });
};

const autoriser = (...roles) => {
  return (req, res, next) => {
    // Normaliser le rôle du token pour la comparaison
    const roleNorm = String(req.utilisateur.role || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_')
      .trim();
    const rolesNorm = roles.map(r => String(r).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_').trim());
    if (!rolesNorm.includes(roleNorm)) {
      return res.status(403).json({ message: 'Accès refusé', role: req.utilisateur.role, requis: roles });
    }
    next();
  };
};

module.exports = { verifierToken, autoriser };