// Action ou vérité : chacun son tour choisit, le téléphone tire un défi ou une question.
// On le fait, ou on refuse et on boit. {p} est remplacé par un autre joueur tiré au hasard.

const AOV = {
  verite: {
    soft: [
      'Quelle est la chose la plus gênante qui t’est arrivée en public ?', 'Quel est ton plus gros mensonge à tes parents ?',
      'Qui dans cette pièce te ferait le plus rire dans une situation de crise ?', 'Quelle appli ouvres-tu le plus sur ton téléphone ?',
      'Quel est ton plaisir coupable musical ?', 'Quelle est la pire note que tu aies eue ?', 'De quoi as-tu le plus peur ?',
      'Quel est le dernier mensonge que tu as dit ?', 'Si tu pouvais échanger ta vie avec quelqu’un ici pour une journée, qui ?',
      'Quel surnom gênant as-tu déjà eu ?', 'Quelle est la chose la plus bizarre que tu as mangée ?',
      'Quelle est ta pire habitude ?', 'Qu’est-ce que tu penses vraiment de la tenue de {p} ce soir ?',
      'Quel est le pire cadeau que tu as reçu ?', 'Quel talent caché as-tu ?', 'Quelle est ta plus grosse honte au lycée ?',
      'Combien de temps as-tu passé sur ton téléphone hier ?', 'Quel film t’a fait pleurer ?',
      'Quelle célébrité inviterais-tu à cette soirée ?', 'Qu’est-ce que tu as déjà cassé sans le dire à personne ?',
      'Quelle est la recherche Google la plus bizarre que tu aies faite ?', 'Qui ici est le plus susceptible de devenir célèbre ?',
      'Quelle est ta pire expérience au travail ou en stage ?', 'À quel âge as-tu arrêté de croire au père Noël ?',
      'Quelle règle de tes parents as-tu le plus enfreinte ?', 'Qui ici t’a fait la meilleure première impression ?'
    ],
    spicy: [
      'Qui dans cette pièce trouves-tu le plus attirant ?', 'Raconte ton pire premier rendez-vous.',
      'As-tu déjà eu un crush sur quelqu’un ici ?', 'Quel est le message le plus gênant que tu as envoyé à un crush ?',
      'Avec qui ici pourrais-tu sortir si tu étais célibataire ?', 'Quelle est la chose la plus folle que tu as faite par amour ?',
      'Combien de personnes as-tu embrassées ?', 'Quelle est ta plus grosse red flag ?', 'Ton ex t’a-t-il ou elle déjà manqué ?',
      'Quel est le plus long que tu aies mis à répondre à un message, exprès ?', 'Quel est ton type idéal, en trois mots ?',
      'As-tu déjà fait semblant d’être occupé pour éviter quelqu’un qui te draguait ?', 'Note de 1 à 10 le charme de {p}.'
    ]
  },
  action: {
    soft: [
      'Imite {p} pendant 30 secondes.', 'Parle avec un accent jusqu’à ton prochain tour.', 'Fais 15 squats.',
      'Chante le refrain d’une chanson choisie par {p}.', 'Raconte une blague. Si personne ne rit, tu bois une gorgée.',
      'Montre la dernière photo de ta galerie.', 'Fais ta meilleure imitation d’un animal, les autres doivent deviner lequel.',
      'Danse 20 secondes sans musique.', 'Laisse {p} choisir ta photo de profil jusqu’à demain.',
      'Fais un compliment sincère à chaque joueur.', 'Parle à la troisième personne jusqu’à ton prochain tour.',
      'Fais le tour de la pièce en marchant comme un mannequin.', 'Mime un film, les autres doivent le trouver en 1 minute.',
      'Garde une grimace jusqu’à ton prochain tour.', 'Récite l’alphabet à l’envers le plus vite possible.',
      'Fais un discours de 30 secondes pour élire {p} président.', 'Laisse {p} te dessiner une moustache (au stylo effaçable ou au maquillage).',
      'Échange un vêtement avec {p} jusqu’à la fin de la partie.', 'Fais une déclaration d’amour dramatique à un objet de la pièce.',
      'Tiens la planche 30 secondes.', 'Raconte ta journée comme un commentateur sportif.', 'Fais rire {p} en moins de 30 secondes.',
      'Envoie un emoji au hasard à la 5e personne de tes conversations, sans explication.', 'Chante tout ce que tu dis jusqu’à ton prochain tour.'
    ],
    spicy: [
      'Fais un slow de 20 secondes avec {p}.', 'Fais ta meilleure technique de drague sur {p}.',
      'Laisse {p} lire ton dernier échange de messages (une seule conversation, choisie par toi).',
      'Fais un massage des épaules à {p} pendant 30 secondes.', 'Regarde {p} dans les yeux 30 secondes sans rire.',
      'Fais un bisou sur la joue au joueur de ton choix.', 'Like la plus vieille photo du profil Instagram de {p}.',
      'Assieds-toi sur les genoux de {p} jusqu’à ton prochain tour.', 'Dis à {p} ce qui te plaît le plus chez lui ou elle.',
      'Laisse {p} écrire ta prochaine story (sans rien de méchant).', 'Fais un clin d’œil séducteur à chaque joueur.'
    ]
  }
};

// Tire le prochain défi ou la prochaine question d'un type, en remélangeant quand tout est passé
function aovDraw(g, mode) {
  if (!g.decks[mode].length) g.decks[mode] = shuffle(AOV[mode].soft.concat(g.spicy ? AOV[mode].spicy : []));
  const who = g.order[g.turn % g.order.length], others = g.order.filter(p => p !== who);
  return g.decks[mode].pop().replace(/\{p\}/g, () => others[Math.floor(Math.random() * others.length)]);
}

defineGame({
  id: 'aov', name: 'Action ou vérité', suit: '?', red: false, tab: 'party',
  desc: 'Choisis : un défi à relever ou une question à laquelle répondre.', meta: '2 joueurs et +',

  init() {
    return { order: order(), turn: 0, mode: null, text: '', spicy: cfg('aov', 'level') === 'all', decks: { action: [], verite: [] }, last: null };
  },

  screen() {
    const g = S.g, p = g.order[g.turn % g.order.length], n = cfg('aov', 'refuse');
    const last = g.last ? `<div class="verdict ${g.last.ok ? 'ok' : 'ko'}">${g.last.ok ? `Bravo ${esc(g.last.who)} !` : `${esc(g.last.who)} refuse et boit ${plural(n, 'gorgée')}.`}</div>` : '';
    const body = g.mode
      ? `<div class="panel"><span class="label" style="text-align:center">${g.mode === 'action' ? 'Action' : 'Vérité'}</span><p class="prompt">${esc(g.text)}</p></div>
        <div class="choices">
          <button class="btn primary" data-act="aovDone" data-arg="1">${g.mode === 'action' ? 'Fait !' : 'Répondu !'}</button>
          <button class="btn" data-act="aovDone" data-arg="0">Refuser · ${plural(n, 'gorgée')}</button>
        </div>`
      : `${last}<div class="choices">
          <button class="btn big" data-act="aovPick" data-arg="action">Action</button>
          <button class="btn big" data-act="aovPick" data-arg="verite">Vérité</button>
        </div>`;
    return `${header('Action ou vérité')}
      ${rules([
        'Chacun son tour choisit <b>Action</b> (un défi) ou <b>Vérité</b> (une question).',
        `On le fait, ou on refuse et on boit ${plural(n, 'gorgée')}.`,
        'Personne n’est obligé de faire un défi qui le met mal à l’aise : refuser fait partie du jeu.'
      ], 'aov')}
      <div class="turn"><span class="sub">${g.mode ? 'Pour' : 'À toi de choisir'}</span><span class="who">${esc(p)}</span></div>
      ${body}`;
  },

  turnOf: g => g.order[g.turn % g.order.length],
  actions: {
    aovPick(mode) {
      const g = S.g;
      if (mode !== 'action' && mode !== 'verite') return;
      g.mode = mode; g.text = aovDraw(g, mode); g.last = null;
      render();
    },
    aovDone(ok) {
      const g = S.g, who = g.order[g.turn % g.order.length];
      if (ok !== '1') drink(who, cfg('aov', 'refuse'));
      g.last = { who, ok: ok === '1' };
      g.mode = null; g.text = ''; g.turn++;
      render();
    }
  },
  undoable: ['aovPick', 'aovDone']
});
