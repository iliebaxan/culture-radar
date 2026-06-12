-- =====================================================
-- CultureRadar - Schema de base de donnees
-- La boussole culturelle dont vous avez besoin
-- =====================================================

PRAGMA foreign_keys = ON;

-- =====================================================
-- UTILISATEURS (B2C + B2B + ADMIN)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nom TEXT NOT NULL,
    prenom TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'pro', 'admin')),
    telephone TEXT,
    ville TEXT,
    code_postal TEXT,
    latitude REAL,
    longitude REAL,
    avatar TEXT,
    bio TEXT,
    subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'pro_local', 'enterprise')),
    subscription_ends_at DATETIME,
    newsletter INTEGER DEFAULT 0,
    accessibility_needs TEXT,
    mobility_mode TEXT DEFAULT 'transit',
    max_distance_km INTEGER DEFAULT 15,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- PREFERENCES CULTURELLES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_userpref_user ON user_preferences(user_id);

-- =====================================================
-- LIEUX CULTURELS
-- =====================================================
CREATE TABLE IF NOT EXISTS places (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER,
    nom TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    adresse TEXT NOT NULL,
    code_postal TEXT,
    ville TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    telephone TEXT,
    email TEXT,
    site_web TEXT,
    horaires TEXT,
    accessibility TEXT,
    services TEXT,
    transport TEXT,
    tarifs_entree TEXT,
    capacite INTEGER,
    annee_creation INTEGER,
    image_url TEXT,
    galerie TEXT,
    is_independent INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_places_ville ON places(ville);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_owner ON places(owner_id);

-- =====================================================
-- EVENEMENTS CULTURELS
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id INTEGER,
    organizer_id INTEGER,
    titre TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    description_longue TEXT,
    category TEXT NOT NULL,
    sous_categorie TEXT,
    tags TEXT,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME,
    duree_minutes INTEGER,
    seances TEXT,
    prix_min REAL DEFAULT 0,
    prix_max REAL,
    gratuit INTEGER DEFAULT 0,
    tarif_reduit REAL,
    places_disponibles INTEGER,
    places_max INTEGER,
    outdoor INTEGER DEFAULT 0,
    accessibility TEXT,
    accessibility_pmr INTEGER DEFAULT 0,
    accessibility_audio INTEGER DEFAULT 0,
    accessibility_visuel INTEGER DEFAULT 0,
    age_min INTEGER,
    age_max INTEGER,
    public_cible TEXT,
    langue TEXT DEFAULT 'fr',
    format TEXT,
    artistes TEXT,
    organisateur_nom TEXT,
    url_billetterie TEXT,
    site_officiel TEXT,
    infos_pratiques TEXT,
    image_url TEXT,
    galerie TEXT,
    video_url TEXT,
    source TEXT DEFAULT 'culture-radar',
    external_id TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'finished')),
    is_promoted INTEGER DEFAULT 0,
    promoted_until DATETIME,
    views_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date_debut);
CREATE INDEX IF NOT EXISTS idx_events_place ON events(place_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_promoted ON events(is_promoted);
CREATE INDEX IF NOT EXISTS idx_events_gratuit ON events(gratuit);
CREATE INDEX IF NOT EXISTS idx_events_format ON events(format);

-- =====================================================
-- RESERVATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    status TEXT DEFAULT 'envie' CHECK (status IN ('envie', 'reserve', 'participe', 'annule')),
    nb_places INTEGER DEFAULT 1,
    note_personnelle TEXT,
    reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations(event_id);

-- =====================================================
-- AVIS / EVALUATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    note INTEGER NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_event ON reviews(event_id);

-- =====================================================
-- PROMOTIONS PAYEES
-- =====================================================
CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    pack TEXT NOT NULL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME NOT NULL,
    payment_status TEXT DEFAULT 'paye' CHECK (payment_status IN ('en_attente', 'paye', 'rembourse', 'echec')),
    payment_ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_promos_event ON promotions(event_id);
CREATE INDEX IF NOT EXISTS idx_promos_user ON promotions(user_id);

-- =====================================================
-- ABONNEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL,
    prix_mensuel REAL,
    date_debut DATETIME NOT NULL,
    date_fin DATETIME,
    status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'annule', 'expire', 'suspendu')),
    payment_ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

-- =====================================================
-- LOGS / ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    titre TEXT NOT NULL,
    message TEXT NOT NULL,
    url TEXT,
    lu INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_lu ON notifications(lu);

-- =====================================================
-- PARTENARIATS
-- =====================================================
CREATE TABLE IF NOT EXISTS partnerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    type TEXT NOT NULL,
    contact_email TEXT,
    contact_nom TEXT,
    description TEXT,
    montant_annuel REAL,
    date_debut DATETIME,
    date_fin DATETIME,
    status TEXT DEFAULT 'actif',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RAPPORTS MENSUELS
-- =====================================================
CREATE TABLE IF NOT EXISTS monthly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annee INTEGER NOT NULL,
    mois INTEGER NOT NULL,
    nb_users INTEGER,
    nb_nouveaux_users INTEGER,
    nb_events INTEGER,
    nb_reservations INTEGER,
    nb_reviews INTEGER,
    revenu_abonnements REAL,
    revenu_promotions REAL,
    revenu_partenariats REAL,
    revenu_total REAL,
    top_categories TEXT,
    top_villes TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(annee, mois)
);

-- =====================================================
-- MESSAGES DE CONTACT (formulaire site)
-- =====================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    sujet TEXT NOT NULL,
    message TEXT NOT NULL,
    categorie TEXT DEFAULT 'general',
    ip TEXT,
    status TEXT DEFAULT 'nouveau' CHECK (status IN ('nouveau','lu','traite','ignore')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_date ON contact_messages(created_at);
