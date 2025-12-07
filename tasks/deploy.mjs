#!/usr/bin/env zx
import 'zx/globals';

const project = process.argv[2];
if (!project) {
  console.error("Usage: deploy.mjs <project-folder>");
  process.exit(1);
}

cd(project);
await $`yarn push`;
console.log(`✅ Projet ${project} déployé !`);