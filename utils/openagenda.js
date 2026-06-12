// =====================================================
// Wrapper OpenAgenda (API publique d evenements culturels)
// Doc: https://developers.openagenda.com/10-lecture/
//
// Configuration requise (dans .env) :
//   OPENAGENDA_KEY=<votre_cle_api_secrete>
//   OPENAGENDA_AGENDA_UID=<uid_d_un_agenda>   (optionnel - sinon recherche large)
//   OPENAGENDA_SEARCH=culture,france         (optionnel - mot-cle pour filtrer les agendas)
//
// Comment obtenir une cle :
//   1. Creer un compte gratuit sur https://openagenda.com
//   2. Aller sur https://openagenda.com/profile/api (Section "API")
//   3. Copier la cle secrete (format : xxxxxxxxxxxx)
//   4. Pour choisir un agenda : parcourir https://openagenda.com/
//      et copier l UID visible dans l URL
// =====================================================

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;   // 30 minutes

const BASE = 'https://api.openagenda.com/v2';

// ---------- Helpers ----------
function pickLang(obj, preferred = 'fr') {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[preferred] || obj.fr || obj.en || Object.values(obj)[0] || '';
}

function mapOaCategory(keywords = [], title = '', description = '') {
    const txt = (keywords.join(' ') + ' ' + title + ' ' + description).toLowerCase();
    const rules = [
        ['theatre', /th(e|é)(â|a)tre|piece|comedie|tragedie|drame|monologue|spectacle vivant/],
        ['musique', /musique|concert|musical|jazz|rock|electro|classique|chorale|opera|orchestre/],
        ['exposition', /exposition|expo|vernissage|galerie|peinture|sculpture/],
        ['danse', /danse|ballet|hip[- ]?hop|choregraphie/],
        ['cinema', /cinema|cine|projection|film|court[- ]?metrage|documentaire/],
        ['patrimoine', /patrimoine|visite guidee|monument|historique|balade|decouverte/],
        ['litterature', /lecture|litterature|poesie|ecriture|conference|rencontre auteur/],
        ['festival', /festival|fete|celebration/],
        ['atelier', /atelier|initiation|cours|stage|workshop/],
        ['jeune_public', /enfant|jeune public|famille|conte|pour les petits|bebe/]
    ];
    for (const [cat, re] of rules) if (re.test(txt)) return cat;
    return 'festival';  // categorie par defaut si non identifiee
}

// ---------- Fetch a low level ----------
async function oaFetch(path, params = {}) {
    const key = process.env.OPENAGENDA_KEY;
    if (!key) throw new Error('OPENAGENDA_KEY manquante dans .env');
    const qs = new URLSearchParams({ key, ...params }).toString();
    const url = `${BASE}${path}?${qs}`;
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`OpenAgenda HTTP ${res.status}`);
    const json = await res.json();
    cache.set(url, { ts: Date.now(), data: json });
    return json;
}

// ---------- Recherche d agendas ----------
async function searchAgendas({ search = 'france', limit = 20 } = {}) {
    const json = await oaFetch('/agendas', { search, size: String(limit) });
    return (json.agendas || []).map(a => ({
        uid: a.uid,
        slug: a.slug,
        titre: pickLang(a.title),
        description: pickLang(a.description),
        url: a.url,
        image: a.image?.base + a.image?.filename || null
    }));
}

// ---------- Fetch des evenements d un agenda (avec pagination) ----------
// OpenAgenda cap la taille a 100 par requete. On boucle avec un curseur
// "from" pour atteindre `limit` total (jusqu a 1000 evenements / agenda).
async function fetchAgendaEvents(agendaUid, { limit = 100, after = null } = {}) {
    const PAGE_SIZE = 100;  // limite max imposee par l API
    const total = [];
    let from = 0;
    const startDate = after || new Date().toISOString();
    while (total.length < limit) {
        const need = Math.min(PAGE_SIZE, limit - total.length);
        const params = {
            size: String(need),
            detailed: '1',
            'timings.start.gte': startDate,
            from: String(from)
        };
        let json;
        try {
            json = await oaFetch(`/agendas/${agendaUid}/events`, params);
        } catch (e) {
            console.warn(`[openagenda] fetch p${from} echoue: ${e.message}`);
            break;
        }
        const events = json.events || [];
        if (!events.length) break;
        total.push(...events);
        if (events.length < need) break;  // plus rien a paginer
        from += events.length;
    }
    return total.map(ev => normalizeEvent(ev, agendaUid));
}

// ---------- Normalisation OpenAgenda -> CultureRadar ----------
function normalizeEvent(ev, agendaUid) {
    const titre = pickLang(ev.title) || 'Evenement';
    const description = pickLang(ev.description) || pickLang(ev.longDescription) || '';
    const first = ev.firstTiming || (ev.timings && ev.timings[0]) || null;
    const last = ev.lastTiming || (ev.timings && ev.timings[ev.timings.length - 1]) || null;
    const dateDebut = first?.begin || ev.firstDate || null;
    const dateFin = last?.end || ev.lastDate || dateDebut;
    const location = ev.location || {};
    const keywords = (ev.keywords?.fr || ev.keywords || []);
    const cat = mapOaCategory(Array.isArray(keywords) ? keywords : [], titre, description);

    // Image (OpenAgenda renvoie {base, filename, variants})
    let image = null;
    if (ev.image?.base && ev.image?.filename) image = ev.image.base + ev.image.filename;
    else if (typeof ev.image === 'string') image = ev.image;

    const gratuit = (ev.conditions?.fr || '').toLowerCase().includes('gratuit') ? 1 : 0;
    const outdoor = /exterieur|plein[- ]?air|jardin|parc|place publique/i.test(description + ' ' + titre) ? 1 : 0;

    return {
        external_id: `oa_${agendaUid}_${ev.uid}`,
        source: 'openagenda',
        titre,
        description: description.slice(0, 1500),
        category: cat,
        date_debut: dateDebut,
        date_fin: dateFin,
        gratuit,
        prix_min: gratuit ? 0 : 0,  // OpenAgenda ne fournit pas toujours le prix
        prix_max: 0,
        outdoor,
        image_url: image,
        langue: 'fr',
        tags: Array.isArray(keywords) ? keywords.join(',') : '',
        url: ev.canonicalUrl || null,
        // Lieu (a creer si inexistant)
        place: location.name ? {
            nom: location.name,
            adresse: location.address || '',
            ville: location.city || '',
            code_postal: location.postalCode || '',
            latitude: location.latitude || null,
            longitude: location.longitude || null
        } : null
    };
}

// ---------- API publique (utilisee par les routes) ----------
async function fetchOpenAgendaEvents({ limit = 20 } = {}) {
    const key = process.env.OPENAGENDA_KEY;
    if (!key) return [];
    const uid = process.env.OPENAGENDA_AGENDA_UID;
    try {
        if (uid) {
            return (await fetchAgendaEvents(uid, { limit })).slice(0, limit);
        }
        // Sinon on cherche des agendas et on prend le premier
        const search = process.env.OPENAGENDA_SEARCH || 'culture';
        const agendas = await searchAgendas({ search, limit: 3 });
        if (!agendas.length) return [];
        return (await fetchAgendaEvents(agendas[0].uid, { limit })).slice(0, limit);
    } catch (e) {
        console.warn('[openagenda] erreur:', e.message);
        return [];
    }
}

module.exports = {
    fetchOpenAgendaEvents,
    searchAgendas,
    fetchAgendaEvents,
    normalizeEvent
};
