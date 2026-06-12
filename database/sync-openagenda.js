// =====================================================
// Synchronisation des evenements OpenAgenda -> base locale
// Usage :
//   npm run sync-openagenda
//   npm run sync-openagenda -- --agenda <uid> --limit 100
//   npm run sync-openagenda -- --search "paris" --limit 200
// =====================================================
require('dotenv').config();
const { getDb } = require('./db');
const { searchAgendas, fetchAgendaEvents } = require('../utils/openagenda');

const args = process.argv.slice(2);
function getArg(name, def = null) {
    const i = args.indexOf('--' + name);
    if (i >= 0 && args[i + 1]) return args[i + 1];
    return def;
}

async function main() {
    if (!process.env.OPENAGENDA_KEY) {
        console.error('\n[sync] ERREUR : OPENAGENDA_KEY manquante dans .env');
        console.error('  1) Creer un compte sur https://openagenda.com');
        console.error('  2) Recuperer votre cle sur https://openagenda.com/profile/api');
        console.error('  3) L ajouter a votre fichier .env');
        console.error('     OPENAGENDA_KEY=votre-cle-ici');
        console.error('  4) (optionnel) OPENAGENDA_AGENDA_UID=uid-d-un-agenda\n');
        process.exit(1);
    }

    const db = getDb();
    // Limite par agenda (pagination automatique). 1000 par defaut (cap OpenAgenda).
    const limit = Number(getArg('limit', 1000));
    let agendaUid = getArg('agenda', process.env.OPENAGENDA_AGENDA_UID);
    const searchTerm = getArg('search', process.env.OPENAGENDA_SEARCH || null);

    // Choix des agendas a synchroniser
    const agendasToSync = [];
    if (agendaUid) {
        agendasToSync.push({ uid: agendaUid, titre: 'Agenda specifique' });
    } else {
        const term = searchTerm || 'culture';
        console.log(`[sync] Recherche d agendas "${term}"...`);
        const found = await searchAgendas({ search: term, limit: 3 });
        if (!found.length) {
            console.error('[sync] Aucun agenda trouve. Precisez --agenda <uid> ou --search <motcle>.');
            process.exit(1);
        }
        agendasToSync.push(...found);
        console.log(`[sync] ${found.length} agenda(s) trouve(s) :`);
        found.forEach(a => console.log(`  - ${a.titre} (${a.uid})`));
    }

    // Preparation des prepared statements
    const findPlaceByName = db.prepare('SELECT id FROM places WHERE nom = ? LIMIT 1');
    const insertPlace = db.prepare(`
        INSERT INTO places (nom, description, category, adresse, code_postal, ville, latitude, longitude, image_url, is_independent, verified)
        VALUES (?, ?, 'espace_independant', ?, ?, ?, ?, ?, NULL, 0, 1)
    `);
    const findEventByExt = db.prepare('SELECT id FROM events WHERE external_id = ? LIMIT 1');
    const insertEvent = db.prepare(`
        INSERT INTO events (place_id, titre, slug, description, category, tags,
                            date_debut, date_fin, gratuit, prix_min, prix_max,
                            outdoor, langue, image_url, source, external_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `);
    const updateEvent = db.prepare(`
        UPDATE events SET titre=?, description=?, category=?, tags=?,
            date_debut=?, date_fin=?, gratuit=?, outdoor=?, image_url=?, updated_at=CURRENT_TIMESTAMP
        WHERE external_id=?
    `);

    let total = 0, created = 0, updated = 0, skipped = 0, placesCreated = 0;

    for (const ag of agendasToSync) {
        console.log(`\n[sync] Recuperation des evenements de "${ag.titre}" (${ag.uid})...`);
        let events;
        try {
            events = await fetchAgendaEvents(ag.uid, { limit });
        } catch (e) {
            console.error(`[sync] Echec : ${e.message}`);
            continue;
        }
        console.log(`[sync] ${events.length} evenements recus`);

        for (const ev of events) {
            total++;
            if (!ev.date_debut) { skipped++; continue; }

            // Trouver ou creer le lieu
            let placeId = null;
            if (ev.place && ev.place.nom) {
                const existing = findPlaceByName.get(ev.place.nom);
                if (existing) {
                    placeId = existing.id;
                } else if (ev.place.latitude && ev.place.longitude) {
                    const info = insertPlace.run(
                        ev.place.nom,
                        `Lieu importe depuis OpenAgenda (${ag.titre || ag.uid}).`,
                        ev.place.adresse || '',
                        ev.place.code_postal || '',
                        ev.place.ville || 'France',
                        ev.place.latitude,
                        ev.place.longitude
                    );
                    placeId = info.lastInsertRowid;
                    placesCreated++;
                }
            }

            const slug = `oa-${ev.external_id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 120);

            const existing = findEventByExt.get(ev.external_id);
            if (existing) {
                updateEvent.run(ev.titre, ev.description, ev.category, ev.tags,
                    ev.date_debut, ev.date_fin, ev.gratuit, ev.outdoor, ev.image_url, ev.external_id);
                updated++;
            } else {
                insertEvent.run(placeId, ev.titre, slug, ev.description, ev.category, ev.tags,
                    ev.date_debut, ev.date_fin, ev.gratuit, ev.prix_min, ev.prix_max,
                    ev.outdoor, ev.langue, ev.image_url, ev.source, ev.external_id);
                created++;
            }
        }
    }

    console.log('\n[sync] ==================================');
    console.log(`[sync]   Evenements recus : ${total}`);
    console.log(`[sync]   Nouveaux         : ${created}`);
    console.log(`[sync]   Mis a jour       : ${updated}`);
    console.log(`[sync]   Ignores (no date): ${skipped}`);
    console.log(`[sync]   Lieux crees      : ${placesCreated}`);
    console.log('[sync] ==================================\n');
}

main().catch(e => { console.error('[sync] erreur fatale:', e); process.exit(1); });
