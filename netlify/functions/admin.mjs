// POST /api/admin { token, src } : données du tableau de bord /admin, réservé aux adresses de ADMIN_EMAILS.
// src choisit la source, chargée séparément pour qu'une source en panne n'empêche pas les autres de s'afficher :
//   stripe   ventes, revenus, remboursements (clé Stripe du site : test ou live)
//   firebase comptes (Authentication), achats (users/*), parties en ligne (rooms/*)
//   ga       Google Analytics 4 sur 28 jours (Data API), avec le compte de service Firebase
//   realtime Google Analytics en temps réel (30 dernières minutes)
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { JWT } from 'google-auth-library';
import { CATALOG, stripe, firebase, json } from '../lib/shop.mjs';

const DAY = 86400000;
const dayKey = t => new Date(t).toISOString().slice(0, 10);
// Les 30 derniers jours, du plus ancien au plus récent, à zéro
const lastDays = (n = 30) => Array.from({ length: n }, (_, i) => dayKey(Date.now() - (n - 1 - i) * DAY));
const countBy = (list, key) => list.reduce((o, x) => ((o[key(x)] = (o[key(x)] || 0) + 1), o), {});

export default async req => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'body' }); }

  // Vérifie que c'est bien un administrateur
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) return json(500, { error: 'ADMIN_EMAILS manquant dans Netlify' });
  let user;
  try { firebase(); user = await getAuth().verifyIdToken(body.token || ''); } catch { return json(401, { error: 'auth' }); }
  if (!user.email_verified || !admins.includes((user.email || '').toLowerCase())) return json(403, { error: 'forbidden' });

  try {
    const src = { stripe: fromStripe, firebase: fromFirebase, ga: fromGA, realtime: fromRealtime }[body.src];
    if (!src) return json(400, { error: 'src' });
    return json(200, await src());
  } catch (e) {
    console.error('admin', body.src, e.message);
    return json(502, { error: e.message });
  }
};

// ---------- Stripe ----------
async function fromStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant');
  const s = stripe(), sessions = [], refunds = [];
  for await (const x of s.checkout.sessions.list({ limit: 100, status: 'complete' })) { sessions.push(x); if (sessions.length >= 1000) break; }
  for await (const r of s.refunds.list({ limit: 100 })) { refunds.push(r); if (refunds.length >= 500) break; }
  const paid = sessions.filter(x => x.payment_status === 'paid');
  const days = Object.fromEntries(lastDays().map(d => [d, 0]));
  const byItem = {};
  for (const x of paid) {
    const d = dayKey(x.created * 1000);
    if (d in days) days[d] += x.amount_total;
    const it = x.metadata?.item || '?';
    byItem[it] = byItem[it] || { name: CATALOG[it]?.name || it, count: 0, amount: 0 };
    byItem[it].count++; byItem[it].amount += x.amount_total;
  }
  const since = Date.now() / 1000 - 30 * 86400;
  return {
    mode: process.env.STRIPE_SECRET_KEY.startsWith('sk_live') ? 'live' : 'test',
    revenue: paid.reduce((a, x) => a + x.amount_total, 0),
    revenue30: paid.filter(x => x.created >= since).reduce((a, x) => a + x.amount_total, 0),
    sales: paid.length,
    sales30: paid.filter(x => x.created >= since).length,
    buyers: new Set(paid.map(x => x.metadata?.uid || x.customer_details?.email)).size,
    refunds: refunds.length,
    refunded: refunds.reduce((a, r) => a + (r.status === 'succeeded' ? r.amount : 0), 0),
    byItem: Object.entries(byItem).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.amount - a.amount),
    days: Object.entries(days).map(([d, v]) => ({ d, v })),
    recent: paid.slice(0, 12).map(x => ({ at: x.created * 1000, item: CATALOG[x.metadata?.item]?.name || x.metadata?.item, amount: x.amount_total, email: x.customer_details?.email || '' }))
  };
}

// ---------- Firebase : comptes, achats, parties en ligne ----------
async function fromFirebase() {
  firebase();
  const users = [];
  let page;
  do { page = await getAuth().listUsers(1000, page?.pageToken); users.push(...page.users); } while (page.pageToken && users.length < 20000);
  const created = users.map(u => Date.parse(u.metadata.creationTime));
  const lastIn = users.map(u => Date.parse(u.metadata.lastSignInTime || u.metadata.creationTime));
  const days = Object.fromEntries(lastDays().map(d => [d, 0]));
  created.forEach(t => { const d = dayKey(t); if (d in days) days[d]++; });
  const provider = countBy(users, u => (u.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Lien e-mail'));

  const db = getDatabase();
  const [usersNode, rooms] = await Promise.all([db.ref('users').get(), db.ref('rooms').get()]);
  const owned = {}, buyers = new Set();
  let purchases = 0;
  usersNode.forEach(u => {
    const o = u.child('owned').val() || {};
    for (const k in o) if (o[k]) { owned[k] = (owned[k] || 0) + 1; buyers.add(u.key); }
    purchases += Object.keys(u.child('purchases').val() || {}).length;
  });
  // Parties en ligne : celles créées depuis moins de 12 h (une partie abandonnée sans « Quitter » reste dans la base)
  const live = [];
  rooms.forEach(r => {
    const v = r.val() || {};
    if (Date.now() - (v.created || 0) < 12 * 3600000) live.push({ game: v.game || '?', players: Object.keys(v.players || {}).length, phase: v.state?.phase || '?' });
  });
  return {
    accounts: users.length,
    new30: created.filter(t => Date.now() - t < 30 * DAY).length,
    active7: lastIn.filter(t => Date.now() - t < 7 * DAY).length,
    provider,
    days: Object.entries(days).map(([d, v]) => ({ d, v })),
    buyers: buyers.size,
    purchases,
    owned: Object.entries(owned).map(([id, n]) => ({ id, name: CATALOG[id]?.name || id, n })).sort((a, b) => b.n - a.n),
    rooms: { total: rooms.numChildren(), live: live.length, playing: live.filter(r => r.phase !== 'lobby').length,
      players: live.reduce((a, r) => a + r.players, 0), games: countBy(live, r => r.game) }
  };
}

// ---------- Google Analytics 4 ----------
let jwt;
function gaClient() {
  if (!process.env.GA_PROPERTY_ID) throw new Error('GA_PROPERTY_ID manquant dans Netlify');
  jwt = jwt || new JWT({
    email: process.env.FIREBASE_CLIENT_EMAIL,
    key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  });
  return jwt;
}
async function gaCall(method, body) {
  const r = await gaClient().request({
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA_PROPERTY_ID}:${method}`,
    method: 'POST', data: body
  }).catch(e => { throw new Error(e.response?.data?.error?.message || e.message); });
  return r.data;
}
// Un rapport : renvoie des lignes { dims: [...], vals: [...] } ou { error } (ex. champ personnalisé pas encore déclaré)
async function report(body) {
  try {
    const d = await gaCall('runReport', { dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }], limit: 50, ...body });
    return (d.rows || []).map(r => ({ dims: (r.dimensionValues || []).map(x => x.value), vals: r.metricValues.map(x => +x.value) }));
  } catch (e) { return { error: e.message }; }
}
const eventIs = names => ({ filter: { fieldName: 'eventName', inListFilter: { values: names } } });
const byEvent = (dim, names, metric = 'eventCount') => report({
  dimensions: [{ name: dim }, { name: 'eventName' }], metrics: [{ name: metric }], dimensionFilter: eventIs(names),
  orderBys: [{ metric: { metricName: metric }, desc: true }]
});

async function fromGA() {
  const [totals, daily, events, games, durations, countries, devices, modes, themes, skins, online, pages, installs, errors] = await Promise.all([
    report({ dateRanges: [{ startDate: 'today', endDate: 'today', name: 'j' }, { startDate: '6daysAgo', endDate: 'today', name: 's' }, { startDate: '27daysAgo', endDate: 'today', name: 'm' }],
      metrics: ['activeUsers', 'newUsers', 'sessions', 'averageSessionDuration', 'screenPageViews', 'engagementRate'].map(name => ({ name })) }),
    report({ dimensions: [{ name: 'date' }], metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }], orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    report({ dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }], orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }] }),
    byEvent('customEvent:game', ['game_start']),
    report({ dimensions: [{ name: 'customEvent:game' }], metrics: [{ name: 'eventCount' }, { name: 'customEvent:duration_sec' }], dimensionFilter: eventIs(['game_end']) }),
    report({ dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }], limit: 10 }),
    report({ dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'activeUsers' }] }),
    report({ dimensions: [{ name: 'customUser:app_mode' }], metrics: [{ name: 'activeUsers' }] }),
    byEvent('customEvent:theme', ['theme_change']),
    byEvent('customEvent:skin', ['skin_use', 'skin_interest']),
    byEvent('customEvent:method', ['online_create', 'online_join', 'online_start']),
    report({ dimensions: [{ name: 'pageTitle' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 15 }),
    byEvent('customEvent:outcome', ['install']),
    report({ dimensions: [{ name: 'customEvent:description' }], metrics: [{ name: 'eventCount' }], dimensionFilter: eventIs(['exception']), limit: 10,
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }] })
  ]);
  return { totals, daily, events, games, durations, countries, devices, modes, themes, skins, online, pages, installs, errors };
}
async function fromRealtime() {
  const [total, screens, countries] = await Promise.all([
    gaCall('runRealtimeReport', { metrics: [{ name: 'activeUsers' }] }),
    gaCall('runRealtimeReport', { dimensions: [{ name: 'unifiedScreenName' }], metrics: [{ name: 'activeUsers' }], limit: 10 }),
    gaCall('runRealtimeReport', { dimensions: [{ name: 'country' }], metrics: [{ name: 'activeUsers' }], limit: 10 })
  ]);
  const rows = d => (d.rows || []).map(r => ({ dims: r.dimensionValues.map(x => x.value), vals: r.metricValues.map(x => +x.value) }));
  return { active: +(total.rows?.[0]?.metricValues[0].value || 0), screens: rows(screens), countries: rows(countries) };
}

export const config = { path: '/api/admin' };
