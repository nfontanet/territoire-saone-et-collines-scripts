#!/usr/bin/env zx

import { argv } from 'process';
import { $ } from 'zx';

const scriptName = argv[2]; // Ex: "hello-world"

if (!scriptName) {
  console.error('❌ Usage: zx pull.ts <script-name>');
  process.exit(1);
}

console.log(`🔄 Pulling script: ${scriptName}...`);
await $`cd scripts/${scriptName} && clasp pull`;
console.log(`✅ Script "${scriptName}" pulled from Google Apps Script.`);
  