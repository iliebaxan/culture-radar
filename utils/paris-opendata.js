// =====================================================
// Paris Open Data - Que faire a Paris ?
// API publique gratuite, sans cle :
//   https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records
// Doc : https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/
// Renvoie les vrais visuels des evenements + URL de billetterie / source.
// =====================================================

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

const BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records';

function mapParisCategory(tags = '', title = '', description = '') {
    const txt = ((tags || '') + ' ' + (title || '') + ' ' + (description || '')).toLowerCase();
    const rules = [
        ['theatre',     /th(e|é|è)(â|a)tre|piece|comedie|tragedie|drame|monologue|spectacle vivant|stand[- ]?up/],
        ['musique',     /musique|concert|musical|jazz|rock|electro|classique|chorale|opera|orchestre|chant/],
        ['exposition',  /exposition|expo|vernissage|galerie|peinture|sculpture|art contemporain/],
        ['danse',       /danse|ballet|hip[- ]?hop|choregraphie|tango|salsa/],
        ['cinema',      /cinema|cine|projection|film|court[- ]?metrage|documentaire/],
        ['patrimoine',  /patrimoine|visite guidee|monument|historique|balade|decouverte|architecture/],
        ['litterature', /lecture|litterature|poesie|ecriture|conference|rencontre auteur|livre/],
        ['festival',    /festival|fete|celebration/],
        ['atelier',     /atelier|initiation|cours|stage|workshop/],
        ['jeune_public',/enfant|jeune public|famille|conte|pour les petits|bebe|junior/]
    ];
    for (const [cat, re] of rules) if (re.test(txt)) return cat;
    return 'festival';
}

function stripHtml(s) {
    if (!s) return '';
    return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchParisEvents({ limit = 100, offset = 0, q = null } = {}) {
    const params = new URLSearchParams({
        limit: String(Math.min(limit, 100)),
        offset: String(offset),
        order_by: 'date_start',
        // Seulement les evts encore d'actualite
        where: 'date_end >= now()'
    });
    if (q) params.set('q', q);
    const url = `${BASE}?${params.toString()}`;
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`Paris OpenData HTTP ${res.status}`);
        const json = await res.json();
        const events = (json.results || []).map(normalizeParisEvent).filter(Boolean);
        cache.set(url, { ts: Date.now(), data: events });
        return events;
    } catch (e) {
        console.warn('[paris-opendata] erreur:', e.message);
        return [];
    }
}

function normalizeParisEvent(r) {
    if (!r || !r.title || !r.date_start) return null;
    const description = stripHtml(r.description || r.lead_text || '');
    const longDesc = stripHtml(r.description || '');
    const tags = (r.tags || '').toString();
    const cat = mapParisCategory(tags, r.title, description);

    // Image : Paris Open Data fournit cover_url pour les visuels de l'evt
    const image = r.cover_url || r.cover_image_url || null;

    // Prix : champ price_type / price_detail
    const priceText = (r.price_detail || r.price_type || '').toString().toLowerCase();
    const gratuit = /gratuit|libre|free/.test(priceText) ? 1 : 0;
    const prixMin = gratuit ? 0 : (parseInt((priceText.match(/\d+/) || [0])[0], 10) || 0);

    // Coordonnees
    let lat = null, lng = null;
    if (r.lat_lon && r.lat_lon.lat && r.lat_lon.lon) { lat = r.lat_lon.lat; lng = r.lat_lon.lon; }
    else if (r.geometry && r.geometry.coordinates) { lng = r.geometry.coordinates[0]; lat = r.geometry.coordinates[1]; }

    // En plein air detection
    const outdoor = /(plein[- ]?air|exterieur|jardin|parc|place publique|berges|quais)/i.test(description + ' ' + (r.access_type || '')) ? 1 : 0;

    return {
        external_id: `paris_${r.id || r.recordid}`,
        source: 'paris-opendata',
        titre: r.title,
        description: description.slice(0, 500),
        description_longue: longDesc.slice(0, 4000),
        category: cat,
        date_debut: r.date_start,
        date_fin: r.date_end || r.date_start,
        gratuit,
        prix_min: prixMin,
        prix_max: gratuit ? 0 : null,
        outdoor,
        image_url: image,
        url: r.url || null,
        url_billetterie: r.url || null,
        site_officiel: r.url || null,
        langue: 'fr',
        tags: (tags || '').replace(/[;|]/g, ',').slice(0, 200),
        accessibility_pmr: r.pmr === 'oui' || r.pmr === true ? 1 : 0,
        accessibility_audio: r.blind === 'oui' || r.blind === true ? 1 : 0,
        accessibility_visuel: r.deaf === 'oui' || r.deaf === true ? 1 : 0,
        organisateur_nom: r.contact_name || r.address_name || null,
        place: r.address_name ? {
            nom: r.address_name,
            adresse: [r.address_street, r.address_zipcode].filter(Boolean).join(' '),
            ville: r.address_city || 'Paris',
            code_postal: r.address_zipcode || '',
            latitude: lat,
            longitude: lng
        } : null
    };
}

module.exports = { fetchParisEvents };
