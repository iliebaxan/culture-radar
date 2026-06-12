// Moteur de recommandation rule-based pour CultureRadar
// Score = preference_match (40%) + proximite (25%) + meteo (15%) + disponibilite (10%) + independance/freshness (10%)

function haversineKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(v => v == null)) return null;
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function scorePreference(event, userPrefs) {
    if (!userPrefs || userPrefs.length === 0) return 0.5;  // par defaut neutre
    const pref = userPrefs.find(p => p.category === event.category);
    if (!pref) return 0.2;
    return Math.min(1, pref.weight);
}

function scoreProximite(event, user) {
    if (!user || user.latitude == null || event.latitude == null) return 0.5;
    const km = haversineKm(user.latitude, user.longitude, event.latitude, event.longitude);
    if (km == null) return 0.5;
    const maxKm = user.max_distance_km || 15;
    if (km > maxKm) return 0;
    return Math.max(0, 1 - km / maxKm);
}

function scoreMeteo(event, meteo) {
    // Si l evenement est en exterieur, la meteo est importante
    if (!event.outdoor) return 0.7;
    if (!meteo) return 0.5;
    // code Open-Meteo weather_code : 0 ciel clair, 1-3 peu/partiellement/tres nuageux, 45-48 brouillard, 51-67 pluie, 71-77 neige, 80-82 averses, 95-99 orage
    const code = meteo.weathercode;
    if (code === 0 || code === 1) return 1;
    if (code === 2) return 0.85;
    if (code === 3) return 0.6;
    if ([45, 48].includes(code)) return 0.4;
    if (code >= 51 && code <= 67) return 0.2;
    if (code >= 71 && code <= 77) return 0.1;
    if (code >= 80 && code <= 82) return 0.2;
    if (code >= 95) return 0.05;
    return 0.5;
}

function scoreDisponibilite(event, user) {
    // Accessibilite : si l utilisateur a des besoins specifiques, verifier
    // Ici : score simple base sur les places disponibles et contrainte mobilite
    if (event.places_disponibles != null && event.places_disponibles < 3) return 0.2;
    return 1;
}

function scoreBonus(event) {
    // Bonus pour : lieu independant (badge CultureRadar), evenement pousse, gratuit
    let bonus = 0.5;
    if (event.is_independent) bonus += 0.25;
    if (event.is_promoted) bonus += 0.1;
    if (event.gratuit) bonus += 0.1;
    // Bonus si c est dans les 7 prochains jours
    const jours = (new Date(event.date_debut) - Date.now()) / (1000*60*60*24);
    if (jours >= 0 && jours <= 7) bonus += 0.05;
    return Math.min(1, bonus);
}

/**
 * Calcule un score global 0..1 + details
 */
function scoreEvent(event, user, userPrefs, meteo) {
    const sPref = scorePreference(event, userPrefs);
    const sProx = scoreProximite(event, user);
    const sMet = scoreMeteo(event, meteo);
    const sDispo = scoreDisponibilite(event, user);
    const sBonus = scoreBonus(event);
    const total = sPref * 0.40 + sProx * 0.25 + sMet * 0.15 + sDispo * 0.10 + sBonus * 0.10;
    return {
        score: Math.round(total * 100),
        details: {
            preference: Math.round(sPref * 100),
            proximite: Math.round(sProx * 100),
            meteo: Math.round(sMet * 100),
            disponibilite: Math.round(sDispo * 100),
            bonus: Math.round(sBonus * 100)
        }
    };
}

/**
 * Recommande les N meilleurs evenements pour un utilisateur
 */
function recommend(events, user, userPrefs, meteo, limit = 20) {
    const scored = events
        .filter(e => e.status === 'published' && new Date(e.date_debut) >= new Date())
        .map(e => ({ event: e, ...scoreEvent(e, user, userPrefs, meteo) }))
        .filter(e => e.score > 10)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    return scored;
}

module.exports = { haversineKm, scoreEvent, recommend };
