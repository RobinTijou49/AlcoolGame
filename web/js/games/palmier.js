// Palmier : les 52 cartes en cercle autour d'un verre. Chaque carte tirée a son action (voir core/card-rules.js).
// Chaque Roi remplit un peu le verre central ; le dernier Roi (réglage « kings ») le boit.

defineGame({
  id: 'palmier', name: 'Palmier', suit: '♣', red: false,
  desc: 'Les cartes en cercle autour du verre. Chaque carte a sa règle.', meta: '3 joueurs et +',

  init() {
    const deck = newDeck();
    deck.forEach((c, i) => (c.pos = i)); // place fixe de chaque carte dans le cercle
    return { order: order(), deck, last: null, kings: 0, turn: 0, by: null };
  },

  screen() {
    const g = S.g, p = g.order;
    const total = g.deck.length;
    const ring = g.deck.map(c => {
      const a = (c.pos / 52) * 360;
      return `<div class="card back" style="transform:rotate(${a}deg) translateY(calc(-1 * min(120px, 33vw)))"></div>`;
    }).join('');
    const K = cfg('palmier', 'kings'), fill = Math.min(g.kings, K) / K * 88;
    let result = `<p class="rule-text muted">Tire une carte du cercle. Le Roi remplit le verre central, le ${K}<sup>e</sup> Roi le boit.</p>`;
    if (g.last) {
      const r = S.rules.palmier[g.last.v];
      let d = esc(r.d);
      if (g.last.v === 13 && g.kings === K) d += ` <b>${K}<sup>e</sup> Roi ! ${esc(g.by)} boit le verre central. Santé.</b>`;
      else if (g.last.v === 13) d += ` (Rois : ${g.kings}/${K})`;
      result = `<div class="center">${cardHTML(g.last, 'lg deal')}</div>
        <div class="rule-title">${esc(r.t)}</div><p class="rule-text" style="margin:0">${d}</p>`;
    }
    const over = total === 0 && !cfg('palmier', 'endless');
    return `${header('Palmier')}
      ${rulesBlock('palmier')}
      <div class="turn"><span class="sub">${g.last ? `${esc(g.by)} a tiré · au tour de` : 'Au tour de'}</span><span class="who">${over ? 'Fin du paquet' : esc(p[g.turn % p.length])}</span></div>
      <div class="palm" aria-label="${plural(total, 'carte')} autour du verre">
        <div class="ring">${ring}</div>
        <div class="glass" aria-hidden="true"><div class="fill" style="height:${fill}%"><div class="foam" style="top:0"></div></div></div>
      </div>
      <div class="kings">${plural(total, 'carte')} restante${total > 1 ? 's' : ''} · Rois : ${g.kings}/${K}</div>
      <div class="panel">${result}</div>
      ${over ? `<button class="btn primary big" data-act="restart">Nouvelle partie</button>`
             : `<button class="btn primary big" data-act="palmDraw">Tirer une carte</button>`}`;
  },

  turnOf: g => (g.deck.length || cfg('palmier', 'endless')) ? g.order[g.turn % g.order.length] : null,
  actions: {
    palmDraw() {
      const g = S.g;
      if (!g.deck.length) {
        if (!cfg('palmier', 'endless')) return;
        g.deck = newDeck(); g.deck.forEach((c, i) => (c.pos = i)); // on remélange un paquet complet
      }
      const c = g.deck.splice(Math.floor(Math.random() * g.deck.length), 1)[0];
      g.by = g.order[g.turn % g.order.length];
      g.last = c; g.turn++;
      if (c.v === 13) g.kings = (g.kings >= cfg('palmier', 'kings') ? 0 : g.kings) + 1; // verre bu : on en remplit un nouveau
      const r = S.rules.palmier[c.v];
      if (r.sips) drink(g.by, r.sips);
      render();
    }
  },
  undoable: ['palmDraw']
});
