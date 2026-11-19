# PokéNoël : Attrapez-les tous !

Un jeu d’aventure rétro style **Pokémon Game Boy Advance (Gen 3)** entièrement en français, conçu comme cadeau de Noël pour toute la famille.

## Les 4 modes de jeu

1. **PM — Pola & Marguerite** (*La Cité des Lettres* — Littérature classique & Théâtre, Boss Final : **Molière**)
2. **DF — Dominique & Francis** (*Rio-Hollywood* — Musique traditionnelle brésilienne & Cinéma américain classique, Boss Final : **Alfred Hitchcock**)
3. **JP — Juliette & Pierre** (*Lumière & Saveurs* — Gastronomie & Photographie, Boss Final : **Paul Bocuse**)
4. **AJ — Alexis & Joseph** (*Arena-City* — Football moderne & Basketball moderne, Boss Final : **Zinédine Zidane**)

## Contrôles

- **Déplacement :** Flèches directionnelles ou `Z Q S D` (et manette tactile sur mobile / bouton *Manette*)
- **Valider / Parler / Action (A) :** `Espace`, `Entrée` ou `E`
- **Retour / Menu (B) :** `Échap`, `X` ou `Retour`
- **Courir :** Maintenir `Maj` (`Shift`)
- **Échanger de meneur dans le binôme :** `C` ou `Tab`
- **Couper / Activer le son :** `M` ou bouton *Son*

## Personnaliser les avatars avec les photos de famille

Tous les visages et sprites des 8 membres de la famille sont centralisés dans [familyAvatars.ts](file:///Users/leonardhussenot/Documents/Antigravity/game-family/src/data/familyAvatars.ts).

Vous pouvez :
- Ajuster directement leurs attributs pixel-art (`appearance` et `portrait`), **ou**
- Renseigner `customPortraitUrl` (portrait `48×48` PNG ou Data URL) et `customSpriteSheetUrl` (planche `48×96` soit 4 lignes `bas/haut/gauche/droite` × 3 vignettes `16×24`) pour remplacer automatiquement les visuels par des sprites créés à partir des photos !

## Commandes de développement & build

```bash
npm install
npm run dev        # Lancer le serveur de développement local
npm run typecheck  # Vérifier les types TypeScript
npm test           # Exécuter la suite de tests d'intégrité et de jouabilité
npm run build      # Produire dist/index.html autonome (fichier unique)
```

Le fichier `dist/index.html` généré par `npm run build` est 100 % autonome : il peut être hébergé gratuitement (Netlify, GitHub Pages, Vercel) ou ouvert directement dans un navigateur.
