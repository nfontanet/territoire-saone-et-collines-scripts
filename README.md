# 🗂️ Territoire Saône et Collines - Scripts Google Apps Script

Repository pour gérer les scripts Google Apps Script utilisés par **Territoire Saône et Collines**.

---

## 📁 Structure

```
territoire-saone-et-collines-scripts/
├── scripts/                          # Dossier racine pour TOUS les scripts GAS
│   └── [NOM_DU_SCRIPT]/              # Ex: hello-world, automation, etc.
│       ├── .clasp.json               # Configuration clasp
│       ├── src/                      # Code source (TypeScript ou JS)
│       │   └── Code.ts               # ou Code.js
│       └── README.md                 # Documentation du script
├── .github/
│   └── workflows/
│       └── clasp-deploy.yml          # Workflow GitHub Actions (optionnel)
├── package.json                      # Dépendances globales
├── tsconfig.json                     # Configuration TypeScript
├── .gitignore
└── scripts/                          # Scripts de déploiement (zx)
    └── deploy/
        ├── push.ts
        ├── pull.ts
        ├── deploy-to-dev.ts
        └── deploy-to-prod.ts
```

---

## 🚀 Initialisation

### Prérequis

- Node.js 18+ 
- npm ou yarn
- [clasp](https://github.com/google/clasp) installé globalement ou via npx
- Un projet Google Apps Script existant

### Installation

```bash
# 1. Cloner le repository
git clone git@github.com:nfontanet/territoire-saone-et-collines-scripts.git
cd territoire-saone-et-collines-scripts

# 2. Installer les dépendances
npm install

# 3. Se connecter à Google Apps Script
npx clasp login
```

---

## 📝 Créer un Nouveau Script

```bash
# 1. Créer le dossier du script
mkdir -p scripts/mon-nouveau-script/src

# 2. Créer le fichier .clasp.json (remplace SCRIPT_ID par ton ID)
echo '{
  "scriptId": "SCRIPT_ID",
  "rootDir": "src",
  "fileExtension": "ts"
}' > scripts/mon-nouveau-script/.clasp.json

# 3. Ajouter un fichier de code
echo 'function myFunction() {
  Logger.log("Hello, World!");
}' > scripts/mon-nouveau-script/src/Code.ts

# 4. (Optionnel) Créer un README.md
echo "# Mon Nouveau Script\n\n- **ID**: SCRIPT_ID\n- **Description**: Description du script." > scripts/mon-nouveau-script/README.md
```

---

## 🔄 Développement Local

### Pousser un script vers Google Apps Script

```bash
# Méthode 1: Via npm script
npm run clasp:push mon-nouveau-script

# Méthode 2: Via zx directement
zx scripts/deploy/push.ts mon-nouveau-script
```

### Tirer un script depuis Google Apps Script

```bash
npm run clasp:pull mon-nouveau-script
# ou
zx scripts/deploy/pull.ts mon-nouveau-script
```

---

## 🎯 Workflow Git

### Travailler sur une nouvelle fonctionnalité

```bash
# 1. Créer une branche de fonctionnalité
git checkout dev
git pull origin dev
git checkout -b feature/ma-nouvelle-fonctionnalite

# 2. Développer (ajouter/modifier des scripts)
# ...

# 3. Pousser vers Google Apps Script pour tester
zx scripts/deploy/push.ts mon-nouveau-script

# 4. Commit et push vers la branche de fonctionnalité
git add .
git commit -m "feat: ajoute ma-nouvelle-fonctionnalite"
git push origin feature/ma-nouvelle-fonctionnalite
```

### Intégrer dans `dev`

```bash
# 1. Fusionner la branche de fonctionnalité dans dev
git checkout dev
git merge feature/ma-nouvelle-fonctionnalite

# 2. Déployer tous les scripts vers Google Apps Script
npm run deploy:dev
```

### Déployer en production (`master`)

```bash
# 1. Vérifier que dev est à jour
git checkout master
git pull origin master
git merge dev

# 2. Déployer en production
npm run deploy:prod
```

---

## ☁️ GitHub Actions (Optionnel)

Le repository inclut un workflow GitHub Actions pour automatiser le déploiement.

### Configuration requise

1. Ajouter un **Secret** `CLASP_TOKEN` dans **Settings > Secrets > Actions**
2. Le contenu de `CLASP_TOKEN` doit être celui de ton fichier local `~/.clasp/token.json` (ou `%USERPROFILE%\.clasp\token.json` sur Windows)

### Fonctionnement

- **Sur push vers `dev`**: Déploiement automatique vers Google Apps Script en mode développement
- **Sur push vers `master`**: Déploiement automatique vers Google Apps Script en mode production

---

## 📚 Scripts Disponibles

| Commande | Description |
|----------|-------------|
| `npm run clasp:login` | Se connecter à Google Apps Script |
| `npm run clasp:push <script>` | Pousser un script vers GAS |
| `npm run clasp:pull <script>` | Tirer un script depuis GAS |
| `npm run deploy:dev` | Déployer tous les scripts vers dev |
| `npm run deploy:prod` | Déployer tous les scripts vers production |

---

## 🔧 Configuration TypeScript

Le projet utilise TypeScript pour le développement des scripts. La configuration est définie dans `tsconfig.json`:

- Cible: ES2020
- Module: ESNext
- Strict mode: activé
- Dossier de sortie: `dist/`

---

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
