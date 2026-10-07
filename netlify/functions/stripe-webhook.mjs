// POST /api/stripe-webhook : Stripe prévient ici quand un paiement est réussi.
// La signature est vérifiée avec STRIPE_WEBHOOK_SECRET, puis l'achat est ajouté au compte dans Firebase.
// C'est le seul endroit qui débloque un achat : l'app ne peut pas écrire ses achats (database.rules.json).
import { CATALOG, stripe, grant, json } from '../lib/shop.mjs';

export default async req => {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Signature Stripe refusée', e.message);
    return json(400, { error: 'signature' });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object;
    const { uid, item } = s.metadata || {};
    if (s.payment_status === 'paid' && uid && CATALOG[item]) {
      await grant(uid, item, s);
      console.log(`Achat ${item} pour ${uid}${s.livemode ? '' : ' (test)'}`);
    }
  }
  return json(200, { received: true });
};

export const config = { path: '/api/stripe-webhook' };
