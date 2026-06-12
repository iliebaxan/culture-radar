// =====================================================
// Ile-de-France - Sorties / agendas
// API publique gratuite via opendatasoft :
//   - "evenements-publics-cibul" (national)
//   - "que-faire-a-paris-" (Paris)
// =====================================================

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

const BASE = 'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-cibul/records';

function stripHtml(s) {
    if (!s) return '';
    return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapCategory(keywords = '', title = '', description = '') {
    const txt = (keywords + ' ' + title + ' ' + description).toLowerCase();
    const rules = [
        ['theatre',     /th(e|é|è)(â|a)tre|piece|comedie|tragedie|drame|monologue|spectacle|stand[- ]?up/],
        ['musique',     /musique|concert|musical|jazz|rock|electro|classique|chorale|opera|orchestre|chant/],
        ['exposition',  /exposition|expo|vernissage|galerie|peinture|sculpture/],
        ['danse',       /danse|ballet|hip[- ]?hop|choregraphie/],
        ['cinema',      /cinema|cine|projection|film|court[- ]?metrage|documentaire/],
        ['patrimoine',  /patrimoine|visite|monument|historique|balade|decouverte|architecture/],
        ['litterature', /lecture|litterature|poesie|ecriture|conference|rencontre auteur|livre/],
        ['festival',    /festival|fete|celebration/],
        ['atelier',     /atelier|initiation|cours|stage|workshop/],
        ['jeune_public',/enfant|jeune public|famille|conte|petits|bebe|junior/]
    ];
    for (const [cat, re] of rules) if (re.test(txt)) return cat;
    return 'festival';
}

async function fetchCibulEvents({ limit = 100, offset = 0, q = null } = {}) {
    // Build where clause: future events only; optionally narrow by search term
    let whereClause = 'date_end >= now()';
    if (q) whereClause += ` AND search(${JSON.stringify(q)})`;
    const params = new URLSearchParams({
        limit: String(Math.min(limit, 100)),
        offset: String(offset),
        order_by: 'date_start',
        where: whereClause
    });
    const url = `${BASE}?${params.toString()}`;
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`Cibul HTTP ${res.status}`);
        const json = await res.json();
        const events = (json.results || []).map(normalize).filter(Boolean);
        cache.set(url, { ts: Date.now(), data: events });
        return events;
    } catch (e) {
        console.warn('[cibul-opendata] erreur:', e.message);
        return [];
    }
}

// Pagination helper: loops through offsets until target or empty page
async function fetchCibulEventsPaged({ maxResults = 1000, q = null } = {}) {
    const all = [];
    const pageSize = 100;
    for (let off = 0; off < maxResults; off += pageSize) {
        const batch = await fetchCibulEvents({ limit: pageSize, offset: off, q });
        if (!batch.length) break;
        all.push(...batch);
        if (batch.length < pageSize) break;
    }
    return all;
}

function normalize(r) {
    if (!r || !r.title || !r.date_start) return null;
    const desc = stripHtml(r.description || r.pre_description || '');
    const long = stripHtml(r.description || '');
    const cat = mapCategory(r.keywords || '', r.title, desc);
    const image = r.image || r.image_url || null;

    const priceText = (r.pricing_info || '').toString().toLowerCase();
    const gratuit = /gratuit|libre|free/.test(priceText) ? 1 : 0;

    let lat = null, lng = null;
    if (r.latlon && r.latlon.lat) { lat = r.latlon.lat; lng = r.latlon.lon; }
    else if (r.geo_point_2d) { lat = r.geo_point_2d.lat; lng = r.geo_point_2d.lon; }

    return {
        external_id: `cibul_${r.uid || r.recordid || r.title.slice(0, 40)}`,
        source: 'cibul',
        titre: r.title,
        description: desc.slice(0, 500),
        description_longue: long.slice(0, 4000),
        category: cat,
        date_debut: r.date_start,
        date_fin: r.date_end || r.date_start,
        gratuit,
        prix_min: gratuit ? 0 : 0,
        prix_max: 0,
        outdoor: 0,
        image_url: image,
        url: r.canonicalurl || r.link || null,
        url_billetterie: r.canonicalurl || r.link || null,
        site_officiel: r.canonicalurl || r.link || null,
        langue: 'fr',
        tags: (r.keywords || '').toString().slice(0, 200),
        place: r.placename ? {
            nom: r.placename,
            adresse: r.address || '',
            ville: r.city || 'Paris',
            code_postal: r.postalcode || '',
            latitude: lat,
            longitude: lng
        } : null
    };
}

module.exports = { fetchCibulEvents, fetchCibulEventsPaged };
