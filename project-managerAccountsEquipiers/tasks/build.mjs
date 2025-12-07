// Script de build pour Google Apps Script
// 1. Nettoie le dossier build
// 2. Compile le TypeScript (vérifie les types et génère les .d.ts)
// 3. Bundle tout avec esbuild en un seul fichier global compatible GAS

import { build } from 'esbuild'
import { $ } from 'zx'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Obtenir le répertoire racine du projet (parent du dossier tasks)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Changer le working directory vers la racine du projet
process.chdir(projectRoot)

// 1. Nettoyage du dossier build
console.log('🧹 Suppression du dossier build précédent...')
await $`rm -rf build`

// 2. Compilation TypeScript (vérification des types et génération des .d.ts)
console.log('🔎 Vérification des types et compilation TypeScript...')
await $`tsc -p tsconfig.src.json --pretty`

// 3. Bundling avec esbuild
console.log('📦 Bundling avec esbuild (format global IIFE pour GAS)...')
await build({
  entryPoints: ['src/index.ts'], // Point d'entrée principal
  bundle: true,
  outfile: 'build/bundle.js',
  target: 'es2020',
  format: 'iife', // IIFE = global pour GAS
  platform: 'browser',
  sourcemap: true,
  legalComments: 'none',
  // Optionnel : minifier pour Apps Script
  minify: false
})

console.log('✅ Build terminé : bundle généré dans build/bundle.js')
