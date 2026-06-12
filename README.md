# CultureRadar — La boussole culturelle

> Plateforme intelligente de recommandations culturelles pour reconnecter les habitants a l offre culturelle de leur territoire.

Projet realise dans le cadre du **Bachelor IA & Management - IA School (B3) - Certification 2024/25 - Mission Possible - Etude de cas n°3 : CultureRadar**.

---

## 1. Sommaire

1. [Pitch](#2-pitch)
2. [Fonctionnalites principales](#3-fonctionnalites-principales)
3. [Stack technique](#4-stack-technique)
4. [Architecture](#5-architecture)
5. [Installation rapide](#6-installation-rapide)
6. [Comptes de demonstration](#7-comptes-de-demonstration)
7. [Configuration (.env)](#8-configuration-env)
8. [API REST](#9-api-rest)
9. [Modele de donnees](#10-modele-de-donnees)
10. [Moteur de recommandation](#11-moteur-de-recommandation)
11. [Deploiement](#12-deploiement)
12. [Export SQL](#13-export-sql)
13. [Manuel utilisateur](#14-manuel-utilisateur)

---

## 2. Pitch

CultureRadar est la reponse d Atelier 59 (SAS, Montreuil, 50 000 EUR de capital) au besoin de 68% des Francais qui affirment ne pas trouver l offre culturelle qui leur correspond. La plateforme allie :

- **Un moteur de recommandation intelligent** (preferences + localisation + meteo + disponibilite)
- **Un annuaire cartographique** des lieux culturels (theatres, musees, salles, galeries, espaces independants)
- **Un badge "CultureRadar"** pour mettre en avant les lieux independants
- **Un espace professionnel** pour les lieux et organisateurs (publication gratuite + promotion payante)
- **Un modele economique freemium** (utilisateurs + partenariats collectivites/ecoles/entreprises)

---

## 3. Fonctionnalites principales

### Cote utilisateur (B2C)

- Inscription / connexion (email + mot de passe)
- Configuration des preferences culturelles (theatre, musique, patrimoine, etc.)
- Parcours du catalogue (filtres categorie, ville, prix, accessibilite)
- Page "Ma boussole" : recommandations personnalisees tenant compte de la meteo et de la position
- Reservation / envies / historique
- Avis et notes (1 a 5 etoiles)
- Gestion de l abonnement (Free, Premium a 4,99 EUR/mois)
- Geolocalisation pour optimiser les trajets (mode : a pied / velo / transports / voiture)

### Cote professionnel (B2B)

- Inscription en tant qu organisateur / lieu culturel
- Creation et gestion des lieux (adresse, description, image, site web)
- Creation et gestion des evenements (categorie, date, prix, places, outdoor, etc.)
- **Badge "CultureRadar"** attribue aux lieux independants
- Tableau de bord : nombre d evenements publies, inscrits, vues, promotion
- Promotion payante (3 packs : Boost 7j 15 EUR, Premium 30j 49 EUR, Sponsored 99 EUR)

### Cote administrateur

- KPIs globaux : utilisateurs, contenu, engagement, revenus (MRR, promotions, partenariats)
- Graphiques temporels (inscriptions 7j, reservations 30j)
- Top categories et top villes
- Gestion des utilisateurs (role, abonnement, activation)
- Gestion des partenariats (collectivites, ecoles, entreprises, medias)
- Generation des rapports mensuels archives (KPIs + revenus)

---

## 4. Stack technique

| Couche | Technologie |
|---|---|
| Backend | Node.js 18+ / Express 4.21 |
| Base de donnees | SQLite via `better-sqlite3` 11 (portable, zero config) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Securite | `helmet` (CSP) + `express-rate-limit` + `cors` |
| Frontend | HTML / CSS / JS vanilla (sans framework, zero build) |
| Charts | Chart.js 4 (CDN, espace admin uniquement) |
| Typographie | Inter (Google Fonts) |
| Meteo | Open-Meteo (gratuit, sans cle API) |
| Agenda culturel | OpenAgenda API (cle optionnelle) |

---

## 5. Architecture

```
culture-radar/
├── server.js                 # Express - point d entree
├── package.json
├── .env.example              # Modele de configuration
│
├── database/
│   ├── schema.sql            # Schema SQL (12 tables, FK, indexes)
│   ├── db.js                 # Connexion better-sqlite3, init auto
│   ├── seed.js               # Donnees de demonstration
│   └── export.js             # Dump SQL (schema + donnees)
│
├── middleware/
│   └── auth.js               # JWT + RBAC (user / pro / admin)
│
├── routes/
│   ├── auth.js               # /api/auth (register, login, me, preferences)
│   ├── events.js             # /api/events (CRUD + mine)
│   ├── places.js             # /api/places (CRUD + mine)
│   ├── reservations.js       # /api/reservations (envies / reservations)
│   ├── reviews.js            # /api/reviews (avis)
│   ├── recommendations.js    # /api/recommendations (moteur)
│   ├── subscriptions.js      # /api/subscriptions (plans, abonnements)
│   ├── promotions.js         # /api/promotions (packs payants)
│   ├── admin.js              # /api/admin (stats, users, partnerships, reports)
│   ├── external.js           # /api/external (meteo, openagenda)
│   └── analytics.js          # /api/analytics (events de tracking)
│
├── utils/
│   ├── recommendations.js    # Algorithme de scoring
│   ├── weather.js            # Client Open-Meteo + cache
│   └── openagenda.js         # Client OpenAgenda
│
├── exports/
│   └── culture-radar.sql     # Dump complet (genere par `npm run export-sql`)
│
└── public/                   # Frontend statique
    ├── index.html            # Landing
    ├── events.html           # Catalogue
    ├── event.html            # Detail evenement
    ├── recommendations.html  # Ma boussole
    ├── places.html           # Annuaire lieux
    ├── place.html            # Detail lieu
    ├── profile.html          # Espace utilisateur B2C (5 onglets)
    ├── pro.html              # Espace professionnel B2B (5 onglets)
    ├── admin.html            # Tableau de bord admin
    ├── login.html / register.html
    ├── pricing.html / about.html / contact.html / legal.html
    ├── css/style.css         # Design system
    └── js/common.js          # Helpers API / Auth / UI
```

---

## 6. Installation rapide

### Prerequis

- Node.js ≥ 18
- npm ≥ 9

### Etapes

```bash
# 1. Depuis la racine du dossier culture-radar/
npm install

# 2. (Optionnel) Copier et editer .env
cp .env.example .env

# 3. Seed de la base de demonstration
npm run seed

# 4. Demarrer le serveur
npm start
```

Le serveur ecoute sur **http://localhost:3000** par defaut.

### Commandes npm

| Commande | Effet |
|---|---|
| `npm start` | Demarre le serveur (mode prod) |
| `npm run dev` | Demarre avec nodemon (auto-reload) |
| `npm run seed` | Cree / reinitialise la base de demo |
| `npm run sync-all` | **Importe les vrais evenements** depuis Paris OpenData + Cibul + OpenAgenda (avec photos reelles + url billetterie) |
| `npm run sync-openagenda` | Importe seulement OpenAgenda |
| `npm run export-sql` | Exporte le dump SQL dans `exports/culture-radar.sql` |
| `npm run init` | Combine seed + message de confirmation |

### Sources d evenements (toutes gratuites)

CultureRadar agrege en temps reel les evenements depuis 3 APIs publiques :

1. **Paris OpenData "Que faire a Paris ?"** - sans cle, ~1000 evts/mois avec visuels riches
2. **Cibul / Opendatasoft** - sans cle, evenements nationaux geoloc
3. **OpenAgenda** - cle gratuite (deja configuree dans .env), agendas culturels institutionnels

Les vraies photos et URLs de billetterie de chaque source sont conservees, sans alteration.

---

## 7. Comptes de demonstration

| Role | Email | Mot de passe |
|---|---|---|
| 👑 Admin | `admin@culture-radar.fr` | `admin123` |
| 👤 B2C Premium | `marie.dupont@exemple.fr` | `demo1234` |
| 👤 B2C Free | `lucas.martin@exemple.fr` | `demo1234` |
| 🎭 B2B Pro Local | `theatre.belleville@exemple.fr` | `pro1234` |
| 🎨 B2B Freemium | `galerie.independante@exemple.fr` | `pro1234` |

---

## 8. Configuration (.env)

Toutes les variables sont optionnelles (des valeurs par defaut sures sont fournies).

```ini
# Serveur
PORT=3000
HOST=0.0.0.0

# Securite
JWT_SECRET=changez-moi-en-production
CORS_ORIGIN=*

# APIs externes (optionnel)
OPENAGENDA_KEY=
OPENAGENDA_AGENDA_UID=

# Base de donnees (par defaut database/culture-radar.db)
DB_PATH=./database/culture-radar.db
```

---

## 9. API REST

Toutes les routes sont prefixees par `/api`. Les routes protegees attendent un header `Authorization: Bearer <token>`.

### Auth

```
POST   /api/auth/register        { email, password, role?, nom?, prenom?, ville? }
POST   /api/auth/login           { email, password }
GET    /api/auth/me              (auth)
PUT    /api/auth/me              (auth) { ... champs a modifier }
PUT    /api/auth/preferences     (auth) { preferences: [{ category, weight }] }
POST   /api/auth/password        (auth) { ancien, nouveau }
```

### Evenements

```
GET    /api/events               ?category=&ville=&gratuit=&search=&limit=
GET    /api/events/:id
GET    /api/events/mine/organized (auth pro)
POST   /api/events               (auth pro) { titre, category, place_id, date_debut, ... }
PUT    /api/events/:id           (auth pro)
DELETE /api/events/:id           (auth pro)
```

### Lieux

```
GET    /api/places               ?category=&ville=&independent=1&limit=
GET    /api/places/:id
POST   /api/places               (auth pro) { nom, category, ville, is_independent, ... }
PUT    /api/places/:id           (auth pro)
DELETE /api/places/:id           (auth pro)
```

### Reservations / Avis

```
GET    /api/reservations         (auth)
POST   /api/reservations         (auth) { event_id, status: 'envie'|'reserve'|'participe', nb_places? }
DELETE /api/reservations/:id     (auth)

POST   /api/reviews              (auth) { event_id, note: 1..5, commentaire? }
GET    /api/reviews?event_id=X
```

### Recommandations

```
GET    /api/recommendations      ?lat=..&lng=..&limit=..  (auth optionnel)
```

Le moteur combine preferences, proximite (Haversine), meteo (Open-Meteo), disponibilite et bonus (lieu independant, gratuit, promotion). Chaque recommandation est accompagnee d un `score` (0-100) et de ses composantes.

### Abonnements / Promotions

```
GET    /api/subscriptions/plans
POST   /api/subscriptions        (auth) { plan: 'premium'|'pro_local'|'enterprise' }
POST   /api/subscriptions/cancel (auth)

GET    /api/promotions/packs
POST   /api/promotions           (auth pro) { event_id, pack: 'boost_7j'|'premium_30j'|'sponsored' }
```

### Admin (role admin requis)

```
GET    /api/admin/stats                       # KPIs globaux
GET    /api/admin/users
PUT    /api/admin/users/:id                   # { role?, active?, subscription_type? }
GET    /api/admin/partnerships
POST   /api/admin/partnerships                # { nom, type, montant_annuel, ... }
POST   /api/admin/reports/monthly             # genere le rapport du mois en cours
GET    /api/admin/reports
```

### Externes

```
GET    /api/external/weather?lat=..&lng=..
GET    /api/external/openagenda?q=..&limit=..
```

### Analytics

```
POST   /api/analytics    { event_type, event_data, session_id }
```

---

## 10. Modele de donnees

Le schema complet est dans `database/schema.sql`. Tables principales :

- **users** — utilisateurs (B2C + B2B + admin), abonnement, geolocalisation, mobilite
- **user_preferences** — categories pref., poids
- **places** — lieux culturels (nom, adresse, geo, `is_independent`)
- **events** — evenements (titre, categorie, date, prix, `outdoor`, `gratuit`)
- **reservations** — status envie / reserve / participe / annule
- **reviews** — note 1-5 + commentaire
- **subscriptions** — abonnements payants (plan, prix, status)
- **promotions** — packs payants sur un evenement
- **partnerships** — collectivites, ecoles, entreprises, medias
- **monthly_reports** — KPIs archives mois par mois
- **analytics_events** — tracking frontend (page_view, reservation_added, ...)
- **notifications** — notifications push / email

Toutes les cles etrangeres sont **ON DELETE CASCADE**. La base est en mode WAL pour performances.

---

## 11. Moteur de recommandation

L algorithme (`utils/recommendations.js`) est **rule-based** et transparent (privilegie l explicabilite en soutenance vs un modele ML opaque).

Pour chaque evenement, un score 0-100 est calcule :

| Composante | Poids | Base |
|---|---|---|
| Preferences | 40% | Correspondance categorie + ponderation utilisateur |
| Proximite | 25% | Distance Haversine + mode de mobilite (rayon max) |
| Meteo | 15% | Penalise outdoor si pluie / froid / vent, bonus indoor par mauvais temps |
| Disponibilite | 10% | Bonus si evenement proche dans le temps |
| Bonus | 10% | Lieux independants (+5) / gratuit (+3) / promotion (+2) |

Le score est toujours accompagne du detail des composantes pour un affichage transparent. Si l utilisateur est anonyme, la proximite utilise uniquement les coordonnees passees en query string.

---

## 12. Deploiement

### Mode production

```bash
export NODE_ENV=production
export JWT_SECRET="un-secret-long-et-unique"
npm install --omit=dev
npm run seed              # (uniquement a la 1ere install)
npm start
```

### Derriere Nginx

```nginx
server {
    listen 80;
    server_name culture-radar.fr;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Avec PM2

```bash
npm install -g pm2
pm2 start server.js --name culture-radar
pm2 save && pm2 startup
```

---

## 13. Export SQL

```bash
npm run export-sql
```

Genere `exports/culture-radar.sql` avec :

- Le `CREATE TABLE` / `CREATE INDEX` complet
- Les `INSERT INTO` pour toutes les tables (utilisateurs, lieux, evenements, reservations, abonnements, etc.)

Le dump est directement importable dans une autre base SQLite :

```bash
sqlite3 nouvelle-base.db < exports/culture-radar.sql
```

---

## 14. Manuel utilisateur

Le manuel detaille (parcours B2C / B2B / Admin + captures d ecran) est dans le fichier **[`docs/MANUEL.md`](./docs/MANUEL.md)**.

---

## Credits

- **Etudiant** : Bachelor IA & Management - IA School (Promo 2024/25)
- **Client fictif** : Mme Lemoine - Atelier 59 (Montreuil)
- **Moteur meteo** : [Open-Meteo](https://open-meteo.com/) (gratuit, sans cle)
- **Agenda culturel** : [OpenAgenda](https://openagenda.com/) (API publique)
- **Typographie** : [Inter](https://rsms.me/inter/) par Rasmus Andersson
- **Images** : [Unsplash](https://unsplash.com/) (placeholders de demo)

Licence : MIT.
