#!/usr/bin/env node
// validate-notes.mjs — 해설 문서(notes.md)의 구조 계약 검증기.
//
// 사용법:
//   node scripts/validate-notes.mjs algorithms/<id>/notes.md   # 한 파일
//   node scripts/validate-notes.mjs                            # 전체(algorithms/* + paradigms/*)
//
// 검증 내용:
//   1. h2 제목은 정해진 어휘(SECTIONS)에서만 고른다 — 알고리즘마다 문서 뼈대가 같아진다
//   2. 필수 섹션이 모두 있다
//   3. 섹션 순서가 표준 순서와 같다
//   4. h1 을 쓰지 않는다(페이지 제목이 이미 h1)
//   5. 코드 펜스(```)가 짝을 이룬다
//   6. 내부 링크 #/algo/<id> · #/paradigm/<id> 가 실제 존재하는 문서를 가리킨다
//
// 종료 코드: 0 = 통과, 1 = 실패. 의존성 없음(순수 Node).

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 문서 종류가 두 가지다. 경로로 구분한다.
//   algorithms/<id>/notes.md  — 알고리즘 하나를 설명(증명 중심)
//   paradigms/<id>/notes.md   — 문제 푸는 "유형"을 설명(성립 조건 중심)
// 각자 섹션 어휘와 순서가 다르므로 스키마도 따로 둔다.

// 알고리즘 해설 — 순서가 곧 문서 순서다.
const ALGORITHM_SECTIONS = [
  { name: '한눈에', required: true },        // 3~5줄 요약 + 언제 쓰나
  { name: '동작 원리', required: true },      // 핵심 아이디어와 절차
  { name: '정확성', required: true },         // 불변식 · 귀납 · 증명
  { name: '복잡도', required: true },         // 시간/공간 표 + 근거
  { name: '구현 노트', required: false },     // 함정, 실전 코드
  { name: '변형과 확장', required: false },   // 관련 알고리즘으로 가는 다리
  { name: '함께 보기', required: false },     // 사이트 내부 링크
];
// 유형 해설 — "언제 이 방식이 성립하는가" 가 중심이다.
const PARADIGM_SECTIONS = [
  { name: '한눈에', required: true },          // 이 방식이 무엇인지 3~5줄
  { name: '언제 쓸 수 있나', required: true },  // 성립 조건 · 무엇을 증명해야 하는가
  { name: '구현 골격', required: true },        // 뼈대 코드와 공통 구조
  { name: '잘 맞는 문제', required: false },    // 신호가 되는 문제 유형
  { name: '함정', required: false },            // 흔한 오적용
  { name: '더 보기', required: false },         // 다른 유형 · 알고리즘으로 가는 다리
];

const SCHEMAS = {
  algorithm: {
    order: ALGORITHM_SECTIONS.map(section => section.name),
    required: ALGORITHM_SECTIONS.filter(section => section.required).map(section => section.name),
  },
  paradigm: {
    order: PARADIGM_SECTIONS.map(section => section.name),
    required: PARADIGM_SECTIONS.filter(section => section.required).map(section => section.name),
  },
};

const schemaFor = notesPath => notesPath.includes('paradigms') ? SCHEMAS.paradigm : SCHEMAS.algorithm;

// cwd 가 프로젝트 루트가 아닐 수도 있다(편집 훅에서 절대 경로로 호출) → 스크립트 위치로 폴백
const projectDir = existsSync('algorithms')
  ? '.'
  : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALGO_DIR = join(projectDir, 'algorithms');
const PARADIGM_DIR = join(projectDir, 'paradigms');

let failureCount = 0;
const fail = message => { console.error(`  ✗ ${message}`); failureCount++; };

// meta.json 을 가진 폴더 = 등록된 문서. 내부 링크 검사의 기준이 된다.
function idsIn(rootDir) {
  if (!existsSync(rootDir)) return new Set();
  return new Set(readdirSync(rootDir).filter(name => {
    const dir = join(rootDir, name);
    return statSync(dir).isDirectory() && existsSync(join(dir, 'meta.json'));
  }));
}

function validate(notesPath, knownIds, knownParadigms) {
  console.log(`검증: ${notesPath}`);
  const { order: ORDER, required: REQUIRED } = schemaFor(notesPath);
  const source = readFileSync(notesPath, 'utf8');
  const lines = source.split(/\r?\n/);
  const failuresBefore = failureCount;

  // 코드 펜스 밖의 줄만 헤딩으로 인정한다(펜스 안의 '# 주석'이 섹션으로 오인되지 않게)
  const headings = [];
  let insideFence = false;
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) { insideFence = !insideFence; return; }
    if (insideFence) return;
    const heading = line.match(/^(#{1,4})\s+(.*?)\s*$/);
    if (heading) headings.push({ level: heading[1].length, text: heading[2], lineNo: index + 1 });
  });

  if (insideFence) fail('코드 펜스(```)가 닫히지 않았습니다');

  if (headings.some(heading => heading.level === 1))
    fail('h1(#)을 쓰지 마세요 — 페이지 제목이 이미 h1 입니다. h2(##)부터 시작하세요');

  const sections = headings.filter(heading => heading.level === 2).map(heading => heading.text);

  for (const section of sections)
    if (!ORDER.includes(section))
      fail(`표준 섹션이 아닌 h2: "${section}"  (허용: ${ORDER.join(' · ')})`);

  for (const required of REQUIRED)
    if (!sections.includes(required)) fail(`필수 섹션 누락: "## ${required}"`);

  const knownSections = sections.filter(section => ORDER.includes(section));
  const expectedOrder = [...knownSections].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  if (knownSections.join('|') !== expectedOrder.join('|'))
    fail('섹션 순서가 표준과 다릅니다.' +
      `\n      현재: ${knownSections.join(' → ')}` +
      `\n      표준: ${expectedOrder.join(' → ')}`);

  const duplicates = knownSections.filter((section, i) => knownSections.indexOf(section) !== i);
  if (duplicates.length) fail(`중복된 섹션: ${[...new Set(duplicates)].join(', ')}`);

  // 내부 링크: 존재하는 문서여야 하고, 자기 자신이면 안 된다
  const selfId = basename(dirname(notesPath));
  const isParadigmDoc = notesPath.includes('paradigms');
  for (const link of source.matchAll(/\]\(#\/algo\/([\w-]+)\)/g)) {
    const linkedId = link[1];
    if (!knownIds.has(linkedId)) fail(`없는 알고리즘으로 링크: #/algo/${linkedId}`);
    else if (!isParadigmDoc && linkedId === selfId)
      fail(`자기 자신(#/algo/${selfId})으로 링크하고 있습니다`);
  }
  for (const link of source.matchAll(/\]\(#\/paradigm\/([\w-]+)\)/g)) {
    const linkedId = link[1];
    if (!knownParadigms.has(linkedId)) fail(`없는 유형으로 링크: #/paradigm/${linkedId}`);
    else if (isParadigmDoc && linkedId === selfId)
      fail(`자기 자신(#/paradigm/${selfId})으로 링크하고 있습니다`);
  }

  if (failureCount === failuresBefore) console.log(`  ✓ 통과 — 섹션 ${sections.length}개`);
}

const knownIds = idsIn(ALGO_DIR);
const knownParadigms = idsIn(PARADIGM_DIR);
const pathArg = process.argv[2];
const targets = pathArg
  ? [pathArg]
  : [
      ...[...knownIds].sort().map(id => join(ALGO_DIR, id, 'notes.md')),
      ...[...knownParadigms].sort().map(id => join(PARADIGM_DIR, id, 'notes.md')),
    ].filter(existsSync);

if (!targets.length) {
  console.log('검증할 notes.md 가 없습니다.');
  process.exit(0);
}
for (const notesPath of targets) {
  if (!existsSync(notesPath)) { console.error(`✗ 파일 없음: ${notesPath}`); failureCount++; continue; }
  validate(notesPath, knownIds, knownParadigms);
}

console.log(failureCount ? `\n❌ ${failureCount}건 실패` : `\n✅ ${targets.length}개 문서 통과`);
process.exit(failureCount ? 1 : 0);
