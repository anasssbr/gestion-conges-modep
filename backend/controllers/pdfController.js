const puppeteer = require('puppeteer');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

// Créer le dossier pdfs s'il n'existe pas
const pdfDir = path.join(__dirname, '../pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

// Helper : parse date MySQL sans décalage timezone
const parseDate = (d) => {
  if (!d) return null;
  // Si c'est déjà un objet Date (MySQL driver), extraire la string ISO
  const s = d instanceof Date ? d.toISOString() : String(d);
  // Prendre uniquement YYYY-MM-DD et construire en local pour éviter le décalage UTC
  const [year, month, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Labels lisibles pour les types de congé
const TYPE_LABELS = {
  annuel: 'Congé annuel',
  maladie: 'Congé maladie',
  maternite: 'Congé maternité',
  sans_solde: 'Sans solde',
  exceptionnel: 'Exceptionnel',
};

// Générer la demande de congé (avec décision du directeur si disponible)
const genererDemande = async (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT c.*, u.nom, u.prenom, u.matricule, u.fonction, u.departement,
     r.nom as resp_nom, r.prenom as resp_prenom,
     rh.nom as rh_nom, rh.prenom as rh_prenom,
     dir.nom as dir_nom, dir.prenom as dir_prenom
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     LEFT JOIN utilisateurs r ON c.responsable_id = r.id
     LEFT JOIN utilisateurs rh ON rh.id = c.visa_rh_par
     LEFT JOIN utilisateurs dir ON dir.role = 'directeur'
     WHERE c.id = ?`,
    [id],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      if (results.length === 0) return res.status(404).json({ message: 'Demande introuvable' });

      const c = results[0];
      const estSigne   = c.statut === 'signe_directeur';
      const estRefuse  = c.statut === 'refuse';
      const typeLabel  = TYPE_LABELS[c.type_conge] || c.type_conge;

      const estRefuseRespo = c.statut === 'refuse' && !c.visa_rh;
      // Décision responsable
      // Décision responsable — masquée si la demande vient d'un RH ou Directeur (pas de responsable)
      const avisRespoHTML = (() => {
        // Si pas de responsable_id ET visa_rh déjà true dès la création → demande RH/Directeur → on cache
        if (!c.responsable_id) return '';

        const estRefParRespo = c.statut === 'refuse' && !c.visa_rh;
        const estAppParRespo = ['approuve_responsable', 'approuve_rh', 'signe_directeur'].includes(c.statut);
        const avisTexte = c.avis_responsable || '-';
        const nomRespo = c.resp_prenom && c.resp_nom ? c.resp_prenom + ' ' + c.resp_nom : '-';
        const decisionBadge = estRefParRespo
          ? '<span style="color:#dc2626;font-weight:bold;font-size:13px;">✕ Refusée par le responsable</span>'
          : estAppParRespo
            ? '<span style="color:#16a34a;font-weight:bold;font-size:13px;">✓ Approuvée par le responsable</span>'
            : '<span style="color:#888;font-style:italic;">En attente de décision</span>';
        return `
          <tr class="section-title"><td colspan="2">AVIS DU RESPONSABLE DIRECT</td></tr>
          <tr>
            <td><strong>Décision :</strong> ${decisionBadge}${avisTexte !== '-' ? `<br><strong>Avis :</strong> ${avisTexte}` : ''}</td>
            <td><strong>Responsable :</strong> ${nomRespo}</td>
          </tr>`;
      })();

      // Section Visa RH — masquée si refusé par responsable (pas encore passé par RH)
      const visaRhHTML = (c.statut === 'refuse' && !c.visa_rh)
        ? ''
        : `
          <tr class="section-title"><td colspan="2">VISA DU SERVICE RH</td></tr>
          <tr>
            <td>
              <strong>Décision RH :</strong>
              ${c.visa_rh
                ? '<span style="color:#16a34a;font-weight:bold;">✓ Approuvé</span>'
                : (c.statut === 'refuse' ? '<span style="color:#dc2626;font-weight:bold;">✕ Refusé</span>' : 'En attente')}
            </td>
            <td><strong>Administrateur RH :</strong> ${c.rh_prenom && c.rh_nom ? c.rh_prenom + ' ' + c.rh_nom : '-'}</td>
          </tr>`;
      let decisionHTML = '';
      if (estSigne) {
        decisionHTML = `
          <div style="display:flex;align-items:center;gap:20px;padding:10px 0;">
            <div>
              <div style="font-size:13px;color:#555;margin-bottom:4px;">Décision :</div>
              <div style="font-size:15px;font-weight:bold;color:#16a34a;">✓ APPROUVÉ</div>
              ${c.signe_at ? `<div style="font-size:12px;color:#888;margin-top:4px;">Le ${new Date(c.signe_at).toLocaleDateString('fr-FR')}</div>` : ''}
            </div>
            ${c.signature_directeur ? `
            <div>
              <div style="font-size:13px;color:#555;margin-bottom:4px;">Signature du Directeur :</div>
              <img src="${c.signature_directeur}" style="height:55px;border:1px solid #ddd;padding:4px;border-radius:4px;background:#fff;"/>
              <div style="font-size:12px;color:#555;margin-top:4px;">M. ${c.dir_prenom || ''} ${c.dir_nom || ''}</div>
            </div>` : ''}
          </div>`;
      } else if (estRefuse) {
        decisionHTML = `
          <div style="padding:10px 0;">
            <div style="font-size:15px;font-weight:bold;color:#dc2626;">✕ REFUSÉ</div>
          </div>`;
      } else {
        decisionHTML = `<div style="height:60px;color:#aaa;font-style:italic;padding:10px 0;">En attente de décision...</div>`;
      }

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 40px; font-size: 13px; color: #222; }
          .logo { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 8px; letter-spacing: 2px; }
          .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 24px; }
          h2 { text-align: center; border: 2px solid #222; padding: 10px; font-size: 15px; letter-spacing: 1px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #bbb; padding: 9px 12px; vertical-align: top; }
          .section-title { background: #e8e8e8; font-weight: bold; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; }
          .ref { font-family: monospace; font-size: 12px; color: #555; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="logo">MODEP</div>
        <div class="subtitle">Direction des Ressources Humaines</div>
        <h2>DEMANDE DE CONGÉ ADMINISTRATIF</h2>

        <table>
          <tr class="section-title">
            <td colspan="2">À REMPLIR PAR L'INTÉRESSÉ(E)</td>
          </tr>
          <tr>
            <td><strong>Matricule :</strong> ${c.matricule || '-'}</td>
            <td><strong>Nom et Prénom :</strong> ${c.prenom} ${c.nom}</td>
          </tr>
          <tr>
            <td><strong>Fonction :</strong> ${c.fonction || '-'}</td>
            <td><strong>Entité / Département :</strong> ${c.departement || '-'}</td>
          </tr>
          <tr>
            <td><strong>Type de congé :</strong> ${typeLabel}</td>
            <td><strong>Durée demandée :</strong> ${c.nb_jours} jour(s)</td>
          </tr>
          <tr>
            <td><strong>Du :</strong> ${parseDate(c.date_debut).toLocaleDateString('fr-FR')}</td>
            <td><strong>Au :</strong> ${parseDate(c.date_fin).toLocaleDateString('fr-FR')} inclus</td>
          </tr>
          <tr>
            <td><strong>Motif :</strong> ${c.motif || '-'}</td>
            <td class="ref"><strong>Référence :</strong> ${c.reference}</td>
          </tr>
          <tr>
            <td colspan="2" style="text-align:right; border-top: none;">
              Casablanca, le ${parseDate(c.created_at || new Date()).toLocaleDateString('fr-FR')}<br><br>
              <em>Signature de l'intéressé(e)</em>
            </td>
          </tr>

          ${avisRespoHTML}

          ${visaRhHTML}

          <tr class="section-title">
            <td colspan="2">DÉCISION DU DIRECTEUR</td>
          </tr>
          <tr>
            <td colspan="2">${decisionHTML}</td>
          </tr>
        </table>

        <div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Réf. ${c.reference}</div>
      </body>
      </html>`;

      try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=demande_${c.reference}.pdf`);
        res.send(pdfBuffer);
      } catch (error) {
        res.status(500).json({ message: 'Erreur génération PDF', error: error.message });
      }
    }
  );
};

// Générer le titre de congé (seulement après signature directeur)
const genererTitre = async (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT c.*, u.nom, u.prenom, u.matricule, u.fonction, u.departement,
     dir.nom as dir_nom, dir.prenom as dir_prenom
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     LEFT JOIN utilisateurs dir ON dir.role = 'directeur'
     WHERE c.id = ? AND c.statut = 'signe_directeur'`,
    [id],
    async (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      if (results.length === 0) return res.status(403).json({ message: 'Titre non disponible avant signature du Directeur' });

      const c = results[0];
      const typeLabel = TYPE_LABELS[c.type_conge] || c.type_conge;

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 70px 80px; font-size: 15px; color: #1a1a1a; }
          .logo { text-align: center; font-size: 26px; font-weight: bold; letter-spacing: 4px; margin-bottom: 6px; }
          .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 36px; letter-spacing: 1px; }
          h2 { text-align: center; border: 2.5px solid #1a1a1a; padding: 14px 20px; font-size: 17px; letter-spacing: 3px; margin-bottom: 50px; }
          .field { margin-bottom: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; display: flex; gap: 12px; }
          .field label { font-weight: bold; min-width: 180px; color: #444; font-size: 13px; }
          .field value { font-size: 15px; }
          .highlight { font-size: 17px; font-weight: bold; }
          .sig-block { margin-top: 70px; text-align: center; }
          .sig-block p { font-size: 14px; font-weight: bold; margin-bottom: 8px; }
          .sig-block img { display: block; margin: 0 auto 10px; max-height: 80px; border-bottom: 1px solid #555; padding-bottom: 6px; }
          .sig-block .dir-name { font-size: 14px; font-weight: bold; margin-top: 6px; }
          .footer { margin-top: 60px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
          .stamp {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 40px auto 0;
            padding: 12px 28px;
            width: fit-content;
            border-left: 4px solid #16a34a;
            background: #f0fdf4;
            border-radius: 6px;
          }
          .stamp-check {
            width: 24px; height: 24px;
            background: #16a34a;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-size: 14px; font-weight: bold; flex-shrink: 0;
          }
          .stamp-text { font-size: 14px; font-weight: 700; color: #15803d; letter-spacing: 0.5px; }
          .stamp-date { font-size: 12px; color: #6b7280; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="logo">MODEP</div>
        <h2>TITRE DE CONGÉ</h2>

        <div class="field">
          <label>Nom et Prénom :</label>
          <span class="highlight">${c.prenom} ${c.nom}</span>
        </div>
        <div class="field">
          <label>Matricule :</label>
          <span>${c.matricule || '-'}</span>
        </div>
        <div class="field">
          <label>Fonction :</label>
          <span>${c.fonction || '-'}</span>
        </div>
        <div class="field">
          <label>Département :</label>
          <span>${c.departement || '-'}</span>
        </div>
        <div class="field">
          <label>Type de congé :</label>
          <span class="highlight">${typeLabel}</span>
        </div>
        <div class="field">
          <label>Durée :</label>
          <span class="highlight">${c.nb_jours} JOUR(S)</span>
        </div>
        <div class="field">
          <label>Période :</label>
          <span>Du <strong>${parseDate(c.date_debut).toLocaleDateString('fr-FR')}</strong> au <strong>${parseDate(c.date_fin).toLocaleDateString('fr-FR')}</strong> inclus</span>
        </div>
        <div class="field">
          <label>Référence :</label>
          <span style="font-family:monospace;color:#555;">${c.reference}</span>
        </div>

<div class="sig-block">
          <p>Le Directeur Général</p>
          ${c.signature_directeur
            ? `<img src="${c.signature_directeur}" />`
            : '<div style="height:60px;"></div>'}
          <div class="dir-name">M. ${c.dir_prenom || ''} ${c.dir_nom || ''}</div>
          <div style="font-size:12px;color:#666;margin-top:4px;">
            Casablanca, le ${c.signe_at ? parseDate(c.signe_at).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>

        <div class="footer">Réf. ${c.reference} — Document officiel MODEP — ${new Date().getFullYear()}</div>
      </body>
      </html>`;

      try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=titre_${c.reference}.pdf`);
        res.send(pdfBuffer);
      } catch (error) {
        res.status(500).json({ message: 'Erreur génération PDF', error: error.message });
      }
    }
  );
};

module.exports = { genererDemande, genererTitre };
