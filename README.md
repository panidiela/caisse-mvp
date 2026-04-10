# Yewo — Maîtrisez votre business

Application mobile POS offline-first pour café, bar, restaurant et snack au Cameroun.

## Stack

- React Native + Expo 51
- TypeScript
- Zustand (état global)
- Expo Router (navigation)
- expo-sqlite (persistance locale)

## Lancer le projet

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer Expo
npx expo start

# 3. Scanner le QR code avec l'app Expo Go (Android)
#    ou appuyer sur 'a' pour lancer sur émulateur Android
```

## Structure

```
app/
  index.tsx                  # Écran de connexion (choix de rôle)
  (server)/
    tables.tsx               # Liste des tables
    order.tsx                # Détail commande / table
    products.tsx             # Sélection de produits
    scan.tsx                 # Scanner code-barres
  (cashier)/
    caisse.tsx               # Écran principal caissière
    payment.tsx              # Encaissement
    receipt.tsx              # Reçu
  (manager)/
    dashboard.tsx            # Dashboard manager

src/
  types/index.ts             # Types TypeScript
  store/useStore.ts          # Store Zustand
  db/database.ts             # SQLite helpers
  data/mockData.ts           # Données initiales
  constants/theme.ts         # Couleurs / design
  utils/format.ts            # Formatage prix/dates
  components/ui/             # Composants réutilisables
```

## Utilisateurs de test

| Nom        | Rôle     |
|------------|----------|
| Aminata    | Serveuse |
| Christelle | Serveuse |
| Brigitte   | Caissière |
| Patron     | Manager  |

## Données mockées

- 8 tables (Table 1–6, Comptoir, Terrasse)
- 20 produits (bières, sodas, eaux, boissons chaudes, plats, accompagnements)
- Codes-barres réels pour les boissons emballées

## Fonctionnalités MVP

- ✅ Connexion par rôle
- ✅ Gestion tables (libre / occupée / addition / payée)
- ✅ Prise de commande
- ✅ Ajout / suppression d'articles
- ✅ Scanner code-barres (expo-camera)
- ✅ Encaissement (espèces, Orange Money, MTN MoMo)
- ✅ Calcul automatique de la monnaie
- ✅ Reçu affiché à l'écran
- ✅ Dashboard manager (ventes du jour, top produits, par mode de paiement)
- ✅ Stockage 100% local (SQLite)
- ✅ Fonctionne sans internet

## Notes techniques

- Les données persistent dans SQLite entre les sessions
- La base est initialisée avec les tables et produits mock au premier lancement
- La synchronisation cloud est prévue mais non implémentée dans ce MVP
- Pour ajouter un nouveau produit: modifier `src/data/mockData.ts` et vider la base (réinstaller l'app)
