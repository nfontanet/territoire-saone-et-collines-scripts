#!/usr/bin/env zx

import { $, fs } from "zx";

console.log("🔍 Checking current branch...");
const currentBranch = (await $`git branch --show-current`).stdout.trim();

if (currentBranch !== "dev") {
  console.error("❌ You must be on the 'dev' branch to deploy.");
  process.exit(1);
}

console.log("📦 Pushing all scripts to Google Apps Script...");
const scriptsDir = "scripts";
const scriptPaths = fs
  .readdirSync(scriptsDir)
  .filter((dir) => fs.existsSync(`${scriptsDir}/${dir}/.clasp.json`));

for (const script of scriptPaths) {
  console.log(`  → Deploying: ${script}...`);
  await $`cd ${scriptsDir}/${script} && clasp push`;
}

console.log("📝 Committing changes...");
await $`git add .`;
await $`git commit -m "chore: deploy to dev [skip ci]"`;
await $`git push origin dev`;

console.log("🎉 Successfully deployed to 'dev'!");
