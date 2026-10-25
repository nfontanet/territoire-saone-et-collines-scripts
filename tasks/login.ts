#!/usr/bin/env zx

import { argv } from 'process';
import { $ } from 'zx';

const scriptName = argv[2]; // Ex: "hello-world"

if (!scriptName) {
  console.error('❌ Usage: zx login.ts <script-name>');
  process.exit(1);
}

console.log(`🔄 Logging in for script: ${scriptName}...`);
await $`cd scripts/${scriptName} && clasp login`;
console.log(`✅ Logged in for script "${scriptName}".`);
