const express = require('express');
const { getDb } = require('../database/db');

const router = express.Router();

// Table simple de contact (creee a la volee pour rester simple)
function ensureTable() {
    getDb().exec(`
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
    `);
}
ensureTable();

// POST /api/contact
router.post('/', (req, res) => {
    const { nom, email, sujet, message, categorie } = req.body || {};
    if (!nom || !email || !sujet || !message) return res.status(400).json({ error: 'Tous les champs sont requis' });
    if (message.length < 10) return res.status(400).json({ error: 'Message trop court' });
    if (message.length > 5000) return res.status(400).json({ error: 'Message trop long' });
    const info = getDb().prepare(
        'INSERT INTO contact_messages (nom, email, sujet, message, categorie, ip) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(nom, email, sujet, message, categorie || 'general', req.ip || null);
    res.status(201).json({ id: info.lastInsertRowid, ok: true, message: 'Message envoye avec succes.' });
});

module.exports = router;
