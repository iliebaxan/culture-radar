const express = require('express');
const { getDb } = require('../database/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(auth(), requireRole('admin'));

// GET /api/admin/stats - KPIs globaux pour le dashboard
router.get('/stats', (req, res) => {
    const db = getDb();
    const q = (sql, ...params) => db.prepare(sql).get(...params);

    const nbUsers = q('SELECT COUNT(*) c FROM users').c;
    const nbUsersPremium = q("SELECT COUNT(*) c FROM users WHERE subscription_type IN ('premium','pro_local','enterprise')").c;
    const nbEvents = q('SELECT COUNT(*) c FROM events').c;
    const nbEventsPublished = q("SELECT COUNT(*) c FROM events WHERE status = 'published'").c;
    const nbPlaces = q('SELECT COUNT(*) c FROM places').c;
    const nbIndependent = q('SELECT COUNT(*) c FROM places WHERE is_independent = 1').c;
    const nbReservations = q('SELECT COUNT(*) c FROM reservations').c;
    const nbReviews = q('SELECT COUNT(*) c FROM reviews').c;
    const noteMoyenne = q('SELECT ROUND(AVG(note),2) m FROM reviews').m || 0;
    const mrr = q("SELECT COALESCE(SUM(prix_mensuel),0) s FROM subscriptions WHERE status = 'actif'").s;
    const revenuPromos = q("SELECT COALESCE(SUM(montant),0) s FROM promotions WHERE payment_status = 'paye' AND date(date_debut) >= date('now','start of month')").s;
    const revenuPartenariats = q("SELECT COALESCE(SUM(montant_annuel),0)/12 s FROM partnerships WHERE status = 'actif'").s;

    const topCats = db.prepare(`
        SELECT category, COUNT(*) c FROM events
        WHERE status='published' AND date_debut >= datetime('now','-30 days')
        GROUP BY category ORDER BY c DESC LIMIT 8
    `).all();
    const topVilles = db.prepare(`
        SELECT p.ville, COUNT(*) c FROM events e JOIN places p ON e.place_id=p.id
        WHERE e.status='published' GROUP BY p.ville ORDER BY c DESC LIMIT 8
    `).all();
    const signups7j = db.prepare(`
        SELECT date(created_at) d, COUNT(*) c FROM users
        WHERE created_at >= datetime('now','-7 days') GROUP BY date(created_at) ORDER BY d
    `).all();
    const reservations30j = db.prepare(`
        SELECT date(created_at) d, COUNT(*) c FROM reservations
        WHERE created_at >= datetime('now','-30 days') GROUP BY date(created_at) ORDER BY d
    `).all();
    const topEvents = db.prepare(`
        SELECT e.id, e.titre, COUNT(r.id) inscrits FROM events e
        LEFT JOIN reservations r ON r.event_id = e.id AND r.status IN ('reserve','participe')
        WHERE e.status='published'
        GROUP BY e.id ORDER BY inscrits DESC, e.date_debut ASC LIMIT 10
    `).all();

    res.json({
        generated_at: new Date().toISOString(),
        utilisateurs: { total: nbUsers, premium: nbUsersPremium },
        contenu: { evenements: nbEvents, publies: nbEventsPublished, lieux: nbPlaces, independants: nbIndependent },
        engagement: { reservations: nbReservations, avis: nbReviews, note_moyenne: noteMoyenne },
        revenus: {
            mrr_abonnements: Math.round(mrr * 100) / 100,
            mois_promotions: Math.round(revenuPromos * 100) / 100,
            mensualise_partenariats: Math.round(revenuPartenariats * 100) / 100,
            total_mensuel: Math.round((mrr + revenuPromos + revenuPartenariats) * 100) / 100
        },
        repartitions: { categories: topCats, villes: topVilles },
        series: { signups_7j: signups7j, reservations_30j: reservations30j },
        top_evenements: topEvents
    });
});

// POST /api/admin/reports/monthly - genere le rapport du mois en cours
router.post('/reports/monthly', (req, res) => {
    const db = getDb();
    const now = new Date();
    const annee = now.getFullYear();
    const mois = now.getMonth() + 1;
    const start = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const report = {
        annee, mois,
        nb_users: db.prepare("SELECT COUNT(*) c FROM users").get().c,
        nb_nouveaux_users: db.prepare("SELECT COUNT(*) c FROM users WHERE date(created_at) >= ?").get(start).c,
        nb_events: db.prepare("SELECT COUNT(*) c FROM events WHERE status='published'").get().c,
        nb_reservations: db.prepare("SELECT COUNT(*) c FROM reservations WHERE date(created_at) >= ?").get(start).c,
        nb_reviews: db.prepare("SELECT COUNT(*) c FROM reviews WHERE date(created_at) >= ?").get(start).c,
        revenu_abonnements: db.prepare("SELECT COALESCE(SUM(prix_mensuel),0) s FROM subscriptions WHERE status='actif'").get().s,
        revenu_promotions: db.prepare("SELECT COALESCE(SUM(montant),0) s FROM promotions WHERE date(date_debut) >= ?").get(start).s,
        revenu_partenariats: db.prepare("SELECT COALESCE(SUM(montant_annuel),0)/12 s FROM partnerships WHERE status='actif'").get().s,
        top_categories: JSON.stringify(db.prepare("SELECT category, COUNT(*) c FROM events GROUP BY category ORDER BY c DESC LIMIT 5").all()),
        top_villes: JSON.stringify(db.prepare("SELECT p.ville, COUNT(*) c FROM events e JOIN places p ON e.place_id=p.id GROUP BY p.ville ORDER BY c DESC LIMIT 5").all())
    };
    report.revenu_total = report.revenu_abonnements + report.revenu_promotions + report.revenu_partenariats;
    db.prepare(`
        INSERT INTO monthly_reports (annee, mois, nb_users, nb_nouveaux_users, nb_events, nb_reservations, nb_reviews,
            revenu_abonnements, revenu_promotions, revenu_partenariats, revenu_total, top_categories, top_villes)
        VALUES (@annee, @mois, @nb_users, @nb_nouveaux_users, @nb_events, @nb_reservations, @nb_reviews,
            @revenu_abonnements, @revenu_promotions, @revenu_partenariats, @revenu_total, @top_categories, @top_villes)
        ON CONFLICT(annee, mois) DO UPDATE SET
            nb_users=excluded.nb_users, nb_nouveaux_users=excluded.nb_nouveaux_users,
            nb_events=excluded.nb_events, nb_reservations=excluded.nb_reservations,
            nb_reviews=excluded.nb_reviews, revenu_abonnements=excluded.revenu_abonnements,
            revenu_promotions=excluded.revenu_promotions, revenu_partenariats=excluded.revenu_partenariats,
            revenu_total=excluded.revenu_total, top_categories=excluded.top_categories, top_villes=excluded.top_villes,
            generated_at=CURRENT_TIMESTAMP
    `).run(report);
    res.json(report);
});

router.get('/reports', (req, res) => {
    const rows = getDb().prepare('SELECT * FROM monthly_reports ORDER BY annee DESC, mois DESC').all();
    res.json(rows);
});

// GET /api/admin/users
router.get('/users', (req, res) => {
    const rows = getDb().prepare('SELECT id, email, nom, prenom, role, ville, subscription_type, created_at, last_login, active FROM users ORDER BY created_at DESC').all();
    res.json(rows);
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res) => {
    const { role, active, subscription_type } = req.body || {};
    const db = getDb();
    const targetId = Number(req.params.id);
    // Normalisation du booleen "active" (accepte false, 0, '0', 'false')
    let activeBool = null;
    if (active != null) activeBool = !(active === false || active === 0 || active === '0' || active === 'false');
    // Empeche l'admin de se rendre lui-meme inutilisable
    if (targetId === req.user.id) {
        if (active != null && activeBool === false) {
            return res.status(400).json({ error: 'Vous ne pouvez pas desactiver votre propre compte admin' });
        }
        if (role && role !== 'admin') {
            return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits admin' });
        }
    }
    // Sanity: ne jamais autoriser un role inconnu
    if (role && !['user', 'pro', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'role invalide (user, pro ou admin)' });
    }
    db.prepare('UPDATE users SET role=COALESCE(?, role), active=COALESCE(?, active), subscription_type=COALESCE(?, subscription_type) WHERE id=?').run(
        role ?? null, (activeBool == null ? null : (activeBool ? 1 : 0)), subscription_type ?? null, targetId
    );
    res.json({ ok: true });
});

// DELETE /api/admin/users/:id - suppression dure
router.delete('/users/:id', (req, res) => {
    if (Number(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte admin' });
    }
    const db = getDb();
    const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!u) return res.status(404).json({ error: 'Utilisateur introuvable' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// DELETE /api/admin/partnerships/:id
router.delete('/partnerships/:id', (req, res) => {
    getDb().prepare('DELETE FROM partnerships WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// PUT /api/admin/partnerships/:id
router.put('/partnerships/:id', (req, res) => {
    const { nom, type, contact_email, contact_nom, description, montant_annuel, status, date_debut, date_fin } = req.body || {};
    getDb().prepare(`
        UPDATE partnerships SET
            nom=COALESCE(?, nom), type=COALESCE(?, type),
            contact_email=COALESCE(?, contact_email), contact_nom=COALESCE(?, contact_nom),
            description=COALESCE(?, description), montant_annuel=COALESCE(?, montant_annuel),
            status=COALESCE(?, status), date_debut=COALESCE(?, date_debut), date_fin=COALESCE(?, date_fin)
        WHERE id=?
    `).run(
        nom ?? null, type ?? null, contact_email ?? null, contact_nom ?? null, description ?? null,
        montant_annuel ?? null, status ?? null, date_debut ?? null, date_fin ?? null, req.params.id
    );
    res.json({ ok: true });
});

// Moderation des evenements (admin voit tout)
router.get('/events', (req, res) => {
    const rows = getDb().prepare(`
        SELECT e.*, p.nom AS place_nom, p.ville, u.email AS organizer_email,
               (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id) AS nb_inscrits
        FROM events e LEFT JOIN places p ON e.place_id = p.id LEFT JOIN users u ON e.organizer_id = u.id
        ORDER BY e.date_debut DESC LIMIT 200
    `).all();
    res.json(rows);
});

// Suppression admin
router.delete('/events/:id', (req, res) => {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// Messages de contact
router.get('/contact', (req, res) => {
    try {
        const rows = getDb().prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100').all();
        res.json(rows);
    } catch { res.json([]); }
});
router.put('/contact/:id', (req, res) => {
    const status = req.body.status || 'lu';
    if (!['nouveau', 'lu', 'traite', 'ignore'].includes(status)) {
        return res.status(400).json({ error: 'status invalide (nouveau, lu, traite, ignore)' });
    }
    try {
        getDb().prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: 'Erreur mise a jour' });
    }
});

// Partenariats CRUD
router.get('/partnerships', (req, res) => {
    res.json(getDb().prepare('SELECT * FROM partnerships ORDER BY created_at DESC').all());
});
router.post('/partnerships', (req, res) => {
    const { nom, type, contact_email, contact_nom, description, montant_annuel, date_debut, date_fin } = req.body || {};
    if (!nom || !type) return res.status(400).json({ error: 'nom et type requis' });
    const info = getDb().prepare('INSERT INTO partnerships (nom, type, contact_email, contact_nom, description, montant_annuel, date_debut, date_fin) VALUES (?,?,?,?,?,?,?,?)').run(nom, type, contact_email || null, contact_nom || null, description || null, montant_annuel || 0, date_debut || null, date_fin || null);
    res.status(201).json({ id: info.lastInsertRowid });
});

module.exports = router;
