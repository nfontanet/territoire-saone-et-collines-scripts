#!/usr/bin/env zx

import { $, fs } from 'zx';

console.log('🔍 Checking current branch...');
const currentBranch = (await $`git branch --show-current`).stdout.trim();

if (currentBranch !== 'master') {
  console.error(
    "❌ You must be on the 'master' branch to deploy to production.",
  );
  process.exit(1);
}

console.log('📦 Pushing all scripts to Google Apps Script...');
const scriptsDir = 'scripts';
const scriptPaths = fs
  .readdirSync(scriptsDir)
  .filter((dir) => fs.existsSync(`${scriptsDir}/${dir}/.clasp.json`));

for (const script of scriptPaths) {
  console.log(`  → Pushing: ${script}...`);
  await $`cd ${scriptsDir}/${script} && clasp push`;
}

console.log('📝 Committing changes...');
await $`git add .`;
await $`git commit -m "chore: deploy to prod [skip ci]"`;
await $`git push origin master`;

console.log('🎉 Successfully deployed to production!');
