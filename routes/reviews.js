const express = require('express');
const { getDb } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth(), (req, res) => {
    const { event_id, note, commentaire } = req.body || {};
    if (!event_id || !note) return res.status(400).json({ error: 'event_id et note requis' });
    if (note < 1 || note > 5) return res.status(400).json({ error: 'note doit etre entre 1 et 5' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ? AND event_id = ?').get(req.user.id, event_id);
    if (existing) {
        db.prepare('UPDATE reviews SET note = ?, commentaire = ? WHERE id = ?').run(note, commentaire || '', existing.id);
        return res.json({ id: existing.id, updated: true });
    }
    const info = db.prepare('INSERT INTO reviews (user_id, event_id, note, commentaire) VALUES (?, ?, ?, ?)').run(req.user.id, event_id, note, commentaire || '');
    res.status(201).json({ id: info.lastInsertRowid });
});

router.delete('/:id', auth(), (req, res) => {
    const db = getDb();
    const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: 'Introuvable' });
    if (r.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorise' });
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
