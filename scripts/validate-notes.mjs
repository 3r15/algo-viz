#!/usr/bin/env node
// validate-notes.mjs — 알고리즘 해설 문서(notes.md)의 구조 계약 검증기.
//
// 사용법:
//   node scripts/validate-notes.mjs algorithms/<id>/notes.md   # 한 파일
//   node scripts/validate-notes.mjs                            # 전체(algorithms/*/notes.md)
//
// 검증 내용:
//   1. h2 제목은 정해진 어휘(SECTIONS)에서만 고른다 — 알고리즘마다 문서 뼈대가 같아진다
//   2. 필수 섹션이 모두 있다
//   3. 섹션 순서가 표준 순서와 같다
//   4. h1 을 쓰지 않는다(페이지 제목이 이미 h1)
//   5. 코드 펜스(```)가 짝을 이룬다
//   6. 내부 링크 #/algo/<id> 가 실제 존재하는 알고리즘을 가리킨다
//
// 종료 코드: 0 = 통과, 1 = 실패. 의존성 없음(순수 Node).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 표준 섹션 — 순서가 곧 문서 순서다.
const SECTIONS = [
  { name: '한눈에', required: true },        // 3~5줄 요약 + 언제 쓰나
  { name: '동작 원리', required: true },      // 핵심 아이디어와 절차
  { name: '정확성', required: true },         // 불변식 · 귀납 · 증명
  { name: '복잡도', required: true },         // 시간/공간 표 + 근거
  { name: '구현 노트', required: false },     // 함정, 실전 코드
  { name: '변형과 확장', required: false },   // 관련 알고리즘으로 가는 다리
  { name: '함께 보기', required: false },     // 사이트 내부 링크
];
const ORDER = SECTIONS.map(s => s.name);
const REQUIRED = SECTIONS.filter(s => s.required).map(s => s.name);

// cwd 가 프로젝트 루트가 아닐 수도 있다(편집 훅에서 절대 경로로 호출) → 스크립트 위치로 폴백
const ALGO_DIR = existsSync('algorithms')
  ? 'algorithms'
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', 'algorithms');

let failed = 0;
const fail = (f, msg) => { console.error(`  ✗ ${msg}`); failed++; };

function algorithmIds() {
  return new Set(readdirSync(ALGO_DIR).filter(n => {
    const d = join(ALGO_DIR, n);
    return statSync(d).isDirectory() && existsSync(join(d, 'meta.json'));
  }));
}

function validate(path, ids) {
  console.log(`검증: ${path}`);
  const src = readFileSync(path, 'utf8');
  const lines = src.split(/\r?\n/);
  const before = failed;

  // 코드 펜스 밖의 줄만 헤딩으로 인정한다
  const headings = [];
  let inFence = false;
  lines.forEach((line, k) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    const m = line.match(/^(#{1,4})\s+(.*?)\s*$/);
    if (m) headings.push({ level: m[1].length, text: m[2], line: k + 1 });
  });

  if (inFence) fail(path, '코드 펜스(```)가 닫히지 않았습니다');

  if (headings.some(h => h.level === 1))
    fail(path, 'h1(#)을 쓰지 마세요 — 페이지 제목이 이미 h1 입니다. h2(##)부터 시작하세요');

  const h2 = headings.filter(h => h.level === 2).map(h => h.text);

  for (const t of h2)
    if (!ORDER.includes(t))
      fail(path, `표준 섹션이 아닌 h2: "${t}"  (허용: ${ORDER.join(' · ')})`);

  for (const r of REQUIRED)
    if (!h2.includes(r)) fail(path, `필수 섹션 누락: "## ${r}"`);

  const known = h2.filter(t => ORDER.includes(t));
  const sorted = [...known].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (known.join('|') !== sorted.join('|'))
    fail(path, `섹션 순서가 표준과 다릅니다.\n      현재: ${known.join(' → ')}\n      표준: ${sorted.join(' → ')}`);

  const dupes = known.filter((t, i) => known.indexOf(t) !== i);
  if (dupes.length) fail(path, `중복된 섹션: ${[...new Set(dupes)].join(', ')}`);

  // 내부 링크가 실제 알고리즘을 가리키는지
  for (const m of src.matchAll(/\]\(#\/algo\/([\w-]+)\)/g))
    if (!ids.has(m[1])) fail(path, `없는 알고리즘으로 링크: #/algo/${m[1]}`);

  // 자기 자신으로 링크하고 있지는 않은지
  const self = basename(dirname(path));
  for (const m of src.matchAll(/\]\(#\/algo\/([\w-]+)\)/g))
    if (m[1] === self) fail(path, `자기 자신(#/algo/${self})으로 링크하고 있습니다`);

  if (failed === before) console.log(`  ✓ 통과 — 섹션 ${h2.length}개`);
}

const ids = algorithmIds();
const arg = process.argv[2];
const targets = arg
  ? [arg]
  : [...ids].sort().map(id => join(ALGO_DIR, id, 'notes.md')).filter(existsSync);

if (!targets.length) {
  console.log('검증할 notes.md 가 없습니다.');
  process.exit(0);
}
for (const t of targets) {
  if (!existsSync(t)) { console.error(`✗ 파일 없음: ${t}`); failed++; continue; }
  validate(t, ids);
}

console.log(failed ? `\n❌ ${failed}건 실패` : `\n✅ ${targets.length}개 문서 통과`);
process.exit(failed ? 1 : 0);
