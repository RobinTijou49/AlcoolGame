// Mesure d'audience avec Google Analytics 4 : quels jeux sont lancés, combien de temps, le jeu en ligne, les erreurs.
// Rien n'est envoyé sans l'accord du joueur (bandeau au premier lancement, modifiable dans Réglages → À propos).
// Aucun prénom n'est jamais envoyé : seulement le nom du jeu, le nombre de joueurs, la durée…
// Hors ligne, les mesures attendent sur le téléphone et partent quand le réseau revient.

// Identifiant de mesure Google Analytics (« G-… ») : vide = mesure désactivée et pas de bandeau
const GA_ID = 'G-243V5SZ139';

const AN = {
  on: !!GA_ID && !EMBEDDED,
  consent: store.get('consent', null), // null = pas encore répondu, true / false = réponse du joueur
  loading: false, ready: false, screen: null, errors: 0
};

// Enregistre une mesure : name = nom de l'évènement, params = détails (jamais de prénom)
function track(name, params = {}) {
  if (!AN.on || AN.consent !== true) return;
  const q = store.get('aq', []);
  q.push([name, params, Date.now()]);
  store.set('aq', q.slice(-200));
  flushTrack();
}

// Envoie les mesures en attente dès que Google Analytics est chargé et que le réseau est là
function flushTrack() {
  if (!AN.on || AN.consent !== true) return;
  if (!AN.ready) { loadGA(); return; }
  if (!navigator.onLine) return;
  const q = store.get('aq', []);
  if (!q.length) return;
  store.set('aq', []);
  q.forEach(([name, params, t]) => gtag('event', name, Date.now() - t > 60000 ? { ...params, delayed: 1 } : params));
}

function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }

function loadGA() {
  if (AN.loading || AN.ready || !navigator.onLine) return;
  AN.loading = true;
  window['ga-disable-' + GA_ID] = false;
  gtag('js', new Date());
  gtag('config', GA_ID, { send_page_view: false });
  // Comment le jeu est utilisé : app installée sur l'écran d'accueil, site, ou app Android
  gtag('set', 'user_properties', {
    app_mode: window.Capacitor ? 'android' : matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'installee' : 'site'
  });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  s.onload = () => { AN.loading = false; AN.ready = true; flushTrack(); };
  s.onerror = () => { AN.loading = false; s.remove(); }; // réessayé au retour du réseau
  document.head.appendChild(s);
}
addEventListener('online', flushTrack);

// Une « page vue » à chaque changement de page ou de jeu (appelé par render)
function trackScreen() {
  if (AN.consent !== true || S.screen === AN.screen) return;
  AN.screen = S.screen;
  track('page_view', { page_title: S.screen, page_location: location.origin + location.pathname + '#' + S.screen });
}

// Bugs rencontrés par les joueurs (5 au plus par session)
addEventListener('error', e => {
  if (AN.errors++ < 5) track('exception', { description: `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`.slice(0, 150), fatal: false });
});
addEventListener('unhandledrejection', e => {
  if (AN.errors++ < 5) track('exception', { description: String(e.reason?.message || e.reason).slice(0, 150), fatal: false });
});

// Réponse du joueur (bandeau ou Réglages)
function setConsent(yes) {
  AN.consent = yes;
  store.set('consent', yes);
  if (yes) { trackScreen(); flushTrack(); return; }
  // Refus : on coupe l'envoi, on oublie les mesures en attente et on efface les cookies Google Analytics
  window['ga-disable-' + GA_ID] = true;
  store.set('aq', []);
  document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n.startsWith('_ga')).forEach(n => {
    const host = location.hostname;
    [host, '.' + host, '.' + host.split('.').slice(-2).join('.')].forEach(d =>
      (document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`));
    document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

// Fenêtre de consentement centrée : affichée tant que le joueur n'a pas répondu
function consentHTML() {
  if (!AN.on || AN.consent !== null) return '';
  return `<div class="consent"><div class="inner" role="dialog" aria-modal="true" aria-labelledby="consent-title">
    <h2 id="consent-title">Mesure d’audience</h2>
    <p>Tournée mesure son utilisation avec Google Analytics (jeux lancés, durée des parties, bugs) pour s’améliorer. Aucun prénom n’est envoyé.
      <a href="confidentialite.html">En savoir plus</a></p>
    <div class="row"><button class="btn" data-act="consent" data-arg="0">Refuser</button><button class="btn" data-act="consent" data-arg="1">Accepter</button></div>
  </div></div>`;
}

Object.assign(A, {
  consent(v) { setConsent(v === '1'); render(); }
});
