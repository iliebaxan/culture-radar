// =====================================================
// CultureRadar - Serveur principal Express
// =====================================================
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { getDb } = require('./database/db');
getDb(); // init DB si besoin

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Securite - helmet en mode permissif pour autoriser les images externes et inline scripts
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:", "https:", "http:"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
            // Helmet 7 active par defaut "script-src-attr 'none'" qui bloque
            // les onclick="..." inline. Le code front utilise des handlers
            // inline, on doit donc autoriser explicitement les attributs.
            "script-src-attr": ["'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
            "style-src-attr": ["'unsafe-inline'"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "connect-src": ["'self'", "https://api.open-meteo.com", "https://api.openagenda.com", "https://opendata.paris.fr", "https://public.opendatasoft.com", "https://*.tile.openstreetmap.org"]
        }
    }
}));

// CORS ouvert (reglages depuis .env pour la prod)
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting sur l auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives, merci de reessayer plus tard.' }
});

// Routes API
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/places', require('./routes/places'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/external', require('./routes/external'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/contact', require('./routes/contact'));

// Healthcheck
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Frontend statique
app.use(express.static(path.join(__dirname, 'public')));

// Page 404 pour les routes api inconnues
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Route API inconnue' }));

// Liste blanche des routes "user-facing" sans extension (raccourcis du type /login).
// Toute autre URL inconnue tombera sur la page 404 (et non sur index.html).
const FRONTEND_ROUTES = new Set([
    '/', '/index', '/events', '/event', '/places', '/place', '/recommendations',
    '/login', '/register', '/profile', '/pricing', '/admin', '/pro', '/about',
    '/contact', '/legal', '/reservation'
]);
app.get('*', (req, res, next) => {
    if (req.path.includes('.')) return next();
    const file = path.join(__dirname, 'public', 'index.html');
    if (FRONTEND_ROUTES.has(req.path) && fs.existsSync(file)) return res.sendFile(file);
    next();
});

// 404 final si aucun fichier statique trouve
app.use((req, res) => {
    const file404 = path.join(__dirname, 'public', '404.html');
    if (fs.existsSync(file404)) return res.status(404).sendFile(file404);
    res.status(404).send('Not Found');
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[err]', err);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(PORT, HOST, () => {
    console.log('');
    console.log('================================================');
    console.log('  CultureRadar - La boussole culturelle');
    console.log(`  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log('================================================');
    console.log('  Comptes demo :');
    console.log('    Admin : admin@culture-radar.fr / admin123');
    console.log('    B2C   : marie.dupont@exemple.fr / demo1234');
    console.log('    B2B   : theatre.belleville@exemple.fr / pro1234');
    console.log('================================================');
    console.log('');
});
