// Registre des pages, des jeux et des actions, plus les morceaux d'interface communs.
//
// Chaque fichier de js/games/ et js/pages/ ajoute ici ce qu'il apporte :
//   SCREENS.nom = function qui renvoie le HTML de la page
//   A.nomAction = ce qui se passe quand on touche un bouton data-act="nomAction" (data-arg est passé en paramètre)
// Les jeux se déclarent avec defineGame (voir plus bas).

const SCREENS = {};
const A = {};
const GAMES = [];            // tous les jeux, dans l'ordre de déclaration
const INIT = {};             // INIT[id]() crée une nouvelle partie du jeu id
const UNDOABLE = new Set();  // actions que le bouton « Annuler » peut défaire
const MOUNT = {};            // MOUNT[écran]() : appelé après l'affichage (ex. dessiner la cible des fléchettes)
const ACTION_GAME = {};      // action → jeu auquel elle appartient (pour les jouer en ligne)
// Partie en ligne : pendant l'affichage ou une action, le jeu tourne avec les joueurs de la partie en ligne (voir online.js).
//   online : vrai pendant ce temps ; me : mon prénom dans la partie ; silent : ne pas réafficher
const CTX = { online: false, me: null, silent: false };

// Déclare un jeu : sa tuile, sa mise en place, son écran et ses actions.
//   tab : où il apparaît : 'home' (jeux de cartes, par défaut), 'party' (jeux d'ambiance, sous les jeux de cartes) ou 'board' (jeux de plateau)
//   min : nombre minimum de joueurs (2 par défaut)
//   mount : facultatif, appelé après chaque affichage de l'écran (dessin sur un canvas, etc.)
//   turnOf(g) : en ligne, le joueur qui a la main (seul lui peut agir) ; null = tout le monde
//   online : 'own' si le jeu a sa propre version en ligne dans online.js (Pyramide, Rivière)
function defineGame(game) {
  game.tab = game.tab || 'home';
  game.min = game.min || 2;
  GAMES.push(game);
  INIT[game.id] = game.init;
  SCREENS[game.id] = game.screen;
  if (game.mount) MOUNT[game.id] = game.mount;
  Object.assign(A, game.actions);
  Object.keys(game.actions || {}).forEach(a => (ACTION_GAME[a] = game.id));
  (game.undoable || []).forEach(a => UNDOABLE.add(a));
}

// Mémorise l'état de la partie pour le bouton « Annuler » (fait automatiquement pour les boutons de UNDOABLE)
function remember() {
  if (!S.g) return;
  S.history.push({ g: clone(S.g), sips: clone(S.sips) });
  if (S.history.length > 40) S.history.shift();
}

// ---------- Interface commune ----------
// En-tête d'un jeu : retour à l'accueil, titre, et le compteur de gorgées pour les jeux de cartes
function header(title, sips = true) {
  if (CTX.online) return ''; // en ligne, l'écran de la partie a sa propre barre (Quitter, code)
  return `<div class="top">
    <button class="iconbtn" data-act="home" aria-label="Retour aux jeux">← Jeux</button>
    <h2 class="${title.length > 11 ? 'long' : ''}">${title}</h2>
    ${sips ? '<button class="iconbtn" data-act="sheet">Compteur</button>' : '<span class="iconbtn" style="visibility:hidden" aria-hidden="true">← Jeux</span>'}
  </div>`;
}
// Bloc « Règles » dépliable d'un jeu, avec un lien vers ses réglages s'il en a
function rules(items, id) {
  return `<details class="rules"><summary>Règles</summary><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
    ${SETTINGS[id] && !CTX.online ? `<p style="margin:0 0 14px"><button class="btn" data-act="settings" data-arg="${id}">Réglages de ce jeu</button></p>` : ''}</details>`;
}
// Titre d'une page des onglets
const pageTop = title => `<h1 class="pagetitle">${title}</h1>`;

// ---------- Barre de navigation : 6 onglets en bas de l'écran (masqués pendant une partie) ----------
const ICONS = {
  home: '<rect x="3.5" y="5" width="11" height="15" rx="2"/><path d="M14.5 7.2l4.3 1.2a1.6 1.6 0 0 1 1.1 2l-2.6 9.4"/>',
  board: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="9" r="1.3"/><circle cx="9" cy="15" r="1.3"/><circle cx="15" cy="15" r="1.3"/>',
  players: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><circle cx="17" cy="9" r="2.5"/><path d="M16.6 14.2c2.4.2 3.9 1.9 4.4 4.8"/>',
  lobby: '<rect x="3" y="6" width="7.5" height="13" rx="1.6"/><rect x="13.5" y="6" width="7.5" height="13" rx="1.6"/><path d="M10.5 12.5h3"/>',
  shop: '<path d="M5 8.5h14l-1.2 11.5H6.2z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
};
const TABS = [['home', 'Cartes'], ['board', 'Plateau'], ['players', 'Joueurs'], ['lobby', 'En ligne'], ['shop', 'Boutique'], ['settings', 'Réglages']];
// La barre s'affiche sur les pages des onglets, sauf les réglages ouverts depuis un jeu
const isTab = () => TABS.some(([id]) => id === S.screen) && !(S.screen === 'settings' && S.setBack);
function tabbarHTML() {
  return `<nav class="tabbar" aria-label="Navigation">${TABS.map(([id, label]) =>
    `<button class="tab ${S.screen === id ? 'on' : ''}" data-act="tab" data-arg="${id}" ${S.screen === id ? 'aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg><span>${label}</span></button>`).join('')}</nav>`;
}
