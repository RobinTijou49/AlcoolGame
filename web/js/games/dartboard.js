// Fléchettes : la cible dessinée à l'écran, le lancer au doigt et le calcul des points.
// Utilisé par games/flechettes.js, sur un téléphone comme en ligne.
//
// Coordonnées : le centre de la cible est (0, 0) et le bord extérieur du double est à 1 (y vers le bas).

const DART_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]; // dans le sens des aiguilles d'une montre, 20 en haut
const DART_RING = { bull: 0.037, outer: 0.094, tripleIn: 0.582, tripleOut: 0.629, doubleIn: 0.953 }; // proportions d'une vraie cible
const DART_NOISE = { easy: 0.02, normal: 0.045, hard: 0.08 }; // imprécision du lancer selon la difficulté

// Case touchée en (x, y) : { pts, label, dbl (double ou Bull, pour finir), x, y }
function dartHitAt(x, y) {
  const r = Math.hypot(x, y);
  if (r > 1) return { pts: 0, label: 'Raté', dbl: false, x, y };
  if (r <= DART_RING.bull) return { pts: 50, label: 'Bull', dbl: true, x, y };
  if (r <= DART_RING.outer) return { pts: 25, label: '25', dbl: false, x, y };
  const a = (Math.atan2(x, -y) * 180 / Math.PI + 369) % 360;
  const n = DART_ORDER[Math.floor(a / 18)];
  const mult = r >= DART_RING.doubleIn ? 2 : r >= DART_RING.tripleIn && r <= DART_RING.tripleOut ? 3 : 1;
  return { pts: n * mult, label: (mult === 3 ? 'T' : mult === 2 ? 'D' : '') + n, dbl: mult === 2, x, y };
}

// ---------- Règles du 301 / 501 / 701 (communes au jeu local et en ligne) ----------
// Partie : { order, left: {joueur: points restants}, stats: {joueur: {pts, darts}}, turn, darts: [3 au plus], bust, winner }
function dartsNew(players, start) {
  const left = {}, stats = {};
  players.forEach(p => { left[p] = start; stats[p] = { pts: 0, darts: 0 }; });
  return { order: players, start, left, stats, turn: 0, darts: [], bust: false, winner: null };
}
const dartsPlayer = st => st.order[st.turn % st.order.length];
const dartsSum = st => (st.darts || []).reduce((s, d) => s + d.pts, 0);
const dartsRemaining = st => st.bust ? st.left[dartsPlayer(st)] : st.left[dartsPlayer(st)] - dartsSum(st);
const dartsTurnOver = st => st.bust || (st.darts || []).length >= 3 || !!st.winner;
// Ajoute une fléchette au tour en cours : bust si on dépasse, victoire si on tombe pile à zéro
function dartsThrow(st, hit) {
  if (dartsTurnOver(st)) return;
  const p = dartsPlayer(st);
  st.darts = st.darts || [];
  const after = st.left[p] - dartsSum(st) - hit.pts;
  const doubleOut = cfg('flechettes', 'doubleOut');
  st.darts.push(hit);
  st.stats[p].darts++;
  if (after < 0 || (doubleOut && after === 1) || (after === 0 && doubleOut && !hit.dbl)) st.bust = true;
  else if (after === 0) { st.stats[p].pts += dartsSum(st); st.left[p] = 0; st.winner = p; }
}
// Valide le tour (sauf bust) et passe au joueur suivant
function dartsNext(st) {
  const p = dartsPlayer(st);
  if (!st.bust) { st.stats[p].pts += dartsSum(st); st.left[p] -= dartsSum(st); }
  st.darts = []; st.bust = false; st.turn++;
}
// Tableau des scores ; name(id) donne le nom à afficher
function dartsScoresHTML(st, name = x => x) {
  const cur = st.winner ? null : dartsPlayer(st);
  return `<div class="hands">${st.order.map(q => {
    const s = st.stats[q], avg = s.darts ? Math.round(s.pts / s.darts * 3) : 0;
    return `<div class="hrow ${q === cur ? 'cur' : ''}"><span class="n">${esc(name(q))}</span>
      <span class="muted" style="font-size:13px">moy. ${avg}</span><b class="dscore">${q === cur ? dartsRemaining(st) : st.left[q]}</b></div>`;
  }).join('')}</div>`;
}
const dartsSlotsHTML = st => `<div class="dslots">${[0, 1, 2].map(i => {
  const d = (st.darts || [])[i];
  return `<span class="dslot ${d ? 'on' : ''}">${d ? d.label : '·'}</span>`;
}).join('')}</div>`;

// ---------- Dessin de la cible ----------
let dartBoardCache = null; // la cible sans fléchettes, dessinée une fois par taille

function drawBoardBase(size) {
  const c = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
  c.width = c.height = size * dpr;
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const cx = size / 2, R = size * 0.4, deg = Math.PI / 180;
  // Anneau des numéros
  x.fillStyle = '#141016'; x.beginPath(); x.arc(cx, cx, R * 1.2, 0, 2 * Math.PI); x.fill();
  const ring = (r1, r2, a1, a2, color) => {
    x.fillStyle = color; x.beginPath();
    x.arc(cx, cx, r2, a1, a2); x.arc(cx, cx, r1, a2, a1, true); x.closePath(); x.fill();
  };
  DART_ORDER.forEach((n, i) => {
    const a1 = (-90 - 9 + i * 18) * deg, a2 = a1 + 18 * deg, even = i % 2 === 0;
    ring(DART_RING.outer * R, R, a1, a2, even ? '#1d1a1f' : '#efe1c6');                       // simple
    ring(DART_RING.tripleIn * R, DART_RING.tripleOut * R, a1, a2, even ? '#d0202e' : '#1f8a46'); // triple
    ring(DART_RING.doubleIn * R, R, a1, a2, even ? '#d0202e' : '#1f8a46');                       // double
    const am = a1 + 9 * deg;
    x.fillStyle = '#f4eadc'; x.font = `800 ${Math.round(size * 0.045)}px Figtree, system-ui, sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(n, cx + Math.cos(am) * R * 1.1, cx + Math.sin(am) * R * 1.1);
  });
  x.fillStyle = '#1f8a46'; x.beginPath(); x.arc(cx, cx, DART_RING.outer * R, 0, 2 * Math.PI); x.fill();
  x.fillStyle = '#d0202e'; x.beginPath(); x.arc(cx, cx, DART_RING.bull * R, 0, 2 * Math.PI); x.fill();
  // Fils métalliques
  x.strokeStyle = 'rgba(200,200,210,.45)'; x.lineWidth = 1;
  [DART_RING.outer, DART_RING.tripleIn, DART_RING.tripleOut, DART_RING.doubleIn, 1].forEach(r => { x.beginPath(); x.arc(cx, cx, r * R, 0, 2 * Math.PI); x.stroke(); });
  for (let i = 0; i < 20; i++) {
    const a = (-90 - 9 + i * 18) * deg;
    x.beginPath(); x.moveTo(cx + Math.cos(a) * DART_RING.outer * R, cx + Math.sin(a) * DART_RING.outer * R);
    x.lineTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R); x.stroke();
  }
  return c;
}

// ---------- Le lancer, façon jeu de fléchettes mobile ----------
// Le canvas #dartboard est plus haut que large : la cible en haut, la fléchette posée en bas.
// On attrape la fléchette, on la fait glisser, et on la lance vers la cible d'un geste rapide vers le haut :
// l'endroit où l'on lâche et la direction du geste donnent la colonne visée, la vitesse du geste donne la hauteur.

const DART_POWER = 1.2; // vitesse du geste (pixels par milliseconde) qui envoie la fléchette au centre

// Repères du canvas : centre et rayon de la cible, position de repos de la fléchette
function dartLayout(canvas) {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  return { W, H, cx: W / 2, cy: W * 0.5, R: W * 0.4, restX: W / 2, restY: H - W * 0.2 };
}

// Dessin d'une fléchette pointe vers le haut ; (x, y) = la pointe, s = échelle
function drawDart(x, px, py, s, alpha = 1) {
  x.save(); x.globalAlpha = alpha; x.translate(px, py); x.scale(s, s);
  x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(6, 92, 14, 4, 0, 0, 2 * Math.PI); x.fill();     // ombre
  x.fillStyle = '#d9d9de'; x.beginPath(); x.moveTo(0, 0); x.lineTo(2.2, 14); x.lineTo(-2.2, 14); x.fill();  // pointe
  x.fillStyle = '#9aa0a8'; x.fillRect(-4, 14, 8, 26);                                                       // corps
  x.fillStyle = '#c9ccd2'; for (let i = 0; i < 5; i++) x.fillRect(-4, 16 + i * 5, 8, 1.5);                 // stries
  x.fillStyle = '#2b2433'; x.fillRect(-2, 40, 4, 26);                                                       // tige
  x.fillStyle = '#f0b13c';                                                                                  // ailettes
  x.beginPath(); x.moveTo(-2, 56); x.lineTo(-14, 84); x.lineTo(-2, 78); x.fill();
  x.beginPath(); x.moveTo(2, 56); x.lineTo(14, 84); x.lineTo(2, 78); x.fill();
  x.fillStyle = '#c47d14'; x.fillRect(-1.5, 58, 3, 24);
  x.restore();
}

// Dessine la cible, les fléchettes plantées, et la fléchette à lancer (au repos, tenue ou en vol)
function paintBoard(canvas, darts, dart) {
  const L = dartLayout(canvas), dpr = window.devicePixelRatio || 1;
  if (!L.W) return;
  if (canvas.width !== Math.round(L.W * dpr) || canvas.height !== Math.round(L.H * dpr)) {
    canvas.width = Math.round(L.W * dpr); canvas.height = Math.round(L.H * dpr);
  }
  if (!dartBoardCache || dartBoardCache.size !== L.W) dartBoardCache = { size: L.W, img: drawBoardBase(L.W) };
  const x = canvas.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, L.W, L.H);
  x.drawImage(dartBoardCache.img, 0, 0, L.W, L.W);
  // Fléchettes plantées : vues de derrière, ailettes vers le bas
  (darts || []).forEach(d => {
    if (d.x === undefined) return;
    const px = L.cx + d.x * L.R, py = L.cy + d.y * L.R;
    drawDart(x, px, py, 0.32);
    x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 2.5, 0, 2 * Math.PI); x.fill();
  });
  if (dart) drawDart(x, dart.x, dart.y, dart.s);
}


// Point d'impact d'un lancer. from : la fléchette au lâcher (pixels du canvas) ; vx : vitesse de côté ;
// power : vitesse vers le haut (pixels par milliseconde). Plus le geste est rapide, plus la fléchette monte.
function dartLanding(L, from, vx, power, noise) {
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * noise * L.R;
  const ly = L.cy + (DART_POWER - power) * L.R * 0.85 + gauss();
  const lx = from.x + (vx / power) * (from.y - ly) * 0.6 + gauss();
  return { lx, ly };
}
// Branche la cible #dartboard. onThrow(x, y) reçoit le point d'impact en coordonnées de cible ;
// sans onThrow (pas son tour, tour fini), la cible est seulement affichée.
function mountDartboard(darts, onThrow) {
  const canvas = document.getElementById('dartboard');
  if (!canvas) return;
  const rest = () => { const L = dartLayout(canvas); return { x: L.restX, y: L.restY - 70, s: 0.75 }; };
  paintBoard(canvas, darts, onThrow ? rest() : null);
  if (!onThrow) { canvas.onpointerdown = null; return; }
  const noise = DART_NOISE[cfg('flechettes', 'skill')] || DART_NOISE.normal;
  let drag = null, flying = false;
  const pos = e => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top, t: performance.now() }; };
  // La fléchette est tenue un peu au-dessus du doigt pour rester visible
  const held = p => ({ x: p.x, y: p.y - 60, s: 0.75 });

  canvas.onpointerdown = e => {
    if (flying) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    const p = pos(e);
    drag = { id: e.pointerId, start: p, samples: [p] };
    paintBoard(canvas, darts, held(p));
  };
  canvas.onpointermove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = pos(e);
    drag.samples.push(p);
    if (drag.samples.length > 12) drag.samples.shift();
    paintBoard(canvas, darts, held(p));
  };
  canvas.onpointerup = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const end = pos(e), samples = drag.samples.concat(end), start = drag.start;
    drag = null;
    // Vitesse du geste sur les 90 dernières millisecondes
    const recent = samples.filter(s => end.t - s.t <= 90), first = recent[0] || samples[0];
    const dt = Math.max(16, end.t - first.t), vx = (end.x - first.x) / dt, vy = (end.y - first.y) / dt;
    const power = -vy;
    if (power < 0.35 || start.y - end.y < 30) { paintBoard(canvas, darts, rest()); toast('Lance la fléchette vers la cible d’un geste rapide vers le haut'); return; }
    const L = dartLayout(canvas), from = held(end), { lx, ly } = dartLanding(L, from, vx, power, noise);
    // Vol de la fléchette : elle rapetisse en s'éloignant, avec une petite courbe
    flying = true;
    const t0 = performance.now(), dur = 320;
    const fly = now => {
      const k = Math.min(1, (now - t0) / dur), ease = 1 - (1 - k) * (1 - k);
      paintBoard(canvas, darts, {
        x: from.x + (lx - from.x) * ease,
        y: from.y + (ly - from.y) * ease - Math.sin(Math.PI * k) * L.H * 0.08,
        s: 0.75 - 0.43 * ease
      });
      if (k < 1) requestAnimationFrame(fly); else land();
    };
    // La fléchette est comptée à l'arrivée, même si le téléphone a mis l'animation en pause
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true; flying = false;
      onThrow(+((lx - L.cx) / L.R).toFixed(4), +((ly - L.cy) / L.R).toFixed(4));
    };
    requestAnimationFrame(fly);
    setTimeout(land, dur + 80);
  };
  canvas.onpointercancel = () => { drag = null; if (!flying) paintBoard(canvas, darts, rest()); };
}
