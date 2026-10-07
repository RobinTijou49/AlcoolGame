// Purple : rouge, noir, ou « purple » (les deux prochaines cartes sont une rouge et une noire).
// Les bonnes réponses font grossir la pile ; une erreur fait boire toute la pile.

defineGame({
  id: 'purple', name: 'Purple', suit: '♦', red: true,
  desc: 'Rouge, noir ou purple ? La pile grossit tant que tu as raison.', meta: '2 joueurs et +',

  init() {
    return { order: order(), deck: newDeck(), pile: 0, turn: 0, streak: 0, last: null };
  },

  screen() {
    const g = S.g, p = g.order[g.turn % g.order.length];
    const stack = Array.from({ length: Math.min(g.pile, 5) }, (_, i) => `<div class="card back" style="transform:translate(${i * 3}px,${-i * 3}px) rotate(${(i % 2 ? 1 : -1) * i * 2}deg)"></div>`).join('') || cardHTML(null);
    let res = '<p class="muted" style="margin:0;text-align:center">Rouge ou noir pour une carte. Purple : les deux prochaines cartes sont une rouge et une noire.</p>';
    if (g.last) {
      const L = g.last;
      res = `<div class="center">${L.cards.map(c => cardHTML(c, 'lg deal')).join('')}</div>
        <div class="verdict ${L.ok ? 'ok' : 'ko'}">${L.ok ? `Bien vu ${esc(L.who)} !` : `Raté ! ${esc(L.who)} boit ${plural(L.sips, 'gorgée')}.`}</div>`;
    }
    const need = cfg('purple', 'pass'), canPass = g.streak >= need;
    return `${header('Purple')}
      ${rules([
        'Annonce <b>Rouge</b> ou <b>Noir</b> pour la prochaine carte, ou <b>Purple</b> si les deux suivantes sont une rouge et une noire.',
        'Bonne réponse : les cartes vont sur la pile et tu rejoues.',
        `Après ${plural(need, 'bonne réponse')} d’affilée, tu peux passer la main. La pile reste pour le suivant.`,
        'Mauvaise réponse : tu bois autant de gorgées que de cartes sur la pile (cartes tirées comprises), la pile repart à zéro et c’est au suivant.'
      ], 'purple')}
      <div class="turn"><span class="sub">À toi de deviner</span><span class="who">${esc(p)}</span></div>
      <div class="streak" aria-label="${g.streak} bonne(s) réponse(s) d’affilée">${Array.from({ length: need }, (_, i) => `<i class="${g.streak > i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="pile"><div class="stack">${stack}</div><div><div class="count">${g.pile}</div><div class="muted">carte${g.pile > 1 ? 's' : ''} sur la pile</div></div></div>
      <div class="panel">${res}</div>
      <div class="choices">
        <button class="btn red" data-act="purpleGuess" data-arg="rouge">Rouge</button>
        <button class="btn black" data-act="purpleGuess" data-arg="noir">Noir</button>
        <button class="btn purple" data-act="purpleGuess" data-arg="purple">Purple</button>
      </div>
      <button class="btn big" data-act="purplePass" ${canPass ? '' : 'disabled'}>${canPass ? 'Passer la main' : `Passer la main dans ${need - g.streak}`}</button>`;
  },

  turnOf: g => g.order[g.turn % g.order.length],
  actions: {
    purpleGuess(v) {
      const g = S.g, who = g.order[g.turn % g.order.length];
      const cards = v === 'purple' ? [draw(g), draw(g)] : [draw(g)];
      const ok = v === 'purple' ? cards[0].red !== cards[1].red : (v === 'rouge') === cards[0].red;
      if (ok) { g.pile += cards.length; g.streak++; g.last = { cards, ok, who }; }
      else {
        const sips = g.pile + cards.length;
        drink(who, sips);
        g.last = { cards, ok, who, sips };
        g.pile = 0; g.streak = 0; g.turn++;
      }
      render();
    },
    purplePass() { const g = S.g; g.turn++; g.streak = 0; g.last = null; render(); }
  },
  undoable: ['purpleGuess', 'purplePass']
});
