// Thème de la soirée (onglet À boire) : Soft, Normal, Hard ou Hot (premium, réservé aux adultes ; payant quand HOT_PAID est vrai).
// Il change le contenu des jeux : phrases de Je n'ai jamais, défis et questions d'Action ou vérité, actions des cartes
// du Palmier et du Barbu. Les gorgées des autres jeux ne changent pas.

const THEMES = [
  { id: 'soft',   name: 'Soft',   desc: 'Tranquille, pour tout le monde.' },
  { id: 'normal', name: 'Normal', desc: 'L’esprit de soirée classique.' },
  { id: 'hard',   name: 'Hard',   desc: 'Gages plus gênants, questions plus cash.' },
  { id: 'hot',    name: 'Hot',    desc: 'Sexy, entre adultes consentants.', premium: true }
];
S.theme = store.get('theme', 'normal');
if (S.theme === 'hot' && !store.get('adult', false)) S.theme = 'normal';
const themeName = id => THEMES.find(t => t.id === id)?.name || id;

// Listes de phrases d'un jeu pour un thème : Normal reprend aussi Soft, Hard et Hot reprennent Normal
const THEME_MIX = { soft: ['soft'], normal: ['soft', 'normal'], hard: ['normal', 'hard'], hot: ['normal', 'hot'] };
const themePool = (lists, theme) => THEME_MIX[theme].flatMap(k => lists[k] || []);

// Cartes du Palmier et du Barbu qui changent selon le thème (les autres gardent l'action de DEFAULT_RULES, le thème Normal)
const THEME_RULES = {
  soft: {
    palmier: {
      1: { t: 'Santé', d: 'Tout le monde lève son verre et boit une gorgée.' },
      3: { t: 'Tu bois 1', d: 'Bois une gorgée.', sips: 1 },
      6: { t: 'Doigt sur le nez', d: 'Le dernier à poser le doigt sur son nez boit une gorgée.' }
    },
    barbu: {
      3: { t: 'Tu bois 2', d: 'Bois 2 gorgées.', sips: 2 },
      4: { t: 'Tu donnes 2', d: 'Distribue 2 gorgées, en une fois ou en plusieurs.' },
      7: { t: 'Le Barbu', d: 'Le dernier à se caresser le menton comme un barbu boit une gorgée.' }
    }
  },
  hard: {
    palmier: {
      3: { t: 'Gage', d: 'Les autres choisissent un gage pour toi. Si tu refuses, tu bois 3 gorgées.' },
      5: { t: 'Vérité cash', d: 'Le joueur de ton choix te pose une question. Réponds franchement ou bois 3 gorgées.' },
      9: { t: 'Imitation', d: 'Imite un joueur. Le premier qui trouve qui c’est distribue 2 gorgées. Si personne ne trouve, tu bois 2 gorgées.' },
      10: { t: 'Galerie', d: 'Montre la dernière photo de ta galerie à tout le monde, ou bois 3 gorgées.' }
    },
    barbu: {
      1: { t: 'Gage', d: 'Les autres choisissent un gage pour toi. Si tu refuses, tu bois 3 gorgées.' },
      5: { t: 'Tournée', d: 'Tout le monde boit 2 gorgées.' },
      8: { t: 'Dernier message', d: 'Lis à voix haute le dernier message que tu as envoyé, ou bois 3 gorgées.' },
      10: { t: 'Vérité cash', d: 'Le joueur de ton choix te pose une question. Réponds franchement ou bois 3 gorgées.' }
    }
  },
  hot: {
    palmier: {
      2: { t: 'Bisou', d: 'Fais un bisou sur la joue au joueur de ton choix, ou bois 2 gorgées.' },
      5: { t: 'Je n’ai jamais hot', d: 'Annonce un « Je n’ai jamais… » coquin. Ceux qui l’ont déjà fait boivent.' },
      6: { t: 'Slow', d: 'Danse un slow de 20 secondes avec le joueur de ton choix, s’il ou elle est d’accord. Sinon, vous buvez chacun 2 gorgées.' },
      8: { t: 'Thème hot', d: 'Choisis un thème coquin (lieux pour un premier baiser, surnoms d’amoureux…). Chacun cite un mot, le premier qui sèche boit.' },
      9: { t: 'Regard', d: 'Fixe le joueur de ton choix dans les yeux. Le premier qui rit ou détourne le regard boit 2 gorgées.' },
      10: { t: 'Confession', d: 'Raconte ton meilleur ou ton pire baiser, ou bois 3 gorgées.' },
      12: { t: 'Maître du charme', d: 'Jusqu’à la prochaine Dame, tu peux demander un compliment à n’importe qui. Celui qui refuse boit.' }
    },
    barbu: {
      1: { t: 'Bisou', d: 'Fais un bisou sur la joue au joueur de ton choix, ou bois 2 gorgées.' },
      6: { t: 'Thème hot', d: 'Choisis un thème coquin (lieux pour un premier baiser, surnoms d’amoureux…). Chacun cite un mot, le premier qui sèche boit.' },
      7: { t: 'Le séducteur', d: 'Fais ta meilleure phrase de drague au joueur de ton choix. S’il ou elle ne sourit pas, tu bois 2 gorgées.' },
      8: { t: 'Confession', d: 'Raconte ton meilleur ou ton pire baiser, ou bois 3 gorgées.' },
      10: { t: 'Je n’ai jamais hot', d: 'Annonce un « Je n’ai jamais… » coquin. Ceux qui l’ont déjà fait boivent.' },
      11: { t: 'Massage', d: 'Masse les épaules de ton voisin de gauche pendant 20 secondes, s’il ou elle est d’accord. Sinon, tu bois 2 gorgées.' }
    }
  }
};

S.rules = { palmier: loadRules('palmier'), barbu: loadRules('barbu') }; // cartes du thème choisi

// Choix du thème. Hot demande une fois de confirmer qu'on a 18 ans et plus (S.hotAsk affiche la question).
Object.assign(A, {
  setTheme(id) {
    if (!THEMES.some(t => t.id === id)) return;
    if (id === 'hot' && !store.get('adult', false)) { S.hotAsk = true; render(); return; }
    if (id === 'hot' && HOT_PAID && !buy('hot', 'Thème Hot')) return; // payant : il faut l'avoir acheté (core/account.js)
    S.theme = id; S.hotAsk = false; store.set('theme', id);
    S.rules = { palmier: loadRules('palmier'), barbu: loadRules('barbu') };
    render(); track('theme_change', { theme: id });
  },
  hotConfirm(yes) {
    S.hotAsk = false;
    if (yes === '1') { store.set('adult', true); A.setTheme('hot'); } else render();
  }
});

// Sélecteur affiché en haut de l'onglet À boire
function themeHTML() {
  const cur = THEMES.find(t => t.id === S.theme);
  return `<div class="section">
      <span class="label">Thème de la soirée</span>
      <div class="themes">${THEMES.map(t => `<button class="chip pick ${t.premium ? 'premium' : ''}" data-act="setTheme" data-arg="${t.id}" aria-pressed="${S.theme === t.id}">${t.name}${t.premium ? '<small>Premium</small>' : ''}</button>`).join('')}</div>
      ${S.hotAsk
        ? `<div class="panel"><b>Thème Hot : réservé aux adultes</b>
            <p style="margin:0;font-size:14px">Il contient des questions et des défis sexy. Tu confirmes avoir 18 ans ou plus ? Chaque défi qui touche quelqu’un se fait seulement s’il ou elle est d’accord. Refuser et boire fait partie du jeu.</p>
            <p class="muted" style="margin:0;font-size:13px">Premium, gratuit pour le moment.</p>
            <div class="choices"><button class="btn" data-act="hotConfirm" data-arg="0">Annuler</button><button class="btn primary" data-act="hotConfirm" data-arg="1">J’ai 18 ans ou plus</button></div></div>`
        : `<p class="muted" style="margin:0;font-size:13.5px">${cur.desc} Change les phrases de Je n’ai jamais et d’Action ou vérité, et les cartes du Palmier et du Barbu.</p>`}
    </div>`;
}
