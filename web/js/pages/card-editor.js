// Éditeur de cartes : changer le nom, l'action et les gorgées comptées de chaque carte du Palmier et du Barbu.
// Les modifications s'enregistrent à chaque frappe (S.rules, défini dans core/card-rules.js), pour le thème de la soirée.

SCREENS.editor = function () {
  const id = S.editId, R = S.rules[id];
  return `<div class="top">
      <button class="iconbtn" data-act="${S.editBack ? 'backToGame' : 'home'}">← ${S.editBack === 'settings' ? 'Réglages' : S.editBack ? 'Retour au jeu' : 'Jeux'}</button>
      <h2>Mes règles</h2><span></span>
    </div>
    <div class="tabs">${['palmier', 'barbu'].map(t => `<button class="chip pick" data-act="editor" data-arg="${t}" aria-pressed="${t === id}">${t === 'palmier' ? 'Palmier' : 'Barbu'}</button>`).join('')}</div>
    <p class="muted" style="margin:0;font-size:14px">Cartes du thème <b>${themeName(S.theme)}</b> (il se change en haut de l’onglet À boire). Les changements s’enregistrent tout seuls sur ce téléphone. « Gorgées comptées » ajoute des gorgées au compteur de celui qui tire la carte.</p>
    <div class="edit">${Object.entries(R).map(([v, r]) => {
      const c = { v: +v, s: '♠', red: false, sn: 'pique' };
      return `<div class="erow">${cardHTML(c)}
        <div class="fields">
          <input class="t" id="rule-${id}-${v}-t" data-rule="${id}:${v}:t" value="${esc(r.t)}" maxlength="40" aria-label="Nom de la règle du ${NAME(+v)}">
          <textarea id="rule-${id}-${v}-d" data-rule="${id}:${v}:d" maxlength="240" aria-label="Description de la règle du ${NAME(+v)}">${esc(r.d)}</textarea>
          <label class="s">Gorgées comptées <input type="number" min="0" max="20" inputmode="numeric" id="rule-${id}-${v}-s" data-rule="${id}:${v}:sips" value="${r.sips || 0}"></label>
        </div></div>`;
    }).join('')}</div>
    <button class="btn" data-act="resetRules">${S.confirmReset ? 'Confirmer : revenir aux règles d’origine' : 'Revenir aux règles d’origine'}</button>`;
};

Object.assign(A, {
  editor(id) {
    if (S.screen !== 'editor') S.editBack = S.screen === 'home' ? null : S.screen;
    S.editId = id; S.screen = 'editor'; S.confirmReset = false;
    render(); scrollTop();
  },
  backToGame() { S.screen = S.editBack; S.editBack = null; render(); scrollTop(); },
  resetRules() {
    if (!S.confirmReset) { S.confirmReset = true; render(); return; }
    S.rules[S.editId] = themeRules(S.editId);
    store.set(ruleKey(S.editId), S.rules[S.editId]);
    S.confirmReset = false; render(); toast('Règles d’origine rétablies');
  }
});

// Enregistre chaque champ dès qu'il change (data-rule="jeu:carte:champ")
document.addEventListener('input', e => {
  const f = e.target.dataset?.rule; if (!f) return;
  const [id, v, k] = f.split(':');
  S.rules[id][v][k] = k === 'sips' ? Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)) : e.target.value;
  store.set(ruleKey(id), S.rules[id]);
});
