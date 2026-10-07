# Tournée

Jeux de soirée sur téléphone.
- **À boire** : les jeux de cartes (Palmier, Rivière, Purple, Autoroute, Pyramide, Ascenseur, Barbu) et sans cartes
  (Je n'ai jamais, Action ou vérité, dont les phrases sont dans `web/js/games/jamais.js` et `aov.js`).
  Un **thème** (Soft, Normal, Hard, Hot) change leurs phrases et les cartes du Palmier et du Barbu : `web/js/core/themes.js`.
  Hot est marqué Premium mais gratuit pour l'instant, après confirmation « 18 ans ou plus ».
- **Loisirs** (jeux sans alcool) : Uno, Fléchettes (on lance la fléchette d’un geste vers la cible) et Puissance 4.

Tous les jeux se jouent sur un seul téléphone ou en ligne, chacun sur son téléphone (QR code pour rejoindre).

Site installable sur l'écran d'accueil, jouable hors ligne, avec un mode à plusieurs téléphones.

## Organisation du projet

```
AlcG/
├── web/                      Le site complet. C'est ce dossier qu'on publie (Netlify) et qu'utilise l'app Android.
│   ├── index.html            La page : écran de chargement, zones de l'app, liste des styles et des scripts
│   ├── styles/
│   │   ├── base.css          Couleurs, polices, mise en page, boutons, champs, fenêtres
│   │   ├── cards.css         Les cartes à jouer (face, dos, tailles, animation)
│   │   ├── navigation.css    Barre de navigation du bas et écran de chargement
│   │   ├── pages.css         Onglets À boire, Loisirs, Joueurs, Réglages, Boutique, éditeur de cartes
│   │   └── games.css         Écrans de jeu, un bloc par jeu
│   ├── js/
│   │   ├── core/             Le socle partagé
│   │   │   ├── state.js        État de l'app, enregistrement sur le téléphone, joueurs, compteur
│   │   │   ├── cards.js        Paquet de cartes, tirage, affichage d'une carte
│   │   │   ├── settings.js     Réglages des règles de chaque jeu
│   │   │   ├── card-rules.js   Action de chaque carte au Palmier et au Barbu
│   │   │   └── screens.js      Registre des pages et des jeux, en-têtes, barre de navigation (6 onglets)
│   │   ├── games/            Un fichier par jeu (cartes et plateau) : sa tuile, sa mise en place, son écran, ses boutons
│   │   ├── pages/            Un fichier par page : home, players, settings, card-editor, shop, install
│   │   ├── online.js         Jeu à plusieurs téléphones (Firebase) : code ou QR code pour rejoindre
│   │   └── app.js            Affichage, navigation, « Annuler », reprise de partie, démarrage
│   ├── fonts/  icons/        Polices et icônes (aucune dépendance à internet)
│   ├── vendor/               qrcode.min.js (fabrique le QR code, MIT) et jsQR.js (le lit avec la caméra, Apache 2.0)
│   ├── manifest.webmanifest  Nom, couleurs et icônes pour l'installation sur l'écran d'accueil
│   ├── sw.js                 Garde une copie de l'app sur le téléphone pour jouer sans réseau
│   └── confidentialite.html  Politique de confidentialité (adresse à donner au Play Store)
├── assets/                   Images sources de l'icône et de l'écran de démarrage de l'app Android
├── capacitor.config.json     App Android : nom, identifiant, dossier du site
├── database.rules.json       Règles d'accès Firebase pour les parties en ligne
├── firebase.json             Hébergement Firebase (facultatif)
└── package.json              Commandes pour l'app Android
```

**Pas d'étape de construction** : on modifie les fichiers de `web/`, et c'est directement la nouvelle version.

## Modifier l'app

- **Un texte, une règle ou un comportement d'un jeu** : `web/js/games/<jeu>.js`. Chaque jeu est déclaré avec `defineGame({...})` :
  `init` crée une nouvelle partie, `screen` renvoie le HTML de l'écran, `actions` contient ce que font ses boutons.
- **Ajouter un jeu** : créer `web/js/games/mon-jeu.js` sur le modèle d'un jeu existant, puis l'ajouter dans la liste des scripts de `web/index.html`
  (après les autres jeux). Il apparaît tout seul dans son onglet : `tab: 'home'` (À boire, jeux de cartes), `tab: 'party'` (À boire, sans cartes) ou `tab: 'board'` (Loisirs).
- **Un réglage** : `web/js/core/settings.js` (la liste), puis `cfg('jeu', 'réglage')` pour lire sa valeur dans le jeu.
- **Les couleurs** : variables en haut de `web/styles/base.css`. **Un skin de cartes** : liste `SKINS` de `web/js/pages/shop.js`.
- **Les boutons** fonctionnent tous pareil : `<button data-act="nomAction" data-arg="paramètre">` appelle `A.nomAction(paramètre)`.

**Tester sur l'ordinateur** : les scripts ne se chargent pas en ouvrant `index.html` directement, il faut un petit serveur.
Avec Node.js installé, dans le dossier `AlcG` :

```bash
npx serve web
```

puis ouvrir l'adresse affichée (par défaut http://localhost:3000).

## Mettre le jeu sur internet

**Netlify Drop (le plus simple, rien à installer)**
1. Se connecter sur https://app.netlify.com
2. La première fois : aller sur https://app.netlify.com/drop et glisser le dossier `web`.
3. Pour une nouvelle version : dans le site sur Netlify → Deploys, glisser à nouveau le dossier `web`.

Dans Netlify, garder le badge « Powered by Netlify » désactivé : Project configuration → General → Powered by Netlify badge → Off.

**Firebase Hosting** (adresse `https://tournee-81b4c.web.app`, demande Node.js) :

```bash
npx firebase-tools deploy --only hosting --project tournee-81b4c
```

**Installer sur le téléphone** : ouvrir l'adresse du site, puis le bouton « Installer l'app » (Android),
ou Partager → « Sur l'écran d'accueil » dans Safari (iPhone).

## Plusieurs téléphones (Firebase)

**Tous les jeux** se jouent aussi sur plusieurs téléphones. Un joueur crée la partie (onglet En ligne) : la salle d'attente
affiche un QR code et un code à 4 lettres. Les autres scannent le QR code (En ligne → Scanner le QR code) ou tapent le code.
L'hôte choisit le jeu, lance la partie, puis peut enchaîner sur un autre jeu avec les mêmes joueurs.

Comment ça marche (`web/js/online.js`) : l'état du jeu est envoyé à tous les téléphones, et chacun affiche le même écran
que sur un seul téléphone, avec les joueurs de la partie. Seul le joueur dont c'est le tour peut agir (fonction `turnOf` de
chaque jeu). À l'Uno, chacun ne voit que sa propre main. La Pyramide et la Rivière ont leur propre version en ligne (mains cachées).
Le QR code contient l’adresse du site avec `?join=CODE` : lu avec l’appareil photo du téléphone, il ouvre aussi directement la partie.
Le scanner a besoin de la caméra, donc du site en https (Netlify) ou de l’app Android, et de l’autorisation du téléphone.
Les parties passent par la base Firebase `tournee-81b4c` (Realtime Database, Europe). Ce mode a besoin de réseau ; sur un seul téléphone, tout marche hors ligne.

Les règles d'accès sont dans `database.rules.json` (déjà collées dans la console Firebase : Realtime Database → Règles).
Elles n'autorisent que les parties (`rooms/<CODE>`), lisibles par qui connaît le code ; tout le reste de la base est fermé.

L'aperçu publié sur claude.ai ne peut pas joindre Firebase : le mode en ligne et l'installation n'y apparaissent pas.

## Mesure d'audience (Google Analytics)

`web/js/core/analytics.js` envoie à Google Analytics 4 ce que font les joueurs, **seulement s'ils l'acceptent** (bandeau au
premier lancement, modifiable dans Réglages → À propos). Aucun prénom n'est envoyé. Hors ligne, les mesures attendent sur le
téléphone et partent au retour du réseau. Tant que `GA_ID` est vide, rien n'est mesuré et le bandeau n'apparaît pas.

Pour l'activer :
1. Sur https://analytics.google.com : Admin → Créer → Propriété (nom « Tournée », fuseau France, devise euro).
2. Créer un flux de données **Web** avec l'adresse du site Netlify.
3. Copier l'**ID de mesure** (`G-XXXXXXXXXX`) dans `const GA_ID = '…'` en haut de `web/js/core/analytics.js`, puis republier `web`.
4. Admin → Conservation des données : passer à **14 mois**.

Évènements envoyés (Rapports → Engagement → Évènements) :

| Évènement | Quand | Détails |
|---|---|---|
| `page_view` | Chaque page ou jeu ouvert | `page_title` = nom de la page ou du jeu |
| `game_start` / `game_end` / `game_restart` | Partie lancée / quittée / relancée sur un téléphone | `game`, `players`, `duration_sec` |
| `online_create` / `online_join` / `online_start` | Jeu en ligne | `method` (qr, lien, code), `game`, `players` |
| `setting_change` | Réglage modifié | `game`, `setting` |
| `begin_checkout` / `purchase` | Page de paiement ouverte / achat débloqué | `item` |
| `login` | Connexion au compte | `method` (google, email) |
| `theme_change` | Thème de la soirée choisi | `theme` (soft, normal, hard, hot) |
| `skin_use` / `skin_interest` | Skin activé / skin premium touché | `skin` |
| `install` | Bouton « Installer l'app » (Android) | `outcome` |
| `undo` | Bouton « Annuler » | `game` |
| `exception` | Erreur JavaScript chez un joueur | `description` |

Propriété utilisateur `app_mode` : `installee` (écran d'accueil), `site` ou `android`. Pour voir les détails dans les rapports,
les déclarer dans Admin → Définitions personnalisées (dimensions `game`, `method`, `setting`, `skin`, `theme`, `app_mode` ; métrique `duration_sec`).

## Compte et achats (site)

`web/js/core/account.js` : compte **facultatif**, proposé seulement pour acheter (thème Hot, skins premium) ou
« Restaurer mes achats » sur un autre navigateur ou téléphone. Connexion **Google** ou **lien par e-mail** (sans mot de passe),
via Firebase Authentication, chargé seulement quand on ouvre la fenêtre du compte. Pas de compte dans l'app Android
(les achats y passeront par Google Play Billing).

Les achats sont dans la base Firebase : `users/<uid>/owned/<article>` = `true` (`hot`, `neon`, `or`…). Chacun ne peut lire
que les siens, et **personne ne peut les écrire depuis l'app** : seul le futur serveur de paiement (Stripe) les ajoutera.
Tant que `apiKey` est vide, aucun bouton de compte n'apparaît.

Pour l'activer :
1. Console Firebase → **Paramètres du projet** → Vos applications → ajouter une app **Web** (</>) → copier `apiKey` et `appId`
   dans `FIREBASE_CONFIG` en haut de `web/js/core/account.js` (ce n'est pas secret).
2. **Authentication** → Commencer → Mode de connexion : activer **Google**, et **E-mail/Mot de passe** avec l'option
   **Lien envoyé par e-mail (connexion sans mot de passe)**.
3. Authentication → Paramètres → **Domaines autorisés** : ajouter l'adresse du site Netlify (ex. `ton-site.netlify.app`).
4. **Realtime Database** → Règles : coller le contenu de `database.rules.json`, puis Publier.

### Paiement (Stripe)

- `netlify/functions/checkout.mjs` (`/api/checkout`) : vérifie le compte et crée la page de paiement Stripe.
- `netlify/functions/stripe-webhook.mjs` (`/api/stripe-webhook`) : Stripe y confirme le paiement, la fonction écrit
  `users/<uid>/owned/<article>` dans Firebase. C'est le seul endroit qui débloque un achat.
- `netlify/lib/shop.mjs` : **les prix qui font foi** (Hot 2,99 €, Pression et Bistrot 0,99 €, Carré d'or et Néon 1,99 €).
  Garder les mêmes dans `web/js/pages/shop.js` et `HOT_PRICE` de `web/js/core/account.js`.
- `netlify.toml` : publie `web/` et les fonctions. Dans Netlify, **Base directory doit être vide**.

Variables d'environnement Netlify (Project configuration → Environment variables) :
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.

**Mode test** : tant que `PAY_LIVE` vaut `false` dans `account.js`, personne ne peut acheter, sauf sur un navigateur où l'on a
ouvert `https://tourneegame.netlify.app/?paytest=1` (`?paytest=0` pour en sortir). Hot y devient payant et un bandeau
rappelle la carte de test Stripe 4242 4242 4242 4242. Pour ouvrir la vente : clés Stripe *live* dans Netlify, nouveau webhook
en mode live, puis `PAY_LIVE = true`.

## App Android

1. Installer **Node.js** (version LTS) : https://nodejs.org, et **Android Studio** : https://developer.android.com/studio
   (au premier lancement, laisser l'assistant installer le SDK Android).
2. Vérifier l'identifiant `com.robintijou.tournee` dans `capacitor.config.json` : il ne pourra plus changer une fois l'app publiée.
3. Une seule fois, dans le dossier `AlcG` :

```bash
npm run setup
```

```bash
npm run android:init
```

4. Pour lancer l'app : activer le **débogage USB** sur le téléphone, le brancher, puis

```bash
npm run android
```

Android Studio s'ouvre : choisir le téléphone en haut, puis ▶. Après chaque modification de `web/`, relancer `npm run android`.

**Vibrations** : après `npm run android:init`, ajouter une fois dans `android/app/src/main/AndroidManifest.xml`, à côté de la ligne
`INTERNET` : `<uses-permission android:name="android.permission.VIBRATE" />`. Sans elle, l'app Android ne vibre pas (le site, si).

## Publier sur le Play Store

1. Créer un compte développeur Google Play (25 $ une seule fois) : https://play.google.com/console
2. Dans Android Studio : **Build → Generate Signed App Bundle or APK → Android App Bundle**.
   Créer une clé de signature (fichier `.jks`). **La sauvegarder en lieu sûr avec son mot de passe** : sans elle, impossible de publier les mises à jour. Ne jamais la mettre sur GitHub.
3. Dans la Play Console : créer l'app, puis remplir :
   - la fiche (description, captures d'écran, icône 512×512 : `web/icons/icon-512.png`) ;
   - le questionnaire de classification : l'app fait référence à l'alcool, elle sera classée pour adultes ;
   - le public cible : 18 ans et plus ;
   - la sécurité des données : prénom et état de la partie envoyés à Firebase pour le jeu en ligne ; si le joueur accepte,
     données d'utilisation et plantages envoyés à Google Analytics (sans prénom) ;
   - la politique de confidentialité : l'adresse de `confidentialite.html` sur le site.
4. Envoyer le fichier `.aab` en **test interne** d'abord, l'installer sur ton téléphone, puis passer en production.

Les nouveaux comptes développeur personnels doivent souvent faire un **test fermé avec plusieurs testeurs pendant 14 jours** avant de pouvoir publier en production.

Pour une mise à jour : augmenter `versionCode` (+1) et `versionName` dans `android/app/build.gradle`, puis générer un nouveau bundle signé avec **la même clé**.
