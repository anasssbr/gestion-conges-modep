const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { login } = require('../controllers/authController');

// Transporter Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Stocker les tokens temporaires en mémoire
const resetTokens = {};

router.post('/login', login);

// Étape 1 : vérifier email et envoyer le lien
router.post('/check-email', (req, res) => {
  const { email } = req.body;
  db.query('SELECT id, prenom FROM utilisateurs WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    if (results.length === 0) return res.status(404).json({ message: 'Aucun compte associé à cet email.' });

    const user = results[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    resetTokens[token] = { email, expiry };

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"MODEP" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe MODEP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #e2e7f7;border-radius:12px">
          <h2 style="color:#197bbd">Bonjour ${user.prenom} 👋</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe MODEP.</p>
          <p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
          <a href="${resetLink}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#ef4444;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">
            Réinitialiser mon mot de passe
          </a>
          <p style="color:#9aa4c2;font-size:12px">Ce lien expire dans 15 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #e2e7f7;margin:20px 0">
          <p style="color:#9aa4c2;font-size:11px">MODEP &mdash; Système de gestion des congés</p>
        </div>
      `
    });

    res.json({ found: true, prenom: user.prenom, message: 'Email envoyé !' });
  });
});

// Étape 2 : vérifier le token
router.get('/verify-token', (req, res) => {
  const { token } = req.query;
  const data = resetTokens[token];
  if (!data || Date.now() > data.expiry) {
    return res.status(400).json({ message: 'Lien invalide ou expiré.' });
  }
  res.json({ valid: true, email: data.email });
});

// Étape 3 : réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
  const { token, nouveau_mot_de_passe } = req.body;
  const data = resetTokens[token];
  if (!data || Date.now() > data.expiry) {
    return res.status(400).json({ message: 'Lien invalide ou expiré.' });
  }
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6) {
    return res.status(400).json({ message: 'Le mot de passe doit faire au moins 6 caractères.' });
  }
  const hash = await bcrypt.hash(nouveau_mot_de_passe, 10);
  db.query('UPDATE utilisateurs SET mot_de_passe = ? WHERE email = ?', [hash, data.email], (err) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    delete resetTokens[token];
    res.json({ message: 'Mot de passe réinitialisé avec succès !' });
  });
});

module.exports = router;