// =====================================================
// Reset des stats fictives — ne conserve QUE l'activite reelle
//
// Usage :
//   npm run reset-stats             # dry-run (affiche l'inventaire)
//   npm run reset-stats -- --force  # execute le reset
//
// Conserve :
//   - les comptes (admin + B2C + B2B) pour la demo / connexion
//   - les evenements et lieux (contenu du site)
//
// Supprime :
//   - abonnements premium (5 demos)
//   - partenariats (4 demos : Montreuil, IDF, Bpifrance, Canope)
//   - promotions payantes (1 demo)
//   - avis (5 demos)
//   - reservations & envies (18 demos)
//   - messages de contact (1 test)
//   - events analytics (123 demos)
//   - preferences utilisateur (10 demos)
//
// Resets :
//   - users.subscription_type -> 'free' pour tous
//   - users.subscription_ends_at -> NULL
//   - events.is_promoted -> 0, promoted_until -> NULL
//   - events.views_count -> 0
//   - events.places_disponibles -> places_max (restauration inventaire)
// =====================================================

const { getDb } = require('./db');

const force = process.argv.includes('--force');
const db = getDb();

const count = (sql) => db.prepare(sql).get().c;

const before = {
    subscriptions:   count('SELECT COUNT(*) c FROM subscriptions'),
    partnerships:    count('SELECT COUNT(*) c FROM partnerships'),
    promotions:      count('SELECT COUNT(*) c FROM promotions'),
    reviews:         count('SELECT COUNT(*) c FROM reviews'),
    reservations:    count('SELECT COUNT(*) c FROM reservations'),
    contact_msgs:    count('SELECT COUNT(*) c FROM contact_messages'),
    analytics:       count('SELECT COUNT(*) c FROM analytics_events'),
    user_prefs:      count('SELECT COUNT(*) c FROM user_preferences'),
    paid_users:      count("SELECT COUNT(*) c FROM users WHERE subscription_type != 'free'"),
    promoted_events: count('SELECT COUNT(*) c FROM events WHERE is_promoted = 1'),
    users:           count('SELECT COUNT(*) c FROM users'),
    events:          count('SELECT COUNT(*) c FROM events'),
    places:          count('SELECT COUNT(*) c FROM places')
};

console.log('\n================================================');
console.log(' Reset des stats fictives');
console.log('================================================');
console.log(' A SUPPRIMER (donnees fictives) :');
console.log(`   Abonnements        : ${before.subscriptions}`);
console.log(`   Partenariats       : ${before.partnerships}`);
console.log(`   Promotions payantes: ${before.promotions}`);
console.log(`   Avis               : ${before.reviews}`);
console.log(`   Reservations       : ${before.reservations}`);
console.log(`   Messages contact   : ${before.contact_msgs}`);
console.log(`   Analytics events   : ${before.analytics}`);
console.log(`   Preferences user   : ${before.user_prefs}`);
console.log(' A RESET :');
console.log(`   Users payants->free: ${before.paid_users}`);
console.log(`   Events promus->0   : ${before.promoted_events}`);
console.log('');
console.log(' CONSERVE :');
console.log(`   Comptes utilisateur: ${before.users}`);
console.log(`   Evenements         : ${before.events}`);
console.log(`   Lieux              : ${before.places}`);
console.log('================================================\n');

if (!force) {
    console.log('[reset] DRY-RUN. Pour executer, ajoutez --force :');
    console.log('[reset]   npm run reset-stats -- --force\n');
    process.exit(0);
}

console.log('[reset] Suppression en cours...\n');

const tx = db.transaction(() => {
    // 1. Restituer l'inventaire des evenements (places_disponibles)
    db.prepare(`
        UPDATE events SET places_disponibles = places_max
        WHERE places_max IS NOT NULL
    `).run();

    // 2. Vider toutes les tables d'activite
    const delSubs   = db.prepare('DELETE FROM subscriptions').run();
    const delParts  = db.prepare('DELETE FROM partnerships').run();
    const delPromos = db.prepare('DELETE FROM promotions').run();
    const delRev    = db.prepare('DELETE FROM reviews').run();
    const delResas  = db.prepare('DELETE FROM reservations').run();
    const delMsg    = db.prepare('DELETE FROM contact_messages').run();
    const delAna    = db.prepare('DELETE FROM analytics_events').run();
    const delPrefs  = db.prepare('DELETE FROM user_preferences').run();
    const delNotif  = db.prepare('DELETE FROM notifications').run();
    const delReport = db.prepare('DELETE FROM monthly_reports').run();

    console.log(`  - ${delSubs.changes}  abonnements supprimes`);
    console.log(`  - ${delParts.changes}  partenariats supprimes`);
    console.log(`  - ${delPromos.changes}  promotions supprimees`);
    console.log(`  - ${delRev.changes}  avis supprimes`);
    console.log(`  - ${delResas.changes} reservations supprimees`);
    console.log(`  - ${delMsg.changes}  messages contact supprimes`);
    console.log(`  - ${delAna.changes} analytics_events supprimes`);
    console.log(`  - ${delPrefs.changes} user_preferences supprimes`);
    console.log(`  - ${delNotif.changes}  notifications supprimees`);
    console.log(`  - ${delReport.changes}  monthly_reports supprimes`);

    // 3. Reset des flags sur users
    const resetUsers = db.prepare(`
        UPDATE users SET
            subscription_type = 'free',
            subscription_ends_at = NULL
    `).run();
    console.log(`  - ${resetUsers.changes} comptes remis a subscription='free'`);

    // 4. Reset des compteurs sur events
    const resetEvents = db.prepare(`
        UPDATE events SET
            is_promoted = 0,
            promoted_until = NULL,
            views_count = 0
    `).run();
    console.log(`  - ${resetEvents.changes} evenements remis a zero (promo + vues)`);

    // 5. Reset auto-increments des tables videes (numerotation propre)
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('subscriptions','partnerships','promotions','reviews','reservations','contact_messages','analytics_events','user_preferences','notifications','monthly_reports')").run();
});
tx();

// VACUUM pour reduire la taille du fichier .db
db.exec('VACUUM');

const after = {
    subscriptions: count('SELECT COUNT(*) c FROM subscriptions'),
    partnerships:  count('SELECT COUNT(*) c FROM partnerships'),
    reviews:       count('SELECT COUNT(*) c FROM reviews'),
    reservations:  count('SELECT COUNT(*) c FROM reservations'),
    paid_users:    count("SELECT COUNT(*) c FROM users WHERE subscription_type != 'free'"),
    users:         count('SELECT COUNT(*) c FROM users'),
    events:        count('SELECT COUNT(*) c FROM events'),
    places:        count('SELECT COUNT(*) c FROM places')
};

console.log('\n================================================');
console.log(' Etat apres reset');
console.log('================================================');
console.log(`   Abonnements actifs : ${after.subscriptions}`);
console.log(`   Partenariats       : ${after.partnerships}`);
console.log(`   Avis               : ${after.reviews}`);
console.log(`   Reservations       : ${after.reservations}`);
console.log(`   Users payants      : ${after.paid_users}`);
console.log('');
console.log(`   Comptes (conserves): ${after.users}`);
console.log(`   Evenements         : ${after.events}`);
console.log(`   Lieux              : ${after.places}`);
console.log('================================================\n');
console.log('[reset] Termine. Le dashboard admin affichera les vrais chiffres (0 partout pour l\'activite).\n');
