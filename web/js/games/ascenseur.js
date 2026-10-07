// Ascenseur : le donneur tire une carte cachée, le joueur devine son « étage » en deux essais.
// Trouvé : le donneur boit. Raté deux fois : le joueur boit l'écart. Après plusieurs ratés, le donneur change.

defineGame({
  id: 'ascenseur', name: 'Ascenseur', suit: '♥', red: true,
  desc: 'Devine l’étage de la carte du donneur. Ça monte, ça descend, ça boit.', meta: '2 joueurs et +',

  init() {
    const g = { order: order(), deck: newDeck(), seen: {}, dealer: 0, player: 1, fails: 0, guess: null, res: null };
    g.cur = draw(g);
    return g;
  },

  screen() {
    const g = S.g, P = g.order;
    const dealer = P[g.dealer % P.length], player = P[g.player % P.length];
    const actual = rank(g.cur);
    // Les 13 étages, du plus fort en haut au plus faible en bas ; les points montrent les cartes déjà sorties
    const floors = [];
    const top = cfg('general', 'asHigh') ? 14 : 13;
    for (let r = top; r >= top - 12; r--) {
      const v = r === 14 || r === 1 ? 1 : r;
      let cls = '', dis = !!g.res;
      if (g.res && r === actual) cls = 'hit';
      else if (g.guess === r) cls = 'guess';
      if (!g.res && g.guess !== null) dis = g.guess === r || (actual > g.guess ? r < g.guess : r > g.guess);
      const seen = g.seen[r] || 0;
      floors.push(`<button class="floor ${cls}" data-act="liftGuess" data-arg="${r}" ${dis ? 'disabled' : ''} aria-label="Étage ${NAME(v)}">
        <span>${LABEL(v)}</span><span class="seen" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i < seen ? 'on' : ''}"></i>`).join('')}</span></button>`);
    }
    let panel;
    if (g.res) {
      panel = `<div class="center">${cardHTML(g.cur, 'lg deal')}</div>
        <div class="verdict ${g.res.ok ? 'ok' : 'ko'}">${g.res.msg}</div>
        ${g.res.extra ? `<p style="margin:0;text-align:center">${g.res.extra}</p>` : ''}
        <button class="btn primary big" data-act="liftNext">Joueur suivant</button>`;
    } else if (g.guess !== null) {
      panel = `${cardHTML('back', 'lg')}
        <div class="hint">${actual > g.guess ? 'Ça monte ▲' : 'Ça descend ▼'}</div>
        <p style="margin:0;text-align:center">Dernier essai, ${esc(player)}. Choisis un autre étage.</p>`;
    } else {
      panel = `${cardHTML('back', 'lg')}
        <p style="margin:0;text-align:center"><b>${esc(dealer)}</b> a tiré une carte. Devine son étage, <b>${esc(player)}</b>.</p>`;
    }
    return `${header('Ascenseur')}
      ${rules([
        `Le donneur tire une carte sans la montrer. Le joueur devine son étage, ${cfg('general', 'asHigh') ? 'du 2 (rez-de-chaussée) à l’As (dernier étage)' : 'de l’As (rez-de-chaussée) au Roi (dernier étage)'}.`,
        'Raté au premier essai : l’ascenseur indique si ça monte ou si ça descend, et le joueur a un second essai.',
        `Trouvé du premier coup : le donneur boit ${plural(cfg('ascenseur', 'first'), 'gorgée')}. Au second essai : le donneur boit ${plural(cfg('ascenseur', 'second'), 'gorgée')}.`,
        'Raté deux fois : le joueur boit l’écart entre son étage et le bon.',
        `Après ${plural(cfg('ascenseur', 'fails'), 'joueur')} raté${cfg('ascenseur', 'fails') > 1 ? 's' : ''} d’affilée, le donneur passe la main. Les points sous chaque étage montrent les cartes déjà sorties.`
      ], 'ascenseur')}
      <div class="stats"><span>Donneur <b>${esc(dealer)}</b></span><span>Ratés d’affilée <b>${g.fails}</b>/${cfg('ascenseur', 'fails')}</span></div>
      <div class="turn"><span class="sub">Devine l’étage</span><span class="who">${esc(player)}</span></div>
      <div class="lift">
        <div class="shaft">${floors.join('')}</div>
        <div class="panel" style="align-items:center">${panel}</div>
      </div>`;
  },

  turnOf: g => g.order[g.player % g.order.length],
  actions: {
    liftGuess(arg) {
      const g = S.g, r = +arg, actual = rank(g.cur), P = g.order;
      const dealer = P[g.dealer % P.length], player = P[g.player % P.length];
      const second = g.guess !== null;
      if (r === actual) {
        const n = cfg('ascenseur', second ? 'second' : 'first');
        drink(dealer, n); g.fails = 0;
        g.res = { ok: true, msg: `${second ? 'Trouvé au second essai' : 'Dans le mille'} ! ${esc(dealer)} boit ${plural(n, 'gorgée')}.` };
      } else if (!second) {
        g.guess = r; render(); return;
      } else {
        const n = Math.abs(r - actual);
        drink(player, n); g.fails++;
        g.res = { ok: false, msg: `Raté ! ${esc(player)} boit ${plural(n, 'gorgée')} (écart de ${n} étage${n > 1 ? 's' : ''}).` };
        if (g.fails >= cfg('ascenseur', 'fails')) {
          g.res.extra = `${g.fails} raté${g.fails > 1 ? 's' : ''} d’affilée : <b>${esc(P[(g.dealer + 1) % P.length])}</b> devient le donneur.`;
          g.dealer = (g.dealer + 1) % P.length; g.fails = 0;
        }
      }
      g.guess = r;
      g.seen[actual] = (g.seen[actual] || 0) + 1;
      render();
    },
    liftNext() {
      const g = S.g, n = S.players.length;
      g.player = (g.player + 1) % n;
      if (g.player === g.dealer % n) g.player = (g.player + 1) % n;
      if (!g.deck.length) g.seen = {};
      g.cur = draw(g); g.guess = null; g.res = null;
      render();
    }
  },
  undoable: ['liftGuess', 'liftNext']
});
