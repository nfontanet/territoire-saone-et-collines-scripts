#!/usr/bin/env zx

await $`yarn login`

await $`yarn build`;

await $`clasp push`;

await $`clasp run executor --dev`;