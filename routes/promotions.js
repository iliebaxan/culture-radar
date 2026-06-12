const express = require('express');
const { getDb } = require('../database/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

const PACKS = {
    boost_7j:     { prix: 15, duree_jours: 7,  label: 'Boost 7 jours' },
    premium_30j:  { prix: 49, duree_jours: 30, label: 'Premium 30 jours' },
    sponsored:    { prix: 99, duree_jours: 60, label: 'Sponsorise 60 jours' }
};

router.get('/packs', (req, res) => res.json(PACKS));

router.post('/', auth(), requireRole('pro', 'admin'), (req, res) => {
    const { event_id, pack } = req.body || {};
    if (!event_id || !PACKS[pack]) return res.status(400).json({ error: 'event_id et pack valide requis' });
    const db = getDb();
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id);
    if (!ev) return res.status(404).json({ error: 'Evenement introuvable' });
    if (req.user.role !== 'admin' && ev.organizer_id !== req.user.id) return res.status(403).json({ error: 'Non autorise' });

    const p = PACKS[pack];
    const debut = new Date();
    const fin = new Date(debut.getTime() + p.duree_jours * 86400000);
    const info = db.prepare(`
        INSERT INTO promotions (event_id, user_id, montant, pack, date_debut, date_fin, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, 'paye')
    `).run(event_id, req.user.id, p.prix, pack, debut.toISOString(), fin.toISOString());
    db.prepare('UPDATE events SET is_promoted = 1, promoted_until = ? WHERE id = ?').run(fin.toISOString(), event_id);
    res.status(201).json({ id: info.lastInsertRowid, montant: p.prix, fin });
});

router.get('/mine', auth(), requireRole('pro', 'admin'), (req, res) => {
    const rows = getDb().prepare(`
        SELECT pr.*, e.titre FROM promotions pr
        JOIN events e ON pr.event_id = e.id
        WHERE pr.user_id = ? ORDER BY pr.date_debut DESC
    `).all(req.user.id);
    res.json(rows);
});

module.exports = router;
