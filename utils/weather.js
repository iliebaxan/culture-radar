// Wrapper Open-Meteo (API gratuite, sans cle) avec cache memoire 30min
// https://open-meteo.com/

const cache = new Map();
const TTL_MS = 30 * 60 * 1000;

/**
 * Recupere la meteo actuelle pour lat/lng
 * Retourne { temperature, weathercode, windspeed, code_label }
 */
async function getWeather(lat, lng) {
    if (lat == null || lng == null) return null;
    const key = `${lat.toFixed(2)}:${lng.toFixed(2)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < TTL_MS) return cached.data;

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=Europe%2FParis`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) return null;
        const json = await res.json();
        const cw = json.current_weather;
        if (!cw) return null;
        const data = {
            temperature: cw.temperature,
            weathercode: cw.weathercode,
            windspeed: cw.windspeed,
            time: cw.time,
            code_label: codeLabel(cw.weathercode)
        };
        cache.set(key, { ts: Date.now(), data });
        return data;
    } catch (e) {
        console.warn('[weather] erreur:', e.message);
        return null;
    }
}

function codeLabel(code) {
    if (code === 0) return 'Ciel clair';
    if (code === 1) return 'Essentiellement clair';
    if (code === 2) return 'Partiellement nuageux';
    if (code === 3) return 'Couvert';
    if ([45, 48].includes(code)) return 'Brouillard';
    if (code >= 51 && code <= 57) return 'Bruine';
    if (code >= 61 && code <= 67) return 'Pluie';
    if (code >= 71 && code <= 77) return 'Neige';
    if (code >= 80 && code <= 82) return 'Averses';
    if (code >= 95 && code <= 99) return 'Orage';
    return 'Meteo indeterminee';
}

module.exports = { getWeather };
