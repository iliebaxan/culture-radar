// =====================================================
// CultureRadar - Seed realiste et riche
// Utilisateurs, lieux detailles, evenements avec infos completes
// =====================================================
const bcrypt = require('bcryptjs');
const { getDb, resetDb } = require('./db');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const db = reset ? resetDb() : getDb();

const existingUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (existingUsers > 0 && !reset) {
    console.log(`[seed] ${existingUsers} utilisateurs deja presents. Utilisez --reset pour tout recreer.`);
    process.exit(0);
}

console.log('[seed] Generation des donnees riches...');

// =====================================================
// UTILISATEURS
// =====================================================
const hash = (p) => bcrypt.hashSync(p, 10);

const users = [
    { email: 'admin@culture-radar.fr', password: hash('admin123'), nom: 'Admin', prenom: 'CultureRadar', role: 'admin', ville: 'Paris', code_postal: '75001', latitude: 48.8566, longitude: 2.3522, bio: 'Administrateur de la plateforme.' },
    { email: 'marie.dupont@exemple.fr', password: hash('demo1234'), nom: 'Dupont', prenom: 'Marie', role: 'user', ville: 'Montreuil', code_postal: '93100', latitude: 48.8621, longitude: 2.4412, subscription_type: 'premium', mobility_mode: 'transit', max_distance_km: 20, bio: 'Passionnee de theatre et d expositions.' },
    { email: 'lucas.martin@exemple.fr', password: hash('demo1234'), nom: 'Martin', prenom: 'Lucas', role: 'user', ville: 'Paris', code_postal: '75011', latitude: 48.8590, longitude: 2.3790, subscription_type: 'free', mobility_mode: 'bike', max_distance_km: 10 },
    { email: 'sophie.bernard@exemple.fr', password: hash('demo1234'), nom: 'Bernard', prenom: 'Sophie', role: 'user', ville: 'Lyon', code_postal: '69001', latitude: 45.7640, longitude: 4.8357, subscription_type: 'free', mobility_mode: 'walk', max_distance_km: 5 },
    { email: 'theatre.belleville@exemple.fr', password: hash('pro1234'), nom: 'Theatre de Belleville', prenom: 'Equipe', role: 'pro', ville: 'Paris', code_postal: '75020', latitude: 48.8720, longitude: 2.3830, subscription_type: 'pro_local' },
    { email: 'mediatheque.montreuil@exemple.fr', password: hash('pro1234'), nom: 'Mediatheque Robert-Desnos', prenom: 'Equipe', role: 'pro', ville: 'Montreuil', code_postal: '93100', latitude: 48.8602, longitude: 2.4411, subscription_type: 'pro_local' },
    { email: 'galerie.independante@exemple.fr', password: hash('pro1234'), nom: 'Galerie Art Libre', prenom: 'Equipe', role: 'pro', ville: 'Paris', code_postal: '75020', latitude: 48.8675, longitude: 2.3929, subscription_type: 'pro_local' },
    { email: 'festival.jazz@exemple.fr', password: hash('pro1234'), nom: 'Jazz en Seine', prenom: 'Equipe', role: 'pro', ville: 'Paris', code_postal: '75019', latitude: 48.8907, longitude: 2.3702, subscription_type: 'pro_local' }
];

const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, nom, prenom, role, ville, code_postal, latitude, longitude, subscription_type, mobility_mode, max_distance_km, bio)
    VALUES (@email, @password, @nom, @prenom, @role, @ville, @code_postal, @latitude, @longitude, @subscription_type, @mobility_mode, @max_distance_km, @bio)
`);

const userIds = {};
for (const u of users) {
    const info = insertUser.run({
        email: u.email, password: u.password, nom: u.nom, prenom: u.prenom || null,
        role: u.role, ville: u.ville, code_postal: u.code_postal,
        latitude: u.latitude, longitude: u.longitude,
        subscription_type: u.subscription_type || 'free',
        mobility_mode: u.mobility_mode || 'transit',
        max_distance_km: u.max_distance_km || 15,
        bio: u.bio || null
    });
    userIds[u.email] = info.lastInsertRowid;
}

// =====================================================
// PREFERENCES
// =====================================================
const insertPref = db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, category, weight) VALUES (?, ?, ?)');
const prefs = [
    ['marie.dupont@exemple.fr', 'theatre', 1.0],
    ['marie.dupont@exemple.fr', 'exposition', 0.9],
    ['marie.dupont@exemple.fr', 'patrimoine', 0.7],
    ['marie.dupont@exemple.fr', 'danse', 0.6],
    ['lucas.martin@exemple.fr', 'musique', 1.0],
    ['lucas.martin@exemple.fr', 'festival', 0.8],
    ['lucas.martin@exemple.fr', 'cinema', 0.6],
    ['sophie.bernard@exemple.fr', 'cinema', 1.0],
    ['sophie.bernard@exemple.fr', 'litterature', 0.9],
    ['sophie.bernard@exemple.fr', 'exposition', 0.7]
];
for (const [email, cat, w] of prefs) insertPref.run(userIds[email], cat, w);

// =====================================================
// LIEUX CULTURELS (detailles)
// =====================================================
const places = [
    {
        nom: 'Theatre de Belleville', category: 'theatre',
        adresse: '94 rue du Faubourg du Temple', ville: 'Paris', code_postal: '75011',
        lat: 48.8694, lng: 2.3702, independent: 1, owner: 'theatre.belleville@exemple.fr',
        image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80','https://images.unsplash.com/photo-1516307365426-bea591f05011?w=1200&q=80','https://images.unsplash.com/photo-1545228818-dfe9a6a4b014?w=1200&q=80'],
        description: 'Le Theatre de Belleville est une scene independante parisienne reputee pour sa programmation exigeante : theatre contemporain, creations, auteurs vivants. Cree en 2012, il accueille chaque annee plus de 40 spectacles et 700 representations.',
        telephone: '+33 1 48 06 72 34', email: 'contact@theatredebelleville.com', site_web: 'https://www.theatredebelleville.com',
        capacite: 180, annee_creation: 2012,
        horaires: { Lundi: 'Ferme', Mardi: '14h00-22h30', Mercredi: '14h00-22h30', Jeudi: '14h00-22h30', Vendredi: '14h00-22h30', Samedi: '14h00-22h30', Dimanche: '14h00-19h00' },
        accessibility: { pmr: true, audio: false, visuel: false, ascenseur: true, toilettes_pmr: true, places_pmr: 4 },
        services: { billetterie_en_ligne: true, bar: true, vestiaire: true, wifi: false, climatisation: true, boucle_magnetique: true },
        transport: { metro: 'Goncourt (L11), Belleville (L11, L2)', bus: '46, 75', velib: 'Oui (station a 50m)', parking: 'Payant a proximite' },
        tarifs_entree: 'Places de 15 a 30 EUR selon spectacle. Tarifs reduits etudiants et -26 ans.'
    },
    {
        nom: 'Mediatheque Robert-Desnos', category: 'mediatheque',
        adresse: '14 boulevard Rouget-de-Lisle', ville: 'Montreuil', code_postal: '93100',
        lat: 48.8602, lng: 2.4411, independent: 0, owner: 'mediatheque.montreuil@exemple.fr',
        image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80','https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&q=80'],
        description: 'La mediatheque Robert-Desnos est le coeur du reseau des bibliotheques de Montreuil. Livres, BD, musique, cinema, jeux video, ateliers numeriques, expositions : un lieu de vie culturelle majeur de Seine-Saint-Denis.',
        telephone: '+33 1 48 70 69 04', email: 'mediatheque@montreuil.fr', site_web: 'https://mediatheques.montreuil.fr',
        capacite: 420, annee_creation: 2000,
        horaires: { Lundi: 'Ferme', Mardi: '13h-19h', Mercredi: '10h-19h', Jeudi: '13h-19h', Vendredi: '13h-19h', Samedi: '10h-18h', Dimanche: 'Ferme' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, documents_adaptes: true },
        services: { wifi: true, prise_electrique: true, espace_enfant: true, bibliobus: true, impression: true, cafe: false },
        transport: { metro: 'Mairie de Montreuil (L9)', bus: '102, 115, 121, 129', velib: 'Oui', parking: 'Gratuit sur place' },
        tarifs_entree: 'Inscription gratuite pour les habitants de Montreuil. 30 EUR/an pour les non-residents.'
    },
    {
        nom: 'Galerie Art Libre', category: 'galerie',
        adresse: '23 rue des Panoyaux', ville: 'Paris', code_postal: '75020',
        lat: 48.8675, lng: 2.3929, independent: 1, owner: 'galerie.independante@exemple.fr',
        image: 'https://images.unsplash.com/photo-1580130544577-11db5bab68a0?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1580130544577-11db5bab68a0?w=1200&q=80','https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=1200&q=80'],
        description: 'Galerie d art contemporain independante dans le 20e arrondissement. Focus sur les artistes emergents francais et internationaux, peinture, photographie, installations.',
        telephone: '+33 1 43 14 22 11', email: 'contact@galerieartlibre.fr', site_web: 'https://galerieartlibre.fr',
        capacite: 60, annee_creation: 2018,
        horaires: { Lundi: 'Ferme', Mardi: '14h-19h', Mercredi: '14h-19h', Jeudi: '14h-19h', Vendredi: '14h-20h', Samedi: '11h-19h', Dimanche: '14h-18h' },
        accessibility: { pmr: true, audio: false, visuel: false, ascenseur: false, toilettes_pmr: false },
        services: { bar: false, boutique: true, vestiaire: false, wifi: true, visites_commentees: true },
        transport: { metro: 'Menilmontant (L2), Gambetta (L3)', bus: '26, 96', velib: 'Oui' },
        tarifs_entree: 'Entree libre. Catalogues disponibles en boutique.'
    },
    {
        nom: 'Musee d Orsay', category: 'musee',
        adresse: '1 rue de la Legion d Honneur', ville: 'Paris', code_postal: '75007',
        lat: 48.8600, lng: 2.3266, independent: 0,
        image: 'https://images.unsplash.com/photo-1565060169861-2d4b6e3df115?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1565060169861-2d4b6e3df115?w=1200&q=80','https://images.unsplash.com/photo-1577720643272-265f09367456?w=1200&q=80','https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=80'],
        description: 'Installe dans l ancienne gare d Orsay, le musee abrite la plus grande collection au monde de peintures impressionnistes et post-impressionnistes : Monet, Manet, Degas, Cezanne, Renoir, Van Gogh... Un incontournable.',
        telephone: '+33 1 40 49 48 14', email: 'visiteur@musee-orsay.fr', site_web: 'https://www.musee-orsay.fr',
        capacite: 3500, annee_creation: 1986,
        horaires: { Lundi: 'Ferme', Mardi: '9h30-18h', Mercredi: '9h30-18h', Jeudi: '9h30-21h45', Vendredi: '9h30-18h', Samedi: '9h30-18h', Dimanche: '9h30-18h' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, langue_signes: true, audioguide: true },
        services: { bar: true, restaurant: true, boutique: true, vestiaire: true, wifi: true, audioguide: true, visites_guidees: true },
        transport: { metro: 'Solferino (L12), Assemblee Nationale (L12)', rer: 'Musee d Orsay (RER C)', bus: '63, 68, 69, 83, 84, 94', velib: 'Oui' },
        tarifs_entree: 'Plein tarif 16 EUR. Tarif reduit 13 EUR (18-25 UE). Gratuit -18 ans, 1er dimanche du mois.'
    },
    {
        nom: 'La Gaite Lyrique', category: 'salle_concert',
        adresse: '3bis rue Papin', ville: 'Paris', code_postal: '75003',
        lat: 48.8672, lng: 2.3533, independent: 0,
        image: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1501612780327-45045538702b?w=1200&q=80','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80'],
        description: 'Centre culturel dedie aux musiques actuelles et aux arts numeriques. Concerts, expositions, ateliers numeriques, conferences : la pointe de la creation contemporaine.',
        telephone: '+33 1 53 01 52 00', email: 'accueil@gaite-lyrique.net', site_web: 'https://gaite-lyrique.net',
        capacite: 750, annee_creation: 2011,
        horaires: { Lundi: 'Ferme', Mardi: '14h-20h', Mercredi: '14h-20h', Jeudi: '14h-20h', Vendredi: '14h-22h', Samedi: '12h-22h', Dimanche: '12h-18h' },
        accessibility: { pmr: true, audio: true, visuel: false, ascenseur: true, toilettes_pmr: true },
        services: { bar: true, restaurant: true, wifi: true, vestiaire: true, boutique: true },
        transport: { metro: 'Reaumur-Sebastopol (L3,L4), Arts et Metiers (L3,L11)', bus: '20, 38, 47', velib: 'Oui' },
        tarifs_entree: 'Concerts 15-35 EUR. Expositions 8 EUR, gratuit -18 ans et 1er dimanche.'
    },
    {
        nom: 'Le Centquatre-Paris', category: 'espace_independant',
        adresse: '5 rue Curial', ville: 'Paris', code_postal: '75019',
        lat: 48.8907, lng: 2.3702, independent: 1,
        image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&q=80','https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80'],
        description: 'Ancien etablissement des Pompes Funebres reconverti en etablissement culturel pluridisciplinaire : expositions, spectacles, danse, cirque, residences d artistes, ateliers famille, librairie, restaurant.',
        telephone: '+33 1 53 35 50 00', email: 'contact@104.fr', site_web: 'https://www.104.fr',
        capacite: 1200, annee_creation: 2008,
        horaires: { Lundi: 'Ferme', Mardi: '12h-19h', Mercredi: '12h-19h', Jeudi: '12h-19h', Vendredi: '12h-23h', Samedi: '11h-23h', Dimanche: '11h-19h' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, places_pmr: 20 },
        services: { restaurant: true, bar: true, librairie: true, espace_enfant: true, wifi: true, vestiaire: true, atelier_enfants: true },
        transport: { metro: 'Riquet (L7), Stalingrad (L2,L5,L7)', bus: '54, 60', velib: 'Oui, 2 stations', parking: 'Parking public a 200m' },
        tarifs_entree: 'Espaces publics en acces libre. Spectacles 12-30 EUR.'
    },
    {
        nom: 'Cinema Le Melies', category: 'cinema',
        adresse: '12 place Jean-Jaures', ville: 'Montreuil', code_postal: '93100',
        lat: 48.8612, lng: 2.4437, independent: 1,
        image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
        description: 'Cinema art et essai classe "Recherche et Decouverte", propose une programmation exigeante : films d auteurs, cine-club, debats, rencontres, avant-premieres.',
        telephone: '+33 1 83 74 56 00', email: 'contact@lemelies.com', site_web: 'https://www.lemelies.com',
        capacite: 500, annee_creation: 1957,
        horaires: { Lundi: '13h-23h', Mardi: '13h-23h', Mercredi: '13h-23h', Jeudi: '13h-23h', Vendredi: '13h-minuit', Samedi: '11h-minuit', Dimanche: '11h-23h' },
        accessibility: { pmr: true, audio: true, visuel: false, ascenseur: true, boucle_magnetique: true, audio_description: true },
        services: { bar: true, carte_fidelite: true, wifi: true, vestiaire: false },
        transport: { metro: 'Mairie de Montreuil (L9)', bus: '102, 115', velib: 'Oui' },
        tarifs_entree: 'Plein tarif 8 EUR, reduit 6 EUR (etudiants, -26 ans, chomeurs). Carte abonnement 4,50 EUR/seance.'
    },
    {
        nom: 'Theatre Antique de Lyon', category: 'lieu_patrimoine',
        adresse: '6 rue de l Antiquaille', ville: 'Lyon', code_postal: '69005',
        lat: 45.7605, lng: 4.8197, independent: 0,
        image: 'https://images.unsplash.com/photo-1533055640609-24b498cdf1ea?w=1200&q=80',
        description: 'Theatre gallo-romain construit au Ier siecle av. J.-C. sur la colline de Fourviere, accueille chaque ete les Nuits de Fourviere, festival de musique et theatre. Site UNESCO.',
        telephone: '+33 4 72 38 49 60', email: 'contact@fourviere.org', site_web: 'https://www.fourviere.org',
        capacite: 4700, annee_creation: -15,
        horaires: { Lundi: 'Acces libre', Mardi: 'Acces libre', Mercredi: 'Acces libre', Jeudi: 'Acces libre', Vendredi: 'Acces libre', Samedi: 'Acces libre', Dimanche: 'Acces libre' },
        accessibility: { pmr: false, audio: false, visuel: false },
        services: { guides: true, visites_guidees: true },
        transport: { metro: 'Vieux Lyon (L D) + funiculaire', bus: 'C20' },
        tarifs_entree: 'Site antique en acces libre. Spectacles 25-60 EUR pendant le festival.'
    },
    {
        nom: 'MAC Lyon - Musee d Art Contemporain', category: 'musee',
        adresse: 'Cite Internationale, 81 Quai Charles de Gaulle', ville: 'Lyon', code_postal: '69006',
        lat: 45.7840, lng: 4.8525, independent: 0,
        image: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200&q=80',
        description: 'Musee d art contemporain installe dans la Cite Internationale. Collections permanentes et expositions temporaires couvrant l art international depuis 1960.',
        telephone: '+33 4 72 69 17 17', email: 'info@mac-lyon.com', site_web: 'https://www.mac-lyon.com',
        capacite: 900, annee_creation: 1995,
        horaires: { Lundi: 'Ferme', Mardi: 'Ferme', Mercredi: '11h-18h', Jeudi: '11h-18h', Vendredi: '11h-18h', Samedi: '11h-19h', Dimanche: '11h-19h' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, audioguide: true },
        services: { cafe: true, boutique: true, wifi: true, audioguide: true, visites_guidees: true, atelier_enfants: true },
        transport: { bus: 'C1, C2 - Musee d art contemporain', velib: 'Oui' },
        tarifs_entree: '8 EUR. Reduit 4 EUR. Gratuit -18 ans, 1er dimanche du mois.'
    },
    {
        nom: 'Le Transbordeur', category: 'salle_concert',
        adresse: '3 Boulevard Stalingrad', ville: 'Villeurbanne', code_postal: '69100',
        lat: 45.7850, lng: 4.8580, independent: 0,
        image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
        description: 'SMAC de l agglomeration lyonnaise, accueille plus de 120 concerts par an : rock, electro, hip-hop, musiques du monde. Salle de 1500 places a Villeurbanne.',
        telephone: '+33 4 78 93 08 33', email: 'contact@transbordeur.fr', site_web: 'https://www.transbordeur.fr',
        capacite: 1500, annee_creation: 1988,
        horaires: { Lundi: 'Selon programmation', Mardi: 'Selon programmation', Mercredi: 'Selon programmation', Jeudi: 'Selon programmation', Vendredi: 'Selon programmation', Samedi: 'Selon programmation', Dimanche: 'Selon programmation' },
        accessibility: { pmr: true, audio: false, visuel: false, places_pmr: 10 },
        services: { bar: true, vestiaire: true, billetterie_en_ligne: true },
        transport: { metro: 'Charpennes (L A,L B)', tram: 'T1, T4', parking: 'Payant a proximite' },
        tarifs_entree: 'Concerts de 15 a 45 EUR selon programmation.'
    },
    {
        nom: 'La Friche la Belle de Mai', category: 'espace_independant',
        adresse: '41 rue Jobin', ville: 'Marseille', code_postal: '13003',
        lat: 43.3083, lng: 5.3880, independent: 1,
        image: 'https://images.unsplash.com/photo-1560421683-6856ea585c78?w=1200&q=80',
        description: 'Ancienne manufacture de tabac, la Friche est devenue un des lieux culturels les plus emblematiques de Marseille. 45000 m2 dedies a la creation : arts vivants, visuels, musiques actuelles, residences, skate-park, librairie, restaurant.',
        telephone: '+33 4 95 04 95 95', email: 'contact@lafriche.org', site_web: 'https://www.lafriche.org',
        capacite: 2000, annee_creation: 1992,
        horaires: { Lundi: 'Ferme', Mardi: '14h-19h', Mercredi: '12h-19h', Jeudi: '14h-19h', Vendredi: '12h-23h', Samedi: '12h-23h', Dimanche: '12h-19h' },
        accessibility: { pmr: true, audio: true, visuel: false, ascenseur: true, toilettes_pmr: true },
        services: { restaurant: true, bar: true, librairie: true, skate_park: true, terrasse: true, espace_enfant: true, wifi: true },
        transport: { metro: 'Saint-Charles (L1,L2) + 10min marche', bus: '49, 52, 70', velib: 'Oui' },
        tarifs_entree: 'Site en acces libre. Expositions 5 EUR, spectacles 10-25 EUR.'
    },
    {
        nom: 'MuCEM', category: 'musee',
        adresse: '1 Esplanade J4', ville: 'Marseille', code_postal: '13002',
        lat: 43.2964, lng: 5.3600, independent: 0,
        image: 'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=1200&q=80',
        galerie: ['https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=1200&q=80','https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=1200&q=80'],
        description: 'Musee des civilisations de l Europe et de la Mediterranee. Architecture spectaculaire signee Rudy Ricciotti, passerelle iconique vers le fort Saint-Jean. Collections et expositions sur les cultures mediterraneennes.',
        telephone: '+33 4 84 35 13 13', email: 'info@mucem.org', site_web: 'https://www.mucem.org',
        capacite: 2500, annee_creation: 2013,
        horaires: { Lundi: '11h-19h', Mardi: 'Ferme', Mercredi: '11h-19h', Jeudi: '11h-19h', Vendredi: '11h-19h', Samedi: '11h-19h', Dimanche: '11h-19h' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, langue_signes: true, audioguide: true, audio_description: true },
        services: { restaurant: true, bar: true, boutique: true, wifi: true, vestiaire: true, audioguide: true, visites_guidees: true },
        transport: { metro: 'Vieux Port (L1), Joliette (L2)', tram: 'T2', bus: '82, 82s', parking: 'Parking payant du Fort Saint-Jean' },
        tarifs_entree: 'Plein tarif 11 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'Capitole de Toulouse', category: 'theatre',
        adresse: 'Place du Capitole', ville: 'Toulouse', code_postal: '31000',
        lat: 43.6043, lng: 1.4437, independent: 0,
        image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80',
        description: 'Opera National et Orchestre National du Capitole. Salle historique fondee en 1818, programmation lyrique, ballet, concerts symphoniques.',
        telephone: '+33 5 61 63 13 13', email: 'billetterie@theatreducapitole.fr', site_web: 'https://www.theatreducapitole.fr',
        capacite: 1156, annee_creation: 1818,
        horaires: { Lundi: '11h-19h (billetterie)', Mardi: '11h-19h', Mercredi: '11h-19h', Jeudi: '11h-19h', Vendredi: '11h-19h', Samedi: '11h-19h', Dimanche: 'Ferme' },
        accessibility: { pmr: true, audio: false, visuel: false, ascenseur: true, places_pmr: 8 },
        services: { bar: true, vestiaire: true, visites_guidees: true, billetterie_en_ligne: true },
        transport: { metro: 'Capitole (L A)', bus: 'Plusieurs lignes', velib: 'Oui' },
        tarifs_entree: 'Operas 15-110 EUR. Ballets 15-95 EUR.'
    },
    {
        nom: 'Les Abattoirs - Musee Frac', category: 'musee',
        adresse: '76 Allees Charles-de-Fitte', ville: 'Toulouse', code_postal: '31300',
        lat: 43.5963, lng: 1.4190, independent: 0,
        image: 'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1200&q=80',
        description: 'Musee d art moderne et contemporain installe dans les anciens abattoirs de Toulouse. Collection riche, expositions temporaires regulieres.',
        telephone: '+33 5 62 48 58 00', email: 'contact@lesabattoirs.org', site_web: 'https://www.lesabattoirs.org',
        capacite: 600, annee_creation: 2000,
        horaires: { Lundi: 'Ferme', Mardi: 'Ferme', Mercredi: '12h-18h', Jeudi: '12h-18h', Vendredi: '12h-20h', Samedi: '11h-19h', Dimanche: '11h-19h' },
        accessibility: { pmr: true, audio: true, visuel: true, audioguide: true, visites_LSF: true },
        services: { cafe: true, boutique: true, wifi: true, visites_guidees: true, atelier_enfants: true, bibliotheque: true },
        transport: { metro: 'Saint-Cyprien (L A)', bus: '1, 45', velib: 'Oui' },
        tarifs_entree: '8 EUR. Reduit 5 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'Le Rocher de Palmer', category: 'salle_concert',
        adresse: '1 rue Aristide Briand', ville: 'Cenon', code_postal: '33150',
        lat: 44.8587, lng: -0.5239, independent: 1,
        image: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
        description: 'Salle de musiques actuelles de l agglomeration bordelaise. Programmation eclectique : world music, jazz, chanson francaise, rock.',
        telephone: '+33 5 56 74 80 00', email: 'info@lerocherdepalmer.fr', site_web: 'https://www.lerocherdepalmer.fr',
        capacite: 1200, annee_creation: 2010,
        horaires: { Lundi: 'Fermee', Mardi: '14h-19h', Mercredi: '14h-19h', Jeudi: '14h-19h', Vendredi: '14h-19h', Samedi: 'Programmation', Dimanche: 'Fermee' },
        accessibility: { pmr: true, audio: false, visuel: false, places_pmr: 8 },
        services: { bar: true, restaurant: false, vestiaire: true },
        transport: { tram: 'Ligne A - Buttiniere', bus: '10, 27', parking: 'Gratuit 500 places' },
        tarifs_entree: 'Concerts 15-35 EUR.'
    },
    {
        nom: 'CAPC Musee d Art Contemporain', category: 'musee',
        adresse: '7 rue Ferrere', ville: 'Bordeaux', code_postal: '33000',
        lat: 44.8483, lng: -0.5764, independent: 0,
        image: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=1200&q=80',
        description: 'Centre d Arts Plastiques Contemporains installe dans un ancien entrepot de denrees coloniales du XIXe siecle. Collection de reference en art contemporain.',
        telephone: '+33 5 56 00 81 50', email: 'capc@mairie-bordeaux.fr', site_web: 'https://www.capc-bordeaux.fr',
        capacite: 800, annee_creation: 1973,
        horaires: { Lundi: 'Ferme', Mardi: '11h-18h', Mercredi: '11h-20h', Jeudi: '11h-18h', Vendredi: '11h-18h', Samedi: '11h-18h', Dimanche: '11h-18h' },
        accessibility: { pmr: true, audio: true, visuel: true, audioguide: true },
        services: { restaurant: true, boutique: true, bibliotheque: true, wifi: true },
        transport: { tram: 'Ligne B - CAPC', bus: '4, 5', velib: 'Oui' },
        tarifs_entree: '7 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'Le Cargo', category: 'espace_independant',
        adresse: '157 Cours de la Martinique', ville: 'Bordeaux', code_postal: '33300',
        lat: 44.8620, lng: -0.5570, independent: 1,
        image: 'https://images.unsplash.com/photo-1506765515384-028b60a970df?w=1200&q=80',
        description: 'Tiers-lieu bordelais : ateliers d artistes, concerts, residences, bar guinguette, programmation pluridisciplinaire.',
        telephone: '+33 5 56 77 44 22', email: 'contact@lecargo.fr',
        capacite: 400, annee_creation: 2017,
        horaires: { Lundi: 'Ferme', Mardi: '18h-minuit', Mercredi: '18h-minuit', Jeudi: '18h-2h', Vendredi: '18h-2h', Samedi: '14h-2h', Dimanche: '12h-20h' },
        accessibility: { pmr: true, audio: false, visuel: false },
        services: { bar: true, restauration: true, guinguette: true, wifi: true },
        transport: { tram: 'Ligne B - Les Aubiers', velib: 'Oui' },
        tarifs_entree: 'Entree libre hors concerts (5-15 EUR).'
    },
    {
        nom: 'Opera de Nantes', category: 'theatre',
        adresse: '1 rue Moliere', ville: 'Nantes', code_postal: '44000',
        lat: 47.2152, lng: -1.5577, independent: 0,
        image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200&q=80',
        description: 'Theatre Graslin, construit en 1788, accueille l Angers Nantes Opera. Programmation lyrique et symphonique.',
        telephone: '+33 2 40 69 77 18', email: 'billetterie@angers-nantes-opera.com', site_web: 'https://www.angers-nantes-opera.com',
        capacite: 780, annee_creation: 1788,
        horaires: { Lundi: 'Ferme', Mardi: '13h-18h30', Mercredi: '13h-18h30', Jeudi: '13h-18h30', Vendredi: '13h-18h30', Samedi: '13h-18h30', Dimanche: 'Selon programmation' },
        accessibility: { pmr: true, audio: true, visuel: false, places_pmr: 6, audio_description: true },
        services: { bar: true, vestiaire: true, visites_guidees: true, billetterie_en_ligne: true },
        transport: { tram: 'Ligne 1 - Commerce', velib: 'Oui' },
        tarifs_entree: 'Operas 15-95 EUR.'
    },
    {
        nom: 'Le Lieu Unique', category: 'espace_independant',
        adresse: '2 quai Ferdinand-Favre', ville: 'Nantes', code_postal: '44000',
        lat: 47.2171, lng: -1.5442, independent: 1,
        image: 'https://images.unsplash.com/photo-1566054757965-8c4085344c96?w=1200&q=80',
        description: 'Scene nationale installee dans l ancienne biscuiterie LU. Programmation pluridisciplinaire : theatre, danse, musique, arts plastiques.',
        telephone: '+33 2 40 12 14 34', email: 'billetterie@lelieuunique.com', site_web: 'https://www.lelieuunique.com',
        capacite: 600, annee_creation: 2000,
        horaires: { Lundi: 'Ferme', Mardi: '11h-19h', Mercredi: '11h-19h', Jeudi: '11h-minuit', Vendredi: '11h-2h', Samedi: '14h-2h', Dimanche: '14h-19h' },
        accessibility: { pmr: true, audio: true, visuel: false, ascenseur: true, places_pmr: 8 },
        services: { bar: true, restaurant: true, librairie: true, hammam: true, wifi: true },
        transport: { tram: 'Ligne 1 - Duchesse Anne', velib: 'Oui' },
        tarifs_entree: 'Espaces publics libres. Spectacles 10-25 EUR.'
    },
    {
        nom: 'Palais des Beaux-Arts de Lille', category: 'musee',
        adresse: '18 rue de Valmy', ville: 'Lille', code_postal: '59000',
        lat: 50.6311, lng: 3.0630, independent: 0,
        image: 'https://images.unsplash.com/photo-1565060169861-2d4b6e3df115?w=1200&q=80',
        description: 'Second musee de France apres le Louvre. Collections prestigieuses de peinture europeenne, sculpture, arts graphiques.',
        telephone: '+33 3 20 06 78 00', email: 'contact@pba-lille.fr', site_web: 'https://www.pba.lille.fr',
        capacite: 2000, annee_creation: 1892,
        horaires: { Lundi: '14h-18h', Mardi: 'Ferme', Mercredi: '10h-18h', Jeudi: '10h-18h', Vendredi: '10h-18h', Samedi: '10h-18h', Dimanche: '10h-18h' },
        accessibility: { pmr: true, audio: true, visuel: true, audioguide: true, visites_LSF: true },
        services: { cafe: true, restaurant: true, boutique: true, bibliotheque: true, audioguide: true, visites_guidees: true },
        transport: { metro: 'Republique Beaux-Arts (L1)', velib: 'Oui' },
        tarifs_entree: '7 EUR. Reduit 4 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'La Condition Publique', category: 'espace_independant',
        adresse: '14 place du General Faidherbe', ville: 'Roubaix', code_postal: '59100',
        lat: 50.6966, lng: 3.1701, independent: 1,
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80',
        description: 'Tiers-lieu et laboratoire de creation dans une ancienne halle de conditionnement de laine. Expositions, creations, residences, skate, ateliers, concerts.',
        telephone: '+33 3 28 33 57 57', email: 'contact@laconditionpublique.com', site_web: 'https://www.laconditionpublique.com',
        capacite: 1500, annee_creation: 2004,
        horaires: { Lundi: 'Ferme', Mardi: '14h-19h', Mercredi: '14h-19h', Jeudi: '14h-19h', Vendredi: '14h-23h', Samedi: '14h-23h', Dimanche: '14h-19h' },
        accessibility: { pmr: true, audio: true, visuel: false, ascenseur: true },
        services: { bar: true, restaurant: true, librairie: true, skate_park: true, wifi: true },
        transport: { metro: 'Roubaix Eurotelport (L2)', tram: 'T2', parking: 'Gratuit' },
        tarifs_entree: 'Entree libre. Spectacles 8-20 EUR.'
    },
    {
        nom: 'Musee des Beaux-Arts de Strasbourg', category: 'musee',
        adresse: '2 place du Chateau', ville: 'Strasbourg', code_postal: '67000',
        lat: 48.5815, lng: 7.7509, independent: 0,
        image: 'https://images.unsplash.com/photo-1577720643272-265f09367456?w=1200&q=80',
        description: 'Collections de peinture europeenne de la Renaissance au XVIIIe siecle, installees dans le palais Rohan.',
        telephone: '+33 3 68 98 50 00', email: 'musees@strasbourg.eu', site_web: 'https://www.musees.strasbourg.eu',
        capacite: 800, annee_creation: 1890,
        horaires: { Lundi: '10h-18h', Mardi: 'Ferme', Mercredi: '10h-18h', Jeudi: '10h-18h', Vendredi: '10h-18h', Samedi: '10h-18h', Dimanche: '10h-18h' },
        accessibility: { pmr: true, audio: true, visuel: true, audioguide: true },
        services: { boutique: true, audioguide: true, visites_guidees: true },
        transport: { tram: 'Langstross/Grand Rue', velib: 'Oui' },
        tarifs_entree: '7 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'La Laiterie', category: 'salle_concert',
        adresse: '13 rue du Hohwald', ville: 'Strasbourg', code_postal: '67000',
        lat: 48.5770, lng: 7.7305, independent: 0,
        image: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&q=80',
        description: 'SMAC de Strasbourg, salle de reference pour les musiques actuelles dans le Grand Est.',
        telephone: '+33 3 88 23 72 37', email: 'billetterie@artefact.org', site_web: 'https://www.laiterie.artefact.org',
        capacite: 1000, annee_creation: 1995,
        horaires: { Lundi: 'Ferme', Mardi: 'Selon programmation', Mercredi: 'Selon programmation', Jeudi: 'Selon programmation', Vendredi: 'Selon programmation', Samedi: 'Selon programmation', Dimanche: 'Selon programmation' },
        accessibility: { pmr: true, audio: false, visuel: false, places_pmr: 6 },
        services: { bar: true, vestiaire: true, billetterie_en_ligne: true },
        transport: { tram: 'Laiterie (L A,L D)', velib: 'Oui' },
        tarifs_entree: 'Concerts 15-35 EUR.'
    },
    {
        nom: 'Musee Guimet', category: 'musee',
        adresse: '6 place d Iena', ville: 'Paris', code_postal: '75016',
        lat: 48.8640, lng: 2.2935, independent: 0,
        image: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200&q=80',
        description: 'Musee national des arts asiatiques, l un des plus importants d Europe. Collection exceptionnelle de l Asie : Chine, Japon, Inde, Asie du Sud-Est.',
        telephone: '+33 1 56 52 54 33', email: 'infos@guimet.fr', site_web: 'https://www.guimet.fr',
        capacite: 1800, annee_creation: 1889,
        horaires: { Lundi: '10h-18h', Mardi: 'Ferme', Mercredi: '10h-18h', Jeudi: '10h-18h', Vendredi: '10h-18h', Samedi: '10h-18h', Dimanche: '10h-18h' },
        accessibility: { pmr: true, audio: true, visuel: true, audioguide: true },
        services: { restaurant: true, boutique: true, bibliotheque: true, audioguide: true, atelier_enfants: true },
        transport: { metro: 'Iena (L9), Boissiere (L6)', bus: '22, 32, 63', velib: 'Oui' },
        tarifs_entree: '11,50 EUR. Reduit 8,50 EUR. Gratuit -18 ans, 1er dimanche.'
    },
    {
        nom: 'Le Hasard Ludique', category: 'espace_independant',
        adresse: '128 Avenue de Saint-Ouen', ville: 'Paris', code_postal: '75018',
        lat: 48.8980, lng: 2.3290, independent: 1, owner: 'festival.jazz@exemple.fr',
        image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&q=80',
        description: 'Ancienne gare Saint-Ouen reconvertie en bar-restaurant-salle de concert. Programmation musicale pointue (jazz, electro, chanson), DJ sets, terrasse sur les voies.',
        telephone: '+33 1 42 28 47 55', email: 'contact@lehasardludique.paris', site_web: 'https://lehasardludique.paris',
        capacite: 350, annee_creation: 2016,
        horaires: { Lundi: 'Ferme', Mardi: '18h-minuit', Mercredi: '18h-minuit', Jeudi: '18h-minuit', Vendredi: '18h-2h', Samedi: '16h-2h', Dimanche: '12h-22h' },
        accessibility: { pmr: true, audio: false, visuel: false },
        services: { bar: true, restaurant: true, terrasse: true, wifi: true },
        transport: { metro: 'Porte de Saint-Ouen (L13)', tram: 'T3b', velib: 'Oui' },
        tarifs_entree: 'Entree libre hors concerts (0-15 EUR).'
    },
    {
        nom: 'Philharmonie de Paris', category: 'salle_concert',
        adresse: '221 avenue Jean-Jaures', ville: 'Paris', code_postal: '75019',
        lat: 48.8896, lng: 2.3935, independent: 0,
        image: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=1200&q=80',
        description: 'Grande salle symphonique conque par Jean Nouvel, accueil l Orchestre de Paris. Programmation classique, jazz et musiques du monde.',
        telephone: '+33 1 44 84 44 84', site_web: 'https://philharmoniedeparis.fr',
        capacite: 2400, annee_creation: 2015,
        horaires: { Lundi: '12h-18h', Mardi: '12h-18h', Mercredi: '12h-18h', Jeudi: '12h-18h', Vendredi: '12h-18h', Samedi: '10h-20h', Dimanche: '10h-20h' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, toilettes_pmr: true, boucle_magnetique: true },
        services: { restaurant: true, cafe: true, boutique: true, bibliotheque: true, wifi: true, visites_guidees: true },
        transport: { metro: 'Porte de Pantin (L5)', tram: 'T3b', parking: 'Payant' },
        tarifs_entree: 'Concerts 10-90 EUR selon programmation.'
    },
    {
        nom: 'Palais de Tokyo', category: 'musee',
        adresse: '13 avenue du President Wilson', ville: 'Paris', code_postal: '75016',
        lat: 48.8645, lng: 2.2970, independent: 0,
        image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80',
        description: 'Plus grand centre d art contemporain europeen. Expositions monumentales, performances, residences d artistes, nuits techno. Un lieu en ebullition permanente.',
        telephone: '+33 1 47 23 54 01', email: 'contact@palaisdetokyo.com', site_web: 'https://palaisdetokyo.com',
        capacite: 22000, annee_creation: 2002,
        horaires: { Lundi: '12h-minuit', Mardi: 'Ferme', Mercredi: '12h-minuit', Jeudi: '12h-minuit', Vendredi: '12h-minuit', Samedi: '12h-minuit', Dimanche: '12h-minuit' },
        accessibility: { pmr: true, audio: true, visuel: true, ascenseur: true, places_pmr: 20, audioguide: true },
        services: { restaurant: true, cafe: true, boutique: true, librairie: true, wifi: true, atelier_enfants: true },
        transport: { metro: 'Iena (L9), Alma-Marceau (L9)', rer: 'Pont de l Alma (RER C)', bus: '32, 42, 63, 72, 80, 92', velib: 'Oui' },
        tarifs_entree: '12 EUR. Reduit 9 EUR. Gratuit -18 ans et jeudi soir gratuit.'
    }
];

const insertPlace = db.prepare(`
    INSERT INTO places (owner_id, nom, description, category, adresse, code_postal, ville, latitude, longitude,
                        telephone, email, site_web, horaires, accessibility, services, transport, tarifs_entree,
                        capacite, annee_creation, image_url, galerie, is_independent, verified)
    VALUES (@owner_id, @nom, @description, @category, @adresse, @code_postal, @ville, @lat, @lng,
            @telephone, @email, @site_web, @horaires, @accessibility, @services, @transport, @tarifs_entree,
            @capacite, @annee_creation, @image, @galerie, @independent, 1)
`);

const placeRows = [];
for (const p of places) {
    const ownerId = p.owner ? userIds[p.owner] : null;
    const info = insertPlace.run({
        owner_id: ownerId, nom: p.nom, description: p.description, category: p.category,
        adresse: p.adresse, code_postal: p.code_postal, ville: p.ville, lat: p.lat, lng: p.lng,
        telephone: p.telephone || null, email: p.email || null, site_web: p.site_web || null,
        horaires: p.horaires ? JSON.stringify(p.horaires) : null,
        accessibility: p.accessibility ? JSON.stringify(p.accessibility) : null,
        services: p.services ? JSON.stringify(p.services) : null,
        transport: p.transport ? JSON.stringify(p.transport) : null,
        tarifs_entree: p.tarifs_entree || null,
        capacite: p.capacite || null, annee_creation: p.annee_creation || null,
        image: p.image, galerie: p.galerie ? JSON.stringify(p.galerie) : null,
        independent: p.independent
    });
    placeRows.push({ id: info.lastInsertRowid, ...p });
}

// =====================================================
// EVENEMENTS - Templates riches par categorie
// =====================================================
const eventTemplates = {
    theatre: [
        { titre: 'Le Malade Imaginaire', sous_cat: 'comedie', format: 'spectacle', artistes: ['Compagnie Les Tetes Froides', 'Mise en scene : Claire Marchand'], desc: 'La derniere comedie de Moliere, jouee avec panache et modernite. Argan, obsede par sa sante, fait vivre un calvaire a son entourage. Une mise en scene contemporaine qui revisite le classique avec humour et profondeur.', duree: 120 },
        { titre: 'Huis Clos', sous_cat: 'drame', format: 'spectacle', artistes: ['Compagnie In Tempo', 'Nathan Petit', 'Eva Roux', 'Sami Bouhadi'], desc: 'L enfer, c est les autres. Trois personnages enfermes dans un salon Second Empire s entre-dechirent. La piece philosophique de Sartre, plus actuelle que jamais.', duree: 90 },
        { titre: 'En Attendant Godot', sous_cat: 'absurde', format: 'spectacle', artistes: ['Theatre du Soleil', 'Alice Martin', 'Jacob Lemoine'], desc: 'Vladimir et Estragon attendent. Qui ? Godot. Pourquoi ? Nous ne le saurons jamais. Beckett et l attente comme revelateur de la condition humaine.', duree: 140 },
        { titre: 'Cyrano de Bergerac', sous_cat: 'comedie-romantique', format: 'spectacle', artistes: ['Compagnie du Grand Nez', 'Orchestre de chambre'], desc: 'Le panache, l amour impossible, les alexandrins tonnerre. Rostand revisite par une troupe energique. Costumes d epoque, emotion intacte.', duree: 180 },
        { titre: 'L Avare', sous_cat: 'comedie', format: 'spectacle', artistes: ['Ensemble Theatre Contemporain'], desc: 'Harpagon, l avare par excellence de Moliere. Une mise en scene deplacee dans les annees 80, pour un propos sur l argent et la famille toujours tranchant.', duree: 110 },
        { titre: 'La Cantatrice Chauve', sous_cat: 'absurde', format: 'spectacle', artistes: ['Troupe Les Mots Perches'], desc: 'Ionesco et l absurde triomphal. Une soiree britannique qui derape, ou la langue elle-meme devient personnage.', duree: 80 },
        { titre: 'Roberto Zucco', sous_cat: 'drame', format: 'spectacle', artistes: ['Collectif Bruit'], desc: 'Le dernier chef-d oeuvre de Bernard-Marie Koltes. Une errance poetique et violente, un personnage-enigme. Creation 2026.', duree: 100 }
    ],
    musique: [
        { titre: 'Concert Jazz Quartet Moderne', sous_cat: 'jazz', format: 'concert', artistes: ['Pierre Dumas (saxo)', 'Anna Novak (piano)', 'Maxime Rivera (contrebasse)', 'Tom Bailey (batterie)'], desc: 'Quatre musiciens reunis autour d un repertoire oscillant entre standards revisites et compositions originales. Un concert jazz chaleureux et improvise.', duree: 90 },
        { titre: 'Soiree Electro Resistance', sous_cat: 'electro', format: 'concert', artistes: ['DJ Minuit', 'Kaos Theory', 'Lyra Deep'], desc: 'Trois sets electro de 21h a 2h du matin. Techno, house, deep. Systeme son calibre, visuels synchronises, dancefloor garanti.', duree: 300 },
        { titre: 'Orchestre Symphonique - Symphonie n 9 de Beethoven', sous_cat: 'classique', format: 'concert', artistes: ['Orchestre Symphonique de Paris', 'Direction : Sophie Aubert', 'Choeur de l Opera'], desc: 'La celebre symphonie avec l Ode a la Joie. 200 musiciens et choristes sur scene. Programmation exceptionnelle.', duree: 75 },
        { titre: 'Chorale Polyphonique - Musiques du Monde', sous_cat: 'choral', format: 'concert', artistes: ['Ensemble Kyriades', 'Direction : Marie Lopez'], desc: 'Un voyage vocal de la Georgie a la Sardaigne en passant par le Pays basque. Polyphonies traditionnelles revisitees.', duree: 90 },
        { titre: 'Concert Acoustique - Chanson Francaise', sous_cat: 'chanson', format: 'concert', artistes: ['Louis Favrel', 'Claire Tsan'], desc: 'Un set acoustique intime, guitare-voix. Entre Brel et Biolay, des textes cisele et des melodies intemporelles.', duree: 75 },
        { titre: 'Festival Indie Rock - Soiree 3 groupes', sous_cat: 'rock', format: 'concert', artistes: ['Les Valises', 'Mercure', 'Nouvelle Ville'], desc: 'Trois groupes emergents de la scene rock francaise. Du post-punk au shoegaze, une soiree pour decouvrir la releve.', duree: 240 },
        { titre: 'Concert Hip-Hop - Rap Conscient', sous_cat: 'hip-hop', format: 'concert', artistes: ['MC Oracle', 'DJ Verdict', 'Flow Collective'], desc: 'Une soiree de rap engage, avec textes cisele et beats organiques. Open mic en premiere partie.', duree: 180 }
    ],
    exposition: [
        { titre: 'Photographies du XXe siecle - Regards sur la France', sous_cat: 'photographie', format: 'exposition', artistes: ['Cartier-Bresson', 'Robert Doisneau', 'Willy Ronis', 'Sabine Weiss'], desc: 'Plus de 200 photographies des grands maitres du XXe siecle francais. Un portrait sensible de la France d apres-guerre aux annees 90.', duree: null },
        { titre: 'Peintres Impressionnistes - Les Ateliers', sous_cat: 'peinture', format: 'exposition', artistes: ['Monet', 'Renoir', 'Degas', 'Morisot', 'Cassatt'], desc: 'Une exposition consacree aux ateliers des impressionnistes : lieux de creation, relations artistiques, rivalites. Pieces rarement montrees.', duree: null },
        { titre: 'Art Contemporain Africain - Nouvelles Voix', sous_cat: 'contemporain', format: 'exposition', artistes: ['Njideka Akunyili Crosby', 'Yinka Shonibare', 'Sammy Baloji'], desc: '15 artistes africains majeurs. Peinture, sculpture, photographie, installation video. Un panorama ambitieux de la creation contemporaine sur le continent.', duree: null },
        { titre: 'Sculptures Monumentales - Dans l Espace Urbain', sous_cat: 'sculpture', format: 'exposition', artistes: ['Louise Bourgeois', 'Anish Kapoor', 'Jaume Plensa'], desc: 'Exposition en plein air, 12 sculptures monumentales reparties dans le parc. Parcours libre avec application guidee.', duree: null },
        { titre: 'Exposition Street Art - Les Fresques de la Ville', sous_cat: 'street-art', format: 'exposition', artistes: ['Shepard Fairey', 'Invader', 'Jef Aerosol', 'C215'], desc: 'Un parcours dans la ville a la decouverte des fresques et collages des artistes majeurs du street-art. Visites guidees quotidiennes.', duree: null },
        { titre: 'Rencontres de la Photographie - Edition Printemps', sous_cat: 'photographie', format: 'exposition', artistes: ['30 photographes internationaux'], desc: 'Le grand rendez-vous annuel de la photographie : 30 expositions dans la ville, rencontres auteurs, lectures de portfolios.', duree: null }
    ],
    patrimoine: [
        { titre: 'Visite Guidee - Les Passages Couverts', sous_cat: 'visite', format: 'visite', artistes: ['Jean-Marc Delibes (conferencier historien)'], desc: 'Partez a la decouverte des 20 passages couverts historiques du centre-ville. Architecture du XIXe, anecdotes, boutiques embelmatiques. Visite de 2h.', duree: 120 },
        { titre: 'Journees Europeennes du Patrimoine', sous_cat: 'journee', format: 'visite', desc: 'Deux journees portes ouvertes sur des sites habituellement fermes au public : hotels particuliers, chapelles, ateliers d artistes. Reservation obligatoire.', duree: null },
        { titre: 'Decouverte des Passages Insolites', sous_cat: 'visite', format: 'visite', artistes: ['Compagnie des Guides Parisiens'], desc: 'Une balade originale dans les ruelles meconnues et les cours secretes du quartier. 2h de decouvertes en petit groupe.', duree: 120 },
        { titre: 'Balade Urbaine Historique - L Histoire de la Ville en 20 Etapes', sous_cat: 'balade', format: 'visite', desc: 'Une visite chronologique en 20 arrets, de l Antiquite a nos jours. Parcours accessible, support papier fourni.', duree: 180 }
    ],
    danse: [
        { titre: 'Spectacle Contemporain - Corps en Fragments', sous_cat: 'contemporain', format: 'spectacle', artistes: ['Compagnie Luna', 'Choregraphie : Solange Rouxel', '6 danseurs'], desc: 'Une piece chorale sur le corps fragmente, ou six danseurs tissent et detissent des figures collectives. Musique originale live.', duree: 70 },
        { titre: 'Ballet Classique - Le Lac des Cygnes', sous_cat: 'classique', format: 'spectacle', artistes: ['Ballet de l Opera', 'Solistes internationaux'], desc: 'Le ballet iconique de Tchaikovski dans une version fidele a la choregraphie d origine. 60 danseurs, orchestre live.', duree: 150 },
        { titre: 'Soiree Hip-Hop - Battle Nationale', sous_cat: 'hip-hop', format: 'spectacle', artistes: ['15 crews selectionnes', 'DJ Spark', 'MC Kendal'], desc: 'Battle hip-hop de haut niveau : break, popping, house. Jurys internationaux, prix de 3000 EUR au vainqueur.', duree: 180 },
        { titre: 'Danse Traditionnelle - Tour du Monde en 8 Danses', sous_cat: 'traditionnelle', format: 'spectacle', artistes: ['Ensemble Traditions'], desc: 'Un spectacle pedagogique et festif : flamenco, kathak, tango, samba... Suivi d un bal-initiation pour le public.', duree: 90 }
    ],
    cinema: [
        { titre: 'Cine-Club - 2001 : l Odyssee de l Espace', sous_cat: 'science-fiction', format: 'projection', artistes: ['Realisation : Stanley Kubrick, 1968'], desc: 'Projection du chef-d oeuvre de Kubrick suivie d une discussion avec un critique specialiste. Copie restauree 4K.', duree: 149 },
        { titre: 'Projection Plein Air - Amelie Poulain', sous_cat: 'comedie', format: 'projection', artistes: ['Realisation : Jean-Pierre Jeunet'], desc: 'Une soiree cinema en plein air sous les etoiles. Ambiance guinguette, food trucks, puis projection. Reservation conseillee.', duree: 122 },
        { titre: 'Festival Court Metrage - Nouveaux Regards', sous_cat: 'court-metrage', format: 'projection', artistes: ['30 courts metrages internationaux'], desc: '3 seances de 5 courts chacune, suivies de debats avec les realisateurs presents. Prix du public en fin de festival.', duree: 240 },
        { titre: 'Cycle Cinema d Auteur - Lynch Integrale', sous_cat: 'auteur', format: 'projection', artistes: ['David Lynch (hommage)'], desc: '8 films de David Lynch projetes sur 4 soirs. Introductions par un universitaire specialiste. Pass cycle a tarif reduit.', duree: null }
    ],
    litterature: [
        { titre: 'Rencontre Auteur - Leila Slimani', sous_cat: 'rencontre', format: 'conference', artistes: ['Leila Slimani (prix Goncourt 2016)'], desc: 'Rencontre-dedicace avec Leila Slimani autour de son dernier roman. Lecture, echange, signature. Reservation obligatoire.', duree: 90 },
        { titre: 'Nuit de la Lecture - Lectures Partagees', sous_cat: 'nuit', format: 'performance', artistes: ['15 lecteurs invites', 'Comediens professionnels'], desc: 'Une nuit de lectures a voix haute, par des comediens et des amateurs. Textes varies, ambiance tamisee, chocolat chaud offert.', duree: 180 },
        { titre: 'Cafe Philo - Qu est-ce que la Liberte ?', sous_cat: 'conference', format: 'conference', artistes: ['Animation : Marc Delmar, philosophe'], desc: 'Un cafe-philo ouvert a tous, autour de la notion de liberte. Prise de parole libre, moderation bienveillante.', duree: 120 },
        { titre: 'Atelier Ecriture Creative - Initiation', sous_cat: 'atelier', format: 'atelier', artistes: ['Animation : Sara Kessel, auteure'], desc: 'Un atelier pour debuter dans l ecriture : exercices ludiques, contraintes creatives, partage de textes. 10 participants max.', duree: 180 }
    ],
    festival: [
        { titre: 'Festival de la Parole', sous_cat: 'parole', format: 'festival', artistes: ['20 conteurs invites', 'Spectacles'], desc: 'Conteurs, slammeurs, poetes : 3 jours de performances autour de la parole vivante. Scenes multiples, ateliers.', duree: null },
        { titre: 'Festival Tous a l Ecran', sous_cat: 'cinema', format: 'festival', artistes: ['80 films projetes', 'Realisateurs invites'], desc: 'Festival cinema en centre-ville : projections, rencontres, master classes, ateliers jeunes publics.', duree: null },
        { titre: 'Fete des Arts de Rue', sous_cat: 'arts-rue', format: 'festival', artistes: ['30 compagnies'], desc: 'Deux jours d arts de rue : theatre, cirque, danse, performances. Totalement gratuit, public familial.', duree: null },
        { titre: 'Nuit des Musees', sous_cat: 'patrimoine', format: 'festival', artistes: ['Tous les musees de la ville'], desc: 'Les musees restent ouverts jusqu a minuit, avec animations specifiques : concerts, lectures, visites theatralisees. Entree libre.', duree: null }
    ],
    atelier: [
        { titre: 'Atelier Poterie en Famille', sous_cat: 'poterie', format: 'atelier', artistes: ['Emilie Roy, ceramiste'], desc: 'Un apres-midi de modelage a partager en famille. Creation d une piece emportable apres cuisson. 6-10 ans et leurs parents.', duree: 120 },
        { titre: 'Initiation Photographie Argentique', sous_cat: 'photo', format: 'atelier', artistes: ['Leo Fremont, photographe'], desc: 'Initiation a la photographie argentique : prise de vue, developpement, tirage. Appareils prets, 8 places.', duree: 240 },
        { titre: 'Atelier Ecriture Creative - Les Personnages', sous_cat: 'ecriture', format: 'atelier', artistes: ['Sara Kessel, auteure'], desc: 'Un atelier concentre sur la creation de personnages : archetypes, contradictions, voix. Travaux individuels et collectifs.', duree: 180 },
        { titre: 'Cours de Dessin - Perspective et Volume', sous_cat: 'dessin', format: 'atelier', artistes: ['Youri Vadim, illustrateur'], desc: 'Apprendre les bases de la perspective et du volume. Materiel fourni, tous niveaux acceptes.', duree: 180 }
    ],
    jeune_public: [
        { titre: 'Spectacle des Petits - La Petite Poule Rousse', sous_cat: 'conte', format: 'spectacle', artistes: ['Compagnie Les Petits Pas'], desc: 'Un spectacle pour les 3-6 ans, inspire du conte traditionnel. Marionnettes, musique, participation du public. Un moment magique.', duree: 40 },
        { titre: 'Atelier Famille - Fabriquer son Conte', sous_cat: 'atelier', format: 'atelier', artistes: ['Isabelle Manon, conteuse'], desc: 'Un atelier parent-enfant (5-10 ans) pour inventer et ecrire un conte. Materiel fourni, repartir avec son livret.', duree: 120 },
        { titre: 'Contes pour Enfants - Tour du Monde', sous_cat: 'conte', format: 'spectacle', artistes: ['Alice Monnier, conteuse'], desc: 'Contes des cinq continents pour les 4-10 ans. 3 seances sur la journee, entree libre.', duree: 45 },
        { titre: 'Theatre d Objets - La Vie Secrete des Chaussures', sous_cat: 'theatre-objets', format: 'spectacle', artistes: ['Compagnie Les Chausseurs'], desc: 'Un theatre d objets drole et poetique : les chaussures prennent vie et racontent leur histoire. 5-12 ans.', duree: 50 }
    ]
};

// =====================================================
// Generation d evenements riches
// =====================================================
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randChoice(prob) { return Math.random() < prob; }

const events = [];
const now = new Date();
const msPerDay = 86400000;

let eventCounter = 1;
for (const [cat, templates] of Object.entries(eventTemplates)) {
    // Generer plusieurs evenements par template pour assurer la diversite
    for (const tpl of templates) {
        // Repartition geographique : chaque evenement dans un lieu compatible
        const compatiblePlaces = placeRows.filter(p => {
            if (cat === 'theatre' || cat === 'danse') return ['theatre', 'espace_independant', 'lieu_patrimoine'].includes(p.category);
            if (cat === 'musique') return ['salle_concert', 'espace_independant', 'theatre'].includes(p.category);
            if (cat === 'exposition') return ['musee', 'galerie', 'espace_independant'].includes(p.category);
            if (cat === 'patrimoine') return ['musee', 'lieu_patrimoine'].includes(p.category);
            if (cat === 'cinema') return ['cinema', 'espace_independant'].includes(p.category);
            if (cat === 'litterature') return ['mediatheque', 'espace_independant'].includes(p.category);
            if (cat === 'festival') return ['espace_independant', 'lieu_patrimoine', 'salle_concert'].includes(p.category);
            if (cat === 'atelier') return ['mediatheque', 'galerie', 'espace_independant'].includes(p.category);
            if (cat === 'jeune_public') return ['mediatheque', 'theatre', 'espace_independant'].includes(p.category);
            return true;
        });
        // On cree 1 a 2 occurrences (dates differentes) par template
        const nbOccurrences = cat === 'exposition' || cat === 'festival' ? 1 : randInt(1, 2);
        for (let occ = 0; occ < nbOccurrences; occ++) {
            if (!compatiblePlaces.length) continue;
            const place = randItem(compatiblePlaces);
            const daysAhead = randInt(1, 75);
            const hour = cat === 'jeune_public' ? randInt(10, 16) : cat === 'atelier' ? randInt(14, 18) : randInt(18, 21);
            const start = new Date(now.getTime() + daysAhead * msPerDay);
            start.setHours(hour, 0, 0, 0);
            const duree = tpl.duree || randInt(60, 180);
            const isExpo = cat === 'exposition';
            const end = isExpo ? new Date(start.getTime() + randInt(14, 90) * msPerDay) : new Date(start.getTime() + duree * 60000);

            const gratuit = randChoice(cat === 'patrimoine' ? 0.4 : cat === 'litterature' ? 0.5 : cat === 'festival' ? 0.3 : 0.25) ? 1 : 0;
            const prixMin = gratuit ? 0 : (cat === 'musique' ? randInt(12, 35) : cat === 'theatre' ? randInt(15, 35) : cat === 'exposition' ? randInt(6, 15) : randInt(5, 25));
            const prixMax = gratuit ? 0 : prixMin + randInt(5, 20);
            const tarifReduit = gratuit ? 0 : Math.round(prixMin * 0.7);
            const outdoor = cat === 'patrimoine' ? randChoice(0.6) ? 1 : 0 : cat === 'festival' ? randChoice(0.5) ? 1 : 0 : randChoice(0.1) ? 1 : 0;
            const placesMax = randInt(50, 500);
            const placesDispo = Math.max(5, placesMax - randInt(0, Math.floor(placesMax * 0.7)));
            const ageMin = cat === 'jeune_public' ? 3 : null;
            const ageMax = cat === 'jeune_public' ? 12 : null;
            const pmr = place.accessibility?.pmr ? 1 : 0;
            const audio = place.accessibility?.audio ? 1 : 0;
            const visuel = place.accessibility?.visuel ? 1 : 0;

            const tags = [cat, place.ville.toLowerCase().replace(/\s+/g, '-')];
            if (gratuit) tags.push('gratuit');
            if (outdoor) tags.push('plein-air');
            if (place.independent) tags.push('independant');
            if (tpl.sous_cat) tags.push(tpl.sous_cat);

            const publicCible = cat === 'jeune_public' ? 'famille' : (ageMin && ageMin >= 16 ? 'adulte' : 'tout-public');

            const seances = isExpo ? null : (randChoice(0.3) ? JSON.stringify([
                new Date(start.getTime() + 1 * msPerDay).toISOString(),
                new Date(start.getTime() + 2 * msPerDay).toISOString()
            ]) : null);

            const infosPratiques = `Ouverture des portes 30 min avant. ${outdoor ? 'Prevoir vetements adaptes a la meteo. ' : ''}${cat === 'exposition' ? 'Duree moyenne de visite : 1h30. ' : ''}${place.transport?.parking ? `Parking : ${place.transport.parking}. ` : ''}Restauration sur place possible.`;

            const urlBilletterie = !gratuit ? `${place.site_web || 'https://culture-radar.fr'}/reservation/${cat}-${eventCounter}` : null;

            events.push({
                place_id: place.id,
                organizer_id: place.owner ? userIds[place.owner] : null,
                titre: tpl.titre,
                slug: `${cat}-${eventCounter}-${place.ville.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                description: tpl.desc,
                description_longue: `${tpl.desc}\n\nProgrammation complete a decouvrir sur le site du lieu. ${place.nom} s associe a CultureRadar pour vous faire decouvrir le meilleur de la programmation culturelle locale.\n\nL evenement est accueilli dans le cadre de la saison ${new Date().getFullYear()}-${new Date().getFullYear() + 1}. ${place.independent ? 'Un lieu independant que nous sommes fiers de soutenir.' : ''}`,
                category: cat,
                sous_categorie: tpl.sous_cat || null,
                format: tpl.format,
                tags: tags.join(','),
                date_debut: start.toISOString(),
                date_fin: end.toISOString(),
                duree_minutes: duree,
                seances,
                prix_min: prixMin,
                prix_max: prixMax,
                gratuit,
                tarif_reduit: tarifReduit,
                places_disponibles: placesDispo,
                places_max: placesMax,
                outdoor,
                accessibility: JSON.stringify({ pmr: !!pmr, audio: !!audio, visuel: !!visuel }),
                accessibility_pmr: pmr, accessibility_audio: audio, accessibility_visuel: visuel,
                age_min: ageMin, age_max: ageMax,
                public_cible: publicCible,
                langue: 'fr',
                artistes: tpl.artistes ? JSON.stringify(tpl.artistes) : null,
                organisateur_nom: place.nom,
                url_billetterie: urlBilletterie,
                site_officiel: place.site_web || null,
                infos_pratiques: infosPratiques,
                image_url: place.image,
                galerie: place.galerie ? place.galerie : null,
                video_url: null,
                source: 'culture-radar',
                status: 'published',
                is_promoted: randChoice(0.08) ? 1 : 0
            });
            eventCounter++;
        }
    }
}

const insertEvent = db.prepare(`
    INSERT INTO events (place_id, organizer_id, titre, slug, description, description_longue, category, sous_categorie, format, tags,
                        date_debut, date_fin, duree_minutes, seances, prix_min, prix_max, gratuit, tarif_reduit,
                        places_disponibles, places_max, outdoor, accessibility, accessibility_pmr, accessibility_audio, accessibility_visuel,
                        age_min, age_max, public_cible, langue, artistes, organisateur_nom, url_billetterie, site_officiel, infos_pratiques,
                        image_url, galerie, video_url, source, status, is_promoted)
    VALUES (@place_id, @organizer_id, @titre, @slug, @description, @description_longue, @category, @sous_categorie, @format, @tags,
            @date_debut, @date_fin, @duree_minutes, @seances, @prix_min, @prix_max, @gratuit, @tarif_reduit,
            @places_disponibles, @places_max, @outdoor, @accessibility, @accessibility_pmr, @accessibility_audio, @accessibility_visuel,
            @age_min, @age_max, @public_cible, @langue, @artistes, @organisateur_nom, @url_billetterie, @site_officiel, @infos_pratiques,
            @image_url, @galerie, @video_url, @source, @status, @is_promoted)
`);

for (const e of events) {
    e.galerie = e.galerie ? JSON.stringify(e.galerie) : null;
    insertEvent.run(e);
}

// =====================================================
// PAS DE GENERATION D'ACTIVITE FICTIVE
// =====================================================
// Les tables suivantes restent vides au seed pour que le dashboard
// admin n'affiche que de la vraie activite :
//   - reservations
//   - reviews
//   - subscriptions
//   - partnerships
//   - promotions
//   - contact_messages
//   - analytics_events
//
// Les comptes de demo (admin, B2C, B2B) ET le catalogue (events,
// places) restent peuples pour permettre la navigation et la
// connexion.

console.log('[seed] Donnees generees :');
console.log(`  - ${users.length} utilisateurs (admin, users B2C, pros B2B)`);
console.log(`  - ${places.length} lieux culturels detailles (horaires, services, transport, accessibility)`);
console.log(`  - ${events.length} evenements riches (artistes, infos pratiques, tarifs, billetterie)`);
console.log(`  - 0 reservation / abonnement / partenariat (vraie activite uniquement)`);
console.log('');
console.log('Comptes demo :');
console.log('  Admin      : admin@culture-radar.fr / admin123');
console.log('  Utilisateur: marie.dupont@exemple.fr / demo1234');
console.log('  Utilisateur: lucas.martin@exemple.fr / demo1234');
console.log('  Utilisateur: sophie.bernard@exemple.fr / demo1234');
console.log('  Pro (lieu) : theatre.belleville@exemple.fr / pro1234');
console.log('  Pro (lieu) : galerie.independante@exemple.fr / pro1234');
console.log('  Pro (lieu) : mediatheque.montreuil@exemple.fr / pro1234');
console.log('  Pro (lieu) : festival.jazz@exemple.fr / pro1234');
