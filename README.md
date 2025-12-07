## Scripts Google Workspace

Ce projet permet de gérer des scripts Google Apps Script (GAS) en TypeScript, avec un monorepo contenant plusieurs sous-projets (Drive et Admin). Il utilise zx et tsx pour exécuter les scripts localement et peut être déployé automatiquement via GitHub Actions.

## Structure du projet
/territoire-saone-et-collines-Scripts
│
├─ projects-managerAccountsEquipiers/
│
├─ package.json       # Dépendances et scripts communs
└─ .github/
    └─ workflows/     # CI/CD GitHub Actions pour déploiement

## Prérequis

- Node.js ≥ 22
- Yarn
- Clasp (`npm install -g @google/clasp`)
- Accès aux projets Google Apps Script

## Installation

```bash
# Installer les dépendances du monorepo
yarn install

## Développement local

Exécuter les scripts localement avec zx et tsx :

```bash
# Exemple : exécuter un script drive
yarn zx projects-managerAccountsEquipiers/src/script.ts
```

## Déploiement

Chaque projet GAS peut être déployé avec clasp :
```bash
# Déployer Drive
yarn deploy:drive

# Déployer Admin
yarn deploy:admin
```


> Les scripts de déploiement utilisent les configurations .clasp.
> json spécifiques à chaque projet.

## Conventions

- Chaque sous-projet possède son propre package.json et tsconfig.json si nécessaire.
- Les scripts partagent des utilitaires communs depuis le monorepo si besoin.

- CI GitHub Actions pour le déploiement automatique à chaque push sur main ou dev.

## Exemple d’utilisation
- Création automatique d’utilisateurs à partir d’un fichier Excel (Admin)
- Gestion de fichiers et dossiers sur Google Drive (Drive)

# Liens utiles

- [Clasp - Google Apps Script](https://github.com/google/clasp)
- [TypeScript](https://www.typescriptlang.org/)
- [ZX](https://github.com/jamestalmage/zx)
