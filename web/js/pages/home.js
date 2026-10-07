// Onglets « À boire » (accueil : tous les jeux où l'on boit, avec ou sans cartes) et « Loisirs » (jeux sans alcool) : qui joue, puis la grille des jeux de l'onglet.

// Carte « Joueurs » : résumé de qui joue et qui commence, mène à l'onglet Joueurs
function whoHTML() {
  const n = S.players.length, ready = n >= 2;
  return `<button class="who ${ready ? '' : 'warn-card'}" data-act="tab" data-arg="players">
      <span class="label">Joueurs · ${n}</span>
      <span class="who-names">${ready ? S.players.map(esc).join(', ') : 'Ajoute au moins 2 joueurs pour jouer'}</span>
      ${ready ? `<span class="muted who-first">★ ${esc(order()[0])} commence</span>` : ''}
      <span class="who-link">${ready ? 'Modifier' : 'Ajouter des joueurs'} ›</span>
    </button>`;
}
// Grille des jeux d'un onglet
function gamesHTML(tab, title) {
  return `<div class="section">
      <span class="label">${title}</span>
      <div class="games">${GAMES.filter(g => g.tab === tab).map(g => `
        <button class="game" data-act="start" data-arg="${g.id}">
          <span class="suit ${g.red ? 'r' : ''}" aria-hidden="true">${g.suit}</span>
          <span class="gname">${g.name}</span>
          <span class="gdesc">${g.desc}</span>
          <span class="gmeta">${g.meta}</span>
        </button>`).join('')}</div>
    </div>`;
}

SCREENS.home = function () {
  return `
    <div class="brand">
      <div><h1>Tournée</h1><p>Les jeux à boire de soirée, sans paquet ni arbitre.</p></div>
      <div class="fan" aria-hidden="true">${cardHTML({ v: 1, s: '♠', red: false, sn: 'pique' })}${cardHTML({ v: 13, s: '♥', red: true, sn: 'cœur' })}${cardHTML({ v: 7, s: '♦', red: true, sn: 'carreau' })}</div>
    </div>
    ${canOfferInstall() ? `<button class="banner" data-act="install">${SHARE_ICON}<span><b>Installe Tournée</b> sur ton écran d’accueil pour l’ouvrir comme une app.</span></button>` : ''}
    ${whoHTML()}
    ${themeHTML()}
    ${gamesHTML('home', 'Jeux de cartes')}
    ${gamesHTML('party', 'Sans cartes')}`;
};

SCREENS.board = function () {
  return `${pageTop('Loisirs')}
    <p class="muted" style="margin:0;font-size:14px">Les jeux sans alcool, sans plateau ni feuille de score : le téléphone tient les comptes.</p>
    ${whoHTML()}
    ${gamesHTML('board', 'Jeux sans alcool')}`;
};
