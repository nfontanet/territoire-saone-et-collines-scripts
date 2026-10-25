# groupsDiffusionSyncForGroup

Script de synchronisation des groupes de diffusion pour Territoire Saône et Collines.

## 📋 Informations

- **ID du Script**: `1DnEhUi_taBSEKiPr4v_ls_1paklvsjK8W8NtGIAwwIuPfHK4Qq9LBtQj`
- **Type**: Synchronisation de groupes
- **Langage**: JavaScript (peuvent être migrés vers TypeScript)
- **Dossier source**: `src/`

## 📁 Structure

```
groupsDiffusionSyncForGroup/
├── .clasp.json       # Configuration clasp
├── appsscript.json   # Configuration Google Apps Script
├── src/
│   ├── adminSDK.js
│   ├── adresseGroups.js
│   ├── autorisation.js
│   ├── config.js
│   ├── info.js
│   ├── initialisation.js
│   ├── journal.js
│   ├── lecture.js
│   ├── listesMissions.js
│   ├── menu.js
│   ├── miseEnForme.js
│   ├── missionParDefault.js
│   ├── saison.js
│   ├── synchAuto.js
│   └── synchronisation.js
└── README.md
```

## 🚀 Utilisation

### Déploiement initial

```bash
npm run clasp:push groupsDiffusionSyncForGroup
```

### Pousser les modifications

```bash
npm run clasp:push groupsDiffusionSyncForGroup
```

### Tirer les modifications depuis Google Apps Script

```bash
npm run clasp:pull groupsDiffusionSyncForGroup
```

## 🔧 Configuration

Le fichier `.clasp.json` est configuré pour :
- Utiliser le dossier `src/` comme racine
- Extension de fichier : `.js` (JavaScript)
- ID du script : `1DnEhUi_taBSEKiPr4v_ls_1paklvsjK8W8NtGIAwwIuPfHK4Qq9LBtQj`

## 📝 Notes

- Ce script était initialement dans `/SGDF/Scripts/annunaires/groupsDiffusionSyncForGroupe/`
- Les fichiers ont été copiés dans la nouvelle structure du repository
- Pour migrer vers TypeScript, renommez les fichiers `.js` en `.ts` et mettez à jour `.clasp.json` avec `"fileExtension": "ts"`
