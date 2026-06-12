# CultureRadar — Manuel utilisateur

**Version 1.0 — Bachelor IA & Management, IA School, Promotion 2024/25**

Ce manuel decrit l utilisation complete de la plateforme CultureRadar pour les trois profils d utilisateurs :

- **Visiteur / grand public** (B2C)
- **Professionnel** (lieu culturel, organisateur - B2B)
- **Administrateur** de la plateforme

Il sert a la fois de guide d onboarding, de support de soutenance et de documentation de reference pour l equipe d Atelier 59.

---

## Sommaire

1. [Prise en main en 5 minutes](#1-prise-en-main-en-5-minutes)
2. [Pages publiques](#2-pages-publiques)
3. [Parcours B2C - Grand public](#3-parcours-b2c---grand-public)
4. [Parcours B2B - Professionnels](#4-parcours-b2b---professionnels)
5. [Parcours Admin](#5-parcours-admin)
6. [La boussole - moteur de recommandation](#6-la-boussole---moteur-de-recommandation)
7. [Abonnements et promotions](#7-abonnements-et-promotions)
8. [Vie privee et RGPD](#8-vie-privee-et-rgpd)
9. [FAQ](#9-faq)
10. [Glossaire](#10-glossaire)

---

## 1. Prise en main en 5 minutes

### Acces
Ouvrez un navigateur a l adresse communiquee par l equipe (par defaut `http://localhost:3000` en local).

### Comptes de test

| Role | Email | Mot de passe |
|---|---|---|
| Admin | `admin@culture-radar.fr` | `admin123` |
| B2C Premium | `marie.dupont@exemple.fr` | `demo1234` |
| B2C Free | `lucas.martin@exemple.fr` | `demo1234` |
| B2B Pro Local | `theatre.belleville@exemple.fr` | `pro1234` |
| B2B Freemium | `galerie.independante@exemple.fr` | `pro1234` |

### Premiere visite en 3 etapes

1. Cliquez sur **S inscrire** (ou utilisez un compte de demo).
2. Definissez vos preferences culturelles (chips a selectionner).
3. Depuis **Ma boussole**, autorisez la geolocalisation pour obtenir des recommandations adaptees a votre position.

---

## 2. Pages publiques

Toutes les pages suivantes sont accessibles sans compte :

| Page | URL | Contenu |
|---|---|---|
| Accueil | `/` | Pitch de la plateforme, KPIs, evenements mis en avant |
| Evenements | `/events.html` | Catalogue complet avec filtres categorie / ville / gratuit |
| Detail evenement | `/event.html?id=X` | Infos completes, avis, bouton "envie" / reservation |
| Lieux culturels | `/places.html` | Annuaire avec filtre par categorie + lieux independants |
| Detail lieu | `/place.html?id=X` | Infos lieu, prochains evenements programmes |
| A propos | `/about.html` | Presentation d Atelier 59, methodologie, partenariats |
| Tarifs | `/pricing.html` | Plans B2C, B2B et packs promotion |
| Mentions legales | `/legal.html` | Mentions legales complete + section RGPD |
| Contact | `/contact.html` | Adresses mails dediees (support, pro, presse, partenariats) |

### Barre de navigation

La barre de navigation s adapte automatiquement :

- **Visiteur non connecte** : liens publics + "Connexion" + "S inscrire"
- **Utilisateur connecte** : liens publics + prenom (espace personnel) + "Deconnexion"
- **Professionnel** : liens publics + "Espace Pro"
- **Administrateur** : liens publics + "Admin"

---

## 3. Parcours B2C - Grand public

### 3.1. Inscription

Depuis la page **S inscrire** :

1. Choisissez le profil **Particulier** (chip actif par defaut).
2. Remplissez email + mot de passe + prenom / nom + ville.
3. Optionnel : cliquez sur "Utiliser ma position" pour pre-remplir lat/lng.
4. Validez. Vous etes automatiquement connecte et redirige vers votre espace.

### 3.2. Espace personnel (`/profile.html`)

L espace propose 5 onglets :

#### 3.2.1. Envies ❤️

Affiche toutes les cartes d evenements que vous avez marques comme "envie" via le bouton ❤️ sur une fiche evenement. Depuis cette liste vous pouvez :

- Voir la fiche (`Voir`)
- Transformer l envie en reservation (`Reserver`)
- Supprimer (🗑️)

#### 3.2.2. Reservations 🎟️

Tableau recapitulatif des evenements reserves (status `reserve` ou `participe`). Pour chaque ligne :

- Lien vers la fiche evenement
- Date / heure formatee
- Badge statut
- Nombre de places
- Bouton "Annuler" (supprime la reservation)

#### 3.2.3. Preferences ⚙️

Selection des categories culturelles qui vous interessent (theatre, musique, exposition, patrimoine, danse, cinema, litterature, festival, atelier, jeune public). Ces preferences **alimentent directement le moteur de recommandation**.

> 💡 Astuce : selectionnez 3 a 5 categories pour obtenir la meilleure pertinence.

#### 3.2.4. Profil 👤

Informations personnelles :

- Prenom / nom
- Ville / code postal
- Mode de deplacement (a pied, velo, transports, voiture)
- Rayon maximum de recherche (km)
- Bio (optionnel)
- Newsletter hebdomadaire (case a cocher)
- Bouton "Utiliser ma position" pour actualiser les coordonnees GPS

Le **mode de deplacement** et le **rayon** sont utilises pour filtrer et pondere les recommandations (ex : un cycliste a un rayon plus grand qu un pieton).

#### 3.2.5. Abonnement 💎

- Affiche votre abonnement courant (Free / Premium)
- Liste les plans disponibles
- Bouton "Choisir" pour souscrire a Premium (4,99 EUR / mois)
- Bouton "Annuler l abonnement" si vous etes Premium

### 3.3. Parcours type "je cherche une sortie ce week-end"

1. Connectez-vous (ou restez anonyme, seule la proximite sera utilisee sans preferences).
2. Cliquez sur **Ma boussole** dans la navbar.
3. Acceptez la geolocalisation.
4. Consultez la barre de contexte (utilisateur, ville, meteo du moment).
5. Parcourez les cartes triees par score.
6. Cliquez sur une carte pour ouvrir la fiche evenement.
7. Cliquez sur ❤️ (envie) ou 🎟️ (reserver).
8. Retrouvez vos sorties dans votre espace personnel.

### 3.4. Fiche evenement

La fiche d un evenement contient :

- Image + titre + badges (categorie, prix, outdoor, independant, promotion)
- Date de debut / fin formatees
- Lieu cliquable (vers la fiche du lieu)
- Description
- Bloc avis (note moyenne + liste des commentaires)
- Boutons d action : ❤️ Envie / 🎟️ Reserver / Deposer un avis (si connecte)

Les avis sont limites a 1 par utilisateur et par evenement (upsert). Notation de 1 a 5 etoiles + commentaire.

---

## 4. Parcours B2B - Professionnels

### 4.1. Inscription en tant que professionnel

Depuis `/register.html` :

1. Cliquez sur le chip **Professionnel** pour basculer en mode B2B.
2. Renseignez email + mot de passe + nom du lieu/organisateur + ville.
3. Validez. Vous etes redirige vers l espace Pro.

### 4.2. Espace Pro (`/pro.html`)

L espace professionnel propose 5 onglets :

#### 4.2.1. Tableau de bord 📊

4 KPIs :
- Nombre d evenements publies
- Nombre d evenements en promotion
- Nombre d inscrits (reservations)
- Abonnement courant

#### 4.2.2. Mes evenements 📋

Tableau de tous les evenements crees. Pour chaque ligne :

- Titre cliquable (vers la fiche)
- Lieu
- Date
- Status (brouillon / publie / archive)
- Bouton pour passer en promotion
- Bouton pour archiver / supprimer

#### 4.2.3. Nouvel evenement ➕

Formulaire complet :

- Titre, categorie, lieu (selection dans vos lieux)
- Date debut / fin
- Prix min / max (ou case "Gratuit")
- Nombre de places total
- Case "Outdoor" (plein air) - cruciale pour la ponderation meteo
- Image (URL)
- Description

Apres creation, l evenement est publie immediatement par defaut et apparait dans le catalogue public.

#### 4.2.4. Mes lieux 🏛️

Formulaire de creation de lieu :

- Nom du lieu, categorie (theatre, musee, salle, galerie, cinema, bibliotheque, espace independant, ...)
- Description
- Adresse, ville, code postal
- Latitude / longitude (optionnel - geoloc auto disponible)
- Site web, image
- **Case "Lieu independant"** - declenche l attribution du **Badge CultureRadar** affiche sur toutes les fiches evenements rattachees.

#### 4.2.5. Promotion 📢

Mettez en avant un evenement avec un des 3 packs :

| Pack | Prix | Duree | Benefices |
|---|---|---|---|
| Boost 7 jours | 15 EUR | 7 jours | Mise en avant locale dans le catalogue |
| Premium 30 jours | 49 EUR | 30 jours | Position premium + newsletter |
| Sponsored | 99 EUR | 30 jours | Page d accueil + push + newsletter + badge |

Selectionnez un evenement, choisissez un pack, validez.

### 4.3. Badge "CultureRadar" (differenciateur)

Les **lieux independants** beneficient automatiquement du badge ⭐ CultureRadar, visible sur :

- La carte du lieu dans l annuaire
- Chaque fiche evenement qu il organise
- Les recommandations (bonus de +5 points sur le score)

Ce badge est un engagement d Atelier 59 pour mettre en avant la culture independante et de proximite.

---

## 5. Parcours Admin

### 5.1. Connexion admin

Email `admin@culture-radar.fr` / mot de passe `admin123`. La barre de navigation affiche alors un onglet **Admin**.

### 5.2. Tableau de bord (`/admin.html`)

#### 5.2.1. KPIs

8 cartes regroupees par domaine :

- **Utilisateurs** (total + payants)
- **Evenements publies** (/ total)
- **Lieux** (/ independants)
- **Reservations** (/ avis / note moyenne)
- **MRR abonnements** (EUR / mois)
- **Promotions du mois** (EUR)
- **Partenariats** (EUR / mois)
- **Revenu mensuel total** (carte gradient mise en avant)

#### 5.2.2. Graphiques

- Ligne : inscriptions 7 derniers jours
- Barres : reservations 30 derniers jours
- Donut : top categories du mois
- Barres horizontales : top villes

#### 5.2.3. Top evenements

Classement des 10 evenements avec le plus d inscrits, lien cliquable.

### 5.3. Gestion des utilisateurs

Tableau triable avec pour chaque utilisateur :

- Email / nom / ville
- Dropdown role (user / pro / admin)
- Dropdown abonnement (free / premium / pro_local / enterprise)
- Checkbox actif / desactive
- Date d inscription / derniere connexion

Toute modification est sauvegardee immediatement (PUT `/api/admin/users/:id`).

### 5.4. Gestion des partenariats

Formulaire de creation (type : collectivite / ecole / entreprise / media / autre ; nom ; contact ; montant annuel ; dates) + tableau de tous les partenariats actifs.

### 5.5. Rapports mensuels

Bouton **"Generer le rapport mensuel"** en haut de page :

- Calcule tous les KPIs du mois en cours
- Enregistre un rapport archive dans la table `monthly_reports`
- Affichage dans l onglet **Rapports** : periode, inscrits, nouveaux, evenements, reservations, avis, revenus detailles, total

Ces rapports permettent de suivre l evolution de la plateforme mois par mois et sont exportables (SQL export).

---

## 6. La boussole - moteur de recommandation

### 6.1. Principe

Pour chaque evenement publie dans le rayon de recherche, le moteur calcule un score de pertinence **0 a 100** combinant :

| Composante | Poids | Source |
|---|---|---|
| Preferences | 40% | Correspondance categorie utilisateur |
| Proximite | 25% | Distance Haversine + mode de mobilite |
| Meteo | 15% | Open-Meteo (outdoor/indoor + conditions) |
| Disponibilite | 10% | Proximite temporelle |
| Bonus | 10% | Lieu independant, gratuit, promotion |

### 6.2. Affichage transparent

Chaque carte de recommandation affiche un badge **"XX% match"** au hover duquel vous voyez le detail de chaque composante. Cette transparence est un choix deliberes (explicabilite).

### 6.3. Influences meteo

Exemples :

- Plein air + pluie forte = fort malus
- Musee + temps pluvieux = bonus leger
- Concert exterieur + canicule = malus
- Cinema + toute meteo = score meteo neutre

### 6.4. Sans compte

Un visiteur anonyme peut acceder a **Ma boussole** en fournissant uniquement sa geolocalisation. Seules les composantes proximite et meteo sont actives (les preferences sont ignorees). Le score est donc moins precis mais toujours utilisable.

---

## 7. Abonnements et promotions

### 7.1. Plans B2C

| Plan | Prix | Inclus |
|---|---|---|
| Free | 0 EUR | Recommandations, envies, reservations, avis |
| Premium | 4,99 EUR / mois | Alertes avancees, recommandations premium, contenu exclusif |

### 7.2. Plans B2B

| Plan | Prix | Inclus |
|---|---|---|
| Freemium | 0 EUR | Publication de 3 lieux et 10 evenements / mois |
| Pro Local | 29 EUR / mois | Publication illimitee, stats de base, 1 promotion offerte |
| Entreprise | 149 EUR / mois | Publication illimitee, API, analytics avances, support dedie |

### 7.3. Packs promotion

| Pack | Prix | Duree |
|---|---|---|
| Boost 7 jours | 15 EUR | 7 jours |
| Premium 30 jours | 49 EUR | 30 jours |
| Sponsored | 99 EUR | 30 jours |

### 7.4. Partenariats

Destines aux collectivites territoriales, ecoles, entreprises et medias. Montant annuel negocie (voir la page contact `partenariats@culture-radar.fr`).

---

## 8. Vie privee et RGPD

### 8.1. Donnees collectees

- Donnees de compte : email, nom, prenom, ville, code postal
- Donnees optionnelles : latitude / longitude (si geoloc acceptee), mobilite, bio, newsletter
- Donnees d activite : reservations, envies, avis
- Analytics : `page_view`, `event_view`, `reservation_added` (anonymises avec un session_id)

### 8.2. Droits utilisateurs

Conformement au RGPD, vous disposez des droits :

- Acces (export depuis l espace profil - a venir)
- Rectification (editable dans Profil)
- Suppression (compte desactive par l admin)
- Portabilite
- Opposition au traitement

Contact DPO : `rgpd@culture-radar.fr`.

### 8.3. Cookies

La plateforme n utilise que des cookies **strictement necessaires** (session JWT stockee dans localStorage). Aucun cookie de tracking tiers n est pose.

---

## 9. FAQ

**Q. J ai oublie mon mot de passe.**
R. Une route de reset sera ajoutee en production. En demo, contactez un admin pour reinitialiser.

**Q. Mes recommandations sont vides / trop limitees.**
R. Verifiez :
1. Vos preferences sont bien saisies (profil > onglet preferences).
2. Votre rayon maximal est suffisant (15 km par defaut).
3. Votre geolocalisation est acceptee.

**Q. Comment supprimer un evenement que j ai cree par erreur ?**
R. Dans l espace pro, onglet "Mes evenements", bouton Supprimer.

**Q. Comment beneficier du badge CultureRadar ?**
R. Cocher la case "Lieu independant" a la creation d un lieu dans l espace Pro.

**Q. Puis-je utiliser CultureRadar sans creer de compte ?**
R. Oui, en mode invite vous pouvez consulter le catalogue, les fiches et obtenir une boussole basee sur la geolocalisation uniquement.

**Q. Les promotions sont-elles refacturables ?**
R. Oui, le systeme enregistre le payment_status. En production, integrer un PSP (Stripe / Mollie).

---

## 10. Glossaire

- **B2C** : Business-to-Consumer — utilisateurs particuliers
- **B2B** : Business-to-Business — lieux, organisateurs, institutions
- **MRR** : Monthly Recurring Revenue — revenu mensuel recurrent
- **JWT** : JSON Web Token — mecanisme d authentification stateless
- **RGPD** : Reglement General sur la Protection des Donnees
- **Haversine** : formule de calcul de distance geographique entre 2 points
- **Outdoor** : evenement en plein air, influence par la meteo
- **Badge CultureRadar** : label attribue aux lieux culturels independants
- **Freemium** : modele mixant offre gratuite et options payantes

---

*Ce manuel est evolutif. Toute suggestion peut etre envoyee a `support@culture-radar.fr`.*
