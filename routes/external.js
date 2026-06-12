const express = require('express');
const { getWeather } = require('../utils/weather');
const { fetchOpenAgendaEvents } = require('../utils/openagenda');

const router = express.Router();

router.get('/weather', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!lat || !lng) return res.status(400).json({ error: 'lat et lng requis' });
    const data = await getWeather(lat, lng);
    if (!data) return res.status(502).json({ error: 'Meteo indisponible' });
    res.json(data);
});

router.get('/openagenda', async (req, res) => {
    const data = await fetchOpenAgendaEvents({
        ville: req.query.ville,
        lat: req.query.lat ? Number(req.query.lat) : null,
        lng: req.query.lng ? Number(req.query.lng) : null,
        limit: Number(req.query.limit) || 10
    });
    res.json(data);
});

module.exports = router;
