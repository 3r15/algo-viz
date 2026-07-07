#!/usr/bin/env node
// validate-all.mjs — 모든 알고리즘의 generator.js / meta.json 을 검증한다(CI용).
// 하나라도 실패하면 exit 1.

import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ALGO_DIR = 'algorithms';
const VALIDATOR = join('scripts', 'validate-trace.mjs');

let failed = 0, ran = 0;
function run(path) {
  ran++;
  const r = spawnSync('node', [VALIDATOR, path], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

for (const name of readdirSync(ALGO_DIR)) {
  const dir = join(ALGO_DIR, name);
  if (!statSync(dir).isDirectory()) continue;
  for (const f of ['generator.js', 'meta.json']) {
    const p = join(dir, f);
    if (existsSync(p)) run(p);
  }
}

console.log(`\n${ran - failed}/${ran} 통과`);
process.exit(failed ? 1 : 0);
