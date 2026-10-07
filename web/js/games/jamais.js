// Je n'ai jamais : une phrase à lire, tous ceux qui l'ont déjà fait boivent.
// On touche leurs prénoms pour compter leurs gorgées, puis « Suivant ». Le lecteur change à chaque phrase.

// Phrases par thème (core/themes.js) : Normal joue Soft + Normal, Hard joue Normal + Hard, Hot joue Normal + Hot
const JAMAIS = {
  soft: [
    'pris l’avion', 'dormi à la belle étoile', 'raté un train ou un avion', 'oublié l’anniversaire d’un ami proche',
    'fait semblant d’aimer un cadeau', 'chanté au karaoké', 'pleuré devant un dessin animé', 'envoyé un message à la mauvaise personne',
    'fait une nuit blanche pour réviser', 'été viré d’un cours', 'eu une amende', 'perdu mes clés plus d’une fois dans le même mois',
    'cassé mon téléphone', 'dormi plus de 14 heures d’affilée', 'mangé quelque chose tombé par terre',
    'regardé une série entière en un week-end', 'fait du camping', 'parlé tout seul dans la rue',
    'fait semblant d’être malade pour ne pas aller en cours ou au travail', 'eu un fou rire à un moment très sérieux',
    'goûté des escargots', 'fait du saut à l’élastique ou du parachute', 'appelé un prof « maman » ou « papa »',
    'oublié le prénom de quelqu’un juste après qu’il me l’a dit', 'triché à un jeu de société', 'teint mes cheveux d’une couleur flashy',
    'eu un tatouage ou un piercing', 'gagné un concours', 'cuisiné un plat complètement raté',
    'porté un vêtement à l’envers toute une journée sans m’en rendre compte', 'fait un selfie avec une célébrité',
    'quitté une soirée sans dire au revoir', 'eu peur du noir après mes 15 ans',
    'parlé à un animal comme à un humain pendant plus de 5 minutes', 'nagé dans la mer en hiver', 'perdu un pari',
    'utilisé une excuse bidon pour annuler un rendez-vous', 'fait une soirée qui a fini au lever du soleil'
  ],
  normal: [
    'menti sur mon âge', 'stalké l’ex de quelqu’un sur les réseaux', 'raconté un secret qu’on m’avait demandé de garder',
    'envoyé un message à mon ex après minuit', 'ghosté quelqu’un', 'été ghosté', 'utilisé une appli de rencontre',
    'eu un rendez-vous catastrophique', 'fait semblant de ne pas voir quelqu’un pour éviter de lui parler',
    'eu un crush sur un prof', 'menti à mes parents sur l’endroit où je dormais', 'été recalé à l’entrée d’une boîte',
    'embrassé quelqu’un pour un gage', 'dit « je t’aime » sans le penser', 'relu une conversation avec mon crush plus de 10 fois',
    'fait une déclaration par message', 'été jaloux d’un ami', 'flirté avec un serveur ou une serveuse',
    'regretté un message le lendemain d’une soirée', 'dragué quelqu’un pour obtenir quelque chose', 'fait une blague qui a vraiment mal tourné'
  ],
  hard: [
    'vomi en soirée', 'oublié comment je suis rentré chez moi', 'été viré d’un bar ou d’une boîte',
    'embrassé deux personnes dans la même soirée', 'fouillé le téléphone de quelqu’un', 'dit du mal de quelqu’un ici dans son dos',
    'menti à quelqu’un dans cette pièce', 'eu un crush sur quelqu’un ici', 'raconté un secret de quelqu’un ici',
    'pleuré pour éviter une amende ou une punition', 'envoyé un message dont j’ai honte à mon patron ou à un prof',
    'été en couple avec deux personnes en même temps', 'trompé quelqu’un', 'été trompé', 'fait une crise de jalousie en public',
    'pris une photo gênante de quelqu’un ici sans le lui dire', 'eu un crush sur le ou la partenaire d’un ami',
    'embrassé quelqu’un dont je ne connaissais pas le prénom', 'fait pipi dans un lieu public', 'menti pendant ce jeu'
  ],
  hot: [
    'eu un plan d’un soir', 'envoyé une photo osée', 'reçu une photo osée', 'fait l’amour dans un lieu insolite',
    'fait l’amour dehors', 'été surpris en pleine action', 'eu un fantasme sur quelqu’un ici', 'fait un strip-tease',
    'fait l’amour dans une voiture', 'recouché avec un ex après la rupture', 'eu un sex friend', 'simulé',
    'dormi nu chez quelqu’un d’autre', 'eu un suçon visible au travail ou en cours', 'envoyé un message coquin à la mauvaise personne',
    'eu une aventure avec un ou une collègue', 'oublié le prénom de quelqu’un avec qui j’ai passé la nuit',
    'fait l’amour chez mes parents', 'embrassé quelqu’un du même sexe', 'utilisé des menottes ou un bandeau',
    'fait l’amour plus de trois fois dans la même nuit', 'eu un rêve coquin sur quelqu’un que je connais'
  ]
};

defineGame({
  id: 'jamais', name: 'Je n’ai jamais', suit: '!', red: true, tab: 'party',
  desc: 'Une phrase, et tous ceux qui l’ont déjà fait boivent.', meta: '3 joueurs et +',

  init() {
    return { order: order(), theme: S.theme, deck: shuffle(themePool(JAMAIS, S.theme)), i: 0, turn: 0, picked: [] };
  },

  screen() {
    const g = S.g, reader = g.order[g.turn % g.order.length], n = cfg('jamais', 'sips');
    return `${header('Je n’ai jamais')}
      ${rules([
        'Le lecteur lit la phrase à voix haute.',
        `Tous ceux qui l’ont déjà fait boivent ${plural(n, 'gorgée')}. Touche leurs prénoms pour les compter.`,
        'Puis « Suivant » : c’est au joueur suivant de lire.'
      ], 'jamais')}
      <div class="turn"><span class="sub">Thème ${themeName(g.theme || 'normal')} · lu par</span><span class="who">${esc(reader)}</span></div>
      <div class="panel"><p class="prompt"><span class="lead">Je n’ai jamais…</span>${g.deck[g.i]}</p></div>
      <div class="section"><span class="label">Qui l’a déjà fait ?</span>
        <div class="chips">${g.order.map((p, k) =>
          `<button class="chip pick" data-act="jamaisPick" data-arg="${k}" aria-pressed="${g.picked.includes(k)}">${esc(p)}</button>`).join('')}</div></div>
      <button class="btn primary big" data-act="jamaisNext">${g.picked.length ? `Suivant · ${g.picked.length} boi${g.picked.length > 1 ? 'vent' : 't'}` : 'Suivant'}</button>
      <p class="muted" style="margin:0;text-align:center;font-size:13px">${plural(g.deck.length - g.i - 1, 'phrase')} restante${g.deck.length - g.i - 1 > 1 ? 's' : ''}</p>`;
  },

  turnOf: () => null, // tout le monde peut toucher les prénoms
  actions: {
    jamaisPick(k) {
      const g = S.g, i = +k, at = g.picked.indexOf(i);
      if (at < 0) g.picked.push(i); else g.picked.splice(at, 1);
      render();
    },
    jamaisNext() {
      const g = S.g, n = cfg('jamais', 'sips');
      g.picked.forEach(k => drink(g.order[k], n));
      g.picked = []; g.turn++; g.i++;
      if (g.i >= g.deck.length) { shuffle(g.deck); g.i = 0; toast('Toutes les phrases sont passées : on remélange'); }
      render();
    }
  },
  undoable: ['jamaisNext']
});
