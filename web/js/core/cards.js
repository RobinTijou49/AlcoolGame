// Cartes à jouer : paquet de 52 cartes, tirage et affichage d'une carte.
// Une carte est un objet { v: 1 à 13, s: '♠', red: false, sn: 'pique' } (v = 1 pour l'As, 11 Valet, 12 Dame, 13 Roi).

const SUITS = [
  { s: '♠', red: false, n: 'pique' },
  { s: '♥', red: true,  n: 'cœur' },
  { s: '♦', red: true,  n: 'carreau' },
  { s: '♣', red: false, n: 'trèfle' }
];
const LABEL = v => ({ 1: 'A', 11: 'V', 12: 'D', 13: 'R' })[v] || String(v);
const NAME = v => ({ 1: 'As', 11: 'Valet', 12: 'Dame', 13: 'Roi' })[v] || String(v);
// Force d'une carte pour les comparaisons : l'As est fort (14) ou faible (1) selon les réglages
const rank = c => (c.v === 1 ? (cfg('general', 'asHigh') ? 14 : 1) : c.v);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function newDeck() {
  const d = [];
  for (const su of SUITS) for (let v = 1; v <= 13; v++) d.push({ v, s: su.s, red: su.red, sn: su.n });
  return shuffle(d);
}
// Tire la carte du dessus du paquet de la partie g (remélange un paquet neuf s'il est vide)
function draw(g) {
  if (!g.deck.length) g.deck = newDeck();
  return g.deck.pop();
}
// HTML d'une carte : une carte, 'back' (face cachée) ou rien (emplacement vide)
function cardHTML(c, cls = '') {
  if (c === 'back') return `<div class="card back ${cls}" aria-label="carte face cachée"></div>`;
  if (!c) return `<div class="card empty ${cls}" aria-hidden="true"></div>`;
  const l = LABEL(c.v);
  return `<div class="card ${c.red ? 'red' : ''} ${cls}" role="img" aria-label="${NAME(c.v)} de ${c.sn}">
    <span class="tl">${l}<br>${c.s}</span><span class="pip">${c.s}</span><span class="br">${l}<br>${c.s}</span></div>`;
}
