// Uno sur un seul téléphone : on se le passe, et chacun ne voit sa main que pendant son tour.
// Paquet de 108 cartes : par couleur un 0, deux de chaque chiffre 1 à 9, deux Passe, deux Inversion, deux +2 ;
// plus 4 Jokers et 4 +4. Pose une carte de même couleur ou de même symbole ; le premier sans carte gagne.

const UNO_COLORS = { r: 'Rouge', j: 'Jaune', v: 'Vert', b: 'Bleu' };
const UNO_SYMBOL = { skip: '⊘', rev: '⇄', '+2': '+2', wild: '✦', '+4': '+4' };
const UNO_NAME = { skip: 'Passe', rev: 'Inversion', '+2': '+2', wild: 'Joker', '+4': '+4' };

function unoDeck() {
  const d = [];
  for (const c of Object.keys(UNO_COLORS)) {
    d.push({ c, t: '0' });
    for (const t of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'rev', '+2']) d.push({ c, t }, { c, t });
  }
  for (let i = 0; i < 4; i++) d.push({ c: 'w', t: 'wild' }, { c: 'w', t: '+4' });
  return shuffle(d);
}
const unoLabel = card => UNO_SYMBOL[card.t] || card.t;
const unoTitle = card => card.c === 'w' ? UNO_NAME[card.t] : `${UNO_NAME[card.t] || card.t} ${UNO_COLORS[card.c].toLowerCase()}`;
// HTML d'une carte Uno ; color : couleur choisie pour un Joker déjà posé
function unoHTML(card, attrs = '', color) {
  const c = card.c === 'w' ? (color || 'w') : card.c;
  return `<span class="uno uno-${c} ${card.c === 'w' ? 'wild' : ''}" ${attrs} role="img" aria-label="${unoTitle(card)}"><i>${unoLabel(card)}</i></span>`;
}
// Pioche n cartes pour le joueur p (remélange la défausse si la pioche est vide)
function unoTake(g, p, n) {
  for (let i = 0; i < n; i++) {
    if (!g.deck.length) {
      const top = g.discard.pop();
      g.deck = shuffle(g.discard); g.discard = [top];
      if (!g.deck.length) return;
    }
    g.hands[p].push(g.deck.pop());
  }
}
const unoTop = g => g.discard[g.discard.length - 1];
const unoPlayable = (g, card) => card.c === 'w' || card.c === g.color || card.t === unoTop(g).t;
const unoNext = (g, steps = 1) => ((g.turn + g.dir * steps) % g.order.length + g.order.length) % g.order.length;

defineGame({
  id: 'uno', tab: 'board', name: 'Uno', suit: '✦', red: true,
  desc: 'On se passe le téléphone, chacun voit sa main à son tour. Le premier sans carte gagne.', meta: '2 à 10 joueurs',

  init() {
    const g = { order: order(), hands: {}, deck: unoDeck(), discard: [], dir: 1, turn: 0, phase: 'pass', drew: false, picking: null, winner: null, log: '' };
    g.order.forEach(p => { g.hands[p] = []; unoTake(g, p, 7); });
    // Première carte : un chiffre (les cartes spéciales retournent sous le paquet)
    let first = g.deck.pop();
    while (!/^\d$/.test(first.t)) { g.deck.unshift(first); first = g.deck.pop(); }
    g.discard.push(first); g.color = first.c;
    return g;
  },

  screen() {
    const g = S.g, p = g.order[g.turn], top = unoTop(g);
    const R = rules([
      'Pose une carte de la même couleur ou du même symbole que la carte du dessus. Le Joker et le +4 se posent sur tout et choisissent la couleur.',
      'Passe : le joueur suivant passe son tour. Inversion : le sens change. +2 et +4 : le suivant pioche et passe son tour.',
      'Tu ne peux pas jouer ? Pioche une carte : si elle va, tu peux la poser, sinon passe.',
      'Le premier qui n’a plus de carte gagne la manche.'
    ], 'uno');
    if (S.players.length > 10) return `${header('Uno', false)}${R}<p class="warn">L’Uno se joue de 2 à 10 joueurs.</p>`;
    const counts = `<div class="chips" style="justify-content:center">${g.order.map(q =>
      `<span class="chip ${q === p && !g.winner ? 'cur' : ''}">${esc(q)} · ${g.hands[q].length}</span>`).join('')}</div>`;
    const table = `<div class="unotable">
        <span class="uno back" aria-label="Pioche"><i>${g.deck.length}</i></span>
        ${unoHTML(top, 'style="--uw:84px"', g.color)}
        <span class="unocolor uno-${g.color}">${UNO_COLORS[g.color]}<br><small>${g.dir === 1 ? 'sens ↻' : 'sens ↺'}</small></span>
      </div>`;
    const log = g.log ? `<p style="margin:0;text-align:center">${g.log}</p>` : '';

    if (g.winner) {
      return `${header('Uno', false)}${R}
        <div class="verdict ok">${esc(g.winner)} n’a plus de cartes et gagne la manche !</div>${log}
        <div class="hands">${g.order.filter(q => q !== g.winner).map(q => `<div class="hrow"><span class="n">${esc(q)}</span>
          <span class="muted">${plural(g.hands[q].length, 'carte')} en main</span></div>`).join('')}</div>
        <button class="btn primary big" data-act="restart">Nouvelle manche</button>`;
    }

    // Entre deux tours : main cachée, on passe le téléphone (en ligne, chacun a déjà son téléphone)
    if (g.phase === 'pass' && !CTX.online) {
      return `${header('Uno', false)}${R}
        ${table}${log}${counts}
        <div class="panel" style="align-items:center;text-align:center">
          <p style="margin:0">Passe le téléphone à <b>${esc(p)}</b>. Les autres, on ne regarde pas.</p>
          <button class="btn primary big" data-act="unoReveal">Je suis ${esc(p)}, voir ma main</button>
        </div>`;
    }

    // La main : celle du joueur dont c'est le tour ; en ligne, toujours la mienne (jouable seulement à mon tour)
    const viewer = CTX.online ? CTX.me : p, myTurn = viewer === p;
    const hand = (g.hands[viewer] || []).map((card, i) => {
      const ok = myTurn && unoPlayable(g, card) && g.picking === null;
      return `<button class="unobtn ${ok ? '' : 'off'}" data-act="unoPlay" data-arg="${i}" ${ok ? '' : 'disabled'} aria-label="Jouer ${unoTitle(card)}">${unoHTML(card)}</button>`;
    }).join('');
    const canPlay = g.hands[p].some(card => unoPlayable(g, card));
    const picker = myTurn && g.picking !== null ? `<div class="panel"><span class="label" style="text-align:center">Choisis la couleur</span>
        <div class="choices">${Object.entries(UNO_COLORS).map(([c, n]) => `<button class="btn unopick uno-${c}" data-act="unoColor" data-arg="${c}">${n}</button>`).join('')}</div>
        <button class="btn ghost" data-act="unoCancel">Annuler</button></div>` : '';
    return `${header('Uno', false)}${R}
      ${table}${log}${CTX.online ? counts : ''}
      <div class="turn"><span class="sub">${myTurn ? 'À toi de jouer' : 'Ta main'}</span><span class="who">${esc(viewer)}</span></div>
      ${picker}
      <div class="unohand">${hand}</div>
      ${myTurn ? `<div class="choices">
        <button class="btn" data-act="unoDraw" ${g.drew || g.picking !== null ? 'disabled' : ''}>Piocher</button>
        <button class="btn ${g.drew && !canPlay ? 'primary' : ''}" data-act="unoPass" ${g.drew && g.picking === null ? '' : 'disabled'}>Passer</button>
      </div>
      ${!g.drew && !canPlay ? '<p class="muted" style="margin:0;text-align:center">Aucune carte ne va : pioche.</p>' : ''}`
      : `<p class="muted" style="margin:0;text-align:center">${esc(p)} joue…</p>`}`;
  },

  turnOf: g => g.winner ? null : g.order[g.turn],
  actions: {
    unoReveal() { S.g.phase = 'play'; S.g.log = ''; render(); scrollTop(); },
    unoPlay(i) {
      const g = S.g, p = g.order[g.turn], card = g.hands[p][+i];
      if (!card || !unoPlayable(g, card)) return;
      if (card.c === 'w') { g.picking = +i; render(); return; }
      unoApply(g, +i, card.c);
    },
    unoColor(c) { const g = S.g; if (g.picking === null) return; unoApply(g, g.picking, c); },
    unoCancel() { S.g.picking = null; render(); },
    unoDraw() {
      const g = S.g, p = g.order[g.turn];
      if (g.drew) return;
      unoTake(g, p, 1); g.drew = true;
      render();
    },
    unoPass() {
      const g = S.g;
      if (!g.drew) return;
      g.log = `${esc(g.order[g.turn])} a pioché et passe.`;
      g.turn = unoNext(g); g.drew = false; g.phase = 'pass';
      render(); scrollTop();
    }
  },
  // Voir sa main n'est pas annulable ; le reste l'est, pour corriger une carte posée par erreur
  undoable: ['unoPlay', 'unoColor', 'unoDraw', 'unoPass']
});

// Pose la carte i du joueur courant (color : couleur demandée), applique son effet et passe au suivant
function unoApply(g, i, color) {
  const p = g.order[g.turn], card = g.hands[p].splice(i, 1)[0];
  g.discard.push(card); g.color = color; g.picking = null; g.drew = false;
  const msgs = [`${esc(p)} pose ${unoTitle(card)}${card.c === 'w' ? ` et demande du ${UNO_COLORS[color].toLowerCase()}` : ''}.`];
  let skip = 0;
  if (card.t === 'rev') {
    if (g.order.length === 2) skip = 1; else g.dir = -g.dir;
  }
  if (card.t === 'skip') { skip = 1; msgs.push(`${esc(g.order[unoNext(g)])} passe son tour.`); }
  if (card.t === '+2' || card.t === '+4') {
    const n = card.t === '+2' ? 2 : 4, victim = g.order[unoNext(g)];
    unoTake(g, victim, n); skip = 1;
    msgs.push(`${esc(victim)} pioche ${n} cartes et passe son tour.`);
  }
  if (g.hands[p].length === 1) msgs.push(`<b>${esc(p)} : UNO !</b>`);
  if (!g.hands[p].length) {
    g.winner = p;
  } else {
    g.turn = unoNext(g, 1 + skip); g.phase = 'pass';
  }
  g.log = msgs.join(' ');
  render(); scrollTop();
}
