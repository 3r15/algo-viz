#!/usr/bin/env node
// build-paradigm-index.mjs — paradigms/*/meta.json 을 모아 paradigms/index.json 생성.
//   node scripts/build-paradigm-index.mjs           # 생성/갱신
//   node scripts/build-paradigm-index.mjs --check   # 최신인지 검사(CI용, 다르면 exit 1)

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PARADIGM_DIR = 'paradigms';
const OUT = join(PARADIGM_DIR, 'index.json');
const checkOnly = process.argv.includes('--check');

const records = [];
for (const name of readdirSync(PARADIGM_DIR)) {
  const dir = join(PARADIGM_DIR, name);
  if (!statSync(dir).isDirectory()) continue;
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) continue;
  records.push(JSON.parse(readFileSync(metaPath, 'utf8')));
}
records.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
const json = JSON.stringify(records, null, 2) + '\n';

if (checkOnly) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== json) {
    console.error('❌ paradigms/index.json 이 최신이 아닙니다. `node scripts/build-paradigm-index.mjs` 후 커밋하세요.');
    process.exit(1);
  }
  console.log('✓ paradigms/index.json 최신');
} else {
  writeFileSync(OUT, json);
  console.log(`✓ paradigms/index.json 생성 — ${records.length} 개 유형`);
}
