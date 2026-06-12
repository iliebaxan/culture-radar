// =====================================================
// Synchronisation MULTI-SOURCES des evenements -> base locale
// Utilise toutes les APIs publiques gratuites disponibles :
//   - OpenAgenda (cle gratuite OPENAGENDA_KEY)
//   - Paris Open Data (Que faire a Paris ?) - sans cle, gratuit
//   - Cibul / public.opendatasoft - sans cle, gratuit
//
// Usage :
//   node database/sync-all.js
//   node database/sync-all.js --limit 200
//
// Conserve les vraies images, descriptions, URLs de billetterie
// fournies par chaque source. Aucune image generique n'est inseree.
// =====================================================
require('dotenv').config();
const { getDb } = require('./db');
const { fetchParisEvents } = require('../utils/paris-opendata');
const { fetchCibulEvents, fetchCibulEventsPaged } = require('../utils/idf-opendata');

let openAgendaModule = null;
try { openAgendaModule = require('../utils/openagenda'); } catch {}

const args = process.argv.slice(2);
function getArg(name, def = null) {
    const i = args.indexOf('--' + name);
    if (i >= 0 && args[i + 1]) return args[i + 1];
    return def;
}

async function main() {
    const db = getDb();
    // Cap par source. Avec OpenAgenda multi-themes + Cibul + Paris OpenData
    // on peut depasser 10 000 evenements distincts sur 12 mois.
    // Surchargeable avec --limit (par source).
    const limit = Number(getArg('limit', 10000));

    // Verification colonnes de schema (au cas ou DB ancienne)
    try { db.prepare('SELECT url_billetterie FROM events LIMIT 1').get(); }
    catch { db.exec('ALTER TABLE events ADD COLUMN url_billetterie TEXT'); }
    try { db.prepare('SELECT site_officiel FROM events LIMIT 1').get(); }
    catch { db.exec('ALTER TABLE events ADD COLUMN site_officiel TEXT'); }

    const findPlaceByName = db.prepare('SELECT id FROM places WHERE nom = ? LIMIT 1');
    const insertPlace = db.prepare(`
        INSERT INTO places (nom, description, category, adresse, code_postal, ville, latitude, longitude, image_url, is_independent, verified)
        VALUES (?, ?, 'espace_independant', ?, ?, ?, ?, ?, NULL, 0, 1)
    `);
    const findEventByExt = db.prepare('SELECT id FROM events WHERE external_id = ? LIMIT 1');

    const insertEvent = db.prepare(`
        INSERT INTO events (place_id, titre, slug, description, description_longue, category, tags,
                            date_debut, date_fin, gratuit, prix_min, prix_max,
                            outdoor, langue, image_url, url_billetterie, site_officiel,
                            accessibility_pmr, accessibility_audio, accessibility_visuel,
                            organisateur_nom, source, external_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
    `);
    const updateEvent = db.prepare(`
        UPDATE events SET titre=?, description=?, description_longue=COALESCE(?, description_longue),
            category=?, tags=?, date_debut=?, date_fin=?,
            gratuit=?, prix_min=?, outdoor=?,
            image_url=COALESCE(?, image_url),
            url_billetterie=COALESCE(?, url_billetterie),
            site_officiel=COALESCE(?, site_officiel),
            updated_at=CURRENT_TIMESTAMP
        WHERE external_id=?
    `);

    let totals = { received: 0, created: 0, updated: 0, skipped: 0, places: 0 };

    async function ingest(events, sourceLabel) {
        console.log(`\n[sync-all] ${sourceLabel} : ${events.length} evenement(s) recus`);
        for (const ev of events) {
            totals.received++;
            if (!ev.date_debut || !ev.titre) { totals.skipped++; continue; }
            // Lieu
            let placeId = null;
            if (ev.place && ev.place.nom) {
                const existing = findPlaceByName.get(ev.place.nom);
                if (existing) placeId = existing.id;
                else if (ev.place.latitude && ev.place.longitude) {
                    const info = insertPlace.run(
                        ev.place.nom,
                        `Lieu importe depuis ${sourceLabel}.`,
                        ev.place.adresse || '',
                        ev.place.code_postal || '',
                        ev.place.ville || 'Paris',
                        ev.place.latitude,
                        ev.place.longitude
                    );
                    placeId = info.lastInsertRowid;
                    totals.places++;
                }
            }

            const slug = `${ev.source}-${ev.external_id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 120);
            const existing = findEventByExt.get(ev.external_id);
            if (existing) {
                updateEvent.run(
                    ev.titre, ev.description, ev.description_longue || null,
                    ev.category, ev.tags || '',
                    ev.date_debut, ev.date_fin || ev.date_debut,
                    ev.gratuit ? 1 : 0, ev.prix_min || 0, ev.outdoor ? 1 : 0,
                    ev.image_url || null,
                    ev.url_billetterie || ev.url || null,
                    ev.site_officiel || ev.url || null,
                    ev.external_id
                );
                totals.updated++;
            } else {
                insertEvent.run(
                    placeId, ev.titre, slug,
                    ev.description || '', ev.description_longue || null,
                    ev.category, ev.tags || '',
                    ev.date_debut, ev.date_fin || ev.date_debut,
                    ev.gratuit ? 1 : 0, ev.prix_min || 0, ev.prix_max || null,
                    ev.outdoor ? 1 : 0, ev.langue || 'fr',
                    ev.image_url || null,
                    ev.url_billetterie || ev.url || null,
                    ev.site_officiel || ev.url || null,
                    ev.accessibility_pmr ? 1 : 0,
                    ev.accessibility_audio ? 1 : 0,
                    ev.accessibility_visuel ? 1 : 0,
                    ev.organisateur_nom || null,
                    ev.source, ev.external_id
                );
                totals.created++;
            }
        }
    }

    // === 1) Paris Open Data (Que faire a Paris ?) - PRIORITAIRE car visuels riches ===
    console.log('[sync-all] === Paris Open Data ===');
    let parisAll = [];
    for (let off = 0; off < limit; off += 100) {
        const batch = await fetchParisEvents({ limit: 100, offset: off });
        if (!batch.length) break;
        parisAll = parisAll.concat(batch);
        if (batch.length < 100) break;
    }
    await ingest(parisAll, 'Paris Open Data');

    // === 2) Cibul (national : toute la France via opendatasoft) ===
    // - Pagination par offset (100 par batch)
    // - Pas de filtre "paris" : on prend toute la France
    console.log('[sync-all] === Cibul (Opendatasoft - national) ===');
    const cibulAll = await fetchCibulEventsPaged({ maxResults: limit, q: null });
    await ingest(cibulAll, 'Cibul national');

    // === 3) OpenAgenda (si cle disponible) - elargi a plusieurs themes/agendas ===
    if (openAgendaModule && process.env.OPENAGENDA_KEY) {
        console.log('[sync-all] === OpenAgenda (multi-themes) ===');
        try {
            const { searchAgendas, fetchAgendaEvents } = openAgendaModule;
            let agendas = [];
            if (process.env.OPENAGENDA_AGENDA_UID) {
                agendas = [{ uid: process.env.OPENAGENDA_AGENDA_UID, titre: 'Agenda specifique' }];
            } else {
                // Decouverte large : 15 themes, 20 agendas par theme = jusqu a 300 agendas uniques
                const themes = (process.env.OPENAGENDA_SEARCH ||
                    'culture,musique,theatre,exposition,danse,festival,patrimoine,cinema,litterature,jeunesse,art,spectacle,concert,musee,famille')
                    .split(',').map(s => s.trim()).filter(Boolean);
                const seen = new Set();
                for (const t of themes) {
                    try {
                        const found = await searchAgendas({ search: t, limit: 20 });
                        for (const a of found) {
                            if (!seen.has(a.uid)) { seen.add(a.uid); agendas.push(a); }
                        }
                    } catch (e) { console.warn(`[sync-all] OpenAgenda search "${t}" : ${e.message}`); }
                }
            }
            console.log(`[sync-all] OpenAgenda : ${agendas.length} agenda(s) decouvert(s)`);
            for (const ag of agendas) {
                try {
                    // Jusqu a 1000 evts par agenda (pagination automatique dans fetchAgendaEvents)
                    const perAgendaLimit = Math.min(1000, limit);
                    const evs = await fetchAgendaEvents(ag.uid, { limit: perAgendaLimit });
                    await ingest(evs, `OpenAgenda/${ag.titre || ag.uid}`);
                } catch (e) { console.warn(`[sync-all] OpenAgenda agenda ${ag.uid} : ${e.message}`); }
            }
        } catch (e) { console.warn('[sync-all] OpenAgenda erreur :', e.message); }
    } else {
        console.log('[sync-all] OpenAgenda ignore (OPENAGENDA_KEY manquante)');
    }

    console.log('\n[sync-all] ==================================');
    console.log(`[sync-all]   Total recus     : ${totals.received}`);
    console.log(`[sync-all]   Nouveaux        : ${totals.created}`);
    console.log(`[sync-all]   Mis a jour      : ${totals.updated}`);
    console.log(`[sync-all]   Ignores         : ${totals.skipped}`);
    console.log(`[sync-all]   Lieux crees     : ${totals.places}`);
    console.log('[sync-all] ==================================\n');
}

main().catch(e => { console.error('[sync-all] erreur fatale:', e); process.exit(1); });
