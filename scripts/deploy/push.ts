#!/usr/bin/env zx

import { $ } from "zx";
import { argv } from "process";

const scriptName = argv[2]; // Ex: "hello-world"

if (!scriptName) {
  console.error("❌ Usage: zx push.ts <script-name>");
  process.exit(1);
}

console.log(`🔄 Pushing script: ${scriptName}...`);
await $`cd scripts/${scriptName} && clasp push`;
console.log(`✅ Script "${scriptName}" pushed to Google Apps Script.`);
