// Autoroute : un pilote passe les cartes une à une en devinant « plus » ou « moins ».
// Une erreur le fait boire et repartir du départ.

const crashSips = g => ({ pos: g.pos + 1, one: 1, two: 2 })[cfg('autoroute', 'crash')];

defineGame({
  id: 'autoroute', name: 'Autoroute', suit: '♠', red: false,
  desc: 'Plus ou moins, carte après carte. Une erreur et on repart du péage.', meta: '1 pilote', min: 1,

  init(driver) {
    const g = { deck: newDeck(), len: cfg('autoroute', 'len') + 1, driver: driver || order()[0], tries: 1, total: 0, crash: null, done: false };
    g.slots = Array(g.len).fill(null); g.slots[0] = draw(g); g.pos = 0;
    return g;
  },

  screen() {
    const g = S.g;
    const slots = g.slots.map((c, i) => {
      let cls = i === g.pos && !g.crash ? 'hl' : '';
      if (g.crash && i === g.pos + 1) return `<div class="slot">${cardHTML(g.crash.card, 'deal hl')}<span class="km" style="color:var(--bad)">Crash</span></div>`;
      if (i === g.pos && c) cls += ' deal';
      return `<div class="slot">${cardHTML(c || 'back', cls)}<span class="km">${i === 0 ? 'Départ' : i === g.len - 1 ? 'Arrivée' : `${i}`}</span></div>`;
    }).join('');
    let msg, actions;
    if (g.done) {
      msg = `<div class="verdict ok">${esc(g.driver)} est arrivé·e au bout en ${plural(g.tries, 'essai')} et ${plural(g.total, 'gorgée')}.</div>`;
      actions = `<button class="btn primary big" data-act="roadNew">Nouveau trajet</button>`;
    } else if (g.crash) {
      msg = `<div class="verdict ko">${g.crash.tie ? 'Égalité, ça compte comme une erreur.' : 'Raté !'} ${esc(g.driver)} boit ${plural(g.crash.sips, 'gorgée')} et repart du départ.</div>`;
      actions = `<button class="btn primary big" data-act="roadRetry">Repartir</button>`;
    } else {
      const cur = g.slots[g.pos];
      msg = `<div class="verdict">La prochaine carte est-elle plus forte ou plus faible que ${NAME(cur.v)} ${cur.s} ?</div>
        <p class="muted" style="margin:0;text-align:center">Une erreur ici coûte ${plural(crashSips(g), 'gorgée')}.</p>`;
      actions = `<div class="choices"><button class="btn primary" data-act="roadGuess" data-arg="plus">Plus ▲</button><button class="btn primary" data-act="roadGuess" data-arg="moins">Moins ▼</button></div>`;
    }
    return `${header('Autoroute')}
      ${rules([
        `${g.len} cartes en ligne. La première est retournée, c’est le départ.`,
        `Devine si la suivante est <b>plus forte</b> ou <b>plus faible</b>. ${asText()} ${tieText()}`,
        cfg('autoroute', 'crash') === 'pos' ? 'Une erreur sur la carte n°N : tu bois N gorgées et tu repars du départ avec de nouvelles cartes.' : `Une erreur : tu bois ${plural(crashSips(g), 'gorgée')} et tu repars du départ avec de nouvelles cartes.`,
        `Tu sors de l’autoroute quand tu as passé les ${g.len - 1} cartes.`
      ], 'autoroute')}
      <div class="section"><span class="label">Pilote</span>
        <div class="chips">${S.players.map(p => `<button class="chip pick" data-act="roadDriver" data-arg="${esc(p)}" aria-pressed="${p === g.driver}">${esc(p)}</button>`).join('')}</div></div>
      <div class="road"><div class="lane" style="--cw:min(50px, calc((100vw - 140px) / ${g.len}))">${slots}</div></div>
      <div class="stats"><span>Essai <b>${g.tries}</b></span><span>Gorgées <b>${g.total}</b></span><span>Carte <b>${Math.min(g.pos + 1, g.len - 1)}</b>/${g.len - 1}</span></div>
      <div class="panel">${msg}${actions}</div>`;
  },

  turnOf: g => g.driver,
  actions: {
    roadDriver(name) { S.g = INIT.autoroute(name); render(); },
    roadGuess(v) {
      const g = S.g, cur = g.slots[g.pos], c = draw(g);
      const tie = rank(c) === rank(cur);
      const ok = tie ? tieWins() : v === 'plus' ? rank(c) > rank(cur) : rank(c) < rank(cur);
      if (ok) {
        g.pos++; g.slots[g.pos] = c;
        if (g.pos === g.len - 1) g.done = true;
      } else {
        const sips = crashSips(g);
        g.total += sips; drink(g.driver, sips);
        g.crash = { card: c, sips, tie };
      }
      render();
    },
    roadRetry() {
      const g = S.g; g.crash = null; g.tries++;
      g.slots = Array(g.len).fill(null); g.slots[0] = draw(g); g.pos = 0;
      render();
    },
    roadNew() { S.g = INIT.autoroute(S.g.driver); render(); }
  },
  undoable: ['roadGuess', 'roadRetry', 'roadDriver', 'roadNew']
});
