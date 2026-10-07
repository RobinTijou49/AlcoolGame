// POST /api/checkout { item, token } : crée une page de paiement Stripe pour un article et renvoie son adresse.
// token = jeton de connexion Firebase de l'app : l'achat est rattaché à ce compte.
// consent = true : l'acheteur a coché l'acceptation des CGV et la renonciation au droit de rétractation.
import { CATALOG, stripe, verifyUser, json } from '../lib/shop.mjs';

export default async req => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'body' }); }
  const product = CATALOG[body.item];
  if (!product) return json(400, { error: 'item' });
  // Acceptation des CGV et renonciation au droit de rétractation, cochées dans l'app avant le paiement
  if (body.consent !== true) return json(400, { error: 'consent' });

  let user;
  try { user = await verifyUser(body.token || ''); } catch { return json(401, { error: 'auth' }); }

  const origin = new URL(req.url).origin;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: product.amount, product_data: { name: product.name } } }],
      customer_email: user.email || undefined,
      client_reference_id: user.uid,
      metadata: { uid: user.uid, item: body.item, consent: `CGV acceptées et rétractation renoncée le ${new Date().toISOString()}` },
      custom_text: { submit: { message: 'Contenu numérique livré immédiatement après le paiement : vous avez renoncé à votre droit de rétractation (CGV, article 6).' } },
      success_url: `${origin}/?paid=${body.item}`,
      cancel_url: `${origin}/?paid=cancel`
    });
    return json(200, { url: session.url });
  } catch (e) {
    console.error('Stripe checkout', e.message);
    return json(502, { error: 'stripe' });
  }
};

export const config = { path: '/api/checkout' };
