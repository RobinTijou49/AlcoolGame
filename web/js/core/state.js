// État de l'app et petits outils partagés : enregistrement sur le téléphone, joueurs, compteur de gorgées, messages.

const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
const clone = o => JSON.parse(JSON.stringify(o));

// Page affichée dans un cadre (aperçu publié sur claude.ai) : pas d'accès au serveur de jeu ni d'installation.
const EMBEDDED = (() => { try { return window.self !== window.top; } catch { return true; } })();

// Enregistrement sur le téléphone (localStorage), sans jamais planter si le navigateur le refuse
const store = {
  get(k, d) { try { const v = localStorage.getItem('tournee:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tournee:' + k, JSON.stringify(v)); } catch {} }
};

// État global : S.screen = page affichée, S.g = partie en cours, S.history = actions annulables
const S = {
  players: store.get('players', ['Léa', 'Hugo', 'Inès', 'Tom']),
  sips: store.get('sips', {}),
  first: store.get('first', null),
  screen: 'home',
  g: null,
  sheet: false,
  history: []
};
function save() { store.set('players', S.players); store.set('sips', S.sips); store.set('first', S.first); }

// Ordre de passage : la liste des joueurs, en commençant par celui qui commence
function order() {
  const i = Math.max(0, S.players.indexOf(S.first));
  return S.players.slice(i).concat(S.players.slice(0, i));
}
// Ajoute des gorgées au compteur d'un joueur
function drink(name, n) {
  if (CTX.online && name !== CTX.me) return; // en ligne, chaque téléphone ne compte que les gorgées de son joueur
  S.sips[name] = (S.sips[name] || 0) + n;
  save();
  buzz([70, 50, 70]);
}
// Vibration du téléphone (réglage Téléphone → Vibrations). Sans effet sur iPhone, qui ne la permet pas aux sites.
function buzz(pattern) {
  if (!cfg('phone', 'vibrate')) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

let toastT;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200);
}
