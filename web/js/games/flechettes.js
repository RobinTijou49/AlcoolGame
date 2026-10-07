// Fléchettes (301 / 501 / 701) : on lance la fléchette sur la cible à l'écran (games/dartboard.js).
// Chaque joueur lance 3 fléchettes par tour ; le premier à finir pile à zéro gagne.
// En ligne (online.js), chacun lance depuis son téléphone et les autres voient les fléchettes arriver.

defineGame({
  id: 'flechettes', tab: 'board', name: 'Fléchettes', suit: '◎', red: true,
  desc: 'Attrape la fléchette et lance-la sur la cible d’un geste vers le haut.', meta: '1 joueur et +', min: 1,

  init() {
    return dartsNew(order(), cfg('flechettes', 'start'));
  },

  screen() {
    const g = S.g, p = dartsPlayer(g), over = dartsTurnOver(g);
    let status;
    if (g.winner) status = `<div class="verdict ok">${esc(g.winner)} gagne en ${plural(g.stats[g.winner].darts, 'fléchette')} !</div>
      <button class="btn primary big" data-act="restart">Nouvelle partie</button>`;
    else if (g.bust) status = `<div class="verdict ko">Dépassé ! ${esc(p)} reste à ${g.left[p]}.</div>
      <button class="btn primary big" data-act="dartNext">Joueur suivant</button>`;
    else if (over) status = `<button class="btn primary big" data-act="dartNext">Valider · joueur suivant</button>`;
    else status = `<p class="muted" style="margin:0;text-align:center">Fléchette ${g.darts.length + 1}/3 : attrape la fléchette en bas et lance-la vers la cible d’un geste rapide vers le haut.</p>`;

    // La cible tout en haut, avec une seule ligne au-dessus : qui joue, son score, ses 3 fléchettes
    return `${header('Fléchettes', false)}
      <div class="dstrip"><span class="dwho"><span class="muted">${g.winner ? 'Gagnant' : 'Au tour de'}</span> <b>${esc(g.winner || p)}</b></span>
        <b class="dleft">${g.winner ? 0 : dartsRemaining(g)}</b>${dartsSlotsHTML(g)}</div>
      <canvas id="dartboard" class="dartboard ${over ? 'locked' : ''}" aria-label="Cible : fais glisser la fléchette vers le haut pour la lancer"></canvas>
      ${status}
      ${dartsScoresHTML(g)}
      ${rules([
        `Chacun part de ${g.start} et lance 3 fléchettes par tour. Les points touchés sont retirés du score.`,
        'Double : l’anneau extérieur compte deux fois. Triple : l’anneau du milieu compte trois fois. 25 : le cercle vert autour du centre. Bull : le centre rouge, 50 points.',
        cfg('flechettes', 'doubleOut') ? 'Pour gagner, il faut tomber pile à zéro avec un double ou le Bull.' : 'Pour gagner, il faut tomber pile à zéro.',
        'Dépasser zéro annule les points du tour. La moyenne affichée est celle de 3 fléchettes.',
        'Pour lancer : attrape la fléchette en bas, puis lance-la d’un geste rapide vers le haut. Là où tu lâches et la direction du geste donnent la colonne ; plus le geste est rapide, plus la fléchette monte haut.'
      ], 'flechettes')}`;
  },

  mount() {
    const g = S.g;
    // En ligne, seul le joueur dont c'est le tour peut lancer ; les autres voient les fléchettes arriver
    const myTurn = !CTX.online || dartsPlayer(g) === CTX.me;
    mountDartboard(g.darts, dartsTurnOver(g) || !myTurn ? null : (x, y) => act('dartLand', `${x}:${y}`));
  },

  turnOf: g => g.winner ? null : dartsPlayer(g),
  actions: {
    // Point d'impact « x:y » en coordonnées de cible
    dartLand(arg) {
      const [x, y] = arg.split(':').map(Number);
      dartsThrow(S.g, dartHitAt(x, y)); render();
    },
    dartNext() { dartsNext(S.g); render(); }
  },
  undoable: ['dartLand', 'dartNext']
});
