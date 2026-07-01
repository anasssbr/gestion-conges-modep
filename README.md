# 🏢 Système MODEP-Congés

Application web de gestion des congés du personnel de la **MODEP** (Mutuelle de l'Office d'Exploitation des Ports).

---

## 📋 Prérequis

Avant de commencer, assurez-vous que les logiciels suivants sont installés sur la machine :

| Logiciel | Version minimale | Lien de téléchargement |
|---|---|---|
| Node.js | v18 ou supérieure | https://nodejs.org |
| npm | v9 ou supérieure | (inclus avec Node.js) |
| MySQL | v8.0 ou supérieure | https://dev.mysql.com/downloads/mysql |
| Git *(optionnel)* | — | https://git-scm.com |

Pour vérifier si Node.js et npm sont déjà installés, ouvrez un terminal et tapez :

```bash
node -v
npm -v
```

---

## 📁 Structure du projet

```
gestion-conges-modep/
├── backend/          # Serveur Node.js / Express + API REST
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── .env          # Variables d'environnement (à configurer)
│   └── server.js
└── frontend/         # Interface React.js
    ├── src/
    │   ├── pages/
    │   └── assets/
    └── package.json
```

---

## ⚙️ Installation

### Étape 1 — Copier le projet

Copiez le dossier `gestion-conges-modep` sur votre bureau ou dans un répertoire de votre choix.

---

### Étape 2 — Créer la base de données MySQL

1. Ouvrez **MySQL Workbench** ou **phpMyAdmin** (ou le client MySQL de votre choix).
2. Connectez-vous avec vos identifiants MySQL.
3. Créez une nouvelle base de données nommée `modep_conges` :

```sql
CREATE DATABASE modep_conges CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. Sélectionnez la base de données :

```sql
USE modep_conges;
```

5. Créez les tables nécessaires en exécutant les requêtes suivantes :

```sql
CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role ENUM('employe', 'responsable', 'rh', 'directeur') NOT NULL DEFAULT 'employe',
  departement VARCHAR(100),
  fonction VARCHAR(100),
  matricule VARCHAR(50),
  cin VARCHAR(20),
  solde_conge INT DEFAULT 18,
  reliquat INT DEFAULT 0,
  responsable_id INT DEFAULT NULL,
  interim_rh_id INT DEFAULT NULL,
  statut ENUM('actif', 'inactif') DEFAULT 'actif',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (responsable_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  FOREIGN KEY (interim_rh_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

CREATE TABLE conges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  responsable_id INT DEFAULT NULL,
  interimaire_id INT DEFAULT NULL,
  type_conge ENUM('annuel', 'maladie', 'maternite', 'sans_solde', 'exceptionnel') NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nb_jours INT NOT NULL,
  motif TEXT,
  statut ENUM('en_attente', 'approuve_responsable', 'approuve_rh', 'signe_directeur', 'refuse') DEFAULT 'en_attente',
  reference VARCHAR(30),
  avis_responsable TEXT,
  visa_rh BOOLEAN DEFAULT FALSE,
  visa_rh_par INT DEFAULT NULL,
  signature_directeur LONGTEXT,
  signe_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (responsable_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  FOREIGN KEY (interimaire_id) REFERENCES utilisateurs(id) ON DELETE SET NULL,
  FOREIGN KEY (visa_rh_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL,
  conge_id INT DEFAULT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'refus', 'validation') DEFAULT 'info',
  lu BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id),
  FOREIGN KEY (conge_id) REFERENCES conges(id) ON DELETE SET NULL
);

CREATE TABLE signatures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  image_data LONGTEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

6. Insérez un utilisateur **Directeur** et un utilisateur **Admin RH** pour les premiers accès :

```sql
-- Mot de passe : password (haché avec bcrypt)
INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, departement, matricule)
VALUES
  ('Alaoui', 'Karim', 'karim@modep.ma',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'directeur', 'Direction Générale', 'DIR-001'),
  ('Amrani', 'Fatima', 'fatima@modep.ma',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'rh', 'Ressources Humaines', 'RH-001');
```

> **Note :** Le mot de passe par défaut est `password`. Le hash fourni est un hash **bcrypt** (10 rounds) qui correspond exactement à `password`. Pensez à changer les mots de passe après la première connexion via la section Paramètres.

> **Note Puppeteer :** La génération de PDF utilise **Puppeteer** (qui télécharge Chromium automatiquement lors du `npm install`). Sur certaines machines en entreprise, ce téléchargement peut être bloqué par un proxy ou un antivirus. Si `npm install` du backend est lent ou bloque, utilisez :
> ```bash
> npm install --ignore-scripts
> node node_modules/puppeteer/install.js
> ```

---

### Étape 3 — Configurer le backend

1. Ouvrez un terminal et naviguez vers le dossier `backend` :

```bash
cd chemin/vers/gestion-conges-modep/backend
```

2. Installez les dépendances Node.js :

```bash
npm install
```

3. Renommez le fichier `.env.example` en `.env` et adaptez les valeurs selon votre configuration MySQL :

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=modep_conges
JWT_SECRET=modep_secret_key_2026
```

> **Important :** Si votre MySQL a un mot de passe, renseignez-le dans `DB_PASSWORD`. Si vous utilisez XAMPP ou une installation locale sans mot de passe, laissez `DB_PASSWORD=` vide.

---

### Étape 4 — Configurer le frontend

1. Dans un **nouveau terminal**, naviguez vers le dossier `frontend` :

```bash
cd chemin/vers/gestion-conges-modep/frontend
```

2. Installez les dépendances React :

```bash
npm install
```

---

## 🚀 Démarrage de l'application

L'application nécessite deux terminaux ouverts simultanément.

### Terminal 1 — Démarrer le backend

```bash
cd chemin/vers/gestion-conges-modep/backend
node server.js
```

Si tout est correct, vous verrez :

```
✅ Connecté à la base de données MySQL
🚀 Serveur démarré sur le port 5000
```

### Terminal 2 — Démarrer le frontend

```bash
cd chemin/vers/gestion-conges-modep/frontend
npm start
```

Le navigateur s'ouvrira automatiquement sur **http://localhost:3000**

---

## 🔐 Accès à l'application

| Rôle | Email | Mot de passe |
|---|---|---|
| Directeur | karim@modep.ma | password |
| Admin RH | fatima@modep.ma | password |

> Pour ajouter des employés et des responsables, connectez-vous en tant qu'**Admin RH** et accédez à la section **Employés** du dashboard.

---

## 🗂️ Ports utilisés

| Service | Port |
|---|---|
| Frontend (React) | http://localhost:3000 |
| Backend (API) | http://localhost:5000 |
| MySQL | 3306 (par défaut) |

---

## ❓ Problèmes courants

**Le backend ne démarre pas — erreur de connexion MySQL**
- Vérifiez que le service MySQL est bien démarré (XAMPP → Start MySQL, ou Services Windows).
- Vérifiez les identifiants dans le fichier `.env`.
- Assurez-vous que la base de données `modep_conges` existe bien.

**Le frontend affiche une erreur réseau**
- Vérifiez que le backend est bien démarré sur le port 5000.
- Vérifiez que vous n'avez pas de pare-feu bloquant le port 5000.

**`npm install` échoue**
- Vérifiez votre version de Node.js (`node -v`) — elle doit être ≥ 18.
- Supprimez le dossier `node_modules` et le fichier `package-lock.json`, puis relancez `npm install`.

**Port 3000 ou 5000 déjà utilisé**
- Fermez l'autre application qui utilise ce port, ou modifiez le port dans `.env` (backend) ou dans `package.json` (frontend).

---

## 👨‍💻 Développé par

**Anas Sabri** — Stagiaire ESTC 2024-2025
Encadrant : **M. Elhoucine Dahous** — MODEP
