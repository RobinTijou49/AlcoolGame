// Je n'ai jamais : une phrase à lire, tous ceux qui l'ont déjà fait boivent.
// On touche leurs prénoms pour compter leurs gorgées, puis « Suivant ». Le lecteur change à chaque phrase.

const JAMAIS = {
  soft: [
    'pris l’avion', 'dormi à la belle étoile', 'raté un train ou un avion', 'menti sur mon âge',
    'oublié l’anniversaire d’un ami proche', 'fait semblant d’aimer un cadeau', 'chanté au karaoké',
    'pleuré devant un dessin animé', 'envoyé un message à la mauvaise personne', 'fait une nuit blanche pour réviser',
    'été viré d’un cours', 'eu une amende', 'perdu mes clés plus d’une fois dans le même mois', 'cassé mon téléphone',
    'dormi plus de 14 heures d’affilée', 'mangé quelque chose tombé par terre', 'regardé une série entière en un week-end',
    'fait du camping', 'parlé tout seul dans la rue', 'stalké l’ex de quelqu’un sur les réseaux',
    'fait semblant d’être malade pour ne pas aller en cours ou au travail', 'eu un fou rire à un moment très sérieux',
    'été pris en photo à mon insu dans une position gênante', 'goûté des escargots', 'fait du saut à l’élastique ou du parachute',
    'appelé un prof « maman » ou « papa »', 'oublié le prénom de quelqu’un juste après qu’il me l’a dit',
    'raconté un secret qu’on m’avait demandé de garder', 'triché à un jeu de société', 'teint mes cheveux d’une couleur flashy',
    'eu un tatouage ou un piercing', 'fait une soirée qui a fini au lever du soleil', 'gagné un concours',
    'cuisiné un plat complètement raté', 'porté un vêtement à l’envers toute une journée sans m’en rendre compte',
    'fait un selfie avec une célébrité', 'été dans une vidéo virale', 'quitté une soirée sans dire au revoir',
    'eu peur du noir après mes 15 ans', 'parlé à un animal comme à un humain pendant plus de 5 minutes',
    'fait du stop', 'nagé dans la mer en hiver', 'fait une blague qui a vraiment mal tourné',
    'utilisé une excuse bidon pour annuler un rendez-vous', 'conduit sans permis', 'perdu un pari'
  ],
  spicy: [
    'embrassé quelqu’un dans cette pièce', 'eu un crush sur un ami d’un ami ici', 'envoyé un message à mon ex après minuit',
    'ghosté quelqu’un', 'été ghosté', 'dragué quelqu’un pour obtenir quelque chose', 'utilisé une appli de rencontre',
    'eu un rendez-vous catastrophique', 'embrassé quelqu’un dont je ne connaissais pas le prénom',
    'fait semblant de ne pas voir quelqu’un pour éviter de lui parler', 'été en couple avec deux personnes en même temps',
    'eu un crush sur un prof', 'menti à mes parents sur l’endroit où je dormais', 'été recalé à l’entrée d’une boîte',
    'embrassé quelqu’un pour un gage', 'dit « je t’aime » sans le penser', 'relu une conversation avec mon crush plus de 10 fois',
    'fait une déclaration par message', 'été jaloux d’un ami', 'flirté avec un serveur ou une serveuse',
    'regretté un message le lendemain d’une soirée', 'eu un crush sur le ou la partenaire d’un ami'
  ]
};

defineGame({
  id: 'jamais', name: 'Je n’ai jamais', suit: '!', red: true, tab: 'party',
  desc: 'Une phrase, et tous ceux qui l’ont déjà fait boivent.', meta: '3 joueurs et +',

  init() {
    const pool = JAMAIS.soft.concat(cfg('jamais', 'level') === 'all' ? JAMAIS.spicy : []);
    return { order: order(), deck: shuffle(pool.slice()), i: 0, turn: 0, picked: [] };
  },

  screen() {
    const g = S.g, reader = g.order[g.turn % g.order.length], n = cfg('jamais', 'sips');
    return `${header('Je n’ai jamais')}
      ${rules([
        'Le lecteur lit la phrase à voix haute.',
        `Tous ceux qui l’ont déjà fait boivent ${plural(n, 'gorgée')}. Touche leurs prénoms pour les compter.`,
        'Puis « Suivant » : c’est au joueur suivant de lire.'
      ], 'jamais')}
      <div class="turn"><span class="sub">Lu par</span><span class="who">${esc(reader)}</span></div>
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
