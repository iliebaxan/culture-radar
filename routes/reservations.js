const express = require('express');
const { getDb } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

function genRef(eventId, userId) {
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CR-${String(eventId).padStart(4,'0')}-${String(userId).padStart(3,'0')}-${rnd}`;
}

// ---------- GET /api/reservations - mes reservations ----------
router.get('/', auth(), (req, res) => {
    const rows = getDb().prepare(`
        SELECT r.*, e.titre, e.date_debut, e.date_fin, e.image_url, e.category,
               e.prix_min, e.prix_max, e.gratuit, e.duree_minutes, e.url_billetterie, e.site_officiel,
               e.source, e.outdoor,
               p.ville, p.nom AS place_nom, p.adresse, p.latitude, p.longitude,
               p.is_independent, p.telephone AS place_telephone
        FROM reservations r
        JOIN events e ON r.event_id = e.id
        LEFT JOIN places p ON e.place_id = p.id
        WHERE r.user_id = ? ORDER BY e.date_debut ASC
    `).all(req.user.id);
    res.json(rows);
});

// ---------- GET /api/reservations/by-event/:event_id ----------
// Retourne la reservation de l'utilisateur pour cet evenement, ou null
router.get('/by-event/:event_id', auth(), (req, res) => {
    const row = getDb().prepare(
        'SELECT * FROM reservations WHERE user_id = ? AND event_id = ?'
    ).get(req.user.id, req.params.event_id);
    res.json(row || null);
});

// ---------- GET /api/reservations/:id ----------
router.get('/:id', auth(), (req, res) => {
    const row = getDb().prepare(`
        SELECT r.*, e.titre, e.date_debut, e.date_fin, e.image_url, e.category, e.description,
               e.prix_min, e.prix_max, e.gratuit, e.duree_minutes, e.url_billetterie, e.infos_pratiques,
               p.ville, p.nom AS place_nom, p.adresse, p.code_postal,
               p.latitude AS place_lat, p.longitude AS place_lng, p.telephone AS place_tel
        FROM reservations r
        JOIN events e ON r.event_id = e.id
        LEFT JOIN places p ON e.place_id = p.id
        WHERE r.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Reservation introuvable' });
    if (row.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise' });
    res.json(row);
});

// ---------- POST /api/reservations ----------
// Ajoute une envie ou confirme une reservation (avec reference generee)
router.post('/', auth(), (req, res) => {
    const { event_id, status = 'envie', nb_places = 1, note_personnelle } = req.body || {};
    if (!event_id) return res.status(400).json({ error: 'event_id requis' });
    if (!['envie', 'reserve', 'participe', 'annule'].includes(status)) {
        return res.status(400).json({ error: 'status invalide' });
    }
    const db = getDb();
    const ev = db.prepare('SELECT id, places_disponibles FROM events WHERE id = ? AND status = \'published\'').get(event_id);
    if (!ev) return res.status(404).json({ error: 'Evenement introuvable' });

    // Verification dispo
    if (status === 'reserve' && ev.places_disponibles != null && ev.places_disponibles < nb_places) {
        return res.status(409).json({ error: `Plus que ${ev.places_disponibles} place(s) disponible(s)` });
    }

    const existing = db.prepare('SELECT id, status FROM reservations WHERE user_id = ? AND event_id = ?').get(req.user.id, event_id);
    const ref = status === 'reserve' ? genRef(event_id, req.user.id) : null;

    if (existing) {
        const stmt = db.prepare(`UPDATE reservations SET status = ?, nb_places = ?, note_personnelle = COALESCE(?, note_personnelle),
            reference = COALESCE(?, reference), updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
        stmt.run(status, nb_places, note_personnelle || null, ref, existing.id);
        // Deduction places si on passe en reserve et qu on ne l etait pas deja
        if (status === 'reserve' && existing.status !== 'reserve' && ev.places_disponibles != null) {
            db.prepare('UPDATE events SET places_disponibles = MAX(0, places_disponibles - ?) WHERE id = ?').run(nb_places, event_id);
        }
        // Restitution places si on annule une reservation active
        if (status === 'annule' && existing.status === 'reserve' && ev.places_disponibles != null) {
            const prev = db.prepare('SELECT nb_places FROM reservations WHERE id = ?').get(existing.id);
            db.prepare('UPDATE events SET places_disponibles = places_disponibles + ? WHERE id = ?').run(prev.nb_places, event_id);
        }
        const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(existing.id);
        return res.json({ ...row, updated: true });
    }

    const info = db.prepare(
        'INSERT INTO reservations (user_id, event_id, status, nb_places, note_personnelle, reference) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, event_id, status, nb_places, note_personnelle || null, ref);

    if (status === 'reserve' && ev.places_disponibles != null) {
        db.prepare('UPDATE events SET places_disponibles = MAX(0, places_disponibles - ?) WHERE id = ?').run(nb_places, event_id);
    }

    const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...row, created: true });
});

// ---------- PUT /api/reservations/:id ----------
router.put('/:id', auth(), (req, res) => {
    const db = getDb();
    const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Introuvable' });
    if (r.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise' });
    const { status, nb_places, note_personnelle } = req.body || {};
    if (status && !['envie', 'reserve', 'participe', 'annule'].includes(status)) {
        return res.status(400).json({ error: 'status invalide' });
    }
    // Restituer l'inventaire si on annule une reservation active
    if (status === 'annule' && r.status === 'reserve') {
        db.prepare('UPDATE events SET places_disponibles = places_disponibles + ? WHERE id = ? AND places_disponibles IS NOT NULL').run(r.nb_places, r.event_id);
    }
    db.prepare(`UPDATE reservations SET status = COALESCE(?, status), nb_places = COALESCE(?, nb_places),
        note_personnelle = COALESCE(?, note_personnelle), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
        status ?? null, nb_places ?? null, note_personnelle ?? null, req.params.id
    );
    res.json({ ok: true });
});

// ---------- DELETE /api/reservations/:id ----------
router.delete('/:id', auth(), (req, res) => {
    const db = getDb();
    const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Introuvable' });
    if (r.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise' });
    // Restituer les places si c etait une reservation active
    if (r.status === 'reserve') {
        db.prepare('UPDATE events SET places_disponibles = places_disponibles + ? WHERE id = ? AND places_disponibles IS NOT NULL').run(r.nb_places, r.event_id);
    }
    db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
