const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'culture-radar-dev-secret-change-me';
const TOKEN_TTL = '7d';

// Garde-fou production : refus de demarrer avec le secret par defaut en prod
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'culture-radar-dev-secret-change-me') {
    console.error('[FATAL] JWT_SECRET doit etre defini en production. Arret.');
    process.exit(1);
}
if (JWT_SECRET === 'culture-radar-dev-secret-change-me') {
    console.warn('[WARN] JWT_SECRET non defini, utilisation du secret de developpement. Definissez JWT_SECRET dans .env');
}

function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role, subscription_type: user.subscription_type },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

// Extrait le user depuis le header Authorization ou le cookie
function extractToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    if (req.cookies && req.cookies.token) return req.cookies.token;
    return null;
}

function auth(required = true) {
    return (req, res, next) => {
        const token = extractToken(req);
        if (!token) {
            if (!required) return next();
            return res.status(401).json({ error: 'Token manquant' });
        }
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            const user = getDb().prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id);
            if (!user) {
                if (!required) return next();
                return res.status(401).json({ error: 'Utilisateur introuvable' });
            }
            req.user = user;
            next();
        } catch (e) {
            if (!required) return next();
            return res.status(401).json({ error: 'Token invalide' });
        }
    };
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentification requise' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Droits insuffisants' });
        next();
    };
}

module.exports = { auth, requireRole, signToken, JWT_SECRET };
