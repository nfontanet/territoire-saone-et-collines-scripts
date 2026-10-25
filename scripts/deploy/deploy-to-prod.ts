#!/usr/bin/env zx

import { $, fs } from "zx";

console.log("🔍 Checking current branch...");
const currentBranch = (await $`git branch --show-current`).stdout.trim();

if (currentBranch !== "master") {
  console.error("❌ You must be on the 'master' branch to deploy to production.");
  process.exit(1);
}

console.log("🔄 Fetching latest changes...");
await $`git fetch origin`;

console.log("🔍 Checking if 'dev' is up to date with 'master'...");
const diffOutput = (await $`git diff origin/master...origin/dev`).stdout.trim();
if (diffOutput) {
  console.error("❌ The 'dev' branch has changes not merged into 'master'. Merge first!");
  process.exit(1);
}

console.log("📥 Pulling latest versions from Google Apps Script...");
const scriptsDir = "scripts";
const scriptPaths = fs
  .readdirSync(scriptsDir)
  .filter((dir) => fs.existsSync(`${scriptsDir}/${dir}/.clasp.json`));

for (const script of scriptPaths) {
  console.log(`  → Pulling: ${script}...`);
  try {
    await $`cd ${scriptsDir}/${script} && clasp pull`;
  } catch (error) {
    console.warn(`  ⚠️  Failed to pull ${script}: ${error.message}`);
  }
}

console.log("📤 Pushing all scripts to Google Apps Script...");
for (const script of scriptPaths) {
  console.log(`  → Pushing: ${script}...`);
  await $`cd ${scriptsDir}/${script} && clasp push`;
}

console.log("📝 Committing changes...");
await $`git add .`;
await $`git commit -m "chore: deploy to prod [skip ci]"`;
await $`git push origin master`;

console.log("🎉 Successfully deployed to production!");
