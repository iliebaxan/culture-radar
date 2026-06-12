# CultureRadar — Guide de deploiement

Ce document explique comment deployer le projet CultureRadar en local (developpement) ou en production.

## 1. Prerequis

| Outil | Version | Note |
|---|---|---|
| Node.js | ≥ 18.0.0 | LTS recommande |
| npm | ≥ 9 | Inclus avec Node |
| OS | macOS / Linux / Windows | better-sqlite3 compile a l install |

**Important** : `better-sqlite3` recompile son binaire natif lors de `npm install`. Si vous deployez sur un OS different de votre machine de dev, lancez `npm install` directement sur le serveur cible.

## 2. Installation locale

```bash
# 1. Cloner / extraire le projet
cd culture-radar

# 2. Installer les dependances
npm install

# 3. Initialiser la base avec donnees de demo
npm run seed

# 4. (Optionnel mais recommande) Importer de vrais evenements Paris
npm run sync-all

# 5. Demarrer en mode developpement
npm run dev   # auto-reload via nodemon

# Ou en mode production
npm start
```

Le serveur ecoute sur `http://localhost:3000` par defaut.

## 3. Comptes de demonstration

| Role | Email | Mot de passe | URL apres login |
|---|---|---|---|
| Admin | `admin@culture-radar.fr` | `admin123` | `/admin.html` |
| B2C Premium | `marie.dupont@exemple.fr` | `demo1234` | `/recommendations.html` |
| B2C Free | `lucas.martin@exemple.fr` | `demo1234` | `/recommendations.html` |
| B2B Pro Local | `theatre.belleville@exemple.fr` | `pro1234` | `/pro.html` |
| B2B Pro Local | `mediatheque.montreuil@exemple.fr` | `pro1234` | `/pro.html` |
| B2B Freemium | `galerie.independante@exemple.fr` | `pro1234` | `/pro.html` |

## 4. Configuration (.env)

```ini
# === SERVEUR ===
PORT=3000                  # Port d ecoute
HOST=0.0.0.0               # 0.0.0.0 pour binder toutes interfaces

# === SECURITE ===
JWT_SECRET=changez-moi     # OBLIGATOIRE de changer en production (32+ chars)
CORS_ORIGIN=*              # Restreindre a votre domaine en prod

# === BASE DE DONNEES ===
DB_PATH=./database/culture-radar.db   # Mettre un chemin persistent en prod

# === APIs EXTERNES (optionnel) ===
OPENAGENDA_KEY=            # https://openagenda.com/profile/api
OPENAGENDA_SEARCH=paris
OPENAGENDA_AGENDA_UID=     # UID d un agenda specifique (optionnel)
```

## 5. Architecture technique

```
culture-radar/
├── server.js                 # Express - point d'entree
├── package.json
├── .env / .env.example
│
├── database/
│   ├── schema.sql            # 12 tables + indexes + FK
│   ├── db.js                 # Connexion better-sqlite3 (singleton)
│   ├── seed.js               # Donnees de demo riches
│   ├── sync-all.js           # Import multi-sources (Paris + Cibul + OpenAgenda)
│   ├── sync-openagenda.js    # Import OpenAgenda seul
│   └── export.js             # Dump SQL complet
│
├── middleware/
│   └── auth.js               # JWT + RBAC (user / pro / admin)
│
├── routes/                   # API REST sous /api
│   ├── auth.js               # register, login, logout, me, password, prefs
│   ├── events.js             # CRUD evenements + filtres riches
│   ├── places.js             # CRUD lieux culturels
│   ├── reservations.js       # Envies / reservations
│   ├── reviews.js            # Avis 1-5 etoiles
│   ├── recommendations.js    # Moteur de scoring transparent
│   ├── subscriptions.js      # Plans (MVP - non-paye en prod)
│   ├── promotions.js         # Packs promo (MVP - non-paye en prod)
│   ├── admin.js              # Stats, users, partnerships, rapports
│   ├── contact.js            # Messages reçus
│   ├── analytics.js          # Tracking front
│   └── external.js           # Meteo, OpenAgenda
│
├── utils/
│   ├── recommendations.js    # Algorithme de scoring (rule-based)
│   ├── weather.js            # Open-Meteo + cache
│   ├── openagenda.js         # OpenAgenda v2
│   ├── paris-opendata.js     # Que faire a Paris ? (sans cle)
│   └── idf-opendata.js       # Cibul / Opendatasoft (sans cle)
│
└── public/                   # Front-end statique (HTML/CSS/JS vanilla)
    ├── index.html            # Landing
    ├── login.html / register.html
    ├── events.html / event.html
    ├── places.html / place.html
    ├── recommendations.html
    ├── profile.html          # Espace B2C (5 onglets)
    ├── pro.html              # Espace B2B (5 onglets)
    ├── admin.html            # Dashboard admin (6 onglets)
    ├── pricing.html          # Tarifs (CTA -> /contact.html)
    ├── contact.html          # Formulaire contact
    ├── reservation.html      # Redirection vers source officielle
    ├── about.html / legal.html / 404.html
    ├── css/style.css         # Design system + dark mode
    └── js/common.js          # Helpers API, auth, hearts, theme
```

## 6. Roles & permissions

| Action | Anonyme | User | Pro | Admin |
|---|---|---|---|---|
| Voir le catalogue | ✅ | ✅ | ✅ | ✅ |
| Voir un evt / lieu | ✅ | ✅ | ✅ | ✅ |
| Recommandations basiques | ✅ | ✅ | ✅ | ✅ |
| Recommandations personnalisees | ❌ | ✅ | ✅ | ✅ |
| Mes envies / reservations | ❌ | ✅ | ✅ | ✅ |
| Laisser un avis | ❌ | ✅ | ✅ | ✅ |
| Modifier son profil / mot de passe | ❌ | ✅ | ✅ | ✅ |
| Supprimer son compte (RGPD) | ❌ | ✅ | ✅ | ❌ |
| CRUD ses lieux et evenements | ❌ | ❌ | ✅ | ✅ |
| Acheter promo (MVP demo) | ❌ | ❌ | ✅ | ✅ |
| Stats, users, partenariats, rapports | ❌ | ❌ | ❌ | ✅ |
| Moderer / supprimer tout evt | ❌ | ❌ | ❌ | ✅ |

## 7. Deploiement en production

### 7.1 Avec PM2 (process manager)

```bash
npm install -g pm2
pm2 start server.js --name culture-radar
pm2 save
pm2 startup        # generation du script systemd
```

### 7.2 Derriere Nginx

```nginx
server {
    listen 80;
    server_name culture-radar.fr www.culture-radar.fr;

    # Redirection HTTPS (apres certbot)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name culture-radar.fr www.culture-radar.fr;

    ssl_certificate     /etc/letsencrypt/live/culture-radar.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/culture-radar.fr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 Avec Docker (optionnel)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm rebuild better-sqlite3
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t culture-radar .
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/database \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  --name culture-radar culture-radar
```

### 7.4 Cron de synchronisation des evenements

Ajouter au crontab pour rafraichir le catalogue chaque nuit :

```cron
0 3 * * *  cd /opt/culture-radar && npm run sync-all >> /var/log/cr-sync.log 2>&1
```

## 8. Securite en production

- **JWT_SECRET** : utiliser une chaine cryptographiquement aleatoire (ex : `openssl rand -hex 32`)
- **CORS_ORIGIN** : restreindre au domaine officiel (`https://culture-radar.fr`)
- **HTTPS obligatoire** (Let's Encrypt + Certbot)
- **Helmet** est deja active (CSP, HSTS, X-Frame-Options...)
- **Rate-limiter** est actif sur `/api/auth/*` (30 req / 15 min / IP)
- **bcrypt** est utilise pour les mots de passe (cost = 10)
- **SQL injection** : toutes les requetes utilisent des prepared statements
- **XSS** : `CR.escape()` echappe les contenus utilisateur dans le front

## 9. Sauvegarde / Restauration

```bash
# Sauvegarde quotidienne du fichier .db (SQLite est mono-fichier)
cp database/culture-radar.db database/backup-$(date +%Y%m%d).db

# Export SQL re-importable
npm run export-sql
# -> exports/culture-radar.sql

# Restauration depuis un dump
sqlite3 database/culture-radar.db < exports/culture-radar.sql
```

## 10. Surveillance

Le serveur expose `GET /api/health` qui retourne `{ status: "ok", time: "..." }`.

Pour un monitoring complet, vous pouvez utiliser :
- **UptimeRobot** : ping `/api/health` toutes les 5 min
- **PM2** : `pm2 monit` (CPU, RAM, logs)
- **Logs** : `pm2 logs culture-radar`

## 11. Mode MVP (paiement desactive)

Le projet est livre comme **MVP educatif**. Aucun paiement n est traite en ligne :
- Les CTA de la page Tarifs renvoient vers `/contact.html` avec pre-remplissage du sujet
- L espace B2B "Promouvoir" propose des promotions de **demo** (creent une row en DB, sans transaction reelle)
- L onglet Abonnement du profil utilisateur affiche un message MVP

Pour activer le paiement reel, integrer **Stripe** dans `routes/subscriptions.js` et `routes/promotions.js` (les schemas SQL sont prets).

## 12. Verification post-deploiement

Apres deploiement, verifier :

- [ ] `GET /api/health` repond 200
- [ ] Page d accueil charge avec les KPIs
- [ ] Les categories de la home redirigent vers `/events.html?category=X`
- [ ] Connexion avec un compte demo fonctionne
- [ ] Le toggle dark/light mode persiste apres rafraichissement
- [ ] L heart sur les cards fonctionne (logged-in vs anonyme)
- [ ] La page "Mes envies" affiche les evts likes
- [ ] La distance slider met a jour le label en temps reel
- [ ] Le mode Grille / Liste change l affichage sans rechargement
- [ ] Le bouton "Reserver" sur une fiche evenement ouvre la billetterie source dans un nouvel onglet
- [ ] La deconnexion redirige vers `/login.html` et nettoie le localStorage
- [ ] Un admin peut supprimer/modifier un user, generer un rapport
- [ ] Un pro peut creer/editer/supprimer un evenement et un lieu
- [ ] La page 404 s affiche pour les routes inconnues
