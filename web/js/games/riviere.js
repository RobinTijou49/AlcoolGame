// Rivière : chacun répond à 4 questions pour faire sa main (une erreur = on boit),
// puis on retourne la rivière (10 cartes « Bois » / « Donne ») : ceux qui ont la même valeur boivent ou donnent.
// rivQuestion, rivOk, qSips et riverSips servent aussi à la Rivière en ligne (online.js).

const qSips = round => ({ inc: round + 1, one: 1, two: 2 })[cfg('riviere', 'qSips')];
const riverSips = k => (Math.floor(k / 2) + 1) * cfg('riviere', 'riverMult');

// Question du tour (round 0 à 3) pour un joueur dont la main est hand
function rivQuestion(round, hand) {
  return [
    { q: 'Rouge ou noir ?', opts: [['rouge', 'Rouge', 'red'], ['noir', 'Noir', 'black']] },
    { q: `Plus ou moins que ton ${hand[0] ? NAME(hand[0].v) + ' ' + hand[0].s : ''} ?`, opts: [['plus', 'Plus ▲', ''], ['moins', 'Moins ▼', '']] },
    { q: 'Entre tes deux cartes ou à l’extérieur ?', opts: [['in', 'Intérieur', ''], ['out', 'Extérieur', '']] },
    { q: 'Quelle couleur ?', opts: SUITS.map(s => [s.s, `${s.s} ${s.n[0].toUpperCase() + s.n.slice(1)}`, s.red ? 'red' : 'black']) }
  ][round];
}
// La réponse v est-elle bonne pour la carte c tirée ?
function rivOk(round, hand, c, v) {
  if (round === 0) return (v === 'rouge') === c.red;
  if (round === 1) {
    if (rank(c) === rank(hand[0])) return tieWins();
    return v === 'plus' ? rank(c) > rank(hand[0]) : rank(c) < rank(hand[0]);
  }
  if (round === 2) {
    const lo = Math.min(rank(hand[0]), rank(hand[1])), hi = Math.max(rank(hand[0]), rank(hand[1])), r = rank(c);
    if (r === lo || r === hi) return tieWins();
    return v === 'in' ? r > lo && r < hi : r < lo || r > hi;
  }
  return v === c.s;
}
// Mains de tous les joueurs. hidden : mains cachées pendant la rivière (seules les cartes défaussées restent visibles)
function handsHTML(g, hidden) {
  return `<div class="section"><span class="label">${hidden ? 'Les mains, de mémoire' : 'Les mains'}</span><div class="hands">${S.players.map(p => `
    <div class="hrow"><span class="n">${esc(p)}</span><div class="hand">${[0, 1, 2, 3].map(i => {
      const c = g.hands[p][i];
      return c && c.used ? cardHTML(c, 'used') : cardHTML(c && hidden ? 'back' : c || null);
    }).join('')}</div></div>`).join('')}</div></div>`;
}

defineGame({
  id: 'riviere', name: 'Rivière', suit: '♥', red: true,
  desc: '4 questions pour faire sa main, puis la rivière : bois ou donne.', meta: '2 à 10 joueurs',

  init() {
    const g = { order: order(), phase: 'deal', deck: newDeck(), hands: {}, round: 0, pi: 0, res: null, river: [], k: -1, lines: [] };
    S.players.forEach(p => (g.hands[p] = []));
    return g;
  },

  screen() {
    const g = S.g;
    const R = rules([
      '<b>Phase 1, la main</b> : chaque joueur répond à ses 4 questions d’affilée, puis on passe au suivant. Bonne réponse : rien. Mauvaise : tu bois les gorgées de la question.',
      `<b>Question 1</b> : rouge ou noir ? (${qSips(0)}) · <b>Question 2</b> : plus ou moins que ta 1<sup>re</sup> carte ? (${qSips(1)}) · <b>Question 3</b> : entre tes deux cartes ou à l’extérieur ? (${qSips(2)}) · <b>Question 4</b> : quelle couleur ? (${qSips(3)})`,
      `${tieText()} ${asText()}`,
      `<b>Phase 2, la rivière</b> : 10 cartes sur deux rangées, « Bois » et « Donne », de ${riverSips(0)} à ${riverSips(9)} gorgées. Si une carte retournée a la même valeur qu’une carte de ta main, tu bois ou tu donnes, et ta carte est défaussée.${cfg('riviere', 'hidden') ? ' Les mains sont cachées pendant la rivière : retiens bien tes cartes.' : ''}`,
      'À la fin, celui à qui il reste le plus de cartes prend l’autoroute.'
    ], 'riviere');
    if (S.players.length < 2 || S.players.length > 10) {
      return `${header('Rivière')}${R}<p class="warn">La Rivière se joue de 2 à 10 joueurs.</p>`;
    }

    // Phase 1 : les questions
    if (g.phase === 'deal') {
      const p = g.order[g.pi], hand = g.hands[p];
      const Q = rivQuestion(g.round, hand);
      const slots = [0, 1, 2, 3].map(i => cardHTML(hand[i] || null, `sm ${g.res && i === g.round ? 'deal hl' : ''}`)).join('');
      return `${header('Rivière')}${R}
        <div class="turn"><span class="sub">Question ${g.round + 1}/4 · ${plural(qSips(g.round), 'gorgée')} si tu te trompes</span><span class="who">${esc(p)}</span></div>
        <div class="panel">
          <div class="center">${slots}</div>
          ${g.res ? `<div class="verdict ${g.res.ok ? 'ok' : 'ko'}">${g.res.ok ? `Bien vu ! ${esc(p)} ne boit pas.` : `Perdu… ${esc(p)} boit ${plural(qSips(g.round), 'gorgée')}.`}</div>
                    <button class="btn primary big" data-act="rivNext">${g.round < 3 ? 'Question suivante' : g.pi === S.players.length - 1 ? 'Ouvrir la rivière' : 'Joueur suivant'}</button>`
                 : `<div class="verdict">${Q.q}</div><div class="choices">${Q.opts.map(([v, l, c]) => `<button class="btn ${c}" data-act="rivAnswer" data-arg="${v}">${l}</button>`).join('')}</div>`}
        </div>
        ${handsHTML(g)}`;
    }

    // Phase 2 : la rivière
    const cells = (row) => [0, 1, 2, 3, 4].map(col => {
      const idx = col * 2 + row;
      return cardHTML(idx <= g.k ? g.river[idx] : 'back', idx === g.k ? 'deal hl' : '');
    }).join('');
    const done = g.k >= 9;
    let end = '';
    if (done) {
      const left = S.players.map(p => [p, g.hands[p].filter(c => !c.used).length]);
      const max = Math.max(...left.map(x => x[1]));
      const losers = left.filter(x => x[1] === max).map(x => x[0]);
      end = `<div class="verdict">${losers.length > 1 ? losers.slice(0, -1).map(esc).join(', ') + ' et ' + esc(losers.at(-1)) : esc(losers[0])} ${losers.length > 1 ? 'finissent' : 'finit'} avec ${plural(max, 'carte')}. Direction l’autoroute !</div>
        <div class="choices">${losers.map(l => `<button class="btn primary" data-act="toRoad" data-arg="${esc(l)}">Autoroute pour ${esc(l)}</button>`).join('')}</div>
        <button class="btn ghost" data-act="restart">Rejouer une rivière</button>`;
    }
    return `${header('Rivière')}${R}
      <div class="panel">
        <div class="river">
          <span></span>${[0, 2, 4, 6, 8].map(k => `<span class="num">${riverSips(k)}</span>`).join('')}
          <span class="rl">Bois</span>${cells(0)}
          <span class="rl">Donne</span>${cells(1)}
        </div>
        ${g.k >= 0 ? `<ul class="lines">${g.lines.map(l => `<li>${l}</li>`).join('')}</ul>` : '<p class="muted" style="margin:0;text-align:center">Retourne les cartes une par une, de gauche à droite.</p>'}
        ${done ? end : `<button class="btn primary big" data-act="rivFlip">Retourner la carte ${g.k + 2}/10</button>`}
      </div>
      ${handsHTML(g, cfg('riviere', 'hidden') && !done)}`;
  },

  actions: {
    rivAnswer(v) {
      const g = S.g, p = g.order[g.pi], hand = g.hands[p];
      const c = draw(g);
      const ok = rivOk(g.round, hand, c, v);
      hand.push(c);
      g.res = { ok };
      if (!ok) drink(p, qSips(g.round));
      render();
    },
    rivNext() {
      const g = S.g; g.res = null;
      g.round++;
      if (g.round > 3) { g.round = 0; g.pi++; }
      if (g.pi >= S.players.length) { g.phase = 'river'; g.round = 3; g.river = Array.from({ length: 10 }, () => draw(g)); }
      render(); scrollTop();
    },
    rivFlip() {
      const g = S.g; g.k++;
      const c = g.river[g.k], sips = riverSips(g.k), give = g.k % 2 === 1;
      const lines = [];
      S.players.forEach(p => {
        g.hands[p].forEach(h => {
          if (!h.used && h.v === c.v) {
            h.used = true;
            if (!give) drink(p, sips);
            lines.push(`<b>${esc(p)}</b> a un ${NAME(c.v)} : ${give ? 'donne' : 'boit'} ${plural(sips, 'gorgée')}`);
          }
        });
      });
      g.lines = lines.length ? lines : [`${NAME(c.v)} ${c.s} : personne n’a cette carte.`];
      render();
    },
    // Fin de rivière : le perdant part sur l'Autoroute
    toRoad(name) { S.screen = 'autoroute'; S.g = INIT.autoroute(name); render(); scrollTop(); }
  },
  undoable: ['rivAnswer', 'rivNext', 'rivFlip']
});
