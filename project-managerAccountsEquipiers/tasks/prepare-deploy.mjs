#!/usr/bin/env zx
import { existsSync } from 'fs'
import { homedir } from 'os'

// Vérifie la présence du fichier d'authentification clasp
const clasprcPath = `${homedir()}/.clasprc.json`
if (!existsSync(clasprcPath)) {
  console.log('🔑 Aucun fichier ~/.clasprc.json détecté')
  console.log('👉 Exécutez "clasp login" manuellement puis relancez le déploiement')
  process.exit(1)
}

// Build du projet
console.log('🛠️ Build du projet...')
await $`yarn build`

// Copie du manifest Apps Script dans le dossier build
await $`cp src/appscript.json build/appsscript.json`

// Vérifier le status clasp
console.log('🔍 Vérification des changements...')
const { stdout: status } = await $`clasp status --json`.quiet()

let hasChanges = false
try {
  const parsed = JSON.parse(status)
  if (parsed.filesToPush.length > 0) {
    hasChanges = true
    console.log('📂 Changements détectés :')
    for (const file of parsed.filesToPush) {
      console.log(`- ${file}`)
    }
  }
} catch {
  console.log("⚠️ Impossible d'analyser le status, on suppose qu'il y a des changements.")
  hasChanges = true
}

if (!hasChanges) {
  console.log('✅ Aucun changement à déployer.')
  process.exit(0)
}

console.log('')
console.log('📁 Les fichiers sont prêts pour le déploiement.')
console.log('👉 Pour finaliser le déploiement, exécutez :')
console.log(' >  clasp push')

process.exit(0)
