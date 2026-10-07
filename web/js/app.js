// Cœur de l'app : affichage de la page courante, navigation, boutons, « Annuler », reprise de partie, démarrage.
// Chargé en dernier : tous les jeux et toutes les pages se sont déjà déclarés (voir core/screens.js).

const app = document.getElementById('app');
const tabbarEl = document.getElementById('tabbar');
const GAME_SCREENS = new Set(GAMES.map(g => g.id));
function scrollTop() { app.scrollTop = 0; }

// Affiche la page S.screen, la barre de navigation et les fenêtres ouvertes, puis enregistre la partie en cours
function render() {
  if (CTX.silent) return; // action d'une partie en ligne en cours : l'affichage suivra l'envoi au serveur
  const inGame = S.g && GAME_SCREENS.has(S.screen);
  const tabs = isTab();
  document.body.classList.toggle('has-tabs', tabs);
  tabbarEl.innerHTML = tabs ? tabbarHTML() : '';
  tabbarEl.hidden = !tabs;
  app.innerHTML = SCREENS[S.screen]() + (S.sheet ? sheetHTML() : '') + (INSTALL.help ? installHTML() : '') +
    (inGame && S.history.length ? '<button class="undo" data-act="undo">↶ Annuler</button>' : '') + consentHTML();
  MOUNT[S.screen]?.();
  trackScreen();
  // Sauvegarde de la partie en cours (y compris quand on regarde ses réglages ou ses cartes), reprise au prochain lancement
  const back = S.screen === 'editor' ? S.editBack : S.screen;
  const gameScreen = back === 'settings' ? S.setBack : back;
  store.set('game', S.g && GAME_SCREENS.has(gameScreen) ? { screen: gameScreen, g: S.g } : null);
}

// ---------- Actions générales ----------
Object.assign(A, {
  // « ← Jeux » : retour à l'onglet du jeu en cours (Cartes ou Plateau)
  home() { A.tab(GAMES.find(x => x.id === S.screen)?.tab || 'home'); },
  // Onglets : quitter une partie ou les réglages d'un jeu ramène à la navigation principale
  tab(id) {
    if (O.scanning) stopScan(); // on quitte l'onglet En ligne : la caméra s'éteint
    endGame();
    S.screen = id; S.g = null; S.history = []; S.setBack = null; S.sheet = false;
    render(); scrollTop();
  },
  start(id) {
    const min = GAMES.find(x => x.id === id).min;
    if (S.players.length < min) { A.tab('players'); toast(min > 1 ? `Ajoute au moins ${min} joueurs` : 'Ajoute au moins un joueur'); return; }
    S.screen = id; S.g = INIT[id](); S.history = []; render(); scrollTop();
    S.gameT = Date.now(); track('game_start', { game: id, players: S.players.length });
  },
  restart() { S.g = INIT[S.screen](); S.history = []; render(); track('game_restart', { game: S.screen }); },
  undo() {
    const h = S.history.pop(); if (!h) return;
    S.g = h.g; S.sips = h.sips; save(); render(); toast('Action annulée');
    track('undo', { game: S.screen });
  }
});

// Mesure : fin d'une partie sur ce téléphone (on la quitte), avec sa durée
function endGame() {
  if (!S.g || !GAME_SCREENS.has(S.screen)) return;
  track('game_end', { game: S.screen, duration_sec: S.gameT ? Math.round((Date.now() - S.gameT) / 1000) : 0 });
  S.gameT = null;
}
UNDOABLE.add('restart');

// Exécute une action. Pendant une partie en ligne, les actions du jeu passent par le serveur (online.js).
function act(name, arg, el, e) {
  const fn = A[name];
  if (!fn) return;
  if (S.screen === 'online' && (ACTION_GAME[name] === O.room?.game || name === 'restart')) { onlineAct(name, arg, el, e); return; }
  if (UNDOABLE.has(name)) remember();
  fn(arg, el, e);
}

// Tous les boutons passent par ici : data-act="action" data-arg="paramètre"
let wake = false;
document.addEventListener('click', e => {
  // Garde l'écran allumé pendant la soirée (si le téléphone le permet)
  if (!wake && navigator.wakeLock) { wake = true; navigator.wakeLock.request('screen').catch(() => {}); }
  const el = e.target.closest('[data-act]');
  if (el) act(el.dataset.act, el.dataset.arg, el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (S.sheet || INSTALL.help)) { S.sheet = false; INSTALL.help = false; render(); }
});
// Pendant la saisie (clavier ouvert), la barre de navigation se retire pour ne pas flotter au-dessus du clavier
document.addEventListener('focusin', e => { if (e.target.matches('input, textarea')) document.body.classList.add('typing'); });
document.addEventListener('focusout', () => document.body.classList.remove('typing'));

// ---------- Démarrage ----------
// Reprise de la partie après un rechargement (ou reconnexion à la partie en ligne)
const saved = store.get('game', null), savedOnline = store.get('online', null);
// Lien d'invitation (QR code lu avec l'appareil photo) : …?join=ABCD
const joinCode = new URLSearchParams(location.search).get('join');
if (joinCode) history.replaceState(null, '', location.pathname);
if (ONLINE_OK && joinCode && /^[A-Za-z]{4}$/.test(joinCode)) {
  S.screen = 'lobby'; O.prefill = joinCode.toUpperCase(); O.joinVia = 'lien';
  if (store.get('myname', '')) setTimeout(() => A.onlineJoin(O.prefill)); // prénom connu : on rejoint directement
} else if (ONLINE_OK && savedOnline && savedOnline.code) {
  enterRoom(savedOnline.code);
} else if (saved && GAME_SCREENS.has(saved.screen) && saved.g) {
  S.screen = saved.screen; S.g = saved.g; S.gameT = Date.now();
  if (S.g.showing) S.g.showing = false; // main de Pyramide en cours d'affichage : on la recache
}
render();
if (S.screen !== 'home') toast('Partie reprise là où vous l’aviez laissée');

// Hors ligne : sur le site, le service worker garde une copie de l'app sur le téléphone
if ('serviceWorker' in navigator && !EMBEDDED && !window.Capacitor && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}

// Écran de chargement : retiré quand les polices sont prêtes (1,5 s au plus), après une courte animation
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1500))])
    .then(() => setTimeout(() => {
      splash.classList.add('done');
      setTimeout(() => splash.remove(), 400);
    }, 600));
})();
