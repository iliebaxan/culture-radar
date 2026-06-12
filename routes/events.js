const express = require('express');
const { getDb } = require('../database/db');
const { auth, requireRole } = require('../middleware/auth');
const { haversineKm } = require('../utils/recommendations');

const router = express.Router();

// ---------- Helpers ----------
const SORTABLE = {
    'date_asc':     'e.date_debut ASC',
    'date_desc':    'e.date_debut DESC',
    'prix_asc':     'e.prix_min ASC',
    'prix_desc':    'e.prix_max DESC',
    'recent':       'e.created_at DESC',
    'populaire':    'nb_inscrits DESC',
    'note':         'note_moyenne DESC',
    'promoted':     'e.is_promoted DESC, e.date_debut ASC'
};

function safeJson(s) { if (!s) return null; try { return JSON.parse(s); } catch { return null; } }

function enrichEvent(e) {
    if (!e) return null;
    e.accessibility_detail = safeJson(e.accessibility);
    e.galerie = safeJson(e.galerie) || (e.image_url ? [e.image_url] : []);
    e.artistes = safeJson(e.artistes) || [];
    e.seances = safeJson(e.seances) || [];
    e.place_horaires = safeJson(e.place_horaires);
    e.place_accessibility = safeJson(e.place_accessibility);
    e.place_services = safeJson(e.place_services);
    e.place_transport = safeJson(e.place_transport);
    e.place_galerie = safeJson(e.place_galerie) || [];
    return e;
}

// ---------- GET /api/events/filters/meta ----------
// Retourne les valeurs possibles pour les filtres (villes, categories, prix, dates)
router.get('/filters/meta', (req, res) => {
    const db = getDb();
    const categories = db.prepare(`
        SELECT e.category AS value, COUNT(*) AS count
        FROM events e WHERE e.status='published' AND e.date_debut >= datetime('now','-1 day')
        GROUP BY e.category ORDER BY count DESC
    `).all();
    const villes = db.prepare(`
        SELECT p.ville AS value, COUNT(*) AS count FROM events e
        JOIN places p ON e.place_id = p.id
        WHERE e.status='published' AND e.date_debut >= datetime('now','-1 day') AND p.ville IS NOT NULL
        GROUP BY p.ville ORDER BY count DESC
    `).all();
    const formats = db.prepare(`
        SELECT e.format AS value, COUNT(*) AS count FROM events e
        WHERE e.status='published' AND e.format IS NOT NULL AND e.date_debut >= datetime('now','-1 day')
        GROUP BY e.format ORDER BY count DESC
    `).all();
    const publics = db.prepare(`
        SELECT e.public_cible AS value, COUNT(*) AS count FROM events e
        WHERE e.status='published' AND e.public_cible IS NOT NULL AND e.date_debut >= datetime('now','-1 day')
        GROUP BY e.public_cible ORDER BY count DESC
    `).all();
    const priceRange = db.prepare(`
        SELECT MIN(prix_min) AS min, MAX(COALESCE(prix_max, prix_min)) AS max
        FROM events WHERE status='published' AND gratuit=0 AND date_debut >= datetime('now','-1 day')
    `).get();
    const dateRange = db.prepare(`
        SELECT MIN(date_debut) AS min, MAX(date_debut) AS max
        FROM events WHERE status='published' AND date_debut >= datetime('now','-1 day')
    `).get();
    const total = db.prepare("SELECT COUNT(*) c FROM events WHERE status='published' AND date_debut >= datetime('now','-1 day')").get().c;
    res.json({ categories, villes, formats, publics, prix: priceRange, dates: dateRange, total });
});

// ---------- GET /api/events ----------
// Liste publique avec filtres riches + sort + pagination
router.get('/', (req, res) => {
    const {
        category,         // theatre,musique,... (csv possible)
        ville, q,
        gratuit,          // '1' = seulement gratuits
        outdoor,          // '1' = seulement en plein air
        pmr, audio, visuel, // accessibilites
        prix_min, prix_max,
        date_debut, date_fin, // filtrage date
        format,           // concert, spectacle, ...
        public_cible,     // tout-public, adulte, famille
        age_min, age_max,
        langue,
        places_disponibles, // '1' = seulement ceux qui ont des places
        tags,             // csv
        independent,      // '1' = lieux independants
        lat, lng, distance_km, // filtrage geographique (post-traitement)
        upcoming = '1',
        source,
        sort = 'promoted',
        limit = 30,
        offset = 0
    } = req.query;

    const db = getDb();
    const params = [];
    const cond = ["e.status = 'published'"];

    if (category) {
        const cats = category.split(',').map(c => c.trim()).filter(Boolean);
        if (cats.length === 1) { cond.push('e.category = ?'); params.push(cats[0]); }
        else if (cats.length > 1) { cond.push(`e.category IN (${cats.map(_ => '?').join(',')})`); params.push(...cats); }
    }
    if (ville) { cond.push('p.ville LIKE ?'); params.push(`%${ville}%`); }
    if (gratuit === '1') cond.push('e.gratuit = 1');
    if (outdoor === '1') cond.push('e.outdoor = 1');
    if (pmr === '1') cond.push('e.accessibility_pmr = 1');
    if (audio === '1') cond.push('e.accessibility_audio = 1');
    if (visuel === '1') cond.push('e.accessibility_visuel = 1');
    if (independent === '1') cond.push('p.is_independent = 1');
    if (prix_min) { cond.push('(e.prix_min >= ? OR e.gratuit = 1)'); params.push(Number(prix_min)); }
    if (prix_max) { cond.push('(COALESCE(e.prix_max, e.prix_min) <= ? OR e.gratuit = 1)'); params.push(Number(prix_max)); }
    if (date_debut) { cond.push('date(e.date_debut) >= date(?)'); params.push(date_debut); }
    if (date_fin) { cond.push('date(e.date_debut) <= date(?)'); params.push(date_fin); }
    if (format) { cond.push('e.format = ?'); params.push(format); }
    if (public_cible) { cond.push('e.public_cible = ?'); params.push(public_cible); }
    if (age_min) { cond.push('(e.age_max IS NULL OR e.age_max >= ?)'); params.push(Number(age_min)); }
    if (age_max) { cond.push('(e.age_min IS NULL OR e.age_min <= ?)'); params.push(Number(age_max)); }
    if (langue) { cond.push('e.langue = ?'); params.push(langue); }
    if (places_disponibles === '1') cond.push('(e.places_disponibles IS NULL OR e.places_disponibles > 0)');
    if (source) { cond.push('e.source = ?'); params.push(source); }
    if (tags) {
        const ts = tags.split(',').map(t => t.trim()).filter(Boolean);
        for (const t of ts) { cond.push('e.tags LIKE ?'); params.push(`%${t}%`); }
    }
    if (upcoming === '1') cond.push("e.date_debut >= datetime('now', '-1 day')");
    if (q) {
        cond.push('(e.titre LIKE ? OR e.description LIKE ? OR e.tags LIKE ? OR p.nom LIKE ? OR e.artistes LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const sortClause = SORTABLE[sort] || SORTABLE['promoted'];

    // Compte total (sans limit)
    const totalSql = `
        SELECT COUNT(*) AS c FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        WHERE ${cond.join(' AND ')}
    `;
    const total = db.prepare(totalSql).get(...params).c;

    const sql = `
        SELECT e.*, p.nom AS place_nom, p.ville, p.adresse, p.code_postal,
               p.latitude AS place_lat, p.longitude AS place_lng,
               p.is_independent, p.category AS place_category, p.site_web AS place_site_web,
               p.galerie AS place_galerie,
               (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id) AS nb_inscrits,
               (SELECT ROUND(AVG(note),1) FROM reviews r WHERE r.event_id = e.id) AS note_moyenne,
               (SELECT COUNT(*) FROM reviews r WHERE r.event_id = e.id) AS nb_reviews
        FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        WHERE ${cond.join(' AND ')}
        ORDER BY ${sortClause}
        LIMIT ? OFFSET ?
    `;
    params.push(Number(limit), Number(offset));
    let rows = db.prepare(sql).all(...params).map(enrichEvent);

    // Filtre post-traitement par distance (si lat/lng/distance fournis)
    if (lat && lng && distance_km) {
        const dk = Number(distance_km);
        rows = rows.map(r => {
            const d = haversineKm(Number(lat), Number(lng), r.place_lat, r.place_lng);
            return { ...r, distance_km: d };
        }).filter(r => r.distance_km == null || r.distance_km <= dk);
    }

    // Ajout header X-Total-Count utile pour client
    res.set('X-Total-Count', String(total));
    res.json(req.query.meta === '1' ? { total, items: rows } : rows);
});

// ---------- GET /api/events/:id ----------
router.get('/:id', (req, res) => {
    const db = getDb();
    const ev = db.prepare(`
        SELECT e.*, p.nom AS place_nom, p.ville, p.adresse, p.code_postal,
               p.latitude AS place_lat, p.longitude AS place_lng,
               p.is_independent, p.image_url AS place_image, p.category AS place_category,
               p.telephone AS place_telephone, p.email AS place_email, p.site_web AS place_site_web,
               p.horaires AS place_horaires, p.accessibility AS place_accessibility,
               p.services AS place_services, p.transport AS place_transport,
               p.tarifs_entree AS place_tarifs, p.capacite AS place_capacite,
               p.galerie AS place_galerie,
               u.nom AS organizer_nom, u.email AS organizer_email
        FROM events e
        LEFT JOIN places p ON e.place_id = p.id
        LEFT JOIN users u ON e.organizer_id = u.id
        WHERE e.id = ?
    `).get(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evenement introuvable' });

    // Incrementer les vues
    db.prepare('UPDATE events SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?').run(req.params.id);

    enrichEvent(ev);

    // Reviews
    ev.reviews = db.prepare(`
        SELECT r.*, u.prenom, u.nom, u.avatar FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.event_id = ? ORDER BY r.created_at DESC LIMIT 50
    `).all(req.params.id);

    // Repartition des notes
    const noteBreakdown = db.prepare(`
        SELECT note, COUNT(*) c FROM reviews WHERE event_id = ? GROUP BY note ORDER BY note DESC
    `).all(req.params.id);
    ev.note_breakdown = noteBreakdown;
    ev.note_moyenne = ev.reviews.length ? Math.round((ev.reviews.reduce((s, r) => s + r.note, 0) / ev.reviews.length) * 10) / 10 : null;
    ev.nb_reviews = ev.reviews.length;

    // Inscriptions
    ev.nb_inscrits = db.prepare('SELECT COUNT(*) AS c FROM reservations WHERE event_id = ? AND status != \'annule\'').get(req.params.id).c;

    // Evenements similaires (meme categorie, meme ville, autres evenements)
    ev.similar = db.prepare(`
        SELECT e.id, e.titre, e.category, e.date_debut, e.prix_min, e.gratuit, e.image_url,
               p.ville, p.nom AS place_nom, p.is_independent
        FROM events e LEFT JOIN places p ON e.place_id = p.id
        WHERE e.status='published' AND e.id != ? AND e.date_debut >= datetime('now','-1 day')
        AND (e.category = ? OR p.ville = ?)
        ORDER BY (e.category = ?) DESC, e.date_debut ASC LIMIT 6
    `).all(req.params.id, ev.category, ev.ville, ev.category);

    res.json(ev);
});

// ---------- POST /api/events ----------
router.post('/', auth(), requireRole('pro', 'admin'), (req, res) => {
    const e = req.body || {};
    if (!e.titre || !e.category || !e.date_debut) return res.status(400).json({ error: 'titre, category, date_debut requis' });
    // Validation de la date
    const dt = Date.parse(e.date_debut);
    if (Number.isNaN(dt)) return res.status(400).json({ error: 'date_debut invalide (format ISO 8601 attendu)' });
    if (e.date_fin) {
        const dtFin = Date.parse(e.date_fin);
        if (Number.isNaN(dtFin)) return res.status(400).json({ error: 'date_fin invalide (format ISO 8601 attendu)' });
        if (dtFin < dt) return res.status(400).json({ error: 'date_fin doit etre apres date_debut' });
    }
    const db = getDb();
    const slug = (e.slug || e.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-')) + '-' + Date.now();
    const info = db.prepare(`
        INSERT INTO events (place_id, organizer_id, titre, slug, description, description_longue, category, sous_categorie, format, tags,
                            date_debut, date_fin, duree_minutes, prix_min, prix_max, gratuit, tarif_reduit,
                            places_disponibles, places_max, outdoor, accessibility, accessibility_pmr, accessibility_audio, accessibility_visuel,
                            age_min, age_max, public_cible, langue, artistes, organisateur_nom, url_billetterie, site_officiel, infos_pratiques,
                            image_url, galerie, video_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        e.place_id || null, req.user.id, e.titre, slug, e.description || '', e.description_longue || null,
        e.category, e.sous_categorie || null, e.format || null, e.tags || '',
        e.date_debut, e.date_fin || null, e.duree_minutes || null,
        e.prix_min || 0, e.prix_max || null, e.gratuit ? 1 : 0, e.tarif_reduit || null,
        e.places_disponibles || null, e.places_max || null, e.outdoor ? 1 : 0,
        e.accessibility ? (typeof e.accessibility === 'string' ? e.accessibility : JSON.stringify(e.accessibility)) : null,
        e.accessibility_pmr ? 1 : 0, e.accessibility_audio ? 1 : 0, e.accessibility_visuel ? 1 : 0,
        e.age_min || null, e.age_max || null, e.public_cible || null, e.langue || 'fr',
        e.artistes ? (typeof e.artistes === 'string' ? e.artistes : JSON.stringify(e.artistes)) : null,
        e.organisateur_nom || null, e.url_billetterie || null, e.site_officiel || null, e.infos_pratiques || null,
        e.image_url || null, e.galerie ? (typeof e.galerie === 'string' ? e.galerie : JSON.stringify(e.galerie)) : null,
        e.video_url || null, e.status || 'published'
    );
    res.status(201).json({ id: info.lastInsertRowid });
});

// ---------- PUT /api/events/:id ----------
router.put('/:id', auth(), (req, res) => {
    const db = getDb();
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Evenement introuvable' });
    if (req.user.role !== 'admin' && ev.organizer_id !== req.user.id) return res.status(403).json({ error: 'Non autorise' });
    const e = req.body || {};
    // Validation dates si fournies
    if (e.date_debut) {
        const dt = Date.parse(e.date_debut);
        if (Number.isNaN(dt)) return res.status(400).json({ error: 'date_debut invalide' });
    }
    if (e.date_fin) {
        const dtFin = Date.parse(e.date_fin);
        if (Number.isNaN(dtFin)) return res.status(400).json({ error: 'date_fin invalide' });
    }
    if (e.status && !['draft', 'published', 'cancelled', 'finished'].includes(e.status)) {
        return res.status(400).json({ error: 'status invalide' });
    }
    db.prepare(`
        UPDATE events SET
            place_id = COALESCE(?, place_id),
            titre = COALESCE(?, titre),
            description = COALESCE(?, description),
            description_longue = COALESCE(?, description_longue),
            category = COALESCE(?, category),
            sous_categorie = COALESCE(?, sous_categorie),
            format = COALESCE(?, format),
            tags = COALESCE(?, tags),
            date_debut = COALESCE(?, date_debut),
            date_fin = COALESCE(?, date_fin),
            duree_minutes = COALESCE(?, duree_minutes),
            seances = COALESCE(?, seances),
            prix_min = COALESCE(?, prix_min),
            prix_max = COALESCE(?, prix_max),
            gratuit = COALESCE(?, gratuit),
            tarif_reduit = COALESCE(?, tarif_reduit),
            places_disponibles = COALESCE(?, places_disponibles),
            places_max = COALESCE(?, places_max),
            outdoor = COALESCE(?, outdoor),
            accessibility = COALESCE(?, accessibility),
            accessibility_pmr = COALESCE(?, accessibility_pmr),
            accessibility_audio = COALESCE(?, accessibility_audio),
            accessibility_visuel = COALESCE(?, accessibility_visuel),
            age_min = COALESCE(?, age_min),
            age_max = COALESCE(?, age_max),
            public_cible = COALESCE(?, public_cible),
            langue = COALESCE(?, langue),
            artistes = COALESCE(?, artistes),
            organisateur_nom = COALESCE(?, organisateur_nom),
            url_billetterie = COALESCE(?, url_billetterie),
            site_officiel = COALESCE(?, site_officiel),
            infos_pratiques = COALESCE(?, infos_pratiques),
            image_url = COALESCE(?, image_url),
            galerie = COALESCE(?, galerie),
            video_url = COALESCE(?, video_url),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(
        e.place_id ?? null,
        e.titre ?? null, e.description ?? null, e.description_longue ?? null,
        e.category ?? null, e.sous_categorie ?? null, e.format ?? null, e.tags ?? null,
        e.date_debut ?? null, e.date_fin ?? null, e.duree_minutes ?? null,
        e.seances ? (typeof e.seances === 'string' ? e.seances : JSON.stringify(e.seances)) : null,
        e.prix_min ?? null, e.prix_max ?? null,
        e.gratuit == null ? null : (e.gratuit ? 1 : 0),
        e.tarif_reduit ?? null,
        e.places_disponibles ?? null, e.places_max ?? null,
        e.outdoor == null ? null : (e.outdoor ? 1 : 0),
        e.accessibility ? (typeof e.accessibility === 'string' ? e.accessibility : JSON.stringify(e.accessibility)) : null,
        e.accessibility_pmr == null ? null : (e.accessibility_pmr ? 1 : 0),
        e.accessibility_audio == null ? null : (e.accessibility_audio ? 1 : 0),
        e.accessibility_visuel == null ? null : (e.accessibility_visuel ? 1 : 0),
        e.age_min ?? null, e.age_max ?? null, e.public_cible ?? null, e.langue ?? null,
        e.artistes ? (typeof e.artistes === 'string' ? e.artistes : JSON.stringify(e.artistes)) : null,
        e.organisateur_nom ?? null,
        e.url_billetterie ?? null, e.site_officiel ?? null, e.infos_pratiques ?? null,
        e.image_url ?? null,
        e.galerie ? (typeof e.galerie === 'string' ? e.galerie : JSON.stringify(e.galerie)) : null,
        e.video_url ?? null,
        e.status ?? null, req.params.id
    );
    res.json({ ok: true });
});

// ---------- DELETE /api/events/:id ----------
router.delete('/:id', auth(), (req, res) => {
    const db = getDb();
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (!ev) return res.status(404).json({ error: 'Introuvable' });
    if (req.user.role !== 'admin' && ev.organizer_id !== req.user.id) return res.status(403).json({ error: 'Non autorise' });
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// ---------- GET /api/events/mine/organized ----------
router.get('/mine/organized', auth(), requireRole('pro', 'admin'), (req, res) => {
    const db = getDb();
    const rows = db.prepare(`
        SELECT e.*, p.nom AS place_nom,
               (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id) AS nb_inscrits,
               (SELECT ROUND(AVG(note),1) FROM reviews r WHERE r.event_id = e.id) AS note_moyenne
        FROM events e LEFT JOIN places p ON e.place_id = p.id
        WHERE e.organizer_id = ? ORDER BY e.date_debut DESC
    `).all(req.user.id);
    res.json(rows);
});

module.exports = router;
