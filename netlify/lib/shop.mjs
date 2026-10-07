// Partagé par les fonctions de paiement : catalogue, Stripe et Firebase (côté serveur).
// Les clés viennent des variables d'environnement Netlify (Project configuration → Environment variables), jamais du code :
//   STRIPE_SECRET_KEY      clé secrète Stripe (sk_test_… en mode test)
//   STRIPE_WEBHOOK_SECRET  secret de signature du webhook Stripe (whsec_…)
//   FIREBASE_CLIENT_EMAIL  et FIREBASE_PRIVATE_KEY : compte de service Firebase (fichier JSON de la console Firebase)
import Stripe from 'stripe';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Prix en centimes. C'est ce catalogue qui fait foi : le prix affiché dans l'app n'est jamais envoyé au serveur.
// Garder les mêmes prix dans web/js/pages/shop.js (skins) et web/js/core/account.js (HOT_PRICE).
export const CATALOG = {
  hot:     { name: 'Thème Hot', amount: 299 },
  biere:   { name: 'Skin Pression', amount: 99 },
  bistrot: { name: 'Skin Bistrot', amount: 99 },
  or:      { name: 'Skin Carré d’or', amount: 199 },
  neon:    { name: 'Skin Néon', amount: 199 }
};

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY);

function firebase() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: 'tournee-81b4c',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      }),
      databaseURL: 'https://tournee-81b4c-default-rtdb.europe-west1.firebasedatabase.app'
    });
  }
}
// Vérifie le jeton de connexion envoyé par l'app et renvoie le compte (uid, email)
export async function verifyUser(idToken) {
  firebase();
  return getAuth().verifyIdToken(idToken);
}
// Ajoute l'achat au compte : users/<uid>/owned/<article> = true, et une trace du paiement
export async function grant(uid, item, session) {
  firebase();
  const db = getDatabase();
  await db.ref(`users/${uid}`).update({
    [`owned/${item}`]: true,
    [`purchases/${session.id}`]: { item, amount: session.amount_total, currency: session.currency, test: !session.livemode, at: Date.now() }
  });
}

export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
