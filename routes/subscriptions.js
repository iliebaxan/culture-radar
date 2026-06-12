const express = require('express');
const { getDb } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

const PLANS = {
    free:       { prix: 0, label: 'Gratuit' },
    premium:    { prix: 4.99, label: 'Premium (particuliers)' },
    pro_local:  { prix: 29, label: 'Pro Local (lieux & organisateurs)' },
    enterprise: { prix: 149, label: 'Entreprise (packs collectifs)' }
};

router.get('/plans', (req, res) => res.json(PLANS));

router.get('/mine', auth(), (req, res) => {
    const rows = getDb().prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY date_debut DESC').all(req.user.id);
    res.json(rows);
});

// POST /api/subscriptions -> souscription (simulee, pas de stripe)
router.post('/', auth(), (req, res) => {
    const { plan } = req.body || {};
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plan inconnu' });
    const db = getDb();
    const now = new Date();
    const fin = new Date(now);
    fin.setMonth(fin.getMonth() + 1);
    // Annule les abonnements actifs
    db.prepare("UPDATE subscriptions SET status = 'annule' WHERE user_id = ? AND status = 'actif'").run(req.user.id);
    const info = db.prepare('INSERT INTO subscriptions (user_id, plan, prix_mensuel, date_debut, date_fin, status) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, plan, PLANS[plan].prix, now.toISOString(), fin.toISOString(), 'actif');
    db.prepare('UPDATE users SET subscription_type = ?, subscription_ends_at = ? WHERE id = ?').run(plan, fin.toISOString(), req.user.id);
    res.status(201).json({ id: info.lastInsertRowid, plan, status: 'actif' });
});

// POST /api/subscriptions/cancel
router.post('/cancel', auth(), (req, res) => {
    const db = getDb();
    db.prepare("UPDATE subscriptions SET status = 'annule' WHERE user_id = ? AND status = 'actif'").run(req.user.id);
    db.prepare("UPDATE users SET subscription_type = 'free', subscription_ends_at = NULL WHERE id = ?").run(req.user.id);
    res.json({ ok: true });
});

module.exports = router;
