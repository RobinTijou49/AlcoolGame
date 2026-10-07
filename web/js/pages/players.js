// Onglet « Joueurs » : liste des joueurs (ordre autour de la table, qui commence) et compteur de gorgées.
// Le compteur s'ouvre aussi pendant les jeux, dans une fenêtre en bas de l'écran (bouton « Compteur »).

SCREENS.players = function () {
  return `${pageTop('Joueurs')}
    <div class="section">
      ${S.players.length ? `<p class="muted" style="margin:0;font-size:13.5px">Range les joueurs dans l’ordre où vous êtes assis en glissant la poignée ⠿. Touche ★ pour choisir qui commence.</p>` : ''}
      <ol class="plist" id="plist">${S.players.map((p, i) => {
        const first = order()[0] === p;
        return `<li class="prow-item" data-name="${esc(p)}">
          <span class="handle" data-i="${i}" tabindex="0" role="button" aria-label="Déplacer ${esc(p)} (flèches haut et bas)">⠿</span>
          <span class="pn">${esc(p)}</span>
          <button class="star ${first ? 'on' : ''}" data-act="setFirst" data-arg="${esc(p)}" aria-pressed="${first}" aria-label="${esc(p)} commence">★${first ? ' commence' : ''}</button>
          <button class="rm" data-act="rmPlayer" data-arg="${i}" aria-label="Retirer ${esc(p)}">×</button>
        </li>`;
      }).join('') || '<li class="muted" style="list-style:none">Personne pour l’instant. Ajoute au moins deux joueurs.</li>'}</ol>
      <form class="add" id="addForm">
        <input id="newPlayer" maxlength="18" placeholder="Prénom du joueur" autocomplete="off" aria-label="Prénom du joueur">
        <button class="btn primary" type="submit">Ajouter</button>
      </form>
      ${S.players.length > 1 ? `<button class="btn" data-act="randomFirst">Tirer au sort qui commence</button>` : ''}
    </div>
    ${S.players.length ? `<div class="section">
      <span class="label">Gorgées de la soirée</span>
      ${tallyHTML()}
    </div>` : ''}`;
};

// Compteur de gorgées : sur cette page et dans la fenêtre « Compteur » des jeux
function tallyHTML() {
  const max = Math.max(1, ...S.players.map(p => S.sips[p] || 0));
  return `<p class="muted" style="margin:0;font-size:14px">Les gorgées bues sont ajoutées automatiquement. Ajuste à la main pour les gorgées distribuées.</p>
    <div class="tally">${S.players.map((p, i) => {
      const v = S.sips[p] || 0;
      return `<div class="t"><span class="n">${esc(p)}</span>
        <button data-act="sip" data-arg="${i}:-1" aria-label="Retirer une gorgée à ${esc(p)}">−</button>
        <span class="v">${v}</span>
        <button data-act="sip" data-arg="${i}:1" aria-label="Ajouter une gorgée à ${esc(p)}">+</button>
        <div class="bar" style="width:${(v / max) * 100}%"></div></div>`;
    }).join('')}</div>
    <button class="btn" data-act="resetSips">Remettre à zéro</button>`;
}
function sheetHTML() {
  return `<div class="sheet" data-act="closeSheet"><div class="inner" role="dialog" aria-label="Compteur de gorgées">
    <div class="row spread"><h3 style="font:400 22px/1 var(--display)">Compteur de gorgées</h3><button class="iconbtn" data-act="closeSheet">Fermer</button></div>
    ${tallyHTML()}
  </div></div>`;
}

Object.assign(A, {
  setFirst(name) { S.first = name; save(); render(); },
  randomFirst() {
    S.first = S.players[Math.floor(Math.random() * S.players.length)];
    save(); render(); toast(`${S.first} commence !`);
  },
  rmPlayer(i) { S.players.splice(+i, 1); save(); render(); },
  sip(arg) {
    const [i, d] = arg.split(':').map(Number), p = S.players[i];
    S.sips[p] = Math.max(0, (S.sips[p] || 0) + d); save(); render();
  },
  resetSips() { S.sips = {}; save(); render(); },
  sheet() { S.sheet = true; render(); },
  closeSheet(_, el, e) { if (e.target === el) { S.sheet = false; render(); } }
});
// Le compteur est annulable pendant une partie
['sip', 'resetSips'].forEach(a => UNDOABLE.add(a));

// Ajouter un joueur
document.addEventListener('submit', e => {
  if (e.target.id !== 'addForm') return;
  e.preventDefault();
  const name = document.getElementById('newPlayer').value.trim();
  if (!name) return;
  if (S.players.includes(name)) { toast(`${name} est déjà dans la partie`); return; }
  S.players.push(name); save(); render();
  document.getElementById('newPlayer').focus();
});

// ---------- Ordre des joueurs : glisser la poignée ⠿ (ou flèches haut/bas au clavier) ----------
let drag = null;
document.addEventListener('pointerdown', e => {
  const h = e.target.closest('.handle'); if (!h) return;
  e.preventDefault();
  const li = h.closest('li');
  drag = { li, id: e.pointerId };
  li.classList.add('dragging');
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const list = document.getElementById('plist'); if (!list) return;
  const rows = [...list.children].filter(r => r !== drag.li);
  const after = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
  if (after) { if (drag.li.nextElementSibling !== after) list.insertBefore(drag.li, after); }
  else if (list.lastElementChild !== drag.li) list.appendChild(drag.li);
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const list = document.getElementById('plist');
  drag = null;
  if (!list) return;
  S.players = [...list.children].map(r => r.dataset.name).filter(Boolean);
  save(); render();
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', e => {
  const h = e.target.closest?.('.handle'); if (!h || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const i = +h.dataset.i, j = i + (e.key === 'ArrowUp' ? -1 : 1);
  if (j < 0 || j >= S.players.length) return;
  [S.players[i], S.players[j]] = [S.players[j], S.players[i]];
  save(); render();
  document.querySelector(`.handle[data-i="${j}"]`)?.focus();
});
