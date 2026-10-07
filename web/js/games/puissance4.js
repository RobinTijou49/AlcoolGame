// Puissance 4 : deux joueurs sur le même téléphone. On touche une colonne pour y lâcher un jeton ;
// le premier qui aligne 4 jetons (ligne, colonne ou diagonale) gagne.

const C4_COLS = 7, C4_ROWS = 6;

// Cases gagnantes si le jeton posé en (r, c) aligne 4 jetons, sinon null
function c4Win(b, r, c) {
  const who = b[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < C4_ROWS && cc >= 0 && cc < C4_COLS && b[rr][cc] === who) { line.push([rr, cc]); rr += dr * s; cc += dc * s; }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

defineGame({
  id: 'puissance4', tab: 'board', name: 'Puissance 4', suit: '●', red: true,
  desc: 'Aligne 4 jetons de ta couleur avant l’autre.', meta: '2 joueurs',

  // pair : les deux joueurs [rouge, jaune] ; starter : qui commence (on alterne à chaque partie)
  init(pair, starter = 0) {
    const pl = order();
    return {
      pair: pair || [pl[0], pl[1]], starter, turn: starter,
      board: Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(0)),
      winner: null, win: [], draw: false, last: null
    };
  },

  screen() {
    const g = S.g, [red, yellow] = g.pair, names = [red, yellow];
    const over = g.winner !== null || g.draw;
    const isWin = (r, c) => g.win.some(([wr, wc]) => wr === r && wc === c);
    const cols = [...Array(C4_COLS)].map((_, c) => {
      const full = g.board[0][c] !== 0;
      const cells = [...Array(C4_ROWS)].map((_, r) => {
        const v = g.board[r][c];
        const cls = v ? (v === 1 ? 'red' : 'yellow') : '';
        const isLast = g.last && g.last[0] === r && g.last[1] === c;
        return `<span class="c4cell ${cls} ${isWin(r, c) ? 'win' : ''} ${isLast ? 'drop' : ''}"></span>`;
      }).join('');
      return `<button class="c4col" data-act="c4Drop" data-arg="${c}" ${over || full ? 'disabled' : ''} aria-label="Colonne ${c + 1}">${cells}</button>`;
    }).join('');
    const pick = (slot, cls) => `<div class="row"><span class="c4dot ${cls}"></span>${S.players.map(p =>
      `<button class="chip pick" data-act="c4Player" data-arg="${slot}:${esc(p)}" aria-pressed="${names[slot] === p}">${esc(p)}</button>`).join('')}</div>`;
    let status;
    if (g.winner !== null) {
      const loser = names[1 - g.winner];
      status = `<div class="verdict ok">${esc(names[g.winner])} gagne contre ${esc(loser)} !</div>`;
    } else if (g.draw) status = '<div class="verdict">Grille pleine : match nul.</div>';
    else status = `<div class="verdict"><span class="c4dot ${g.turn ? 'yellow' : 'red'}"></span> À ${esc(names[g.turn])} de jouer</div>`;
    return `${header('Puissance 4', false)}
      ${rules([
        'Chacun son tour, touche une colonne pour y lâcher un jeton. Il tombe tout en bas.',
        'Le premier qui aligne 4 jetons de sa couleur gagne : en ligne, en colonne ou en diagonale.',
        'À la partie suivante, l’autre joueur commence.'
      ], 'puissance4')}
      <div class="section"><span class="label">Joueurs</span>${pick(0, 'red')}${pick(1, 'yellow')}</div>
      ${status}
      <div class="c4" style="--cols:${C4_COLS}">${cols}</div>
      ${over ? '<button class="btn primary big" data-act="c4New">Nouvelle partie</button>' : ''}`;
  },

  turnOf: g => g.winner !== null || g.draw ? null : g.pair[g.turn],
  actions: {
    c4Drop(arg) {
      const g = S.g, c = +arg;
      if (g.winner !== null || g.draw) return;
      let r = C4_ROWS - 1;
      while (r >= 0 && g.board[r][c]) r--;
      if (r < 0) return;
      g.board[r][c] = g.turn + 1; g.last = [r, c];
      const win = c4Win(g.board, r, c);
      if (win) {
        g.winner = g.turn; g.win = win;
      } else if (g.board[0].every(v => v)) g.draw = true;
      else g.turn = 1 - g.turn;
      render();
    },
    // Changer un joueur : s'il occupe déjà l'autre place, on échange les deux
    c4Player(arg) {
      const [slot, name] = [+arg.split(':')[0], arg.slice(arg.indexOf(':') + 1)];
      const pair = S.g.pair.slice();
      if (pair[1 - slot] === name) pair[1 - slot] = pair[slot];
      pair[slot] = name;
      S.g = INIT.puissance4(pair, S.g.starter); render();
    },
    c4New() { const g = S.g; S.g = INIT.puissance4(g.pair, 1 - g.starter); render(); }
  },
  undoable: ['c4Drop', 'c4New']
});
