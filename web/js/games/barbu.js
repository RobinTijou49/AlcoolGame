// Barbu : on pioche chacun son tour, chaque carte impose son action (voir core/card-rules.js).

defineGame({
  id: 'barbu', name: 'Barbu', suit: '♣', red: false,
  desc: 'On pioche à tour de rôle, chaque carte impose son action.', meta: '3 joueurs et +',

  init() {
    return { order: order(), deck: newDeck(), last: null, turn: 0, by: null };
  },

  screen() {
    const g = S.g, p = g.order, total = g.deck.length, over = total === 0 && !cfg('barbu', 'endless');
    const pile = over ? cardHTML(null) : Array.from({ length: Math.min(4, Math.ceil(total / 13)) }, (_, i) =>
      `<div class="card back" style="transform:translate(${i * 2}px,${-i * 2}px)"></div>`).join('');
    let result = '<p class="rule-text muted" style="margin:0">Chacun pioche à son tour et applique l’action de la carte.</p>';
    if (g.last) {
      const r = S.rules.barbu[g.last.v];
      result = `<div class="center">${cardHTML(g.last, 'lg deal')}</div>
        <div class="rule-title">${esc(r.t)}</div><p class="rule-text" style="margin:0">${esc(r.d)}</p>`;
    }
    return `${header('Barbu')}
      ${rulesBlock('barbu')}
      <div class="turn"><span class="sub">${g.last ? `${esc(g.by)} a pioché · au tour de` : 'Au tour de'}</span><span class="who">${over ? 'Fin du paquet' : esc(p[g.turn % p.length])}</span></div>
      <div class="deckpile" aria-label="${plural(total, 'carte')} dans la pioche">${pile}</div>
      <div class="kings">${plural(total, 'carte')} dans la pioche</div>
      <div class="panel">${result}</div>
      ${over ? `<button class="btn primary big" data-act="restart">Nouvelle partie</button>`
             : `<button class="btn primary big" data-act="barbuDraw">Piocher</button>`}`;
  },

  turnOf: g => (g.deck.length || cfg('barbu', 'endless')) ? g.order[g.turn % g.order.length] : null,
  actions: {
    barbuDraw() {
      const g = S.g;
      if (!g.deck.length) {
        if (!cfg('barbu', 'endless')) return;
        g.deck = newDeck();
      }
      const c = g.deck.pop();
      g.by = g.order[g.turn % g.order.length];
      g.last = c; g.turn++;
      const r = S.rules.barbu[c.v];
      if (r.sips) drink(g.by, r.sips);
      render();
    }
  },
  undoable: ['barbuDraw']
});
