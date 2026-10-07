// Action de chaque carte au Palmier et au Barbu. Modifiables dans l'éditeur de cartes, enregistrées sur le téléphone.
// t = nom de la règle, d = description, sips = gorgées ajoutées automatiquement au compteur de celui qui tire la carte.

const DEFAULT_RULES = {};
DEFAULT_RULES.palmier = {
  1:  { t: 'Cascade', d: 'Tout le monde boit en même temps. Personne ne s’arrête avant celui qui a tiré la carte.' },
  2:  { t: 'Tu donnes 2', d: 'Distribue 2 gorgées à qui tu veux.' },
  3:  { t: 'Tu bois 3', d: 'Bois 3 gorgées.', sips: 3 },
  4:  { t: 'Les voisins', d: 'Tes voisins de gauche et de droite boivent une gorgée.' },
  5:  { t: 'J’ai jamais', d: 'Annonce un « Je n’ai jamais… ». Ceux qui l’ont déjà fait boivent.' },
  6:  { t: 'Doigt sur le nez', d: 'Le dernier à poser le doigt sur son nez boit 2 gorgées.' },
  7:  { t: 'Le 7 Buzz', d: 'On compte à tour de rôle. Multiple de 7 ou nombre contenant un 7 : on dit « Buzz ». Celui qui se trompe boit.' },
  8:  { t: 'Thème', d: 'Choisis un thème (marques de bière, capitales…). Chacun cite un mot, le premier qui sèche boit.' },
  9:  { t: 'Rimes', d: 'Dis un mot. Chacun trouve une rime, le premier qui sèche boit.' },
  10: { t: 'Nouvelle règle', d: 'Invente une règle valable jusqu’à la fin de la partie. Qui l’oublie boit.' },
  11: { t: 'Maître du pouce', d: 'Jusqu’au prochain Valet, quand tu poses ton pouce sur la table, le dernier à t’imiter boit.' },
  12: { t: 'Maître des questions', d: 'Jusqu’à la prochaine Dame, quiconque répond à une de tes questions boit.' },
  13: { t: 'Roi', d: 'Verse un peu de ton verre dans le verre central du palmier.' }
};
DEFAULT_RULES.barbu = {
  1:  { t: 'Tu bois 1', d: 'Bois une gorgée.', sips: 1 },
  2:  { t: 'Tu donnes 2', d: 'Distribue 2 gorgées à qui tu veux.' },
  3:  { t: 'Tu bois 3', d: 'Bois 3 gorgées.', sips: 3 },
  4:  { t: 'Tu donnes 4', d: 'Distribue 4 gorgées, en une fois ou en plusieurs.' },
  5:  { t: 'Santé', d: 'Tout le monde boit une gorgée.' },
  6:  { t: 'Thème', d: 'Choisis un thème. Chacun cite un mot, le premier qui sèche boit.' },
  7:  { t: 'Le Barbu', d: 'Le dernier à se caresser le menton comme un barbu boit 2 gorgées.' },
  8:  { t: 'Dans ma valise', d: '« Dans ma valise, je mets… » Chacun répète la liste et ajoute un objet. Le premier qui se trompe boit.' },
  9:  { t: 'Rimes', d: 'Dis un mot. Chacun trouve une rime, le premier qui sèche boit.' },
  10: { t: 'J’ai jamais', d: 'Annonce un « Je n’ai jamais… ». Ceux qui l’ont déjà fait boivent.' },
  11: { t: 'À gauche', d: 'Ton voisin de gauche boit 2 gorgées.' },
  12: { t: 'À droite', d: 'Ton voisin de droite boit 2 gorgées.' },
  13: { t: 'Nouvelle règle', d: 'Invente une règle valable jusqu’à la fin de la partie. Qui l’oublie boit.' }
};

// Règles enregistrées, complétées par les règles d'origine pour les champs manquants
function loadRules(id) {
  const saved = store.get('rules:' + id, null) || {}, out = clone(DEFAULT_RULES[id]);
  for (const v in out) out[v] = Object.assign(out[v], saved[v] || {});
  return out;
}
S.rules = { palmier: loadRules('palmier'), barbu: loadRules('barbu') };

// Bloc « Règles » dépliable du Palmier et du Barbu : la liste des cartes et leur action
function rulesList(id) {
  return Object.entries(S.rules[id]).map(([v, r]) => {
    const auto = r.sips ? `bois ${r.sips}` : '';
    return `<b>${NAME(+v)} · ${esc(r.t)}</b> : ${esc(r.d)}${auto ? ` <span class="muted">(compteur : ${auto})</span>` : ''}`;
  });
}
function rulesBlock(id) {
  if (CTX.online) return `<details class="rules"><summary>Règles</summary><ul>${rulesList(id).map(i => `<li>${i}</li>`).join('')}</ul></details>`;
  return `<details class="rules"><summary>Règles</summary><ul>${rulesList(id).map(i => `<li>${i}</li>`).join('')}</ul>
    <p class="row" style="margin:0 0 14px"><button class="btn" data-act="editor" data-arg="${id}">Modifier les cartes</button>
      <button class="btn" data-act="settings" data-arg="${id}">Réglages de ce jeu</button></p></details>`;
}
