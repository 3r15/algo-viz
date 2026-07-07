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

const REQUIRED = ['line', 'op', 'values', 'sortedFrom', 'explain'];
const OK_OPS = new Set(['start', 'compare', 'swap', 'pass-end', 'done',
  'read', 'write', 'push', 'pop', 'visit', 'enqueue', 'dequeue', 'mark', 'set']);

function fail(msg) { console.error(`  ✗ ${msg}`); process.exitCode = 1; }
function warn(msg) { console.warn(`  ! ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }

function isInt(x) { return Number.isInteger(x); }

function validateTrace(trace, opts = {}) {
  const { maxLine = Infinity, category = '' } = opts;
  let bad = false;
  const t = () => { bad = true; };

  if (!Array.isArray(trace) || trace.length === 0) {
    fail('트레이스가 비었거나 배열이 아님'); return false;
  }

  // 각 스텝 필드
  const len0 = Array.isArray(trace[0].values) ? trace[0].values.length : -1;
  let lengthVaries = false;
  trace.forEach((s, k) => {
    for (const f of REQUIRED)
      if (!(f in s)) { fail(`step ${k}: 필수 필드 '${f}' 누락`); t(); }
    if (isInt(s.line)) {
      if (s.line < 1) { fail(`step ${k}: line(${s.line}) < 1`); t(); }
      if (s.line > maxLine) { fail(`step ${k}: line(${s.line}) 가 소스 줄 수(${maxLine}) 초과`); t(); }
    } else { fail(`step ${k}: line 이 정수가 아님`); t(); }
    if (typeof s.op !== 'string') { fail(`step ${k}: op 이 문자열이 아님`); t(); }
    else if (!OK_OPS.has(s.op)) warn(`step ${k}: 표준 op 아님 '${s.op}' (커스텀 렌더러 필요)`);
    if (!Array.isArray(s.values)) { fail(`step ${k}: values 가 배열이 아님`); t(); }
    else if (s.values.length !== len0) lengthVaries = true;
    if (isInt(s.sortedFrom)) {
      if (s.sortedFrom < 0 || s.sortedFrom > (s.values?.length ?? 0))
        { fail(`step ${k}: sortedFrom(${s.sortedFrom}) 범위 밖`); t(); }
    }
    if ('a' in s && !isInt(s.a)) { fail(`step ${k}: a 가 정수가 아님`); t(); }
    if ('b' in s && !isInt(s.b)) { fail(`step ${k}: b 가 정수가 아님`); t(); }
  });

  if (lengthVaries) {
    if (category.includes('sorting'))
      { fail('정렬 알고리즘인데 values 길이가 변함(인플레이스 불변식 위반)'); t(); }
    else warn('values 길이가 스텝마다 변함(구조 크기 변화 — 의도된 것인지 확인)');
  }

  // 정렬 계열: 마지막 스냅샷은 오름차순 정렬돼 있어야 함
  if (category.includes('sorting')) {
    const last = trace[trace.length - 1].values;
    const sorted = [...last].every((v, i, arr) => i === 0 || arr[i - 1] <= v);
    if (!sorted) { fail(`마지막 스냅샷이 정렬돼 있지 않음: [${last}]`); t(); }
    else ok('최종 스냅샷 정렬 확인');
  }

  return !bad;
}

function equivalent(t1, t2) {
  if (t1.length !== t2.length) return `길이 다름 (${t1.length} vs ${t2.length})`;
  for (let k = 0; k < t1.length; k++) {
    const x = t1[k], y = t2[k];
    if (x.line !== y.line) return `step ${k}: line ${x.line} vs ${y.line}`;
    if (x.op !== y.op)     return `step ${k}: op ${x.op} vs ${y.op}`;
    if ((x.a ?? -1) !== (y.a ?? -1)) return `step ${k}: a 불일치`;
    if ((x.b ?? -1) !== (y.b ?? -1)) return `step ${k}: b 불일치`;
    if (JSON.stringify(x.values) !== JSON.stringify(y.values))
      return `step ${k}: values 불일치`;
  }
  return null; // 동일
}

async function main() {
  const path = process.argv[2];
  if (!path) { console.error('경로 인자가 필요합니다'); process.exit(1); }

  const base = basename(path);
  console.log(`검증: ${path}`);

  if (path.endsWith('.cpp')) {
    console.log('  · C++ 소스 — WASM/네이티브 빌드 후 트레이스로 검증하세요. 건너뜀.');
    return;
  }

  if (base === 'meta.json') {
    const meta = JSON.parse(readFileSync(path, 'utf8'));
    const need = ['id', 'title', 'categories', 'dataStructures', 'complexity', 'languages', 'path'];
    for (const f of need) if (!(f in meta)) fail(`meta.json: 필수 필드 '${f}' 누락`);
    if (meta.complexity && !meta.complexity.time) fail('meta.json: complexity.time 누락');
    if (Array.isArray(meta.categories) && meta.categories.length === 0)
      fail('meta.json: categories 가 비었음');
    if (process.exitCode !== 1) console.log('✅ meta.json 통과');
    else console.error('❌ meta.json 실패');
    return;
  }

  let trace, opts = {};

  if (path.endsWith('.js')) {
    const mod = await import(pathToFileURL(path).href);
    if (typeof mod.generate !== 'function') {
      fail('generator.js 는 generate(input) 를 export 해야 합니다'); return;
    }
    const input = mod.defaultInput ?? [5, 2, 9, 1, 5, 6];
    trace = mod.generate(input);
    if (Array.isArray(mod.code)) opts.maxLine = mod.code.length;
    if (typeof mod.category === 'string') opts.category = mod.category;

    // 동치 대조: 옆에 참조 트레이스가 있으면 (Model 2 결과)
    const dir = dirname(path);
    for (const ref of ['trace.json', 'reference-trace.json']) {
      const p = join(dir, ref);
      if (existsSync(p)) {
        const refTrace = JSON.parse(readFileSync(p, 'utf8'));
        const diff = equivalent(trace, refTrace);
        if (diff) fail(`Model A(JS) ↔ ${ref} 동치 실패: ${diff}`);
        else ok(`Model A(JS) ↔ ${ref} 동치 (LOCK)`);
      }
    }
  } else if (path.endsWith('.json')) {
    trace = JSON.parse(readFileSync(path, 'utf8'));
    // meta.json 에서 category 추론 시도
    const metaPath = join(dirname(path), 'meta.json');
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        if (Array.isArray(meta.categories)) opts.category = meta.categories.join(',');
      } catch { /* ignore */ }
    }
  } else {
    console.log('  · 대상 파일 아님(.js/.json/.cpp). 건너뜀.');
    return;
  }

  const pass = validateTrace(trace, opts);
  if (pass && process.exitCode !== 1) {
    console.log(`✅ 통과 — ${trace.length} 스텝`);
  } else {
    console.error(`❌ 실패`);
    process.exitCode = 1;
  }
}

main().catch(e => { console.error('검증기 오류:', e.message); process.exit(1); });
