// Installer l'app sur l'écran d'accueil (site web uniquement).
// Android/Chrome : le navigateur fournit la fenêtre d'installation (beforeinstallprompt).
// iPhone : Apple ne permet pas de la déclencher, on affiche les étapes à suivre dans Safari.

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/.test(navigator.userAgent);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const INSTALL = { prompt: null, done: false, help: false };

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  INSTALL.prompt = e;
  if (S.screen === 'home') render();
});
window.addEventListener('appinstalled', () => {
  INSTALL.done = true; INSTALL.prompt = null; INSTALL.help = false;
  render(); toast('Tournée est sur ton écran d’accueil');
});

// Le bouton « Installer » apparaît sur le site, sur téléphone, tant que l'app n'est pas déjà installée
function canOfferInstall() {
  if (EMBEDDED || window.Capacitor || isStandalone() || INSTALL.done) return false;
  return !!INSTALL.prompt || isIOS() || isAndroid();
}
const SHARE_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

// Fenêtre d'aide quand le navigateur ne peut pas installer tout seul
function installHTML() {
  const steps = isIOS()
    ? [`Touche le bouton <b>Partager</b> ${SHARE_ICON} en bas de Safari (en haut à droite sur iPad).`,
       'Fais défiler et choisis <b>« Sur l’écran d’accueil »</b>.',
       'Touche <b>« Ajouter »</b>. Tournée apparaît avec ses cartes comme icône.']
    : ['Touche le menu <b>⋮</b> en haut à droite de Chrome.',
       'Choisis <b>« Installer l’application »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.',
       'Confirme avec <b>« Installer »</b>.'];
  return `<div class="sheet" data-act="closeInstall"><div class="inner" role="dialog" aria-label="Installer Tournée">
    <div class="row spread"><h3 style="font:400 22px/1 var(--display)">Installer Tournée</h3><button class="iconbtn" data-act="closeInstall">Fermer</button></div>
    ${isIOS() ? '<p class="muted" style="margin:0;font-size:14px">Sur iPhone, Apple ne laisse pas les sites s’installer tout seuls. Ça prend 3 touches :</p>' : ''}
    <ol class="steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <p class="muted" style="margin:0;font-size:14px">L’app s’ouvre ensuite en plein écran et marche même sans réseau.</p>
  </div></div>`;
}

Object.assign(A, {
  async install() {
    if (!INSTALL.prompt) { INSTALL.help = true; render(); return; }
    const p = INSTALL.prompt; INSTALL.prompt = null;
    p.prompt();
    try { track('install', { outcome: (await p.userChoice).outcome }); } catch {}
    render();
  },
  closeInstall(_, el, e) { if (e.target === el) { INSTALL.help = false; render(); } }
});
