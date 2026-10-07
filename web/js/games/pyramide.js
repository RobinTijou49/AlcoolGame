// Pyramide : chacun mémorise sa main (4 cartes) une seule fois, puis on retourne 15 cartes en pyramide.
// Celui qui a (ou prétend avoir) la même valeur distribue les gorgées de la rangée. Le bluff est permis.
// PYR_ROWS, pyrRowsHTML, bluffWord et memoTimer servent aussi à la Pyramide en ligne (online.js).

const PYR_ROWS = [[0, 5], [5, 9], [9, 12], [12, 14], [14, 15]]; // [début, fin) par rangée, du bas (1 gorgée) vers le haut (5)
const bluffWord = () => (cfg('pyramide', 'bluff') === 3 ? 'le triple' : 'le double');
let memoTimer; // compte à rebours de la mémorisation

// Rangées du sommet (5 gorgées) à la base (1 gorgée), cartes retournées jusqu'à l'indice k
function pyrRowsHTML(cards, k) {
  return PYR_ROWS.map(([a, b], r) => {
    const cells = [];
    for (let i = a; i < b; i++) cells.push(cardHTML(i <= k ? cards[i] : 'back', i === k ? 'deal hl' : ''));
    const on = k >= a && k < b;
    return `<div class="prow"><span class="tag ${on ? 'on' : ''}" title="${plural(r + 1, 'gorgée')}">×${r + 1}</span>${cells.join('')}<span class="tag" aria-hidden="true"></span></div>`;
  }).reverse().join('');
}

defineGame({
  id: 'pyramide', name: 'Pyramide', suit: '♠', red: false,
  desc: '15 cartes en pyramide. Tu as la carte ? Distribue. Tu bluffes ? Gare à toi.', meta: '2 à 9 joueurs',

  init() {
    const g = { order: order(), phase: 'memo', mi: 0, showing: false, left: 0, deck: newDeck(), hands: {}, cards: [], k: -1, check: false };
    S.players.forEach(p => (g.hands[p] = [draw(g), draw(g), draw(g), draw(g)]));
    g.cards = Array.from({ length: 15 }, () => draw(g)); // ordre de retournement : rangée du bas (1 gorgée) vers le sommet (5)
    return g;
  },

  screen() {
    const g = S.g;
    const R = rules([
      'Chaque joueur reçoit 4 cartes. On se passe le téléphone : chacun voit sa main une seule fois, ' + cfg('pyramide', 'memo') + ' secondes, puis elle est cachée jusqu’à la fin. Retiens-la bien.',
      'La pyramide se retourne carte par carte, de la rangée du bas (1 gorgée) jusqu’au sommet (5 gorgées).',
      'Si tu penses avoir une carte de même valeur, annonce-le et distribue les gorgées de la rangée. Tu peux bluffer.',
      `Quelqu’un te conteste ? « Qui l’a vraiment » tranche : le menteur boit ${bluffWord()}, sinon c’est le contestataire qui boit ${bluffWord()}. Celui qui s’est trompé de bonne foi boit aussi.`,
      'À la fin de la pyramide, toutes les mains sont dévoilées.'
    ], 'pyramide');
    if (S.players.length > 9) return `${header('Pyramide')}${R}<p class="warn">La Pyramide se joue de 2 à 9 joueurs.</p>`;

    // Mémorisation : on se passe le téléphone, chacun voit sa main une fois
    if (g.phase === 'memo') {
      const p = g.order[g.mi], last = g.mi === S.players.length - 1;
      const body = g.showing
        ? `<div class="center">${g.hands[p].map(c => cardHTML(c, 'memo deal')).join('')}</div>
           <div class="hint" id="memoLeft" aria-live="polite">${g.left} s</div>
           <button class="btn primary big" data-act="pyrHide">J’ai retenu, cacher mes cartes</button>`
        : `<div class="center">${[0, 1, 2, 3].map(() => cardHTML('back', 'memo')).join('')}</div>
           <p style="margin:0;text-align:center">Passe le téléphone à <b>${esc(p)}</b>. Les autres, on regarde ailleurs.</p>
           <button class="btn primary big" data-act="pyrShow">Je suis ${esc(p)}, montrer mes cartes</button>`;
      return `${header('Pyramide')}${R}
        <div class="turn"><span class="sub">Mémorisation · joueur ${g.mi + 1}/${S.players.length}${last ? ' · dernier' : ''}</span><span class="who">${esc(p)}</span></div>
        <div class="panel">${body}</div>
        <p class="muted" style="margin:0;text-align:center;font-size:14px">Tes cartes ne s’afficheront plus avant la fin de la partie.</p>`;
    }

    // La pyramide
    let info = '<p class="muted" style="margin:0;text-align:center">Tout le monde a mémorisé sa main. Retourne la première carte.</p>';
    if (g.k >= 0) {
      const c = g.cards[g.k], sips = PYR_ROWS.findIndex(([a, b]) => g.k >= a && g.k < b) + 1;
      const holders = S.players.filter(p => g.hands[p].some(h => h.v === c.v));
      info = `<div class="verdict">${NAME(c.v)} ${c.s} : ceux qui ont un ${NAME(c.v)} distribuent ${plural(sips, 'gorgée')}.</div>
        ${g.check
          ? `<p style="margin:0;text-align:center">${holders.length ? `Ont vraiment un ${NAME(c.v)} : <b>${holders.map(esc).join(', ')}</b>.` : `Personne n’a de ${NAME(c.v)}. Les menteurs boivent ${plural(sips * cfg('pyramide', 'bluff'), 'gorgée')}.`}</p>`
          : `<button class="btn" data-act="pyrCheck">Bluff contesté ? Voir qui l’a vraiment</button>`}`;
    }
    const done = g.k >= 14;
    return `${header('Pyramide')}${R}
      <div class="panel">
        <div class="pyr">${pyrRowsHTML(g.cards, g.k)}</div>
        ${info}
        ${done ? `<div class="verdict ok">Pyramide terminée.</div><button class="btn primary big" data-act="restart">Nouvelle pyramide</button>`
               : `<button class="btn primary big" data-act="pyrFlip">Retourner la carte ${g.k + 2}/15</button>`}
      </div>
      <div class="section"><span class="label">${done ? 'Les mains dévoilées' : 'Les mains, cachées jusqu’à la fin'}</span><div class="hands">${S.players.map(p => `
        <div class="hrow"><span class="n">${esc(p)}</span>
          <div class="hand">${g.hands[p].map(c => cardHTML(done ? c : 'back')).join('')}</div></div>`).join('')}</div></div>`;
  },

  actions: {
    pyrFlip() { const g = S.g; g.k++; g.check = false; render(); },
    pyrCheck() { S.g.check = true; render(); },
    pyrShow() {
      const g = S.g; g.showing = true; g.left = cfg('pyramide', 'memo');
      clearInterval(memoTimer);
      memoTimer = setInterval(() => {
        if (S.screen !== 'pyramide' || S.g !== g || !g.showing) { clearInterval(memoTimer); return; }
        g.left--;
        const el = document.getElementById('memoLeft');
        if (el) el.textContent = g.left + ' s';
        if (g.left <= 0) A.pyrHide();
      }, 1000);
      render();
    },
    pyrHide() {
      const g = S.g; clearInterval(memoTimer);
      g.showing = false; g.mi++;
      if (g.mi >= S.players.length) g.phase = 'play';
      render(); scrollTop();
    }
  },
  // La mémorisation n'est pas annulable, pour ne pas pouvoir revoir une main cachée
  undoable: ['pyrFlip', 'pyrCheck']
});
