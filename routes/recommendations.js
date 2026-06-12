const express = require('express');
const { getDb } = require('../database/db');
const { auth } = require('../middleware/auth');
const { recommend } = require('../utils/recommendations');
const { getWeather } = require('../utils/weather');

const router = express.Router();

// GET /api/recommendations?limit=20&lat=..&lng=..
// Si l utilisateur est connecte, utilise ses preferences et sa geoloc.
// Sinon, utilise lat/lng passes en query (geoloc navigateur).
router.get('/', auth(false), async (req, res) => {
    const db = getDb();
    const lat = req.query.lat ? Number(req.query.lat) : (req.user?.latitude ?? null);
    const lng = req.query.lng ? Number(req.query.lng) : (req.user?.longitude ?? null);
    const user = req.user ? {
        latitude: lat, longitude: lng,
        max_distance_km: req.user.max_distance_km,
        mobility_mode: req.user.mobility_mode
    } : { latitude: lat, longitude: lng, max_distance_km: Number(req.query.max_km) || 30 };

    const prefs = req.user
        ? db.prepare('SELECT category, weight FROM user_preferences WHERE user_id = ?').all(req.user.id)
        : (req.query.categories ? req.query.categories.split(',').map(c => ({ category: c.trim(), weight: 1 })) : []);

    const events = db.prepare(`
        SELECT e.*, p.ville, p.latitude, p.longitude, p.is_independent
        FROM events e LEFT JOIN places p ON e.place_id = p.id
        WHERE e.status = 'published' AND e.date_debut >= datetime('now', '-1 day')
    `).all();

    let meteo = null;
    if (lat && lng) meteo = await getWeather(lat, lng);

    const recos = recommend(events, user, prefs, meteo, Number(req.query.limit) || 20);
    res.json({ meteo, recommendations: recos });
});

module.exports = router;
