#!/usr/bin/env zx

// Déploiement avancé pour Google Apps Script avec zx

// Étape 1 : compiler TypeScript
console.log("🛠️ Compilation TypeScript...");
await $`tsc`;

// Étape 2 : vérifier le status clasp
console.log("🔍 Vérification des changements...");
let { stdout: status } = await $`clasp status --json`.quiet();

let hasChanges = false;
try {
  const parsed = JSON.parse(status);
  if (parsed.files.length > 0) {
    hasChanges = true;
    console.log("📂 Changements détectés :");
    for (const file of parsed.files) {
      console.log(`- ${file.state}: ${file.name}`);
    }
  }
} catch {
  console.log("⚠️ Impossible d’analyser le status, on suppose qu’il y a des changements.");
  hasChanges = true;
}

// Étape 3 : afficher diff si dispo
if (hasChanges) {
  console.log("\n📜 Diff des fichiers :\n");
  await $`clasp status`;
} else {
  console.log("✅ Aucun changement à déployer.");
  process.exit(0);
}

// Étape 4 : demander confirmation
const answer = await question("🚀 Voulez-vous déployer ces changements ? (o/N) ");

if (answer.toLowerCase() === "o" || answer.toLowerCase() === "oui") {
  console.log("📡 Déploiement en cours...");
  await $`clasp push`;
  console.log("✅ Déploiement terminé !");
} else {
  console.log("❌ Déploiement annulé.");
  process.exit(0);
}