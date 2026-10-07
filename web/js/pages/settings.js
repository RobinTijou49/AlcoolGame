// Onglet « Réglages » : les règles de tous les jeux sur une seule page (une section par jeu, définies dans core/settings.js).
// Ouverte depuis un jeu, la page n'affiche pas la barre de navigation et propose « Retour au jeu ».

SCREENS.settings = function () {
  const top = S.setBack
    ? `<div class="top"><button class="iconbtn" data-act="settingsBack">← Retour au jeu</button><h2>Réglages</h2><span></span></div>`
    : pageTop('Réglages');
  const anyChanged = Object.values(S.set).some(o => Object.keys(o || {}).length);
  const sections = Object.entries(SETTINGS).map(([id, def]) => {
    const changed = Object.keys(S.set[id] || {}).length > 0;
    const opts = def.opts.map(o => {
      const val = cfg(id, o.key);
      const control = o.num
        ? `<div class="stepper">
            <button class="btn" data-act="setNum" data-arg="${id}:${o.key}:-1" ${val <= o.num[0] ? 'disabled' : ''} aria-label="Moins">−</button>
            <span class="v" aria-live="polite">${val}</span>
            <button class="btn" data-act="setNum" data-arg="${id}:${o.key}:1" ${val >= o.num[1] ? 'disabled' : ''} aria-label="Plus">+</button>
          </div>`
        : `<div class="chips">${o.choices.map(([v, l], i) =>
            `<button class="chip pick" data-act="setOpt" data-arg="${id}:${o.key}:${i}" aria-pressed="${v === val}">${l}</button>`).join('')}</div>`;
      return `<div class="opt"><span class="olabel">${o.label}${val !== o.def ? ' <span class="tagmod">modifié</span>' : ''}</span>${control}</div>`;
    }).join('');
    return `<section class="setsec" id="set-${id}">
      <div class="row spread"><h3 class="sechead">${def.name}</h3>
        ${changed ? `<button class="iconbtn" data-act="resetSettings" data-arg="${id}">Par défaut</button>` : ''}</div>
      ${def.desc ? `<p class="muted" style="margin:0;font-size:14px">${def.desc}</p>` : ''}
      ${opts}
      ${def.cards ? `<button class="btn" data-act="editor" data-arg="${id}">Modifier l’action de chaque carte</button>` : ''}
    </section>`;
  }).join('');
  return `${top}
    ${canOfferInstall() && !S.setBack ? `<button class="banner" data-act="install">${SHARE_ICON}<span><b>Installer l’app</b> sur l’écran d’accueil de ce téléphone.</span></button>` : ''}
    <p class="muted" style="margin:0;font-size:14px">Les changements s’enregistrent sur ce téléphone et s’appliquent tout de suite, y compris à la partie en cours. En ligne, tout le monde joue avec les réglages de l’hôte.</p>
    <nav class="chips" aria-label="Aller au jeu">${Object.entries(SETTINGS).map(([k, s]) =>
      `<button class="chip pick" data-act="jumpSet" data-arg="${k}">${s.name}</button>`).join('')}</nav>
    ${sections}
    <button class="btn" data-act="resetAllSettings" ${anyChanged ? '' : 'disabled'}>${S.confirmResetAll ? 'Confirmer : tout remettre par défaut' : 'Tout remettre par défaut'}</button>
    ${S.setBack ? '' : `<section class="setsec"><h3 class="sechead">À propos</h3>
      <p class="muted" style="margin:0;font-size:14px">L’abus d’alcool est dangereux pour la santé. Une gorgée de soft compte autant qu’une gorgée de bière, et personne n’est obligé de boire.</p>
      ${AN.on ? `<div class="opt"><span class="olabel">Mesure d’audience (Google Analytics, sans prénom)</span>
        <div class="chips"><button class="chip pick" data-act="consent" data-arg="1" aria-pressed="${AN.consent === true}">Activée</button>
          <button class="chip pick" data-act="consent" data-arg="0" aria-pressed="${AN.consent !== true}">Désactivée</button></div></div>` : ''}
      ${ACC.on ? `<div class="opt"><span class="olabel">Compte (facultatif, seulement pour les achats)</span>${accountButtonHTML()}</div>` : ''}
      ${EMBEDDED ? '' : '<a class="muted" style="font-size:14px" href="confidentialite.html">Politique de confidentialité</a>'}
    </section>`}`;
};

Object.assign(A, {
  // Ouvre les réglages ; id = jeu dont on affiche directement la section
  settings(id) {
    if (S.screen !== 'settings') S.setBack = GAMES.some(x => x.id === S.screen) ? S.screen : null;
    S.screen = 'settings'; S.confirmResetAll = false;
    render();
    if (SETTINGS[id] && id !== 'general') A.jumpSet(id); else scrollTop();
  },
  jumpSet(id) { document.getElementById('set-' + id)?.scrollIntoView({ block: 'start' }); },
  settingsBack() { S.screen = S.setBack; S.setBack = null; render(); scrollTop(); },
  setOpt(arg) {
    const [id, key, i] = arg.split(':'), o = SETTINGS[id].opts.find(x => x.key === key);
    (S.set[id] = S.set[id] || {})[key] = o.choices[+i][0];
    if (S.set[id][key] === o.def) delete S.set[id][key];
    S.confirmResetAll = false; store.set('settings', S.set); render();
    track('setting_change', { game: id, setting: key });
  },
  setNum(arg) {
    const [id, key, d] = arg.split(':'), o = SETTINGS[id].opts.find(x => x.key === key);
    const v = Math.min(o.num[1], Math.max(o.num[0], cfg(id, key) + +d));
    (S.set[id] = S.set[id] || {})[key] = v;
    if (v === o.def) delete S.set[id][key];
    S.confirmResetAll = false; store.set('settings', S.set); render();
    track('setting_change', { game: id, setting: key });
  },
  resetSettings(id) { delete S.set[id]; store.set('settings', S.set); render(); toast(`${SETTINGS[id].name} : réglages par défaut`); },
  resetAllSettings() {
    if (!S.confirmResetAll) { S.confirmResetAll = true; render(); return; }
    S.set = {}; S.confirmResetAll = false; store.set('settings', S.set); render(); toast('Tous les réglages sont par défaut');
  }
});
