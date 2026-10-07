// Réglages des règles de chaque jeu (page Réglages). Les valeurs choisies sont enregistrées dans S.set.
// Chaque option : soit des choix [valeur, libellé], soit un nombre entre num[0] et num[1].

const SETTINGS = {
  general: { name: 'Général', opts: [
    { key: 'asHigh', label: 'L’As est', choices: [[true, 'la carte la plus forte'], [false, 'la carte la plus faible']], def: true },
    { key: 'tie', label: 'Une égalité (plus ou moins, intérieur ou extérieur)', choices: [['lose', 'compte comme une erreur'], ['win', 'compte comme une bonne réponse']], def: 'lose' }
  ] },
  palmier: { name: 'Palmier', cards: true, opts: [
    { key: 'kings', label: 'Le verre central est bu au', choices: [[2, '2e Roi'], [3, '3e Roi'], [4, '4e Roi']], def: 4 },
    { key: 'endless', label: 'Quand le paquet est fini', choices: [[false, 'la partie s’arrête'], [true, 'on remélange et on continue']], def: false }
  ] },
  riviere: { name: 'Rivière', opts: [
    { key: 'qSips', label: 'Gorgées par question ratée', choices: [['inc', '1, 2, 3 puis 4'], ['one', '1 à chaque fois'], ['two', '2 à chaque fois']], def: 'inc' },
    { key: 'riverMult', label: 'Gorgées de la rivière', choices: [[1, 'de 1 à 5'], [2, 'de 2 à 10']], def: 1 },
    { key: 'hidden', label: 'Pendant la rivière, les mains sont', choices: [[false, 'visibles'], [true, 'cachées, de mémoire']], def: false }
  ] },
  purple: { name: 'Purple', opts: [
    { key: 'pass', label: 'Bonnes réponses d’affilée pour pouvoir passer la main', num: [1, 6], def: 3 }
  ] },
  autoroute: { name: 'Autoroute', opts: [
    { key: 'len', label: 'Cartes à passer', num: [3, 8], def: 5 },
    { key: 'crash', label: 'En cas d’erreur, on boit', choices: [['pos', 'le numéro de la carte'], ['one', '1 gorgée'], ['two', '2 gorgées']], def: 'pos' }
  ] },
  pyramide: { name: 'Pyramide', opts: [
    { key: 'memo', label: 'Temps pour mémoriser sa main', choices: [[5, '5 s'], [10, '10 s'], [20, '20 s'], [30, '30 s']], def: 10 },
    { key: 'bluff', label: 'Bluff démasqué ou contestation ratée : on boit', choices: [[2, 'le double'], [3, 'le triple']], def: 2 }
  ] },
  ascenseur: { name: 'Ascenseur', opts: [
    { key: 'first', label: 'Trouvé du premier coup : le donneur boit', num: [1, 10], def: 4 },
    { key: 'second', label: 'Trouvé au second essai : le donneur boit', num: [0, 10], def: 2 },
    { key: 'fails', label: 'Joueurs ratés d’affilée avant de changer de donneur', num: [1, 6], def: 3 }
  ] },
  barbu: { name: 'Barbu', cards: true, opts: [
    { key: 'endless', label: 'Quand le paquet est fini', choices: [[false, 'la partie s’arrête'], [true, 'on remélange et on continue']], def: false }
  ] },
  // Jeux de plateau (sans alcool)
  flechettes: { name: 'Fléchettes', opts: [
    { key: 'start', label: 'Score de départ', choices: [[301, '301'], [501, '501'], [701, '701']], def: 501 },
    { key: 'doubleOut', label: 'Pour finir pile à zéro, il faut toucher', choices: [[false, 'n’importe quelle case'], [true, 'un double ou le Bull']], def: false },
    { key: 'skill', label: 'Précision du lancer sur l’écran', choices: [['easy', 'facile'], ['normal', 'normale'], ['hard', 'difficile']], def: 'normal' }
  ] }
};
S.set = store.get('settings', {});

// Valeur d'un réglage. En ligne, tout le monde joue avec les réglages de l'hôte, copiés dans la partie au lancement.
function cfg(game, key) {
  const snap = (CTX.online || S.screen === 'online') && O.room?.state?.cfg;
  if (snap && snap[`${game}_${key}`] !== undefined) return snap[`${game}_${key}`];
  const v = S.set[game]?.[key];
  return v === undefined ? SETTINGS[game].opts.find(o => o.key === key).def : v;
}
// Copie de tous les réglages, envoyée aux autres téléphones au lancement d'une partie en ligne
function cfgSnapshot() {
  const out = {};
  for (const g in SETTINGS) for (const o of SETTINGS[g].opts) out[`${g}_${o.key}`] = cfg(g, o.key);
  return out;
}

// Réglages généraux, utilisés par les jeux qui comparent des cartes
const tieWins = () => cfg('general', 'tie') === 'win';
const tieText = () => (tieWins() ? 'Une égalité compte comme une bonne réponse.' : 'Une égalité compte comme une erreur.');
const asText = () => (cfg('general', 'asHigh') ? 'L’As est la carte la plus forte.' : 'L’As est la carte la plus faible.');
