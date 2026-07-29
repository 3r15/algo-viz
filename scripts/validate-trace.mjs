#!/usr/bin/env node
// validate-trace.mjs — 트레이스 계약 검증기
//
// 사용법:
//   node scripts/validate-trace.mjs <path>
//     <path> = *.json     → 트레이스 배열을 직접 검증
//     <path> = generator.js → generate(defaultInput) 실행 후 검증,
//                             옆에 trace.json / reference-trace.json 이 있으면 동치 대조
//     <path> = *.cpp        → 빌드가 필요하므로 건너뜀(경고만)
//
// 종료 코드: 0 = 통과, 1 = 실패(훅에서 차단/피드백에 사용)
//
// 의존성 없음(순수 Node). CI 에서도 그대로 사용 가능.

import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';

const REQUIRED_FIELDS = ['line', 'op', 'values', 'sortedFrom', 'explain'];
const STANDARD_OPS = new Set(['start', 'compare', 'swap', 'pass-end', 'done',
  'read', 'write', 'push', 'pop', 'visit', 'enqueue', 'dequeue', 'mark', 'set']);

function fail(message) { console.error(`  ✗ ${message}`); process.exitCode = 1; }
function warn(message) { console.warn(`  ! ${message}`); }
function ok(message)   { console.log(`  ✓ ${message}`); }

const isInt = value => Number.isInteger(value);

function validateTrace(trace, options = {}) {
  const { maxLine = Infinity, category = '' } = options;
  let valid = true;
  const markInvalid = () => { valid = false; };

  if (!Array.isArray(trace) || trace.length === 0) {
    fail('트레이스가 비었거나 배열이 아님'); return false;
  }

  // 각 스텝 필드
  const firstLength = Array.isArray(trace[0].values) ? trace[0].values.length : -1;
  let lengthVaries = false;
  trace.forEach((step, index) => {
    for (const field of REQUIRED_FIELDS)
      if (!(field in step)) { fail(`step ${index}: 필수 필드 '${field}' 누락`); markInvalid(); }

    if (isInt(step.line)) {
      if (step.line < 1) { fail(`step ${index}: line(${step.line}) < 1`); markInvalid(); }
      if (step.line > maxLine) {
        fail(`step ${index}: line(${step.line}) 가 소스 줄 수(${maxLine}) 초과`); markInvalid();
      }
    } else { fail(`step ${index}: line 이 정수가 아님`); markInvalid(); }

    if (typeof step.op !== 'string') { fail(`step ${index}: op 이 문자열이 아님`); markInvalid(); }
    else if (!STANDARD_OPS.has(step.op))
      warn(`step ${index}: 표준 op 아님 '${step.op}' (커스텀 렌더러 필요)`);

    if (!Array.isArray(step.values)) { fail(`step ${index}: values 가 배열이 아님`); markInvalid(); }
    else if (step.values.length !== firstLength) lengthVaries = true;

    if (isInt(step.sortedFrom) && (step.sortedFrom < 0 || step.sortedFrom > (step.values?.length ?? 0))) {
      fail(`step ${index}: sortedFrom(${step.sortedFrom}) 범위 밖`); markInvalid();
    }
    if ('a' in step && !isInt(step.a)) { fail(`step ${index}: a 가 정수가 아님`); markInvalid(); }
    if ('b' in step && !isInt(step.b)) { fail(`step ${index}: b 가 정수가 아님`); markInvalid(); }
  });

  if (lengthVaries) {
    if (category.includes('sorting')) {
      fail('정렬 알고리즘인데 values 길이가 변함(인플레이스 불변식 위반)'); markInvalid();
    } else warn('values 길이가 스텝마다 변함(구조 크기 변화 — 의도된 것인지 확인)');
  }

  // 정렬 계열: 마지막 스냅샷은 오름차순 정렬돼 있어야 함
  if (category.includes('sorting')) {
    const finalValues = trace[trace.length - 1].values;
    const ascending = finalValues.every((value, i, arr) => i === 0 || arr[i - 1] <= value);
    if (!ascending) { fail(`마지막 스냅샷이 정렬돼 있지 않음: [${finalValues}]`); markInvalid(); }
    else ok('최종 스냅샷 정렬 확인');
  }

  return valid;
}

// 두 트레이스가 같은 실행을 나타내는가(LOCK). 다르면 첫 불일치를 설명하는 문자열, 같으면 null.
function findDifference(traceA, traceB) {
  if (traceA.length !== traceB.length) return `길이 다름 (${traceA.length} vs ${traceB.length})`;
  for (let index = 0; index < traceA.length; index++) {
    const stepA = traceA[index], stepB = traceB[index];
    if (stepA.line !== stepB.line) return `step ${index}: line ${stepA.line} vs ${stepB.line}`;
    if (stepA.op !== stepB.op)     return `step ${index}: op ${stepA.op} vs ${stepB.op}`;
    if ((stepA.a ?? -1) !== (stepB.a ?? -1)) return `step ${index}: a 불일치`;
    if ((stepA.b ?? -1) !== (stepB.b ?? -1)) return `step ${index}: b 불일치`;
    if (JSON.stringify(stepA.values) !== JSON.stringify(stepB.values))
      return `step ${index}: values 불일치`;
  }
  return null; // 동일
}

const META_REQUIRED_FIELDS =
  ['id', 'title', 'categories', 'dataStructures', 'complexity', 'languages', 'path'];
const FALLBACK_INPUT = [5, 2, 9, 1, 5, 6];

async function main() {
  const targetPath = process.argv[2];
  if (!targetPath) { console.error('경로 인자가 필요합니다'); process.exit(1); }

  const fileName = basename(targetPath);
  console.log(`검증: ${targetPath}`);

  if (targetPath.endsWith('.cpp')) {
    console.log('  · C++ 소스 — WASM/네이티브 빌드 후 트레이스로 검증하세요. 건너뜀.');
    return;
  }

  if (fileName === 'meta.json') {
    const meta = JSON.parse(readFileSync(targetPath, 'utf8'));
    for (const field of META_REQUIRED_FIELDS)
      if (!(field in meta)) fail(`meta.json: 필수 필드 '${field}' 누락`);
    if (meta.complexity && !meta.complexity.time) fail('meta.json: complexity.time 누락');
    if (Array.isArray(meta.categories) && meta.categories.length === 0)
      fail('meta.json: categories 가 비었음');
    if (process.exitCode !== 1) console.log('✅ meta.json 통과');
    else console.error('❌ meta.json 실패');
    return;
  }

  let trace;
  const options = {};

  if (targetPath.endsWith('.js')) {
    const generatorModule = await import(pathToFileURL(targetPath).href);
    if (typeof generatorModule.generate !== 'function') {
      fail('generator.js 는 generate(input) 를 export 해야 합니다'); return;
    }
    trace = generatorModule.generate(generatorModule.defaultInput ?? FALLBACK_INPUT);
    if (Array.isArray(generatorModule.code)) options.maxLine = generatorModule.code.length;
    if (typeof generatorModule.category === 'string') options.category = generatorModule.category;

    // 동치 대조: 옆에 참조 트레이스가 있으면 (Model 2 결과)
    const algoDir = dirname(targetPath);
    for (const referenceName of ['trace.json', 'reference-trace.json']) {
      const referencePath = join(algoDir, referenceName);
      if (!existsSync(referencePath)) continue;
      const referenceTrace = JSON.parse(readFileSync(referencePath, 'utf8'));
      const difference = findDifference(trace, referenceTrace);
      if (difference) fail(`Model A(JS) ↔ ${referenceName} 동치 실패: ${difference}`);
      else ok(`Model A(JS) ↔ ${referenceName} 동치 (LOCK)`);
    }
  } else if (targetPath.endsWith('.json')) {
    trace = JSON.parse(readFileSync(targetPath, 'utf8'));
    // meta.json 에서 category 추론 시도
    const metaPath = join(dirname(targetPath), 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        if (Array.isArray(meta.categories)) options.category = meta.categories.join(',');
      } catch { /* meta 가 깨졌으면 category 추론만 포기한다 */ }
    }
  } else {
    console.log('  · 대상 파일 아님(.js/.json/.cpp). 건너뜀.');
    return;
  }

  if (validateTrace(trace, options) && process.exitCode !== 1) {
    console.log(`✅ 통과 — ${trace.length} 스텝`);
  } else {
    console.error(`❌ 실패`);
    process.exitCode = 1;
  }
}

main().catch(err => { console.error('검증기 오류:', err.message); process.exit(1); });
