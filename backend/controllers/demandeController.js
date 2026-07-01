const db = require('../config/database');

// Helper : résout le poste/fonction d'un employé
// Priorité : fonction > poste > label du rôle
const resolvePoste = (row) => {
  const roleLabels = { employe: 'Employé', responsable: 'Responsable', rh: 'Admin RH', directeur: 'Directeur Général' };
  return row.fonction || row.poste || roleLabels[row.role] || row.role || '-';
};

const calculerNbJours = (dateDebut, dateFin, type_conge = 'annuel') => {
  // Jours fériés marocains fixes
  const getFeriesSet = (startYear, endYear) => {
    const set = new Set();
    for (let y = startYear; y <= endYear; y++) {
      [
        `${y}-01-01`, `${y}-01-11`, `${y}-05-01`, `${y}-07-30`,
        `${y}-08-14`, `${y}-08-20`, `${y}-08-21`, `${y}-11-06`, `${y}-11-18`
      ].forEach(d => set.add(d));
    }
    return set;
  };
  const isFerie = (d, feriesSet) => {
    const s = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return feriesSet.has(s);
  };

  if (type_conge === 'exceptionnel') {
    const debut = new Date(String(dateDebut).slice(0,10));
    const fin   = new Date(String(dateFin).slice(0,10));
    return Math.floor((fin - debut) / 86400000) + 1;
  }

  const toDate = (d) => {
    const s = String(d instanceof Date ? d.toISOString() : d).slice(0,10);
    const [y,m,day] = s.split('-').map(Number);
    return new Date(y, m-1, day);
  };
  const debut = toDate(dateDebut);
  const fin   = toDate(dateFin);
  if (fin < debut) return 0;

  const feriesSet = getFeriesSet(debut.getFullYear(), fin.getFullYear());

  const getLundi = (d) => {
    const c = new Date(d);
    const j = d.getDay();
    c.setDate(d.getDate() + (j === 0 ? -6 : 1 - j));
    return c;
  };

  const lundiDebut = getLundi(debut);
  const lundiFin   = getLundi(fin);
  const nbSemaines = Math.round((lundiFin - lundiDebut) / (7 * 86400000));

  // CAS 1 : même semaine
  if (nbSemaines === 0) {
    const diffJours = Math.floor((fin - debut) / 86400000) + 1;
    const base = fin.getDay() === 5 ? diffJours + 2 : diffJours;
    let ferieCount = 0;
    const cur = new Date(debut);
    const finEtendue = new Date(fin);
    if (fin.getDay() === 5) finEtendue.setDate(fin.getDate() + 2);
    while (cur <= finEtendue) { if (isFerie(cur, feriesSet)) ferieCount++; cur.setDate(cur.getDate() + 1); }
    return Math.max(0, base - ferieCount);
  }

  // CAS général : plusieurs semaines
  const dimancheS1 = new Date(lundiDebut);
  dimancheS1.setDate(lundiDebut.getDate() + 6);
  const joursS1 = Math.floor((dimancheS1 - debut) / 86400000) + 1;
  const joursDerniere = Math.floor((fin - lundiFin) / 86400000) + 1;
  const nbSemainesInter = nbSemaines - 1;

  let total = joursS1 + (nbSemainesInter * 7) + joursDerniere;

  const finJourSemaine = fin.getDay();
  if (finJourSemaine >= 1 && finJourSemaine <= 4 && nbSemaines >= 2) {
    total -= 2;
  }

  // Soustraire les jours fériés sur la période réelle
  let ferieCount = 0;
  const cur = new Date(debut);
  while (cur <= fin) { if (isFerie(cur, feriesSet)) ferieCount++; cur.setDate(cur.getDate() + 1); }
  total = Math.max(0, total - ferieCount);

  return total;
};

const genererReference = () => {
  const année = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `DMD-${année}-${random}`;
};

// Créer une demande
const creerDemande = (req, res) => {
  const { type_conge, date_debut, date_fin, motif, interimaire_id, nb_jours_override } = req.body;
  const employe_id = req.utilisateur.id;
  const role = req.utilisateur.role;
  const nb_jours = (type_conge === 'exceptionnel' && nb_jours_override)
    ? parseInt(nb_jours_override)
    : calculerNbJours(date_debut, date_fin, type_conge);
  const reference = genererReference();

  db.query(
    'SELECT responsable_id, solde_conge, reliquat, nom, prenom, matricule, fonction, departement FROM utilisateurs WHERE id = ?',
    [employe_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      const employe = results[0];

      if (type_conge !== 'exceptionnel') {
        const soldeTotal = (employe.solde_conge || 0) + (employe.reliquat || 0);
        if (nb_jours > soldeTotal) {
          return res.status(400).json({ message: `Solde insuffisant. Vous avez ${soldeTotal} jours disponibles.` });
        }
      }

      db.query(
        `SELECT id FROM conges WHERE utilisateur_id = ? AND statut != 'refuse' AND date_debut <= ? AND date_fin >= ?`,
        [employe_id, date_fin, date_debut],
        (err, chevauchements) => {
          if (err) return res.status(500).json({ message: 'Erreur serveur' });
          if (chevauchements.length > 0) {
            return res.status(400).json({ message: 'Vous avez déjà une demande de congé sur cette période.' });
          }

          // Logique des statuts selon le rôle :
          // - Employé avec responsable → en_attente (attend le responsable)
          // - Responsable sans responsable supérieur → approuve_responsable (attend le RH)
          // - Admin RH → approuve_rh + visa_rh=true (saute le visa RH, va direct au Directeur)
          // - Directeur → approuve_rh + visa_rh=true (même logique)
          const estRH = role === 'rh';
          const estDirecteur = role === 'directeur';
          const estSansResponsable = !employe.responsable_id;

          // Vérifier si cet utilisateur est intérimaire RH d'un RH absent aujourd'hui
          const todayStr = new Date().toISOString().slice(0, 10);
          db.query(
            `SELECT u.id FROM utilisateurs u
             WHERE u.role = 'rh' AND u.interim_rh_id = ?
             AND EXISTS (
               SELECT 1 FROM conges c
               WHERE c.utilisateur_id = u.id
               AND c.statut IN ('signe_directeur','approuve_rh','approuve_responsable')
               AND c.date_debut <= ? AND c.date_fin >= ?
             )
             LIMIT 1`,
            [employe_id, todayStr, todayStr],
            (err, interimCheck) => {
              const estInterimRH = !err && interimCheck.length > 0;

              let statutInitial, visaRHInitial;
              if (estRH || estDirecteur || estInterimRH) {
                // RH, Directeur, ou Intérimaire RH → saute le visa RH, va direct au Directeur
                statutInitial = 'approuve_rh';
                visaRHInitial = true;
              } else if (estSansResponsable) {
                statutInitial = 'approuve_responsable';
                visaRHInitial = false;
              } else {
                statutInitial = 'en_attente';
                visaRHInitial = false;
              }

          // Vérifier si le responsable a un intérimaire actif sur cette période
          const checkInterim = (callback) => {
            if (!employe.responsable_id) return callback(null);
            const todayCheck = new Date().toISOString().slice(0, 10);
            db.query(
              `SELECT interimaire_id FROM conges
               WHERE utilisateur_id = ?
               AND statut IN ('signe_directeur','approuve_rh','approuve_responsable')
               AND date_debut <= ? AND date_fin >= ?
               LIMIT 1`,
              // L'interim prend le relais seulement si le respo est absent AUJOURD'HUI
              [employe.responsable_id, todayCheck, todayCheck],
              (err, rows) => {
                if (err || !rows.length || !rows[0].interimaire_id) return callback(employe.responsable_id);
                callback(rows[0].interimaire_id);
              }
            );
          };

          checkInterim((responsable_effectif) => {
            const responsable_id_final = (estRH || estDirecteur || estSansResponsable) ? null : responsable_effectif;

          db.query(
            `INSERT INTO conges (utilisateur_id, responsable_id, interimaire_id, type_conge, date_debut, date_fin, nb_jours, motif, reference, statut, visa_rh) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [employe_id, responsable_id_final, interimaire_id || null, type_conge, date_debut, date_fin, nb_jours, motif, reference, statutInitial, visaRHInitial],
            (err, result) => {
              if (err) {
                console.error('Erreur INSERT conges:', err);
                return res.status(500).json({ message: 'Erreur création demande', detail: err.message });
              }
              const conge_id = result.insertId;

              if (estRH || estDirecteur || estInterimRH) {
                // Admin RH / Directeur / Intérimaire RH → notifier le Directeur directement
                db.query('SELECT id FROM utilisateurs WHERE role = "directeur" LIMIT 1', (err, dirResults) => {
                  if (!err && dirResults.length > 0 && dirResults[0].id !== employe_id) {
                    db.query(
                      `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                      [dirResults[0].id, conge_id, `Nouvelle demande de congé de ${employe.prenom} ${employe.nom} attend votre signature.`]
                    );
                  }
                });
              } else if (estSansResponsable) {
                // Responsable sans supérieur → notifier le RH
                db.query('SELECT id FROM utilisateurs WHERE role = "rh" LIMIT 1', (err, rhResults) => {
                  if (!err && rhResults.length > 0) {
                    db.query(
                      `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                      [rhResults[0].id, conge_id, `Nouvelle demande de congé de ${employe.prenom} ${employe.nom} — ${nb_jours} jour(s)`]
                    );
                  }
                });
              } else {
                // Employé normal → notifier le responsable effectif (intérimaire ou responsable direct)
                db.query(
                  `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                  [responsable_id_final, conge_id, `Nouvelle demande de congé de ${employe.prenom} ${employe.nom} — ${nb_jours} jour(s)`],
                  () => {}
                );
              }

              res.status(201).json({ message: 'Demande créée avec succès', reference, nb_jours, conge_id });
            }
          );
          }); // fin checkInterim
            }
          ); // fin verif interimRH
        }
      );
    }
  );
};

// Mes demandes (employé)
const getMesDemandes = (req, res) => {
  const employe_id = req.utilisateur.id;
  db.query(
    'SELECT * FROM conges WHERE utilisateur_id = ? ORDER BY created_at DESC',
    [employe_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Demandes traitées par l'intérimaire RH (historique pour le RH)
const getDemandesTraiteesParInterimRH = (req, res) => {
  const rh_id = req.utilisateur.id;
  // Chercher toutes les demandes où visa_rh_par != rh_id ET visa_rh_par appartient à un user
  // qui est intérimaire du RH connecté (via interim_rh_id)
  db.query('SELECT interim_rh_id FROM utilisateurs WHERE id = ?', [rh_id], (err, results) => {
    if (err || !results.length || !results[0].interim_rh_id) return res.json([]);
    const interim_id = results[0].interim_rh_id;
    db.query(
      `SELECT c.*,
       u.nom, u.prenom, u.departement, u.role,
       COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction,
       i.prenom AS interimaire_prenom, i.nom AS interimaire_nom
       FROM conges c
       JOIN utilisateurs u ON c.utilisateur_id = u.id
       LEFT JOIN utilisateurs i ON i.id = ?
       WHERE c.visa_rh_par = ?
       ORDER BY c.created_at DESC`,
      [interim_id, interim_id],
      (err, results) => {
        if (err) return res.status(500).json({ message: 'Erreur serveur' });
        res.json(results);
      }
    );
  });
};

// Demandes traitées par l'intérimaire du responsable
const getDemandesTraiteesParInterim = (req, res) => {
  const responsable_id = req.utilisateur.id;
  // On cherche les demandes dont le responsable_id est cet utilisateur
  // ET qui ont été traitées par un intérimaire (responsable_id dans conges = interimaire_id d'un congé du responsable)
  db.query(
    `SELECT c.*,
     u.nom, u.prenom, u.matricule, u.departement, u.role,
     COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction,
     i.prenom AS interimaire_prenom, i.nom AS interimaire_nom
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     LEFT JOIN utilisateurs i ON c.responsable_id = i.id
     WHERE c.responsable_id != ? 
     AND c.responsable_id IN (
       SELECT interimaire_id FROM conges 
       WHERE utilisateur_id = ? 
       AND interimaire_id IS NOT NULL
     )
     ORDER BY c.created_at DESC`,
    [responsable_id, responsable_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Demandes pour le responsable (y compris en tant qu'intérimaire)
const getDemandesResponsable = (req, res) => {
  const responsable_id = req.utilisateur.id;
  db.query(
    `SELECT c.*,
     u.nom, u.prenom, u.matricule, u.departement, u.role,
     COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction,
     i.prenom AS interimaire_prenom, i.nom AS interimaire_nom,
     CASE WHEN c.interimaire_id = ? THEN 1 ELSE 0 END AS est_interimaire
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     LEFT JOIN utilisateurs i ON c.interimaire_id = i.id
     WHERE c.responsable_id = ? OR c.interimaire_id = ?
     ORDER BY c.created_at DESC`,
    [responsable_id, responsable_id, responsable_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Toutes les demandes pour admin RH (ou intérimaire RH)
const getDemandesRH = (req, res) => {
  const user_id = req.utilisateur.id;
  // Vérifier si cet utilisateur est intérimaire RH d'un RH absent
  db.query(
    `SELECT u.id as rh_id, u.interim_rh_id
     FROM utilisateurs u
     WHERE u.role = 'rh' AND u.interim_rh_id = ?
     AND EXISTS (
       SELECT 1 FROM conges c
       WHERE c.utilisateur_id = u.id
       AND c.statut IN ('signe_directeur','approuve_rh','approuve_responsable')
       AND c.date_debut <= CURDATE() AND c.date_fin >= CURDATE()
     )
     LIMIT 1`,
    [user_id],
    (err, interimCheck) => {
      const estAutorise = req.utilisateur.role === 'rh' || (!err && interimCheck.length > 0);
      if (!estAutorise) return res.status(403).json({ message: 'Accès refusé' });

      db.query(
        `SELECT c.*,
         u.nom, u.prenom, u.matricule, u.cin, u.email, u.departement, u.role, u.poste,
         COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction
         FROM conges c
         JOIN utilisateurs u ON c.utilisateur_id = u.id
         WHERE c.utilisateur_id != ?
         ORDER BY c.created_at DESC`,
        [user_id],
        (err, results) => {
          if (err) return res.status(500).json({ message: 'Erreur serveur' });
          res.json(results);
        }
      );
    }
  );
};

// Demandes en attente de signature (directeur)
const getDemandesDirecteur = (req, res) => {
  db.query(
    `SELECT c.*,
     u.nom, u.prenom, u.matricule, u.cin, u.email, u.departement, u.role, u.poste,
     COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     WHERE c.statut = 'approuve_rh'
     ORDER BY c.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Demandes traitées (signées + refusées) par le directeur
const getDemandesDirecteurTraitees = (req, res) => {
  db.query(
    `SELECT c.*,
     u.nom, u.prenom, u.matricule, u.departement, u.role, u.poste,
     COALESCE(NULLIF(TRIM(u.fonction),''), NULLIF(TRIM(u.poste),''), u.role) AS fonction
     FROM conges c
     JOIN utilisateurs u ON c.utilisateur_id = u.id
     WHERE c.statut IN ('signe_directeur', 'refuse') AND c.visa_rh = TRUE
     ORDER BY c.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.json(results);
    }
  );
};

// Responsable (ou intérimaire) approuve ou refuse
const decisionResponsable = (req, res) => {
  const { id } = req.params;
  const { decision, avis_responsable, interimaire_id } = req.body;
  const responsable_id = req.utilisateur.id;
  const nouveau_statut = decision === 'approuver' ? 'approuve_responsable' : 'refuse';

  // Autoriser si je suis le responsable direct OU l'intérimaire désigné
  db.query(
    'SELECT id FROM conges WHERE id = ? AND (responsable_id = ? OR interimaire_id = ?)',
    [id, responsable_id, responsable_id],
    (err, check) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      if (check.length === 0) return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à traiter cette demande.' });

      db.query(
        'UPDATE conges SET statut = ?, avis_responsable = ?, interimaire_id = COALESCE(interimaire_id, ?) WHERE id = ?',
        [nouveau_statut, avis_responsable || null, interimaire_id || null, id],
        (err, result) => {
          if (err) return res.status(500).json({ message: 'Erreur serveur' });

          if (decision === 'refuser') {
            db.query('SELECT utilisateur_id FROM conges WHERE id = ?', [id], (err, results) => {
              if (!err && results.length > 0) {
                db.query(
                  `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'refus')`,
                  [results[0].utilisateur_id, id, 'Votre demande de congé a été refusée par votre responsable.']
                );
              }
            });
          }

          if (decision === 'approuver') {
            const todayNotif = new Date().toISOString().slice(0, 10);
            // Vérifier si le RH est absent et a un intérimaire
            db.query(
              `SELECT u.id as rh_id, u.interim_rh_id
               FROM utilisateurs u
               WHERE u.role = 'rh'
               AND EXISTS (
                 SELECT 1 FROM conges c
                 WHERE c.utilisateur_id = u.id
                 AND c.statut IN ('signe_directeur','approuve_rh','approuve_responsable')
                 AND c.date_debut <= ? AND c.date_fin >= ?
               )
               LIMIT 1`,
              [todayNotif, todayNotif],
              (err, rhResults) => {
                let destinataire_id;
                if (!err && rhResults.length > 0 && rhResults[0].interim_rh_id) {
                  // RH absent → notifier l'intérimaire RH
                  destinataire_id = rhResults[0].interim_rh_id;
                } else {
                  // RH présent → notifier le RH normalement
                  db.query('SELECT id FROM utilisateurs WHERE role = "rh" LIMIT 1', (err, rh) => {
                    if (!err && rh.length > 0) {
                      db.query(
                        `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                        [rh[0].id, id, 'Une demande de congé attend votre visa RH.']
                      );
                    }
                  });
                  return;
                }
                db.query(
                  `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                  [destinataire_id, id, 'Une demande de congé attend votre visa RH (intérimaire).']
                );
              }
            );
            db.query('SELECT utilisateur_id FROM conges WHERE id = ?', [id], (err, results) => {
              if (!err && results.length > 0) {
                db.query(
                  `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                  [results[0].utilisateur_id, id, 'Votre demande de congé a été approuvée et transmise au service RH.']
                );
              }
            });
          }

          res.json({ message: `Demande ${decision === 'approuver' ? 'approuvée' : 'refusée'} avec succès` });
        }
      );
    }
  );
};

// Admin RH visa
const visaRH = (req, res) => {
  const { id } = req.params;
  const { decision } = req.body;
  const user_id = req.utilisateur.id;
  const user_role = req.utilisateur.role;

  // Vérifier autorisation : RH lui-même OU intérimaire RH désigné
  const checkAutorisation = (callback) => {
    if (user_role === 'rh') return callback(true);
    // Vérifier si cet utilisateur est intérimaire RH d'un RH absent aujourd'hui
    const today = new Date().toISOString().slice(0, 10);
    db.query(
      `SELECT u.id FROM utilisateurs u
       WHERE u.role = 'rh' AND u.interim_rh_id = ?
       AND EXISTS (
         SELECT 1 FROM conges c
         WHERE c.utilisateur_id = u.id
         AND c.statut IN ('signe_directeur','approuve_rh','approuve_responsable')
         AND c.date_debut <= ? AND c.date_fin >= ?
       )
       LIMIT 1`,
      [user_id, today, today],
      (err, results) => callback(!err && results.length > 0)
    );
  };

  checkAutorisation((autorise) => {
    if (!autorise) return res.status(403).json({ message: 'Vous n\'êtes pas autorisé à effectuer le visa RH.' });

    db.query('SELECT statut, utilisateur_id FROM conges WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      if (results.length === 0) return res.status(404).json({ message: 'Demande introuvable' });

      const { utilisateur_id } = results[0];
      const nouveau_statut = decision === 'approuver' ? 'approuve_rh' : 'refuse';

      db.query(
        'UPDATE conges SET statut = ?, visa_rh = ?, visa_rh_par = ? WHERE id = ?',
        [nouveau_statut, decision === 'approuver' ? true : false, user_id, id],
        (err) => {
          if (err) return res.status(500).json({ message: 'Erreur serveur' });

          if (decision === 'approuver') {
            db.query('SELECT id FROM utilisateurs WHERE role = "directeur" LIMIT 1', (err, results) => {
              if (results.length > 0) {
                db.query(
                  `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
                  [results[0].id, id, 'Une demande de congé attend votre signature.']
                );
              }
            });
            db.query(
              `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'info')`,
              [utilisateur_id, id, 'Votre demande de congé a été approuvée par le service RH et attend la signature du Directeur.']
            );
          } else {
            db.query(
              `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'refus')`,
              [utilisateur_id, id, 'Votre demande de congé a été refusée par le service RH.']
            );
          }

          res.json({ message: `Visa RH ${decision === 'approuver' ? 'accordé' : 'refusé'}` });
        }
      );
    });
  });
};

// Directeur signe
const signerDirecteur = (req, res) => {
  const { id } = req.params;
  const { signature_directeur, decision } = req.body;

  if (decision === 'refuser') {
    db.query(`UPDATE conges SET statut = 'refuse' WHERE id = ?`, [id], (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      db.query(`SELECT utilisateur_id FROM conges WHERE id = ?`, [id], (err, results) => {
        if (results && results.length > 0) {
          db.query(
            `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'refus')`,
            [results[0].utilisateur_id, id, 'Votre demande de congé a été refusée par le Directeur.']
          );
        }
      });
      return res.json({ message: 'Demande refusée avec succès' });
    });
    return;
  }

  db.query(
    `UPDATE conges SET statut = 'signe_directeur', signature_directeur = ?, signe_at = NOW() WHERE id = ?`,
    [signature_directeur, id],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur serveur' });

      db.query(`SELECT utilisateur_id, nb_jours, type_conge FROM conges WHERE id = ?`, [id], (err, results) => {
        if (results.length > 0) {
          const { utilisateur_id, nb_jours, type_conge } = results[0];

          // Ne pas déduire le solde pour les congés exceptionnels
          if (type_conge !== 'exceptionnel') {
            db.query('SELECT solde_conge, reliquat FROM utilisateurs WHERE id = ?', [utilisateur_id], (err, userResults) => {
              const { solde_conge, reliquat } = userResults[0];
              let nouveauReliquat = reliquat;
              let nouveauSolde = solde_conge;
              if (nb_jours <= reliquat) {
                nouveauReliquat = reliquat - nb_jours;
              } else {
                const reste = nb_jours - reliquat;
                nouveauReliquat = 0;
                nouveauSolde = solde_conge - reste;
              }
              db.query('UPDATE utilisateurs SET solde_conge = ?, reliquat = ? WHERE id = ?', [nouveauSolde, nouveauReliquat, utilisateur_id]);
            });
          }

          db.query(
            `INSERT INTO notifications (utilisateur_id, conge_id, message, type) VALUES (?, ?, ?, 'succes')`,
            [utilisateur_id, id, 'Votre demande de congé a été signée par le Directeur. Votre titre de congé est disponible.']
          );
        }
      });

      res.json({ message: 'Demande signée avec succès' });
    }
  );
};

// Vérifier si le responsable sera absent AVANT la fin du traitement de la demande
// = le responsable part en congé avant la date de début de la demande de l'employé
const verifierResponsableAbsent = (req, res) => {
  const employe_id = req.utilisateur.id;
  const { date_debut, date_fin } = req.query;

  db.query(
    'SELECT responsable_id FROM utilisateurs WHERE id = ?',
    [employe_id],
    (err, results) => {
      if (err || !results.length || !results[0].responsable_id) {
        return res.json({ absent: false, interimaire: null });
      }
      const responsable_id = results[0].responsable_id;

      const today = new Date().toISOString().slice(0, 10);

      // Le responsable ne peut pas traiter = il est déjà en congé AUJOURD'HUI
      db.query(
        `SELECT c.interimaire_id, u.nom, u.prenom, u.fonction
         FROM conges c
         LEFT JOIN utilisateurs u ON c.interimaire_id = u.id
         WHERE c.utilisateur_id = ?
         AND c.statut IN ('signe_directeur', 'approuve_rh', 'approuve_responsable')
         AND c.date_debut <= ? AND c.date_fin >= ?
         LIMIT 1`,
        [responsable_id, today, today],
        (err, conges) => {
          if (err || !conges.length) return res.json({ absent: false, interimaire: null });
          const c = conges[0];
          res.json({
            absent: true,
            interimaire: c.interimaire_id ? {
              id: c.interimaire_id,
              nom: c.nom,
              prenom: c.prenom,
              fonction: c.fonction
            } : null
          });
        }
      );
    }
  );
};
module.exports = {
  creerDemande,
  getMesDemandes,
  getDemandesResponsable,
  getDemandesTraiteesParInterimRH,
  getDemandesTraiteesParInterim,
  getDemandesRH,
  getDemandesDirecteur,
  getDemandesDirecteurTraitees,
  decisionResponsable,
  visaRH,
  signerDirecteur,
  verifierResponsableAbsent
};
