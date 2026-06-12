const express = require('express');
const { getDb } = require('../database/db');
const { auth, requireRole } = require('../middleware/auth');
const { haversineKm } = require('../utils/recommendations');

const router = express.Router();

function safeJson(s) { if (!s) return null; try { return JSON.parse(s); } catch { return null; } }
function enrichPlace(p) {
    if (!p) return null;
    p.horaires = safeJson(p.horaires);
    p.accessibility = safeJson(p.accessibility);
    p.services = safeJson(p.services);
    p.transport = safeJson(p.transport);
    p.galerie = safeJson(p.galerie) || (p.image_url ? [p.image_url] : []);
    return p;
}

const PLACE_SORTS = {
    'name_asc':     'p.nom ASC',
    'name_desc':    'p.nom DESC',
    'events_desc':  'nb_events DESC',
    'recent':       'p.created_at DESC'
};

router.get('/filters/meta', (req, res) => {
    const db = getDb();
    const categories = db.prepare(`
        SELECT category AS value, COUNT(*) AS count FROM places GROUP BY category ORDER BY count DESC
    `).all();
    const villes = db.prepare(`
        SELECT ville AS value, COUNT(*) AS count FROM places GROUP BY ville ORDER BY count DESC
    `).all();
    const total = db.prepare('SELECT COUNT(*) c FROM places').get().c;
    const independents = db.prepare('SELECT COUNT(*) c FROM places WHERE is_independent = 1').get().c;
    res.json({ categories, villes, total, independents });
});

router.get('/', (req, res) => {
    const {
        ville, category, q, independent, verified,
        pmr, lat, lng, distance_km,
        sort = 'events_desc',
        limit = 60, offset = 0
    } = req.query;

    const db = getDb();
    const params = [];
    const cond = [];
    if (ville) { cond.push('p.ville LIKE ?'); params.push(`%${ville}%`); }
    if (category) {
        const cats = category.split(',').map(c => c.trim()).filter(Boolean);
        if (cats.length === 1) { cond.push('p.category = ?'); params.push(cats[0]); }
        else if (cats.length > 1) { cond.push(`p.category IN (${cats.map(_ => '?').join(',')})`); params.push(...cats); }
    }
    if (independent === '1') cond.push('p.is_independent = 1');
    if (verified === '1') cond.push('p.verified = 1');
    if (q) { cond.push('(p.nom LIKE ? OR p.description LIKE ? OR p.ville LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (pmr === '1') cond.push("p.accessibility LIKE '%\"pmr\":true%'");

    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const sortClause = PLACE_SORTS[sort] || PLACE_SORTS['events_desc'];

    const totalSql = `SELECT COUNT(*) c FROM places p ${where}`;
    const total = db.prepare(totalSql).get(...params).c;

    const sql = `
        SELECT p.*,
               (SELECT COUNT(*) FROM events e WHERE e.place_id = p.id AND e.status='published' AND e.date_debut >= datetime('now','-1 day')) AS nb_events
        FROM places p
        ${where}
        ORDER BY ${sortClause}
        LIMIT ? OFFSET ?
    `;
    params.push(Number(limit), Number(offset));
    let rows = db.prepare(sql).all(...params).map(enrichPlace);

    if (lat && lng && distance_km) {
        const dk = Number(distance_km);
        rows = rows.map(r => ({ ...r, distance_km: haversineKm(Number(lat), Number(lng), r.latitude, r.longitude) }))
                   .filter(r => r.distance_km == null || r.distance_km <= dk);
    }

    res.set('X-Total-Count', String(total));
    res.json(rows);
});

router.get('/:id', (req, res) => {
    const db = getDb();
    const place = enrichPlace(db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id));
    if (!place) return res.status(404).json({ error: 'Lieu introuvable' });

    place.events = db.prepare(`
        SELECT e.*, (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id) AS nb_inscrits,
               (SELECT ROUND(AVG(note),1) FROM reviews r WHERE r.event_id = e.id) AS note_moyenne
        FROM events e WHERE place_id = ? AND status = 'published'
        AND date_debut >= datetime('now', '-1 day') ORDER BY date_debut LIMIT 30
    `).all(req.params.id);

    place.past_events_count = db.prepare(`
        SELECT COUNT(*) c FROM events WHERE place_id = ? AND (status='finished' OR date_debut < datetime('now','-1 day'))
    `).get(req.params.id).c;

    place.total_events_count = db.prepare('SELECT COUNT(*) c FROM events WHERE place_id = ?').get(req.params.id).c;

    res.json(place);
});

router.post('/', auth(), requireRole('pro', 'admin'), (req, res) => {
    const p = req.body || {};
    if (!p.nom || !p.category || !p.ville || p.latitude == null || p.longitude == null) {
        return res.status(400).json({ error: 'nom, category, ville, latitude, longitude requis' });
    }
    const lat = Number(p.latitude), lng = Number(p.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Latitude invalide (entre -90 et 90)' });
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ error: 'Longitude invalide (entre -180 et 180)' });
    p.latitude = lat; p.longitude = lng;
    const info = getDb().prepare(`
        INSERT INTO places (owner_id, nom, description, category, adresse, code_postal, ville, latitude, longitude,
                            telephone, email, site_web, horaires, accessibility, services, transport, tarifs_entree,
                            capacite, annee_creation, image_url, galerie, is_independent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        req.user.id, p.nom, p.description || '', p.category, p.adresse || '', p.code_postal || '',
        p.ville, p.latitude, p.longitude, p.telephone || '', p.email || '', p.site_web || '',
        p.horaires ? (typeof p.horaires === 'string' ? p.horaires : JSON.stringify(p.horaires)) : null,
        p.accessibility ? (typeof p.accessibility === 'string' ? p.accessibility : JSON.stringify(p.accessibility)) : null,
        p.services ? (typeof p.services === 'string' ? p.services : JSON.stringify(p.services)) : null,
        p.transport ? (typeof p.transport === 'string' ? p.transport : JSON.stringify(p.transport)) : null,
        p.tarifs_entree || null, p.capacite || null, p.annee_creation || null,
        p.image_url || null,
        p.galerie ? (typeof p.galerie === 'string' ? p.galerie : JSON.stringify(p.galerie)) : null,
        p.is_independent ? 1 : 0
    );
    res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', auth(), (req, res) => {
    const db = getDb();
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    if (!place) return res.status(404).json({ error: 'Introuvable' });
    if (req.user.role !== 'admin' && place.owner_id !== req.user.id) return res.status(403).json({ error: 'Non autorise' });
    const p = req.body || {};
    // Validation des coords si fournies
    let lat = p.latitude, lng = p.longitude;
    if (lat != null && lat !== '') { lat = Number(lat); if (!Number.isFinite(lat) || lat < -90 || lat > 90) return res.status(400).json({ error: 'Latitude invalide' }); }
    if (lng != null && lng !== '') { lng = Number(lng); if (!Number.isFinite(lng) || lng < -180 || lng > 180) return res.status(400).json({ error: 'Longitude invalide' }); }
    // is_independent / verified : reserves a l'admin
    const isAdmin = req.user.role === 'admin';
    db.prepare(`
        UPDATE places SET nom=COALESCE(?, nom), description=COALESCE(?, description),
            ville=COALESCE(?, ville), adresse=COALESCE(?, adresse), code_postal=COALESCE(?, code_postal),
            latitude=COALESCE(?, latitude), longitude=COALESCE(?, longitude),
            telephone=COALESCE(?, telephone), email=COALESCE(?, email), site_web=COALESCE(?, site_web),
            horaires=COALESCE(?, horaires), accessibility=COALESCE(?, accessibility),
            services=COALESCE(?, services), transport=COALESCE(?, transport),
            tarifs_entree=COALESCE(?, tarifs_entree), capacite=COALESCE(?, capacite),
            annee_creation=COALESCE(?, annee_creation),
            image_url=COALESCE(?, image_url), galerie=COALESCE(?, galerie),
            is_independent=COALESCE(?, is_independent), verified=COALESCE(?, verified)
        WHERE id = ?
    `).run(
        p.nom ?? null, p.description ?? null, p.ville ?? null, p.adresse ?? null, p.code_postal ?? null,
        lat ?? null, lng ?? null,
        p.telephone ?? null, p.email ?? null, p.site_web ?? null,
        p.horaires ? (typeof p.horaires === 'string' ? p.horaires : JSON.stringify(p.horaires)) : null,
        p.accessibility ? (typeof p.accessibility === 'string' ? p.accessibility : JSON.stringify(p.accessibility)) : null,
        p.services ? (typeof p.services === 'string' ? p.services : JSON.stringify(p.services)) : null,
        p.transport ? (typeof p.transport === 'string' ? p.transport : JSON.stringify(p.transport)) : null,
        p.tarifs_entree ?? null, p.capacite ?? null, p.annee_creation ?? null,
        p.image_url ?? null,
        p.galerie ? (typeof p.galerie === 'string' ? p.galerie : JSON.stringify(p.galerie)) : null,
        (isAdmin && p.is_independent != null) ? (p.is_independent ? 1 : 0) : null,
        (isAdmin && p.verified != null) ? (p.verified ? 1 : 0) : null,
        req.params.id
    );
    res.json({ ok: true });
});

router.delete('/:id', auth(), (req, res) => {
    const db = getDb();
    const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
    if (!place) return res.status(404).json({ error: 'Introuvable' });
    if (req.user.role !== 'admin' && place.owner_id !== req.user.id) return res.status(403).json({ error: 'Non autorise' });
    db.prepare('DELETE FROM places WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

router.get('/mine/owned', auth(), requireRole('pro', 'admin'), (req, res) => {
    const rows = getDb().prepare(`
        SELECT p.*, (SELECT COUNT(*) FROM events e WHERE e.place_id = p.id) AS nb_events
        FROM places p WHERE owner_id = ? ORDER BY nom
    `).all(req.user.id).map(enrichPlace);
    res.json(rows);
});

module.exports = router;
