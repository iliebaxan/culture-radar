const express = require('express');
const { getDb } = require('../database/db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/analytics - tracker cote client (page view, event click, etc.)
router.post('/', auth(false), (req, res) => {
    const { event_type, event_data, session_id } = req.body || {};
    if (!event_type) return res.status(400).json({ error: 'event_type requis' });
    getDb().prepare(`
        INSERT INTO analytics_events (user_id, session_id, event_type, event_data, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        req.user?.id || null,
        session_id || null,
        event_type,
        event_data ? JSON.stringify(event_data) : null,
        req.ip,
        req.headers['user-agent'] || ''
    );
    res.status(204).end();
});

module.exports = router;
