# Hello World - Script Exemple

Exemple de base pour un script Google Apps Script utilisé par Territoire Saône et Collines.

## 📋 Informations

- **ID du Script**: `REPLACE_WITH_YOUR_SCRIPT_ID`
- **Type**: Exemple / Template
- **Langage**: TypeScript
- **Dossier source**: `src/`

## 📝 Fonctions Disponibles

| Fonction | Description |
|----------|-------------|
| `myFunction()` | Fonction principale, point d'entrée par défaut |
| `getGreeting()` | Retourne un message de salutation |
| `greet(name)` | Retourne un message de salutation personnalisé |

## 🚀 Utilisation

### Déploiement initial

1. Remplacer `REPLACE_WITH_YOUR_SCRIPT_ID` dans `.clasp.json` par l'ID de votre script Google Apps Script
2. Exécuter: `npm run clasp:push hello-world`

### Mises à jour

Après chaque modification du code:
```bash
npm run clasp:push hello-world
```

### Récupérer les modifications depuis Google Apps Script

```bash
npm run clasp:pull hello-world
```

## 🔧 Configuration

Le fichier `.clasp.json` contient la configuration spécifique à ce script:

```json
{
  "scriptId": "VOTRE_SCRIPT_ID",
  "rootDir": "src",
  "fileExtension": "ts"
}
```

## 📂 Structure

```
hello-world/
├── .clasp.json    # Configuration clasp
├── src/
│   └── Code.ts    # Code source TypeScript
└── README.md      # Ce fichier
```
