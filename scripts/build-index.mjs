#!/usr/bin/env node
// build-index.mjs — algorithms/*/meta.json 을 모아 algorithms/index.json 생성.
//   node scripts/build-index.mjs           # 생성/갱신
//   node scripts/build-index.mjs --check   # 커밋된 index.json 이 최신인지 검사(CI용, 다르면 exit 1)

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describeRecordDiff, reportStaleIndex } from './index-diff.mjs';

const ALGO_DIR = 'algorithms';
const OUT = join(ALGO_DIR, 'index.json');
const check = process.argv.includes('--check');

const records = [];
for (const name of readdirSync(ALGO_DIR)) {
  const dir = join(ALGO_DIR, name);
  if (!statSync(dir).isDirectory()) continue;
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) continue;
  records.push(JSON.parse(readFileSync(metaPath, 'utf8')));
}
records.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
const json = JSON.stringify(records, null, 2) + '\n';

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current !== json) {
    let currentRecords = [];
    try { currentRecords = JSON.parse(current); } catch { /* 파일이 없거나 깨졌으면 전부 추가로 보인다 */ }
    reportStaleIndex(OUT, 'npm run index', describeRecordDiff(currentRecords, records));
    process.exit(1);
  }
  console.log(`✓ ${OUT} 최신 — ${records.length} 개 알고리즘`);
} else {
  writeFileSync(OUT, json);
  console.log(`✓ index.json 생성 — ${records.length} 개 알고리즘`);
}
