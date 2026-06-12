// =====================================================
// Diagnostic OpenAgenda
// Teste la cle API, la recherche d agendas et la recuperation
// d evenements. Affiche une sortie lisible pour comprendre
// pourquoi la synchronisation renvoie 0 evenement.
//
// Usage :
//   npm run diag-openagenda
//   npm run diag-openagenda -- --search "musee"
//   npm run diag-openagenda -- --agenda <uid>
// =====================================================
require('dotenv').config();

const args = process.argv.slice(2);
function getArg(name, def = null) {
    const i = args.indexOf('--' + name);
    if (i >= 0 && args[i + 1]) return args[i + 1];
    return def;
}

const KEY = process.env.OPENAGENDA_KEY;
const BASE = 'https://api.openagenda.com/v2';

function banner(txt) {
    console.log('\n================================================');
    console.log(' ' + txt);
    console.log('================================================');
}

function pickLang(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj.fr || obj.en || Object.values(obj)[0] || '';
}

async function call(path, params) {
    const qs = new URLSearchParams({ key: KEY, ...params }).toString();
    const url = `${BASE}${path}?${qs}`;
    console.log(`  -> GET ${path}?${Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')}`);
    const t0 = Date.now();
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const ms = Date.now() - t0;
    console.log(`  <- HTTP ${res.status} (${ms} ms)`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch {
        console.log('  !! reponse non-JSON :');
        console.log('    ' + text.slice(0, 300));
        throw new Error('Reponse non-JSON');
    }
    if (!res.ok) {
        console.log('  !! erreur API :', JSON.stringify(json).slice(0, 300));
        throw new Error(`HTTP ${res.status}`);
    }
    return json;
}

async function main() {
    banner('Diagnostic OpenAgenda');

    // --- Etape 1 : cle API presente ? ---
    console.log('\n[1] Verification de la cle API');
    if (!KEY) {
        console.log('  ECHEC : OPENAGENDA_KEY absente de .env');
        console.log('  -> verifiez que le fichier .env existe et contient :');
        console.log('     OPENAGENDA_KEY=<votre_cle>');
        process.exit(1);
    }
    console.log(`  OK : cle detectee (${KEY.slice(0, 4)}...${KEY.slice(-4)}, longueur ${KEY.length})`);

    // --- Etape 2 : la cle est-elle valide ? ---
    console.log('\n[2] Test de la cle (recherche "paris" size=1)');
    try {
        const probe = await call('/agendas', { search: 'paris', size: '1' });
        const nb = (probe.agendas || []).length;
        console.log(`  OK : ${nb} agenda(s) retourne(s) sur la requete de test`);
        console.log(`  Total disponible cote API : ${probe.total ?? '?'}`);
    } catch (e) {
        console.log('  ECHEC : la cle semble invalide ou l API est injoignable');
        console.log('  Message :', e.message);
        console.log('\n  Pistes :');
        console.log('   - verifier la cle sur https://openagenda.com/profile/api');
        console.log('   - coller la cle exacte dans .env (sans espace, sans guillemets)');
        console.log('   - redemarrer le script');
        process.exit(1);
    }

    // --- Etape 3 : agenda specifique OU recherche ? ---
    const uidArg = getArg('agenda', process.env.OPENAGENDA_AGENDA_UID);
    const searchArg = getArg('search', process.env.OPENAGENDA_SEARCH || 'paris');

    let agendasToInspect = [];

    if (uidArg) {
        console.log(`\n[3] Agenda force via UID : ${uidArg}`);
        try {
            const ag = await call(`/agendas/${uidArg}`, {});
            agendasToInspect.push({
                uid: uidArg,
                titre: pickLang(ag.agenda?.title) || '(inconnu)',
                url: ag.agenda?.url
            });
            console.log(`  OK : agenda "${agendasToInspect[0].titre}"`);
        } catch (e) {
            console.log(`  ECHEC : UID ${uidArg} introuvable ou inaccessible`);
            console.log('  Message :', e.message);
            process.exit(1);
        }
    } else {
        console.log(`\n[3] Recherche d agendas avec mot-cle : "${searchArg}"`);
        const json = await call('/agendas', { search: searchArg, size: '5' });
        const list = json.agendas || [];
        if (!list.length) {
            console.log(`  AUCUN agenda ne correspond au mot-cle "${searchArg}"`);
            console.log('\n  Pistes :');
            console.log('   - essayez un mot-cle plus generique : culture, musique, theatre, ile-de-france');
            console.log('   - ou utilisez un UID public connu :');
            console.log('       npm run diag-openagenda -- --agenda 82519191');
            console.log('     (agenda "Ile-de-France")');
            process.exit(0);
        }
        console.log(`  OK : ${list.length} agenda(s) trouve(s) :`);
        list.forEach((a, i) => {
            console.log(`    ${i + 1}. "${pickLang(a.title)}" (uid=${a.uid})`);
        });
        agendasToInspect = list.map(a => ({ uid: a.uid, titre: pickLang(a.title), url: a.url }));
    }

    // --- Etape 4 : pour chaque agenda, compter les evenements a venir ---
    console.log('\n[4] Recuperation des evenements futurs (top 3 agendas)');
    const now = new Date().toISOString();
    let totalFound = 0;
    let agendaWithEvents = null;

    for (const ag of agendasToInspect.slice(0, 3)) {
        console.log(`\n  >> "${ag.titre}" (${ag.uid})`);
        try {
            // D abord, les evenements futurs
            const future = await call(`/agendas/${ag.uid}/events`, {
                size: '5',
                detailed: '1',
                'timings.start.gte': now
            });
            const futureEvents = future.events || [];
            console.log(`     evenements futurs (depuis maintenant) : ${futureEvents.length}`);
            if (futureEvents.length) {
                if (!agendaWithEvents) agendaWithEvents = ag;
                totalFound += futureEvents.length;
                futureEvents.slice(0, 3).forEach((ev, i) => {
                    const t = pickLang(ev.title) || '(sans titre)';
                    const d = ev.firstTiming?.begin || ev.firstDate || '?';
                    console.log(`       ${i + 1}. ${t.slice(0, 70)} [${d?.slice(0, 10)}]`);
                });
            } else {
                // S il n y a rien en futur, on check si l agenda a des events du tout
                const any = await call(`/agendas/${ag.uid}/events`, { size: '1', detailed: '0' });
                const total = any.total ?? (any.events || []).length;
                console.log(`     total evenements (tous temps) : ${total}`);
                if (total > 0) {
                    console.log('     -> cet agenda existe mais n a pas d evenements futurs');
                } else {
                    console.log('     -> cet agenda est vide');
                }
            }
        } catch (e) {
            console.log('     ECHEC :', e.message);
        }
    }

    banner('Resume');
    if (totalFound > 0) {
        console.log(`  ${totalFound} evenement(s) futur(s) detecte(s) sur les agendas testes`);
        console.log('  => La cle API fonctionne et des evenements sont disponibles.\n');
        console.log('  Pour synchroniser ces evenements en base, lancez :');
        if (agendaWithEvents) {
            console.log(`     npm run sync-openagenda -- --agenda ${agendaWithEvents.uid} --limit 100`);
        } else {
            console.log('     npm run sync-openagenda');
        }
    } else {
        console.log('  La cle fonctionne mais aucun evenement futur n a ete trouve');
        console.log('  sur les agendas testes.\n');
        console.log('  Essayez un autre mot-cle ou un UID precis :');
        console.log('    npm run diag-openagenda -- --search musee');
        console.log('    npm run diag-openagenda -- --search concert');
        console.log('    npm run diag-openagenda -- --search ile-de-france');
        console.log('    npm run diag-openagenda -- --agenda 82519191   # Ile-de-France');
    }
    console.log('');
}

main().catch(e => {
    console.error('\n[diag] erreur fatale :', e.message);
    process.exit(1);
});
