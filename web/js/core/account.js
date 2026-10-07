// Compte facultatif : il sert seulement à acheter et à retrouver ses achats (thème Hot, skins premium)
// sur un autre navigateur ou un autre téléphone. Tout le reste de l'app marche sans compte.
// Connexion Google ou lien par e-mail, via Firebase Authentication, chargé uniquement quand on en a besoin.
// Les achats sont rangés dans la base Firebase : users/<uid>/owned/<article> = true. Seul le serveur de paiement
// peut les écrire (règles : database.rules.json). Le téléphone en garde une copie pour fonctionner hors ligne.

// Configuration de l'app Web Firebase (console Firebase → Paramètres du projet → Vos applications → Web).
// Ce n'est pas une donnée secrète. Tant que apiKey est vide, aucun bouton de compte n'apparaît.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBaENuga5UjphIJZ5g4LuZG5OX3QrDNJzU',
  authDomain: 'tournee-81b4c.firebaseapp.com',
  databaseURL: 'https://tournee-81b4c-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'tournee-81b4c',
  appId: '1:573393514642:web:f183d03878283a9b8b364b'
};
const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

const ACC = {
  // Pas dans l'app Android : Google y bloque la connexion dans une vue web, et les achats passeront par Google Play
  on: !!FIREBASE_CONFIG.apiKey && !EMBEDDED && !window.Capacitor,
  user: store.get('acct', null),                                   // { uid, email } du compte connecté
  owned: new Set(store.get('owned', []).concat(store.get('ownedSkins', []))), // articles achetés (copie locale)
  ready: false, open: false, step: 'choose', reason: '', error: '', busy: false, link: '', then: null
};
const owns = id => ACC.owned.has(id);

// ---------- Firebase Authentication ----------
let authP = null;
function loadAuth() {
  if (authP) return authP;
  const load = f => new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = FB_SDK + f; s.onload = ok; s.onerror = () => ko(new Error('network'));
    document.head.appendChild(s);
  });
  authP = load('firebase-app-compat.js').then(() => load('firebase-auth-compat.js')).then(() => {
    firebase.initializeApp(FIREBASE_CONFIG);
    const auth = firebase.auth();
    auth.onAuthStateChanged(onUser);
    ACC.ready = true;
    if (ACC.open) render();
    return auth;
  });
  authP.catch(() => (authP = null)); // on pourra réessayer quand le réseau reviendra
  return authP;
}

// Connexion ou déconnexion détectée par Firebase (y compris au retour sur l'app)
async function onUser(u) {
  if (!u) {
    if (ACC.user) { ACC.user = null; store.set('acct', null); setOwned([]); render(); }
    return;
  }
  const fresh = !ACC.user || ACC.user.uid !== u.uid;
  ACC.user = { uid: u.uid, email: u.email || '' };
  store.set('acct', ACC.user);
  await refreshOwned(u);
  if (fresh) toast(`Connecté : ${ACC.user.email}`);
  const then = ACC.then;
  ACC.then = null; ACC.open = false; ACC.busy = false;
  render();
  then?.();
}
// Lit les achats du compte sur le serveur
async function refreshOwned(u) {
  try {
    const token = await u.getIdToken();
    const r = await fetch(`${FIREBASE_CONFIG.databaseURL}/users/${u.uid}/owned.json?auth=${token}`);
    if (!r.ok) return false;
    const data = (await r.json()) || {};
    setOwned(Object.keys(data).filter(k => data[k]));
    return true;
  } catch { return false; }
}
function setOwned(list) {
  ACC.owned = new Set(list);
  store.set('owned', list);
  applySkin(); // un skin qui n'est plus possédé revient au skin gratuit
  if (hotPaid() && S.theme === 'hot' && !owns('hot')) A.setTheme('normal');
}
function accFail(e) {
  ACC.busy = false;
  const code = e?.code || e?.message || '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') { render(); return; }
  ACC.error = ({
    'auth/popup-blocked': 'Le navigateur a bloqué la fenêtre de connexion. Autorise les pop-up pour ce site, ou utilise le lien par e-mail.',
    'auth/invalid-email': 'Cette adresse e-mail n’est pas valide.',
    'auth/invalid-action-code': 'Ce lien a expiré ou a déjà servi. Demande un nouveau lien.',
    'auth/expired-action-code': 'Ce lien a expiré. Demande un nouveau lien.',
    'auth/unauthorized-domain': 'Ce site n’est pas encore autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).',
    'auth/operation-not-allowed': 'Ce mode de connexion n’est pas encore activé dans Firebase.'
  })[code] || (code.includes('api-key')
    ? 'La configuration Firebase de l’app n’est pas bonne (FIREBASE_CONFIG dans core/account.js).'
    : 'Impossible de joindre le serveur. Vérifie la connexion et réessaie.');
  ACC.open = true; render();
}

// ---------- Achats ----------
// Paiement par Stripe, via les fonctions Netlify (netlify/functions) : /api/checkout crée la page de paiement,
// /api/stripe-webhook ajoute l'achat au compte quand Stripe confirme. Prix réels : netlify/lib/shop.mjs.
// PAY_LIVE : vente ouverte à tout le monde. En attendant, les achats ne marchent qu'en mode test,
// activé sur un navigateur en ouvrant le site avec ?paytest=1 (et coupé avec ?paytest=0).
const PAY_LIVE = false;
const HOT_PRICE = '2,99 €';
(() => {
  const t = new URLSearchParams(location.search).get('paytest');
  if (t === null) return;
  store.set('paytest', t === '1');
  history.replaceState(null, '', location.pathname);
})();
const PAY = { on: ACC.on && (PAY_LIVE || store.get('paytest', false)), test: !PAY_LIVE && store.get('paytest', false) };
// Le thème Hot est payant dès que la vente est ouverte (ou en mode test) ; gratuit sinon
const hotPaid = () => PAY.on;

// Achat d'un article : il faut un compte, pour que l'achat suive la personne sur tous ses appareils
function buy(id, name) {
  if (owns(id)) return true;
  if (!PAY.on) { toast(`« ${name} » sera bientôt disponible à l’achat`); return false; }
  if (!ACC.user) {
    A.account(`Connecte-toi pour acheter « ${name} ». L’achat te suivra sur tous tes appareils.`);
    ACC.then = () => buy(id, name); // une fois connecté, on reprend l'achat
    return false;
  }
  checkout(id);
  return false;
}
// Envoie vers la page de paiement Stripe ; au retour, l'app revient avec ?paid=<article>
async function checkout(id) {
  toast('Ouverture du paiement…');
  try {
    const token = await (await loadAuth()).currentUser.getIdToken();
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: id, token }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.url) throw new Error(data.error || 'network');
    track('begin_checkout', { item: id });
    location.href = data.url;
  } catch (e) {
    toast(e.message === 'auth' ? 'Reconnecte-toi puis réessaie' : 'Paiement indisponible pour le moment, réessaie plus tard');
  }
}
// Retour de Stripe : l'achat arrive sur le compte quelques secondes après le paiement (webhook), on le guette
async function awaitPurchase(id) {
  const auth = await loadAuth();
  for (let i = 0; i < 12 && !owns(id); i++) {
    if (auth.currentUser) await refreshOwned(auth.currentUser);
    if (!owns(id)) await new Promise(r => setTimeout(r, 1500));
  }
  if (!owns(id)) { toast('Paiement reçu. L’achat apparaîtra dans quelques instants : « Vérifier mes achats »'); return; }
  toast(`Merci ! « ${itemName(id)} » est débloqué`);
  track('purchase', { item: id });
  if (id === 'hot') A.setTheme('hot');
  else if (SKINS.some(s => s.id === id)) A.useSkin(id);
  else render();
}

// ---------- Fenêtre « Compte » ----------
Object.assign(A, {
  account(reason) {
    if (!ACC.on) return;
    ACC.open = true; ACC.error = ''; ACC.busy = false;
    ACC.step = ACC.user ? 'me' : 'choose';
    ACC.reason = typeof reason === 'string' && reason ? reason : '';
    loadAuth().catch(accFail); // chargé d'avance : la fenêtre Google doit s'ouvrir tout de suite au toucher
    render();
  },
  accClose() { ACC.open = false; ACC.then = null; render(); },
  accGoogle() {
    if (!ACC.ready) return;
    ACC.error = ''; ACC.busy = true; render();
    firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then(() => track('login', { method: 'google' })).catch(accFail);
  },
  accEmail() { ACC.step = 'email'; ACC.error = ''; render(); document.getElementById('acc-email')?.focus(); },
  accBack() { ACC.step = 'choose'; ACC.error = ''; render(); },
  accSendLink() {
    const email = document.getElementById('acc-email')?.value.trim() || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { ACC.error = 'Cette adresse e-mail n’est pas valide.'; render(); return; }
    ACC.error = ''; ACC.busy = true; render();
    loadAuth().then(auth => auth.sendSignInLinkToEmail(email, { url: location.origin + location.pathname, handleCodeInApp: true }))
      .then(() => { store.set('accEmail', email); ACC.email = email; ACC.step = 'sent'; ACC.busy = false; render(); })
      .catch(accFail);
  },
  // Lien ouvert sur un autre appareil que celui où on l'a demandé : on redemande l'adresse
  accConfirm() {
    const email = document.getElementById('acc-email')?.value.trim() || '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { ACC.error = 'Cette adresse e-mail n’est pas valide.'; render(); return; }
    ACC.busy = true; render();
    finishEmailLink(email);
  },
  accRestore() {
    if (!ACC.user) { A.account('Connecte-toi avec le même compte que lors de ton achat pour le retrouver.'); return; }
    ACC.busy = true; render();
    loadAuth().then(auth => auth.currentUser ? refreshOwned(auth.currentUser) : false).then(ok => {
      ACC.busy = false; render();
      toast(ok ? (ACC.owned.size ? 'Achats retrouvés' : 'Aucun achat sur ce compte') : 'Impossible de joindre le serveur');
    }).catch(accFail);
  },
  accSignOut() {
    loadAuth().then(auth => auth.signOut()).catch(() => {});
    ACC.user = null; store.set('acct', null); setOwned([]);
    ACC.open = false; render(); toast('Déconnecté');
  }
});

function finishEmailLink(email) {
  loadAuth().then(auth => auth.signInWithEmailLink(email, ACC.link))
    .then(() => { store.set('accEmail', ''); ACC.link = ''; track('login', { method: 'email' }); })
    .catch(accFail);
}

// Nom lisible d'un article acheté
const itemName = id => (id === 'hot' ? 'Thème Hot' : SKINS.find(s => s.id === id)?.name || id);

function accountHTML() {
  if (!ACC.open) return '';
  const err = ACC.error ? `<p class="acc-err" role="alert">${esc(ACC.error)}</p>` : '';
  const close = `<button class="btn ghost" data-act="accClose">Fermer</button>`;
  let body;
  if (ACC.step === 'me' && ACC.user) {
    const list = [...ACC.owned].map(itemName);
    body = `<p style="margin:0">Connecté avec <b>${esc(ACC.user.email)}</b></p>
      <p class="muted" style="margin:0;font-size:14px">${list.length ? `Tes achats : ${list.map(esc).join(', ')}.` : 'Aucun achat sur ce compte pour l’instant.'}</p>
      ${err}
      <button class="btn" data-act="accRestore" ${ACC.busy ? 'disabled' : ''}>${ACC.busy ? 'Vérification…' : 'Vérifier mes achats'}</button>
      <div class="choices"><button class="btn" data-act="accSignOut">Se déconnecter</button>${close}</div>`;
  } else if (ACC.step === 'email' || ACC.step === 'confirm') {
    const confirm = ACC.step === 'confirm';
    body = `<p style="margin:0;font-size:14px">${confirm ? 'Pour terminer la connexion, retape l’adresse e-mail à laquelle tu as reçu le lien.' : 'Tu vas recevoir un lien : ouvre-le sur ce téléphone pour te connecter. Pas de mot de passe.'}</p>
      <input id="acc-email" type="email" inputmode="email" autocomplete="email" placeholder="ton@email.fr" aria-label="Adresse e-mail" value="${esc(store.get('accEmail', ''))}">
      ${err}
      <button class="btn primary" data-act="${confirm ? 'accConfirm' : 'accSendLink'}" ${ACC.busy ? 'disabled' : ''}>${ACC.busy ? 'Un instant…' : confirm ? 'Me connecter' : 'Recevoir le lien'}</button>
      ${confirm ? close : '<button class="btn ghost" data-act="accBack">Retour</button>'}`;
  } else if (ACC.step === 'sent') {
    body = `<p style="margin:0">Lien envoyé à <b>${esc(ACC.email)}</b>.</p>
      <p class="muted" style="margin:0;font-size:14px">Ouvre-le sur ce téléphone, dans ce navigateur. Pense à regarder dans les spams.</p>
      ${close}`;
  } else {
    body = `${ACC.reason ? `<p style="margin:0">${esc(ACC.reason)}</p>` : ''}
      <p class="muted" style="margin:0;font-size:14px">Le compte sert uniquement à tes achats. Le reste de l’app marche sans compte.</p>
      ${err}
      <button class="btn primary" data-act="accGoogle" ${ACC.ready && !ACC.busy ? '' : 'disabled'}>${ACC.ready ? (ACC.busy ? 'Connexion…' : 'Continuer avec Google') : 'Chargement…'}</button>
      <button class="btn" data-act="accEmail">Recevoir un lien par e-mail</button>
      ${close}`;
  }
  return `<div class="consent"><div class="inner" role="dialog" aria-modal="true" aria-labelledby="acc-title">
    <h2 id="acc-title">${ACC.step === 'me' ? 'Mon compte' : 'Compte Tournée'}</h2>${body}</div></div>`;
}

// Bouton d'accès au compte (Boutique, Réglages)
function accountButtonHTML() {
  if (!ACC.on) return '';
  return ACC.user
    ? `<button class="btn" data-act="account">Mon compte · ${esc(ACC.user.email)}</button>`
    : `<button class="btn" data-act="accRestore">Restaurer mes achats</button>`;
}

// ---------- Démarrage ----------
if (ACC.on) {
  const params = new URLSearchParams(location.search);
  if (params.get('mode') === 'signIn' && params.get('oobCode')) {
    // Retour depuis le lien reçu par e-mail
    ACC.link = location.href;
    history.replaceState(null, '', location.pathname);
    const email = store.get('accEmail', '');
    if (email) finishEmailLink(email);
    else { ACC.open = true; ACC.step = 'confirm'; loadAuth().catch(accFail); }
  } else if (params.get('paid')) {
    // Retour depuis la page de paiement Stripe
    const id = params.get('paid');
    history.replaceState(null, '', location.pathname);
    if (id === 'cancel') toast('Paiement annulé');
    else if (ACC.user) awaitPurchase(id).catch(() => {});
  } else if (ACC.user) {
    loadAuth().catch(() => {}); // déjà connecté : met à jour les achats en arrière-plan
  }
}
