// Jeu à plusieurs téléphones, pour tous les jeux : onglet « En ligne », salle d'attente avec QR code, écran de la partie.
// Passe par Firebase Realtime Database (API REST + flux en direct). Règles d'accès : database.rules.json.
// La partie vit dans rooms/<CODE> : game, host, players {id: {name, t}}, state (état public du jeu).
// Chaque téléphone écoute la partie et réécrit « state » quand c'est à lui d'agir.

const DB_URL = 'https://tournee-81b4c-default-rtdb.europe-west1.firebasedatabase.app';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O, faciles à confondre
// L'aperçu publié sur claude.ai bloque les connexions vers d'autres serveurs
const ONLINE_OK = !EMBEDDED;
const PID = store.get('pid', null) || (() => { const id = Math.random().toString(36).slice(2, 10); store.set('pid', id); return id; })();
const O = { code: null, room: null, loaded: false, closed: false, error: '', busy: false, showing: false, left: 0, confirmLeave: false };
const memoSeen = new Set(store.get('memoSeen', [])); // parties dont j'ai déjà vu ma main (Pyramide)
let stream = null;

// ---------- Échanges avec Firebase ----------
async function dbReq(path, method = 'GET', body) {
  let r;
  try { r = await fetch(`${DB_URL}/${path}.json`, { method, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error('network'); }
  if (r.status === 401) throw new Error('denied');
  if (!r.ok) throw new Error('network');
  return r.json();
}
function netMsg(e) {
  return ({
    denied: 'Le serveur refuse l’accès. Les règles de sécurité Firebase ne sont pas encore en place.',
    notfound: 'Aucune partie avec ce code. Vérifie les 4 lettres.',
    started: 'Cette partie a déjà commencé, impossible de la rejoindre.',
    full: 'Cette partie est complète.'
  })[e.message] || 'Impossible de joindre le serveur. Vérifie la connexion. Sur la version claude.ai, le jeu à plusieurs téléphones est bloqué : utilise l’app Android.';
}
// Applique un événement du flux (put = remplace, patch = fusionne) sur la copie locale de la partie
function applyEvent(path, data, merge) {
  const keys = path.split('/').filter(Boolean);
  if (!keys.length && !merge) { O.room = data; return; }
  O.room = O.room || {};
  let o = O.room;
  for (const k of keys.slice(0, merge ? keys.length : -1)) o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {};
  if (merge) { for (const k in data) { if (data[k] === null) delete o[k]; else o[k] = data[k]; } return; }
  const last = keys.at(-1);
  if (data === null) delete o[last]; else o[last] = data;
}
// Écoute la partie en direct
function listen(code) {
  stream?.close();
  stream = new EventSource(`${DB_URL}/rooms/${code}.json`);
  const on = merge => e => {
    const { path, data } = JSON.parse(e.data);
    // Ignore l'écho d'un état plus ancien que celui déjà affiché (appuis rapides de l'hôte)
    const incoming = path === '/' ? data?.state?.n : path === '/state' ? data?.n : undefined;
    if (incoming !== undefined && O.room?.state?.n > incoming) return;
    applyEvent(path, data, merge);
    O.loaded = true; O.error = '';
    if (!O.room) O.closed = true;
    if (S.screen === 'online') render();
  };
  stream.addEventListener('put', on(false));
  stream.addEventListener('patch', on(true));
  stream.addEventListener('cancel', () => { O.error = netMsg(new Error('denied')); render(); });
  stream.onerror = () => { if (!O.loaded) { O.error = netMsg(new Error('network')); if (S.screen === 'online') render(); } };
}
const roomPlayers = () => Object.entries(O.room?.players || {}).sort((a, b) => a[1].t - b[1].t).map(([id, p]) => ({ id, name: p.name }));
const pname = id => O.room?.players?.[id]?.name || '?';
const isHost = () => O.room?.host === PID;
// Publie le nouvel état de la partie (affiché tout de suite ici, puis envoyé aux autres)
function putState(st) {
  st.n = (O.room.state?.n || 0) + 1; // numéro de version de l'état
  O.room.state = st; render();
  dbReq(`rooms/${O.code}/state`, 'PUT', st).catch(e => toast(netMsg(e)));
}
function readName() {
  const name = (document.getElementById('onlineName')?.value || '').trim();
  if (!name) { toast('Entre ton prénom'); document.getElementById('onlineName')?.focus(); return null; }
  store.set('myname', name);
  return name;
}
function enterRoom(code) {
  Object.assign(O, { code, room: null, loaded: false, closed: false, error: '', showing: false, confirmLeave: false });
  store.set('online', { code });
  S.screen = 'online'; S.g = null; S.history = [];
  listen(code); render(); scrollTop();
}

// ---------- Onglet « En ligne » : créer ou rejoindre une partie ----------
SCREENS.lobby = function () {
  return `${pageTop('En ligne')}
    <p style="margin:0">Chacun joue sur son propre téléphone. Un joueur crée la partie, les autres la rejoignent avec le code à 4 lettres ou en scannant le QR code.</p>
    ${!ONLINE_OK ? '<div class="panel"><p class="muted" style="margin:0">Le jeu à plusieurs téléphones marche sur le site et dans l’app Android. Cette version ne peut pas se connecter au serveur de jeu.</p></div>' : `
    <div class="panel">
      <label class="label" for="onlineName">Ton prénom</label>
      <input class="field" id="onlineName" maxlength="18" placeholder="Ton prénom" autocomplete="off" value="${esc(store.get('myname', ''))}">
    </div>
    <div class="panel">
      <span class="label">Rejoindre une partie</span>
      ${canScan() ? `<button class="btn primary big" data-act="scanOpen" ${O.busy ? 'disabled' : ''}>${QR_ICON} Scanner le QR code</button>` : ''}
      <div class="add">
        <input class="field" id="joinCode" maxlength="4" placeholder="ABCD" autocomplete="off" autocapitalize="characters" aria-label="Code de la partie" value="${esc(O.prefill || '')}" style="text-transform:uppercase;letter-spacing:.2em;font-weight:800">
        <button class="btn" data-act="onlineJoin" ${O.busy ? 'disabled' : ''}>Rejoindre</button>
      </div>
    </div>
    <div class="panel">
      <span class="label">Créer une partie</span>
      <p class="muted" style="margin:0;font-size:14px">Tu choisiras le jeu ensuite, une fois tout le monde arrivé : les 10 jeux se jouent en ligne.</p>
      <button class="btn" data-act="onlineCreate" ${O.busy ? 'disabled' : ''}>Créer une partie</button>
    </div>
    ${O.error ? `<p class="warn" style="margin:0">${esc(O.error)}</p>` : ''}`}
    ${O.scanning ? scannerHTML() : ''}`;
};

// ---------- QR code : l'afficher dans la salle d'attente, le scanner pour rejoindre ----------
const QR_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h1M20 14h1"/></svg>';
// Adresse du QR code : ouvre l'app sur la partie (un appareil photo ordinaire peut aussi la lire)
const joinURL = code => `${location.origin}${location.pathname}?join=${code}`;
function qrSVG(text) {
  if (typeof qrcode !== 'function') return '';
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}
// Code de partie lu dans un QR code : une adresse « ?join=ABCD » ou directement 4 lettres
function codeFromQR(text) {
  try { const c = new URL(text).searchParams.get('join'); if (c) return c.toUpperCase(); } catch {}
  const m = String(text).trim().toUpperCase().match(/^[A-Z]{4}$/);
  return m ? m[0] : null;
}
const canScan = () => !!navigator.mediaDevices?.getUserMedia;
let scanStream = null, scanRAF = 0;
function scannerHTML() {
  return `<div class="sheet" data-act="scanClose"><div class="inner" role="dialog" aria-label="Scanner le QR code">
    <div class="row spread"><h3 style="font:400 22px/1 var(--display)">Scanner le QR code</h3><button class="iconbtn" data-act="scanClose">Fermer</button></div>
    <div class="scanbox"><video id="qrvideo" playsinline muted></video><span class="scanframe" aria-hidden="true"></span></div>
    <p class="muted" style="margin:0;font-size:14px;text-align:center">${esc(O.scanMsg || 'Vise le QR code affiché sur le téléphone de l’hôte.')}</p>
  </div></div>`;
}
// Charge jsQR (lecteur de QR code, 250 Ko) seulement quand on scanne
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = 'vendor/jsQR.js'; s.onload = ok; s.onerror = ko;
    document.head.appendChild(s);
  });
}
function stopScan() {
  cancelAnimationFrame(scanRAF);
  scanStream?.getTracks().forEach(t => t.stop());
  scanStream = null; O.scanning = false;
}
// Relie la caméra à la vidéo affichée (à chaque affichage) et cherche un QR code image par image
function mountScanner() {
  const video = document.getElementById('qrvideo');
  if (!video || !scanStream) return;
  if (video.srcObject !== scanStream) { video.srcObject = scanStream; video.play().catch(() => {}); }
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  cancelAnimationFrame(scanRAF);
  const tick = () => {
    if (!O.scanning) return;
    const v = document.getElementById('qrvideo');
    if (v && v.readyState >= 2 && v.videoWidth) {
      canvas.width = v.videoWidth; canvas.height = v.videoHeight;
      ctx.drawImage(v, 0, 0);
      const found = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
      const code = found && codeFromQR(found.data);
      if (code) { stopScan(); O.prefill = code; render(); A.onlineJoin(code); return; }
    }
    scanRAF = requestAnimationFrame(tick);
  };
  scanRAF = requestAnimationFrame(tick);
}
MOUNT.lobby = mountScanner;

// ---------- Écran de la partie en ligne ----------
SCREENS.online = function () {
  const R = O.room, st = R?.state;
  const title = (R && GAMES.find(x => x.id === R.game)?.name) || 'En ligne';
  const top = `<div class="top">
    <button class="iconbtn" data-act="onlineLeave">${O.confirmLeave ? (isHost() ? 'Fermer pour tous ?' : 'Quitter ?') : '← Quitter'}</button>
    <h2>${title}</h2>
    <button class="iconbtn code" data-act="onlineCopy" aria-label="Copier le code ${O.code}">${O.code}</button>
  </div>`;
  if (O.closed) return `${top}<div class="panel"><div class="verdict">La partie a été fermée.</div><button class="btn primary big" data-act="onlineLeave">Retour à l’accueil</button></div>`;
  if (!R || !st) return `${top}<div class="panel"><p style="margin:0;text-align:center">${O.error ? esc(O.error) : `Connexion à la partie ${O.code}…`}</p></div>`;
  const ps = roomPlayers(), host = pname(R.host);

  // Salle d'attente
  if (st.phase === 'lobby') {
    return `${top}
      <div class="panel" style="align-items:center;text-align:center">
        <span class="label">Pour rejoindre : scanner le QR code ou taper le code</span>
        <div class="qrbox" aria-label="QR code de la partie ${O.code}">${qrSVG(joinURL(O.code))}</div>
        <div class="codebig">${O.code}</div>
        <p style="margin:0">Les autres ouvrent Tournée, onglet <b>En ligne</b>, puis <b>Scanner le QR code</b> ou tapent ce code.</p>
      </div>
      <div class="section"><span class="label">Joueurs · ${ps.length}</span>
        <ol class="plist">${ps.map(p => `<li class="prow-item"><span class="pn" style="padding:8px">${esc(p.name)}${p.id === PID ? ' (toi)' : ''}</span>${p.id === R.host ? '<span class="star on">hôte</span>' : ''}</li>`).join('')}</ol></div>
      <div class="section"><span class="label">${isHost() ? 'Choisis le jeu' : 'Jeu choisi par l’hôte'}</span>
        ${isHost()
          ? ['home', 'board'].map(tab => `<div class="chips">${GAMES.filter(x => x.tab === tab).map(x =>
              `<button class="chip pick" data-act="onlinePickGame" data-arg="${x.id}" aria-pressed="${R.game === x.id}">${x.suit} ${x.name}</button>`).join('')}</div>`).join('')
          : `<div class="panel" style="text-align:center"><b class="gamebig">${esc(title)}</b></div>`}
      </div>
      ${isHost() ? `<button class="btn primary big" data-act="onlineStart" ${ps.length < 2 ? 'disabled' : ''}>${ps.length < 2 ? 'En attente d’un 2e joueur' : `Lancer : ${esc(title)}`}</button>`
                 : `<p class="muted" style="margin:0;text-align:center">${esc(host)} lancera la partie quand tout le monde sera là.</p>`}`;
  }
  const again = isHost() ? `<button class="btn primary big" data-act="onlineLobby">Rejouer avec les mêmes joueurs</button>` : `<p class="muted" style="margin:0;text-align:center">${esc(host)} peut relancer une partie.</p>`;
  const hands = st.hands || {}, mine = hands[PID] || [];
  if (OWN_ONLINE.has(R.game)) return `${top}${R.game === 'pyramide' ? onlinePyramide(st, hands, mine, host, again) : onlineRiviere(st, hands, mine, host, again)}`;
  // Les autres jeux : le même écran que sur un téléphone, joué avec les joueurs de la partie
  const me = pname(PID), g = GAMES.find(x => x.id === R.game), turn = withGame(st, () => g.turnOf?.(S.g), true);
  const banner = turn ? `<div class="turnbar ${turn === me ? 'me' : ''}">${turn === me ? 'À toi de jouer !' : `C’est au tour de <b>${esc(turn)}</b>`}<span>Tu es ${esc(me)}</span></div>` : '';
  return `${top}${banner}${withGame(st, () => SCREENS[R.game]())}${isHost() ? '<button class="btn ghost" data-act="onlineLobby">Changer de jeu ou de joueurs</button>' : ''}`;
};

// ---------- Jouer n'importe quel jeu en ligne ----------
// La partie en ligne garde l'état du jeu (S.g sur un téléphone) en texte JSON dans state.gs, avec les prénoms des joueurs.
// (En texte car Firebase transforme les listes vides, les trous et les clés numériques.)
// Pour l'afficher ou y jouer, on fait tourner le jeu comme sur un seul téléphone, avec ces joueurs-là.
const OWN_ONLINE = new Set(['pyramide', 'riviere']); // jeux qui ont leur propre version en ligne (mains cachées)
function withGame(st, fn, silent = false) {
  const keep = { screen: S.screen, g: S.g, players: S.players, first: S.first, rules: S.rules, ctx: { ...CTX } };
  try {
    S.screen = O.room.game; S.g = st.gs ? JSON.parse(st.gs) : null;
    S.players = st.names || []; S.first = S.players[0];
    if (typeof st.rules === 'string') S.rules = JSON.parse(st.rules); // cartes du Palmier et du Barbu : celles de l'hôte
    Object.assign(CTX, { online: true, me: pname(PID), silent });
    return fn();
  }
  finally {
    Object.assign(S, { screen: keep.screen, g: keep.g, players: keep.players, first: keep.first, rules: keep.rules });
    Object.assign(CTX, keep.ctx);
  }
}
// Une action du jeu (bouton ou fléchette lancée) : vérifie que c'est mon tour, l'applique, et envoie le nouvel état à tous
function onlineAct(name, arg, el, e) {
  const st = clone(O.room.state);
  if (!st.gs) return;
  const g = GAMES.find(x => x.id === O.room.game), me = pname(PID);
  const turn = withGame(st, () => g.turnOf?.(S.g), true);
  if (turn && turn !== me && name !== 'restart') { toast(`C’est au tour de ${turn}`); return; }
  withGame(st, () => { A[name](arg, el, e); st.gs = JSON.stringify(S.g); }, true);
  putState(st);
}
// Après l'affichage : le dessin propre au jeu (la cible des fléchettes) et le scanner de QR code
MOUNT.online = () => {
  const st = O.room?.state;
  if (st?.gs && MOUNT[O.room.game]) withGame(st, () => MOUNT[O.room.game](), true);
};

// Pyramide en ligne : chacun mémorise sa main sur son téléphone, l'hôte retourne les cartes
function onlinePyramide(st, hands, mine, host, again) {
  const k = st.k ?? -1, done = k >= 14, seen = memoSeen.has(O.code + ':' + st.deal);
  let memo = '';
  if (!seen && !done && mine.length) {
    memo = O.showing
      ? `<div class="panel"><span class="label" style="text-align:center">Ta main, retiens-la</span><div class="center">${mine.map(c => cardHTML(c, 'memo deal')).join('')}</div>
          <div class="hint" id="memoLeft">${O.left} s</div><button class="btn primary big" data-act="onlineHide">J’ai retenu, cacher mes cartes</button></div>`
      : `<div class="panel"><div class="center">${[0, 1, 2, 3].map(() => cardHTML('back', 'memo')).join('')}</div>
          <p style="margin:0;text-align:center">Tu verras ta main une seule fois, ${cfg('pyramide', 'memo')} secondes.</p>
          <button class="btn primary big" data-act="onlineShow">Voir mes cartes</button></div>`;
  }
  let info = `<p class="muted" style="margin:0;text-align:center">${isHost() ? 'Quand tout le monde a mémorisé sa main, retourne la première carte.' : `${esc(host)} retourne les cartes.`}</p>`;
  if (k >= 0) {
    const c = st.cards[k], sips = PYR_ROWS.findIndex(([a, b]) => k >= a && k < b) + 1;
    const holders = st.order.filter(id => (hands[id] || []).some(h => h.v === c.v)).map(pname);
    info = `<div class="verdict">${NAME(c.v)} ${c.s} : ceux qui ont un ${NAME(c.v)} distribuent ${plural(sips, 'gorgée')}.</div>
      ${st.check
        ? `<p style="margin:0;text-align:center">${holders.length ? `Ont vraiment un ${NAME(c.v)} : <b>${holders.map(esc).join(', ')}</b>.` : `Personne n’a de ${NAME(c.v)}. Les menteurs boivent ${plural(sips * cfg('pyramide', 'bluff'), 'gorgée')}.`}</p>`
        : `<button class="btn" data-act="onlinePyrCheck">Bluff contesté ? Voir qui l’a vraiment</button>`}`;
  }
  return `${memo}
    <div class="panel">
      <div class="pyr">${pyrRowsHTML(st.cards, k)}</div>
      ${info}
      ${done ? `<div class="verdict ok">Pyramide terminée.</div>${again}`
             : isHost() ? `<button class="btn primary big" data-act="onlinePyrFlip">Retourner la carte ${k + 2}/15</button>` : ''}
    </div>
    <div class="section"><span class="label">${done ? 'Les mains dévoilées' : 'Ta main, cachée jusqu’à la fin'}</span><div class="hands">${(done ? st.order : [PID]).filter(id => hands[id]).map(id => `
      <div class="hrow"><span class="n">${esc(pname(id))}${id === PID ? ' (toi)' : ''}</span><div class="hand">${hands[id].map(c => cardHTML(done ? c : 'back')).join('')}</div></div>`).join('')}</div></div>`;
}

// Rivière en ligne : chacun répond à ses questions sur son téléphone, puis l'hôte retourne la rivière
function onlineRiviere(st, hands, mine, host, again) {
  if (st.phase === 'deal') {
    const cur = st.order[st.pi], hand = hands[cur] || [], me = cur === PID, round = st.round;
    const Q = rivQuestion(round, hand);
    const slots = [0, 1, 2, 3].map(i => cardHTML(hand[i] || null, `sm ${st.res && i === round ? 'deal hl' : ''}`)).join('');
    let body;
    if (st.res) {
      body = `<div class="verdict ${st.res.ok ? 'ok' : 'ko'}">${st.res.ok ? `Bien vu ! ${esc(pname(cur))} ne boit pas.` : `Perdu… ${esc(pname(cur))} boit ${plural(qSips(round), 'gorgée')}.`}</div>
        ${me ? `<button class="btn primary big" data-act="onlineRivNext">${round < 3 ? 'Question suivante' : st.pi === st.order.length - 1 ? 'Ouvrir la rivière' : 'Joueur suivant'}</button>` : ''}`;
    } else if (me) {
      body = `<div class="verdict">${Q.q}</div><div class="choices">${Q.opts.map(([v, l, c]) => `<button class="btn ${c}" data-act="onlineRivAnswer" data-arg="${v}">${l}</button>`).join('')}</div>`;
    } else {
      body = `<p style="margin:0;text-align:center">${esc(pname(cur))} répond : <b>${Q.q}</b></p>`;
    }
    return `
      <div class="turn"><span class="sub">Question ${round + 1}/4 · ${plural(qSips(round), 'gorgée')} si tu te trompes</span><span class="who">${me ? 'À toi !' : esc(pname(cur))}</span></div>
      <div class="panel"><div class="center">${slots}</div>${body}</div>
      ${!me && mine.length ? `<div class="section"><span class="label">Ta main</span><div class="hand">${mine.map(c => cardHTML(c, 'sm')).join('')}</div></div>` : ''}`;
  }
  const k = st.k ?? -1, done = k >= 9;
  const cells = row => [0, 1, 2, 3, 4].map(col => { const i = col * 2 + row; return cardHTML(i <= k ? st.river[i] : 'back', i === k ? 'deal hl' : ''); }).join('');
  let end = '';
  if (done) {
    const left = st.order.map(id => [pname(id), (hands[id] || []).filter(c => !c.used).length]);
    const max = Math.max(...left.map(x => x[1])), losers = left.filter(x => x[1] === max).map(x => esc(x[0]));
    end = `<div class="verdict">${losers.length > 1 ? losers.slice(0, -1).join(', ') + ' et ' + losers.at(-1) : losers[0]} ${losers.length > 1 ? 'finissent' : 'finit'} avec ${plural(max, 'carte')}. Direction l’autoroute !</div>${again}`;
  }
  return `
    <div class="panel">
      <div class="river">
        <span></span>${[0, 2, 4, 6, 8].map(k => `<span class="num">${riverSips(k)}</span>`).join('')}
        <span class="rl">Bois</span>${cells(0)}
        <span class="rl">Donne</span>${cells(1)}
      </div>
      ${k >= 0 ? `<ul class="lines">${(st.lines || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : `<p class="muted" style="margin:0;text-align:center">${isHost() ? 'Retourne les cartes une par une.' : `${esc(host)} retourne les cartes.`}</p>`}
      ${done ? end : isHost() ? `<button class="btn primary big" data-act="onlineRivFlip">Retourner la carte ${k + 2}/10</button>` : ''}
    </div>
    <div class="section"><span class="label">Ta main</span><div class="hand">${mine.map(c => c.used ? cardHTML(c, 'used') : cardHTML(cfg('riviere', 'hidden') && !done ? 'back' : c)).join('')}</div></div>`;
}

// ---------- Actions ----------
Object.assign(A, {
  // Crée la partie ; l'hôte choisira le jeu dans la salle d'attente
  async onlineCreate() {
    const name = readName(); if (!name) return;
    const game = store.get('onlineGame', 'uno');
    O.busy = true; O.error = ''; render();
    try {
      let code = null;
      for (let i = 0; i < 8 && !code; i++) {
        const c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
        if (await dbReq(`rooms/${c}`) === null) code = c;
      }
      if (!code) throw new Error('network');
      await dbReq(`rooms/${code}`, 'PUT', { created: Date.now(), game, host: PID, players: { [PID]: { name, t: Date.now() } }, state: { phase: 'lobby' } });
      O.busy = false; enterRoom(code);
      track('online_create');
    } catch (e) { O.busy = false; O.error = netMsg(e); render(); }
  },
  // code : lu dans un QR code ; sinon celui tapé dans le champ
  async onlineJoin(scanned) {
    const name = readName(); if (!name) return;
    const code = (scanned || document.getElementById('joinCode')?.value || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { toast('Le code fait 4 lettres'); return; }
    O.busy = true; O.error = ''; render();
    try {
      const room = await dbReq(`rooms/${code}`);
      if (!room) throw new Error('notfound');
      const inRoom = room.players && room.players[PID];
      if (!inRoom && room.state?.phase !== 'lobby') throw new Error('started');
      if (!inRoom && Object.keys(room.players || {}).length >= 10) throw new Error('full');
      // Deux joueurs ne peuvent pas avoir le même prénom dans la partie : on ajoute un numéro
      const taken = Object.entries(room.players || {}).filter(([id]) => id !== PID).map(([, p]) => p.name);
      let unique = name;
      for (let i = 2; taken.includes(unique); i++) unique = `${name} ${i}`;
      await dbReq(`rooms/${code}/players/${PID}`, 'PUT', { name: unique, t: inRoom ? inRoom.t : Date.now() });
      O.busy = false; enterRoom(code);
      // Comment on a rejoint : QR code scanné dans l'app, lien (QR lu par l'appareil photo) ou code tapé
      if (!inRoom) track('online_join', { method: O.joinVia || (scanned ? 'qr' : 'code') });
      O.joinVia = null;
    } catch (e) { O.busy = false; O.error = netMsg(e); render(); }
  },
  // Quitter (confirmation au premier appui). Si l'hôte quitte, la partie est supprimée pour tout le monde.
  onlineLeave() {
    if (!O.confirmLeave && !O.closed && O.room) { O.confirmLeave = true; render(); return; }
    if (O.room && !O.closed) {
      if (isHost()) dbReq(`rooms/${O.code}`, 'DELETE').catch(() => {});
      else if (O.room.state?.phase === 'lobby') dbReq(`rooms/${O.code}/players/${PID}`, 'DELETE').catch(() => {});
    }
    stream?.close(); stream = null;
    Object.assign(O, { code: null, room: null, loaded: false, closed: false, error: '', confirmLeave: false });
    store.set('online', null);
    A.tab('lobby');
  },
  async onlineCopy() {
    try { await navigator.clipboard.writeText(O.code); toast('Code copié'); } catch { toast(`Le code est ${O.code}`); }
  },
  // L'hôte lance la partie : distribution des cartes et copie de ses réglages pour tout le monde
  onlineStart() {
    if (!isHost()) return;
    const ids = roomPlayers().map(p => p.id), game = O.room.game;
    if (ids.length < 2) { toast('Il faut au moins 2 joueurs'); return; }
    if (game === 'pyramide' && ids.length > 9) { toast('La Pyramide se joue à 9 au plus'); return; }
    track('online_start', { game, players: ids.length });
    const g = { deck: newDeck() }, deal = Date.now();
    if (!OWN_ONLINE.has(game)) {
      // Tous les autres jeux : on crée la partie comme sur un téléphone, avec les prénoms des joueurs
      const st = { phase: 'play', deal, cfg: cfgSnapshot(), names: roomPlayers().map(p => p.name), rules: JSON.stringify(S.rules) };
      withGame(st, () => { st.gs = JSON.stringify(INIT[game]()); }, true);
      putState(st);
    } else if (game === 'pyramide') {
      const hands = {};
      ids.forEach(id => (hands[id] = [draw(g), draw(g), draw(g), draw(g)]));
      putState({ phase: 'play', deal, cfg: cfgSnapshot(), order: ids, hands, cards: Array.from({ length: 15 }, () => draw(g)), k: -1, check: false });
    } else {
      putState({ phase: 'deal', deal, cfg: cfgSnapshot(), order: ids, deck: g.deck, hands: {}, pi: 0, round: 0, k: -1 });
    }
  },
  onlineLobby() { if (isHost()) putState({ phase: 'lobby' }); },
  // L'hôte choisit le jeu dans la salle d'attente
  onlinePickGame(id) {
    if (!isHost() || !GAMES.some(x => x.id === id)) return;
    O.room.game = id; store.set('onlineGame', id); render();
    dbReq(`rooms/${O.code}/game`, 'PUT', id).catch(e => toast(netMsg(e)));
  },

  // Scanner de QR code (caméra arrière)
  async scanOpen() {
    const typed = (document.getElementById('onlineName')?.value || '').trim();
    if (typed) store.set('myname', typed); // garde le prénom déjà tapé
    O.scanning = true; O.scanMsg = 'Ouverture de la caméra…'; render();
    try {
      await loadJsQR();
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!O.scanning) { stopScan(); return; }
      O.scanMsg = ''; render();
    } catch {
      stopScan(); render();
      toast('Impossible d’ouvrir la caméra. Autorise-la dans les réglages du téléphone, ou tape le code.');
    }
  },
  scanClose(_, el, e) { if (e.target === el) { stopScan(); render(); } },

  // Pyramide
  onlineShow() {
    O.showing = true; O.left = cfg('pyramide', 'memo');
    clearInterval(memoTimer);
    memoTimer = setInterval(() => {
      if (S.screen !== 'online' || !O.showing) { clearInterval(memoTimer); return; }
      O.left--;
      const el = document.getElementById('memoLeft');
      if (el) el.textContent = O.left + ' s';
      if (O.left <= 0) A.onlineHide();
    }, 1000);
    render();
  },
  onlineHide() {
    clearInterval(memoTimer); O.showing = false;
    memoSeen.add(O.code + ':' + O.room.state.deal); store.set('memoSeen', [...memoSeen].slice(-30));
    render();
  },
  onlinePyrFlip() {
    const st = clone(O.room.state); if (!isHost() || st.k >= 14) return;
    st.k++; st.check = false; putState(st);
  },
  onlinePyrCheck() { const st = clone(O.room.state); st.check = true; putState(st); },

  // Rivière
  onlineRivAnswer(v) {
    const st = clone(O.room.state), me = st.order[st.pi];
    if (me !== PID || st.res) return;
    st.hands = st.hands || {};
    const hand = st.hands[me] = st.hands[me] || [];
    const c = st.deck.pop(), ok = rivOk(st.round, hand, c, v);
    hand.push(c);
    st.res = { ok };
    putState(st);
  },
  onlineRivNext() {
    const st = clone(O.room.state);
    if (st.order[st.pi] !== PID || !st.res) return;
    st.res = null; st.round++;
    if (st.round > 3) { st.round = 0; st.pi++; }
    if (st.pi >= st.order.length) { st.phase = 'river'; st.round = 3; st.river = Array.from({ length: 10 }, () => st.deck.pop()); st.k = -1; }
    putState(st);
  },
  onlineRivFlip() {
    const st = clone(O.room.state); if (!isHost() || st.k >= 9) return;
    st.k++;
    const c = st.river[st.k], sips = riverSips(st.k), give = st.k % 2 === 1;
    st.lines = [];
    st.order.forEach(id => (st.hands[id] || []).forEach(h => {
      if (!h.used && h.v === c.v) { h.used = true; st.lines.push(`${pname(id)} a un ${NAME(c.v)} : ${give ? 'donne' : 'boit'} ${plural(sips, 'gorgée')}`); }
    }));
    if (!st.lines.length) st.lines = [`${NAME(c.v)} ${c.s} : personne n’a cette carte.`];
    putState(st);
  }
});
