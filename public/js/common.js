// =====================================================
// CultureRadar - JS commun (API helpers, auth, UI)
// =====================================================

const CR = {
    apiBase: '/api',

    token() { return localStorage.getItem('cr_token'); },
    user() { try { return JSON.parse(localStorage.getItem('cr_user')); } catch { return null; } },
    setAuth(token, user) {
        localStorage.setItem('cr_token', token);
        localStorage.setItem('cr_user', JSON.stringify(user));
    },
    clearAuth() { localStorage.removeItem('cr_token'); localStorage.removeItem('cr_user'); },

    async api(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        const tok = CR.token();
        if (tok) headers.Authorization = `Bearer ${tok}`;
        const res = await fetch(CR.apiBase + path, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
        if (res.status === 204) return null;
        let data;
        try { data = await res.json(); } catch { data = null; }
        if (res.status === 401 && tok) {
            // Token expire ou invalide : nettoyage et redirection
            CR.clearAuth();
            if (!location.pathname.startsWith('/login.html')) {
                CR.toast('Session expiree, reconnexion necessaire', 'error');
                setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname + location.search), 800);
            }
        }
        if (!res.ok) { const err = new Error(data?.error || 'Erreur reseau'); err.status = res.status; err.data = data; throw err; }
        return data;
    },
    get(path) { return CR.api(path); },
    post(path, body) { return CR.api(path, { method: 'POST', body }); },
    put(path, body) { return CR.api(path, { method: 'PUT', body }); },
    del(path) { return CR.api(path, { method: 'DELETE' }); },

    toast(msg, type = 'info', ttl = 3000) {
        let wrap = document.querySelector('.toast-container');
        if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-container'; document.body.appendChild(wrap); }
        const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
        wrap.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, ttl);
    },

    escape(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    },

    fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    fmtDateOnly(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    },
    fmtTime(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },
    fmtDateShort(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    },
    fmtDuration(min) {
        if (!min) return '';
        const h = Math.floor(min / 60); const m = min % 60;
        return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m} min`;
    },
    fmtPrix(ev) {
        if (ev.gratuit) return 'Gratuit';
        if (!ev.prix_min && !ev.prix_max) return '—';
        if (ev.prix_max && ev.prix_max > ev.prix_min) return `${ev.prix_min}-${ev.prix_max} EUR`;
        return `${ev.prix_min} EUR`;
    },
    catLabel(c) {
        const m = {
            theatre:'Theatre', musique:'Musique', exposition:'Exposition', patrimoine:'Patrimoine',
            danse:'Danse', cinema:'Cinema', litterature:'Litterature', festival:'Festival',
            conference:'Conference', atelier:'Atelier', jeune_public:'Jeune public',
            musee:'Musee', salle_concert:'Salle de concert', galerie:'Galerie',
            bibliotheque:'Bibliotheque', mediatheque:'Mediatheque', lieu_patrimoine:'Patrimoine',
            espace_independant:'Espace independant'
        };
        return m[c] || c;
    },
    catIcon(c) {
        const m = { theatre:'🎭', musique:'🎵', exposition:'🖼️', patrimoine:'🏛️',
            danse:'💃', cinema:'🎬', litterature:'📚', festival:'🎉',
            conference:'🎤', atelier:'🎨', jeune_public:'🧸',
            musee:'🏛️', salle_concert:'🎵', galerie:'🎨',
            bibliotheque:'📚', mediatheque:'📚', lieu_patrimoine:'🏛️',
            espace_independant:'⭐' };
        return m[c] || '🎟️';
    },
    formatLabel(f) {
        const m = { concert:'Concert', spectacle:'Spectacle', exposition:'Exposition',
            projection:'Projection', visite:'Visite', atelier:'Atelier',
            conference:'Conference', performance:'Performance', festival:'Festival' };
        return m[f] || f;
    },
    publicLabel(p) {
        const m = { 'tout-public':'Tout public', adulte:'Adulte', famille:'Famille', senior:'Senior', ado:'Adolescent' };
        return m[p] || p;
    },

    fmtDistance(km) {
        if (km == null) return '';
        if (km < 1) return `${Math.round(km * 1000)} m`;
        return `${km.toFixed(1)} km`;
    },

    fallbackImage(category, size = 800) {
        const map = {
            theatre:      'photo-1503095396549-807759245b35',
            musique:      'photo-1501386761578-eac5c94b800a',
            exposition:   'photo-1577720580479-7d839d829c73',
            patrimoine:   'photo-1564660957744-9d72cf3b6f1e',
            danse:        'photo-1535525153412-5a092d3f5db2',
            cinema:       'photo-1489599849927-2ee91cede3ba',
            litterature:  'photo-1457369804613-52c61a468e7d',
            festival:     'photo-1492684223066-81342ee5ff30',
            atelier:      'photo-1452860606245-08befc0ff44b',
            jeune_public: 'photo-1503454537195-1dcabb73ffb9',
            conference:   'photo-1505373877841-8d25f7d46678',
            musee:        'photo-1565060169861-2d4b6e3df115',
            galerie:      'photo-1577720580479-7d839d829c73'
        };
        const id = map[category] || map.festival;
        return `https://images.unsplash.com/${id}?w=${size}&q=80&auto=format&fit=crop`;
    },
    eventImage(e, size = 800) {
        if (e && e.image_url) return e.image_url;
        if (e && Array.isArray(e.galerie) && e.galerie.length) return e.galerie[0];
        return CR.fallbackImage(e?.category, size);
    },

    renderEventCard(e, options = {}) {
        const score = options.score;
        const details = options.scoreDetails;
        const url = `/event.html?id=${e.id}`;
        const img = CR.eventImage(e, 800);
        const isReal = !!e.image_url;
        const ville = e.ville || e.place_ville || '';
        const indep = (e.is_independent || e.place_independent) ? '<span class="badge badge-cr">⭐ CultureRadar</span>' : '';
        const promoted = e.is_promoted ? '<span class="badge badge-accent">Mis en avant</span>' : '';
        const scoreHtml = score != null ? `<div class="score-pill" title="Match: ${details?.preference||0}% • Proximite: ${details?.proximite||0}% • Meteo: ${details?.meteo||0}%">${score}% match</div>` : '';
        const note = e.note_moyenne ? `<span class="badge">★ ${e.note_moyenne}</span>` : '';
        const distance = e.distance_km != null ? `<span class="badge">${CR.fmtDistance(e.distance_km)}</span>` : '';
        const heart = options.hideHeart ? '' : `<button class="cr-heart" data-event-id="${e.id}" title="Ajouter a mes envies" onclick="CR.toggleEnvie(event, ${e.id})">♡</button>`;
        return `
        <div class="card event-card" data-event-id="${e.id}">
            <a href="${url}" class="event-card-link">
                <div class="event-img-wrap">
                    <img class="card-img" src="${CR.escape(img)}" alt="${CR.escape(e.titre)}" loading="lazy" onerror="this.onerror=null;this.src='${CR.fallbackImage(e.category, 800)}'">
                    ${!isReal ? '<span class="img-badge">Visuel generique</span>' : ''}
                </div>
                <div class="card-body">
                    <div class="event-meta">
                        <span>${CR.catIcon(e.category)} ${CR.catLabel(e.category)}</span>
                        ${ville ? `<span>•</span><span>📍 ${CR.escape(ville)}</span>` : ''}
                        <span>•</span>
                        <span>📅 ${CR.fmtDateShort(e.date_debut)}</span>
                    </div>
                    <div class="event-title">${CR.escape(e.titre)}</div>
                    <div class="flex gap-sm" style="flex-wrap:wrap;">
                        <span class="badge badge-primary">${CR.fmtPrix(e)}</span>
                        ${e.outdoor ? '<span class="badge">En plein air</span>' : ''}
                        ${indep}
                        ${promoted}
                        ${note}
                        ${distance}
                    </div>
                    <div class="event-footer">
                        <span class="small muted">${CR.fmtDate(e.date_debut)}</span>
                        ${scoreHtml}
                    </div>
                </div>
            </a>
            ${heart}
        </div>`;
    },

    renderPlaceCard(p) {
        const img = p.image_url || CR.fallbackImage(p.category, 800);
        return `
        <a class="card" href="/place.html?id=${p.id}">
            <img class="card-img" src="${CR.escape(img)}" alt="${CR.escape(p.nom)}" loading="lazy" onerror="this.onerror=null;this.src='${CR.fallbackImage(p.category, 800)}'">
            <div class="card-body">
                <div class="event-meta">${CR.catIcon(p.category)} ${CR.catLabel(p.category)} • ${CR.escape(p.ville || '')}</div>
                <div class="event-title">${CR.escape(p.nom)}</div>
                <div class="flex gap-sm" style="flex-wrap:wrap;">
                    ${p.is_independent ? '<span class="badge badge-cr">⭐ Independant</span>' : ''}
                    ${p.nb_events ? `<span class="badge badge-primary">${p.nb_events} evt a venir</span>` : ''}
                    ${p.accessibility?.pmr ? '<span class="badge badge-success">♿ PMR</span>' : ''}
                </div>
            </div>
        </a>`;
    },

    renderHeader() {
        const h = document.querySelector('#cr-header-placeholder');
        if (!h) return;
        const u = CR.user();
        const isAdmin = u?.role === 'admin';
        const isPro = u?.role === 'pro';
        const isDark = CR.isDark();
        h.innerHTML = `
        <header class="cr-header">
            <div class="container">
                <a class="cr-logo" href="/" aria-label="CultureRadar - retour a l'accueil">
                    <img src="/img/logo.png" alt="" width="44" height="44">
                    <span><span class="cr-logo-text-1">Culture</span> <span class="cr-logo-text-2">Radar</span></span>
                </a>
                <button class="menu-toggle" aria-label="Menu" onclick="document.querySelector('.cr-nav').classList.toggle('open')">☰</button>
                <nav class="cr-nav">
                    <a href="/events.html">Evenements</a>
                    <a href="/places.html">Lieux</a>
                    <a href="/recommendations.html">Ma boussole</a>
                    <a href="/about.html">A propos</a>
                    <a href="/pricing.html">Tarifs</a>
                    ${u ? `
                        ${isAdmin ? '<a href="/admin.html">Admin</a>' : ''}
                        ${isPro ? '<a href="/pro.html">Espace Pro</a>' : ''}
                        <a href="/profile.html" class="cr-nav-user">${CR.escape(u.prenom || u.nom)}</a>
                        <a href="#" class="cr-nav-logout" onclick="return CR.logout(event)">Deconnexion</a>
                    ` : `
                        <a href="/login.html">Connexion</a>
                        <a href="/register.html" class="btn btn-primary btn-sm">S inscrire</a>
                    `}
                    <button class="theme-toggle" onclick="CR.toggleTheme()" aria-label="Changer le theme" title="Mode ${isDark ? 'clair' : 'sombre'}">${isDark ? '☀️' : '🌙'}</button>
                </nav>
            </div>
        </header>`;
    },

    renderFooter() {
        const f = document.querySelector('#cr-footer-placeholder');
        if (!f) return;
        f.innerHTML = `
        <footer class="cr-footer">
            <div class="container">
                <div class="grid">
                    <div>
                        <div style="display:flex;align-items:center;gap:.75rem;">
                            <img src="/img/logo.png" alt="" width="56" height="56" style="display:block;">
                            <div style="font-family:'Playfair Display',Georgia,serif;font-size:1.4rem;font-weight:700;letter-spacing:-.01em;">
                                <span style="color:#E66B40;">Culture</span> <span style="color:#FFFFFF;">Radar</span>
                            </div>
                        </div>
                        <p class="mt-sm" style="color:#C8C4B0;max-width:340px;">
                            La boussole culturelle intelligente qui reconnecte les habitants a leur offre culturelle locale.
                        </p>
                    </div>
                    <div>
                        <h4>Decouvrir</h4>
                        <a href="/events.html">Evenements</a>
                        <a href="/recommendations.html">Recommandations</a>
                        <a href="/places.html">Lieux culturels</a>
                    </div>
                    <div>
                        <h4>Professionnels</h4>
                        <a href="/pricing.html">Tarifs Pro</a>
                        <a href="/register.html?role=pro">Espace organisateur</a>
                        <a href="/about.html#partenariats">Partenariats</a>
                    </div>
                    <div>
                        <h4>Informations</h4>
                        <a href="/about.html">A propos</a>
                        <a href="/legal.html">Mentions legales</a>
                        <a href="/legal.html#rgpd">Confidentialite</a>
                        <a href="/contact.html">Contact</a>
                    </div>
                </div>
                <div class="cr-footer-bottom text-center">
                    © ${new Date().getFullYear()} CultureRadar. La boussole culturelle dont vous avez besoin.
                </div>
            </div>
        </footer>`;
    },

    logout(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        // Tentative serveur (best effort) puis nettoyage local complet
        try { fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + (CR.token() || '') } }); } catch {}
        CR.clearAuth();
        try {
            localStorage.removeItem('cr_envies');
            sessionStorage.removeItem('cr_sid');
        } catch {}
        CR.toast('A bientot sur CultureRadar !', 'success');
        setTimeout(() => { window.location.href = '/login.html'; }, 400);
        return false;
    },

    requireAuth(role = null) {
        const u = CR.user();
        if (!u) { location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname); return false; }
        if (role && u.role !== role && !(Array.isArray(role) && role.includes(u.role))) {
            CR.toast('Acces reserve', 'error'); location.href = '/'; return false;
        }
        return u;
    },

    async getLocation() {
        if (!navigator.geolocation) return null;
        return new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
                p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
            );
        });
    },

    track(event_type, data = {}) {
        try {
            fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(CR.token() ? { Authorization: 'Bearer ' + CR.token() } : {}) },
                body: JSON.stringify({ event_type, event_data: data, session_id: CR.sessionId() })
            });
        } catch {}
    },
    sessionId() {
        let sid = sessionStorage.getItem('cr_sid');
        if (!sid) { sid = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('cr_sid', sid); }
        return sid;
    },

    enviesSet() {
        try { return new Set(JSON.parse(localStorage.getItem('cr_envies') || '[]')); } catch { return new Set(); }
    },
    saveEnvies(set) { localStorage.setItem('cr_envies', JSON.stringify(Array.from(set))); },
    isEnvie(eventId) { return CR.enviesSet().has(Number(eventId)); },
    async refreshEnvies() {
        if (!CR.user()) return;
        try {
            const list = await CR.get('/reservations');
            const ids = list.filter(r => r.status === 'envie').map(r => r.event_id);
            CR.saveEnvies(new Set(ids));
            CR.applyHearts();
        } catch {}
    },
    applyHearts() {
        const set = CR.enviesSet();
        document.querySelectorAll('.cr-heart').forEach(btn => {
            const id = Number(btn.dataset.eventId);
            const liked = set.has(id);
            btn.textContent = liked ? '♥' : '♡';
            btn.classList.toggle('active', liked);
        });
    },
    async toggleEnvie(ev, eventId) {
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        if (!CR.user()) {
            CR.toast('Connectez-vous pour ajouter a vos envies', 'info');
            setTimeout(() => location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname + location.search), 1200);
            return;
        }
        const set = CR.enviesSet();
        const liked = set.has(Number(eventId));
        try {
            if (liked) {
                const list = await CR.get('/reservations');
                const r = list.find(x => x.event_id === Number(eventId) && x.status === 'envie');
                if (r) await CR.del('/reservations/' + r.id);
                set.delete(Number(eventId));
                CR.toast('Retire de vos envies', 'success');
            } else {
                await CR.post('/reservations', { event_id: Number(eventId), status: 'envie' });
                set.add(Number(eventId));
                CR.toast('Ajoute a vos envies !', 'success');
                CR.track('envie_added', { event_id: eventId });
            }
            CR.saveEnvies(set);
            CR.applyHearts();
        } catch (e) { CR.toast(e.message || 'Erreur', 'error'); }
    },

    isDark() { return localStorage.getItem('cr_theme') === 'dark'; },
    applyTheme() {
        const dark = CR.isDark();
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    },
    toggleTheme() {
        const dark = CR.isDark();
        localStorage.setItem('cr_theme', dark ? 'light' : 'dark');
        CR.applyTheme();
        CR.renderHeader();
    },

    icsUrl(ev) {
        const dtStart = new Date(ev.date_debut).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const dtEnd = ev.date_fin ? new Date(ev.date_fin).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : dtStart;
        const ics = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CultureRadar//FR',
            'BEGIN:VEVENT',
            `UID:cr-${ev.id}@culture-radar.fr`,
            `DTSTAMP:${dtStart}`, `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
            `SUMMARY:${(ev.titre || '').replace(/\n/g, ' ')}`,
            `LOCATION:${((ev.place_nom || '') + ' ' + (ev.adresse || '') + ' ' + (ev.ville || '')).replace(/\n/g, ' ')}`,
            `DESCRIPTION:${(ev.description || '').replace(/\n/g, '\\n')}`,
            `URL:${location.origin}/event.html?id=${ev.id}`,
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');
        return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    }
};

// Injection dynamique du favicon + de la police de marque sur toutes les pages
// (evite de modifier chaque <head> manuellement)
(function injectBrandAssets() {
    // Favicon (si absent)
    if (!document.querySelector('link[rel="icon"]')) {
        const fav = document.createElement('link');
        fav.rel = 'icon';
        fav.type = 'image/png';
        fav.href = '/img/logo-32.png';
        document.head.appendChild(fav);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        apple.href = '/img/logo-192.png';
        document.head.appendChild(apple);
    }
    // Playfair Display (serif de marque pour les titres) si absent
    if (!document.querySelector('link[href*="Playfair+Display"]')) {
        const font = document.createElement('link');
        font.rel = 'stylesheet';
        font.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(font);
    }
})();

CR.applyTheme();

document.addEventListener('DOMContentLoaded', () => {
    CR.applyTheme();
    CR.renderHeader();
    CR.renderFooter();
    CR.track('page_view', { path: location.pathname });
    if (CR.user()) setTimeout(() => CR.refreshEnvies(), 200);
});
