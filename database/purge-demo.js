// =====================================================
// Purge des donnees de demonstration
// Supprime les evenements fictifs pour ne conserver que
// ceux synchronises depuis OpenAgenda (source = 'openagenda').
//
// Usage :
//   npm run purge-demo             # dry-run : affiche seulement
//   npm run purge-demo -- --force  # execute la suppression
//
// Cascade : les reservations et avis lies aux evenements supprimes
// sont automatiquement supprimes (ON DELETE CASCADE dans le schema).
// =====================================================

const { getDb } = require('./db');

const force = process.argv.includes('--force');
const db = getDb();

// Inventaire avant
const before = {
    events_total: db.prepare('SELECT COUNT(*) c FROM events').get().c,
    events_oa: db.prepare("SELECT COUNT(*) c FROM events WHERE source = 'openagenda'").get().c,
    events_demo: db.prepare("SELECT COUNT(*) c FROM events WHERE source != 'openagenda' OR source IS NULL").get().c,
    places_total: db.prepare('SELECT COUNT(*) c FROM places').get().c,
    reservations: db.prepare('SELECT COUNT(*) c FROM reservations').get().c,
    reviews: db.prepare('SELECT COUNT(*) c FROM reviews').get().c
};

console.log('\n================================================');
console.log(' Purge des donnees de demonstration');
console.log('================================================');
console.log(`  Evenements au total     : ${before.events_total}`);
console.log(`    - openagenda (gardes) : ${before.events_oa}`);
console.log(`    - demo (a supprimer)  : ${before.events_demo}`);
console.log(`  Lieux au total          : ${before.places_total}`);
console.log(`  Reservations            : ${before.reservations} (cascade)`);
console.log(`  Avis                    : ${before.reviews} (cascade)`);
console.log('================================================\n');

if (!force) {
    console.log('[purge] DRY-RUN : rien n a ete modifie.');
    console.log('[purge] Pour executer vraiment, ajoutez --force :');
    console.log('[purge]   npm run purge-demo -- --force\n');
    process.exit(0);
}

console.log('[purge] Suppression en cours...\n');

const tx = db.transaction(() => {
    // 1. Supprimer les evenements non-OpenAgenda (les reservations et avis
    //    associes sont supprimes via ON DELETE CASCADE)
    const delEvents = db.prepare("DELETE FROM events WHERE source != 'openagenda' OR source IS NULL").run();
    console.log(`  - ${delEvents.changes} evenements fictifs supprimes`);

    // 2. Supprimer les lieux orphelins (plus aucun evenement ne pointe dessus)
    //    SAUF ceux geres par un pro (owner_id NOT NULL) pour preserver les comptes demo Pro
    const delPlaces = db.prepare(`
        DELETE FROM places
        WHERE owner_id IS NULL
        AND id NOT IN (SELECT DISTINCT place_id FROM events WHERE place_id IS NOT NULL)
    `).run();
    console.log(`  - ${delPlaces.changes} lieux orphelins supprimes`);

    // 3. Supprimer les promotions orphelines
    const delPromos = db.prepare(`
        DELETE FROM promotions
        WHERE event_id NOT IN (SELECT id FROM events)
    `).run();
    console.log(`  - ${delPromos.changes} promotions orphelines supprimees`);
});
tx();

const after = {
    events: db.prepare('SELECT COUNT(*) c FROM events').get().c,
    places: db.prepare('SELECT COUNT(*) c FROM places').get().c,
    reservations: db.prepare('SELECT COUNT(*) c FROM reservations').get().c,
    reviews: db.prepare('SELECT COUNT(*) c FROM reviews').get().c
};

console.log('\n================================================');
console.log(' Resultat');
console.log('================================================');
console.log(`  Evenements  : ${after.events}`);
console.log(`  Lieux       : ${after.places}`);
console.log(`  Reservations: ${after.reservations}`);
console.log(`  Avis        : ${after.reviews}`);
console.log('================================================\n');

if (after.events === 0) {
    console.log('[purge] Base vide cote evenements.');
    console.log('[purge] Lancez maintenant : npm run sync-openagenda\n');
} else {
    console.log('[purge] OK - seuls les evenements OpenAgenda sont conserves.\n');
}
