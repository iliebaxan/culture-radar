const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database/db');
const { signToken, auth } = require('../middleware/auth');

const router = express.Router();

// Helper de validation
function isValidLat(x) { return typeof x === 'number' && Number.isFinite(x) && x >= -90 && x <= 90; }
function isValidLng(x) { return typeof x === 'number' && Number.isFinite(x) && x >= -180 && x <= 180; }

// POST /api/auth/register
router.post('/register', (req, res) => {
    const { email, password, nom, prenom, role, ville, code_postal, latitude, longitude, newsletter } = req.body || {};
    if (!email || !password || !nom) return res.status(400).json({ error: 'email, password, nom requis' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email invalide' });
    if (password.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caracteres' });
    // Coordonnees facultatives mais si presentes, doivent etre valides
    const lat = (latitude === '' || latitude == null) ? null : Number(latitude);
    const lng = (longitude === '' || longitude == null) ? null : Number(longitude);
    if (lat !== null && !isValidLat(lat)) return res.status(400).json({ error: 'Latitude invalide (entre -90 et 90)' });
    if (lng !== null && !isValidLng(lng)) return res.status(400).json({ error: 'Longitude invalide (entre -180 et 180)' });
    const finalRole = (role === 'pro') ? 'pro' : 'user';
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) return res.status(409).json({ error: 'Cet email est deja utilise. Connectez-vous plutot ?' });
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare(`
        INSERT INTO users (email, password_hash, nom, prenom, role, ville, code_postal, latitude, longitude, newsletter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(email.toLowerCase().trim(), hash, nom.trim(), prenom ? prenom.trim() : null, finalRole, ville || null, code_postal || null, lat, lng, newsletter ? 1 : 0);
    const user = db.prepare('SELECT id, email, nom, prenom, role, subscription_type, ville FROM users WHERE id = ?').get(info.lastInsertRowid);
    const token = signToken(user);
    res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND active = 1').get(email);
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Identifiants invalides' });
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
});

router.post('/logout', auth(false), (req, res) => {
    if (req.user) {
        try { getDb().prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(req.user.id); } catch {}
    }
    res.json({ ok: true });
});

router.get('/me', auth(), (req, res) => {
    const u = { ...req.user };
    delete u.password_hash;
    const prefs = getDb().prepare('SELECT category, weight FROM user_preferences WHERE user_id = ?').all(req.user.id);
    u.preferences = prefs;
    res.json(u);
});

router.put('/me', auth(), (req, res) => {
    const { nom, prenom, ville, code_postal, latitude, longitude, mobility_mode, max_distance_km, bio, newsletter, accessibility_needs, avatar, telephone } = req.body || {};
    // Validation lat/lng si fournies
    let lat = latitude, lng = longitude;
    if (lat != null && lat !== '') { lat = Number(lat); if (!isValidLat(lat)) return res.status(400).json({ error: 'Latitude invalide' }); }
    if (lng != null && lng !== '') { lng = Number(lng); if (!isValidLng(lng)) return res.status(400).json({ error: 'Longitude invalide' }); }
    const db = getDb();
    db.prepare(`
        UPDATE users SET
            nom = COALESCE(?, nom), prenom = COALESCE(?, prenom),
            ville = COALESCE(?, ville), code_postal = COALESCE(?, code_postal),
            latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
            mobility_mode = COALESCE(?, mobility_mode), max_distance_km = COALESCE(?, max_distance_km),
            bio = COALESCE(?, bio), newsletter = COALESCE(?, newsletter),
            accessibility_needs = COALESCE(?, accessibility_needs),
            avatar = COALESCE(?, avatar),
            telephone = COALESCE(?, telephone)
        WHERE id = ?
    `).run(
        nom ?? null, prenom ?? null, ville ?? null, code_postal ?? null,
        lat ?? null, lng ?? null, mobility_mode ?? null, max_distance_km ?? null,
        bio ?? null, (newsletter == null ? null : (newsletter ? 1 : 0)),
        accessibility_needs ?? null, avatar ?? null, telephone ?? null,
        req.user.id
    );
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    delete u.password_hash;
    res.json(u);
});

router.put('/preferences', auth(), (req, res) => {
    const { preferences } = req.body || {};
    if (!Array.isArray(preferences)) return res.status(400).json({ error: 'preferences doit etre un tableau' });
    const db = getDb();
    const tx = db.transaction((prefs) => {
        db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(req.user.id);
        const ins = db.prepare('INSERT OR IGNORE INTO user_preferences (user_id, category, weight) VALUES (?, ?, ?)');
        for (const p of prefs) ins.run(req.user.id, p.category, p.weight ?? 1.0);
    });
    tx(preferences);
    res.json({ ok: true });
});

router.post('/password', auth(), (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Champs requis' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 caracteres' });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    res.json({ ok: true });
});

router.delete('/me', auth(), (req, res) => {
    const db = getDb();
    if (req.user.role === 'admin') {
        return res.status(400).json({ error: 'Un admin ne peut pas supprimer son compte via cette route.' });
    }
    // Si l'utilisateur est un pro et possede des lieux/evenements publies, on bloque
    // pour eviter les contenus orphelins (et la perte d'audience pour les visiteurs).
    if (req.user.role === 'pro') {
        const ownedPlaces = db.prepare('SELECT COUNT(*) AS n FROM places WHERE owner_id = ?').get(req.user.id).n;
        const ownedEvents = db.prepare("SELECT COUNT(*) AS n FROM events WHERE organizer_id = ? AND status = 'published'").get(req.user.id).n;
        if (ownedPlaces > 0 || ownedEvents > 0) {
            return res.status(409).json({
                error: `Vous etes proprietaire de ${ownedPlaces} lieu(x) et ${ownedEvents} evenement(s) publies. Contactez un administrateur pour transferer ou retirer ces contenus avant suppression.`
            });
        }
    }
    // Suppression effective (CASCADE configurees dans schema.sql se chargent du reste)
    const tx = db.transaction(() => {
        db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM reservations WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM reviews WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
        db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    });
    tx();
    res.json({ ok: true });
});

module.exports = router;
