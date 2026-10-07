// Onglet « Boutique » : skins de cartes (couleurs de la face et du dos).
// price : null = gratuit, sinon prix affiché. Un skin payant est possédé quand il est dans les achats du compte
// (core/account.js), écrits par le serveur de paiement. Un déblocage fait uniquement sur le téléphone serait trop facile à contourner.

const SKINS = [
  { id: 'classique', name: 'Classique', desc: 'Le dos aubergine et laiton de Tournée.', price: null,
    face: '#f7efe2', ink: '#1e1622', red: '#c22a3e', edge: 'transparent', backEdge: '#f7efe2',
    back: 'repeating-linear-gradient(45deg,transparent 0 5px,rgba(240,177,60,.28) 5px 7px),repeating-linear-gradient(-45deg,transparent 0 5px,rgba(240,177,60,.28) 5px 7px),#5a2340' },
  { id: 'nuit', name: 'Nuit blanche', desc: 'Cartes sombres et ciel étoilé, pour les fins de soirée.', price: null,
    face: '#26232e', ink: '#ece6f5', red: '#ff7a8f', edge: '#4a4458', backEdge: '#8fa3d9',
    back: 'radial-gradient(circle,rgba(255,255,255,.35) 0 1px,transparent 1.6px) 0 0/9px 9px,linear-gradient(160deg,#1d2a4a,#101626)' },
  { id: 'tapis', name: 'Tapis vert', desc: 'Le feutre des tables de jeu.', price: null,
    face: '#fbf8f0', ink: '#1b2a20', red: '#b3261e', edge: 'transparent', backEdge: '#fbf8f0',
    back: 'repeating-linear-gradient(45deg,rgba(255,255,255,.13) 0 2px,transparent 2px 9px),repeating-linear-gradient(-45deg,rgba(255,255,255,.13) 0 2px,transparent 2px 9px),#1f5c3a' },
  { id: 'biere', name: 'Pression', desc: 'Un dos doré plein de bulles.', price: '0,99 €',
    face: '#fff8e6', ink: '#2a1a06', red: '#c2410c', edge: 'transparent', backEdge: '#fff8e6',
    back: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,.6) 0 2px,transparent 2.5px) 0 0/11px 13px,radial-gradient(circle at 70% 60%,rgba(255,255,255,.45) 0 1.5px,transparent 2px) 0 0/9px 10px,linear-gradient(180deg,#f8c64a,#d98b12)' },
  { id: 'bistrot', name: 'Bistrot', desc: 'Nappe à carreaux et papier jauni.', price: '0,99 €',
    face: '#f3e6cc', ink: '#2b1d12', red: '#a31f1f', edge: '#c9b58f', backEdge: '#f3e6cc',
    back: 'repeating-linear-gradient(0deg,rgba(200,30,40,.75) 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,rgba(200,30,40,.55) 0 6px,transparent 6px 12px),#fff' },
  { id: 'or', name: 'Carré d’or', desc: 'Bordure dorée et dos en or brossé.', price: '1,99 €',
    face: '#fffaf0', ink: '#2a2418', red: '#9e1b32', edge: '#d4af37', backEdge: '#fffaf0',
    back: 'repeating-linear-gradient(45deg,rgba(255,255,255,.25) 0 1px,transparent 1px 6px),linear-gradient(135deg,#b8860b,#f5d76e 45%,#b8860b)' },
  { id: 'neon', name: 'Néon', desc: 'Encre fluo sur fond noir, ambiance boîte de nuit.', price: '1,99 €',
    face: '#0e0b14', ink: '#7df9ff', red: '#ff4fd8', edge: '#ff4fd8', backEdge: '#7df9ff',
    back: 'linear-gradient(rgba(125,249,255,.35) 1px,transparent 1px) 0 0/10px 10px,linear-gradient(90deg,rgba(255,79,216,.35) 1px,transparent 1px) 0 0/10px 10px,#0e0b14' }
];
const ownsSkin = s => !s.price || owns(s.id);
const skinVars = s => `--face:${s.face};--face-ink:${s.ink};--face-red:${s.red};--face-edge:${s.edge};--back:${s.back};--back-edge:${s.backEdge}`;

// Applique le skin choisi à toutes les cartes de l'app (variables CSS de cards.css)
function applySkin(id = store.get('skin', 'classique')) {
  const s = SKINS.find(x => x.id === id && ownsSkin(x)) || SKINS[0];
  S.skin = s.id;
  document.documentElement.style.cssText = skinVars(s);
}
applySkin();

SCREENS.shop = function () {
  const sample = [{ v: 1, s: '♠', red: false, sn: 'pique' }, { v: 13, s: '♥', red: true, sn: 'cœur' }];
  return `${pageTop('Boutique')}
    <p class="muted" style="margin:0;font-size:14px">Change l’apparence des cartes dans tous les jeux. Le skin choisi reste enregistré sur ce téléphone.</p>
    <div class="skins">${SKINS.map(s => {
      const owned = ownsSkin(s), active = S.skin === s.id;
      const action = active ? '<span class="pill on">Utilisé</span>'
        : owned ? `<button class="btn primary" data-act="useSkin" data-arg="${s.id}">Utiliser</button>`
        : `<button class="btn" data-act="buySkin" data-arg="${s.id}">${s.price}</button>`;
      return `<div class="skin ${active ? 'active' : ''}">
        <div class="skin-preview" style="${skinVars(s)}" aria-hidden="true">${cardHTML('back')}${sample.map(c => cardHTML(c)).join('')}</div>
        <div class="skin-info"><span class="skin-name">${s.name}</span><span class="muted skin-desc">${s.desc}</span>
          <span class="skin-price">${s.price ? (owned ? 'Acheté' : `Premium · ${s.price}`) : 'Gratuit'}</span></div>
        <div class="skin-act">${action}</div>
      </div>`;
    }).join('')}</div>
    <p class="muted" style="margin:0;font-size:13.5px;text-align:center">Les skins premium seront bientôt disponibles à l’achat.${ACC.on ? ' Ils seront liés à ton compte, pour les retrouver sur tous tes appareils.' : ''}</p>
    ${accountButtonHTML()}`;
};

Object.assign(A, {
  useSkin(id) {
    const s = SKINS.find(x => x.id === id);
    if (!s || !ownsSkin(s)) return;
    store.set('skin', id); applySkin(id); render(); toast(`Skin « ${s.name} » activé`);
    track('skin_use', { skin: id });
  },
  buySkin(id) {
    const s = SKINS.find(x => x.id === id);
    track('skin_interest', { skin: id }); // skin premium touché : mesure l'envie d'acheter
    if (buy(id, s.name)) A.useSkin(id);
  }
});
