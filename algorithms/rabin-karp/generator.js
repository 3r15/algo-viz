// algorithms/rabin-karp/generator.js — Model A 생성기(라빈-카프 문자열 검색).
//
// 텍스트에서 패턴을 찾되, 창(window)마다 문자를 다 비교하지 않고 **해시** 하나로 먼저 거른다.
//   롤링 해시: 창을 한 칸 옮길 때 앞 글자를 빼고 뒤 글자를 더해 O(1) 로 갱신한다.
//   해시가 같을 때만 실제 문자 비교(가짜 일치=충돌 걸러내기). 기대 O(n+m).
//
// 입력은 문자열 두 개(inputKind='text'): 텍스트 · 패턴.
// 시각화(전시용으로 작은 밑/법을 쓴다): matrix 슬롯 — 텍스트 / 패턴(정렬) 2행 + 해시는 설명·캡션.

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = 'xabcxabc abc';
export const inputLabel = '텍스트 패턴';
export const inputHint = '공백으로 구분한 텍스트와 패턴(소문자). 롤링 해시로 텍스트에서 패턴을 찾는다.';

const MAX_TEXT = 20, MAX_PATTERN = 10;
const BASE = 31, MOD = 1009;   // 전시용 작은 값(실전은 큰 소수 + 문자코드)

export function randomInput() {
  const samples = ['xabcxabc abc', 'abracadabra abra', 'mississippi issi', 'aaabaaab aab', 'abcabcabc abc'];
  return samples[Math.floor(Math.random() * samples.length)];
}

const val = (ch) => ch.charCodeAt(0) - 96;   // a→1 … z→26

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int rabinKarp(string t, string p) {          // 밑 B, 소수 법 M',
  '    int n = t.size(), m = p.size();',
  '    long long hp = 0, ht = 0, pw = 1;',
  '    for (int i = 0; i < m; i++) {             // 패턴·첫 창 해시',
  '        hp = (hp*B + p[i]) % M;',
  '        ht = (ht*B + t[i]) % M;',
  '        if (i) pw = pw*B % M;                 // pw = B^(m-1)',
  '    }',
  '    for (int i = 0; i + m <= n; i++) {',
  '        if (ht == hp && t.substr(i,m) == p)   // 해시 같으면 실제 비교',
  '            return i;                         // 찾았다',
  '        if (i + m < n)                        // 창을 한 칸 굴린다',
  '            ht = ((ht - t[i]*pw%M + M)*B + t[i+m]) % M;',
  '    }',
  '    return -1;',
  '}',
];

function parseWords(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join(' ') : '');
  const [first = '', second = ''] = text.toLowerCase().trim().split(/\s+/);
  return [first.replace(/[^a-z]/g, '').slice(0, MAX_TEXT), second.replace(/[^a-z]/g, '').slice(0, MAX_PATTERN)];
}

export function generate(input) {
  const [text, pattern] = parseWords(input);
  const n = text.length, m = pattern.length;

  if (!n || !m || m > n) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '텍스트와 (더 짧은) 패턴을 공백으로 구분해 입력하세요 (예: xabcxabc abc)' }];
  }

  let windowStart = 0;
  const buildMatrix = (extra) => {
    const cols = n;
    const values = new Array(2 * cols).fill(null);
    const states = new Array(2 * cols).fill(0);
    for (let c = 0; c < n; c++) { values[c] = text[c]; states[c] = 1; }
    for (let j = 0; j < m; j++) {
      const c = windowStart + j;
      if (c >= 0 && c < cols) { values[cols + c] = pattern[j]; states[cols + c] = 1; }
    }
    // 현재 창 강조
    for (let j = 0; j < m; j++) {
      const c = windowStart + j;
      if (c >= 0 && c < cols) states[c] = extra?.windowState ?? 2;
    }
    if (extra?.matchCol != null) { states[extra.matchCol] = 3; states[cols + extra.matchCol] = 3; }
    return {
      rows: 2, cols,
      values, states,
      rowLabels: ['텍스트', '패턴'],
      colLabels: Array.from({ length: cols }, (_, c) => String(c)),
      caption: extra?.caption ?? '',
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: [], sortedFrom: 0, matrix: buildMatrix(extra), explain,
  });

  // ── 패턴·첫 창 해시 ──
  let hp = 0, ht = 0, pw = 1;
  for (let i = 0; i < m; i++) {
    hp = (hp * BASE + val(pattern[i])) % MOD;
    ht = (ht * BASE + val(text[i])) % MOD;
    if (i) pw = (pw * BASE) % MOD;
  }
  windowStart = 0;
  pushStep(5, 'start',
    `롤링 해시로 "${pattern}" 을 찾는다(전시용 밑 B=${BASE}, 법 M=${MOD}). ` +
    `패턴 해시 hp=${hp}, 첫 창 해시 ht=${ht}. B^(m-1)=${pw}`,
    { caption: `hp=${hp} · 첫 창 ht=${ht}` });

  const found = [];
  for (let i = 0; i + m <= n; i++) {
    windowStart = i;
    if (ht === hp) {
      const slice = text.slice(i, i + m);
      const ok = slice === pattern;
      pushStep(10, 'compare',
        `i=${i}: 창 해시 ht=${ht} = hp → 실제 문자 비교 "${slice}" ${ok ? '= 패턴, 일치!' : '≠ 패턴(해시 충돌, 가짜)'}`,
        { caption: `해시 일치 → 문자 검증 ${ok ? '성공' : '실패(충돌)'}`, windowState: ok ? 3 : 2, a: i });
      if (ok) { found.push(i); }
    } else {
      pushStep(9, 'read',
        `i=${i}: 창 해시 ht=${ht} ≠ hp=${hp} → 문자 비교 없이 건너뛴다`,
        { caption: `ht=${ht} ≠ hp=${hp}`, a: i });
    }
    // 롤링: 창을 한 칸 굴린다
    if (i + m < n) {
      ht = (((ht - val(text[i]) * pw % MOD) % MOD + MOD) * BASE + val(text[i + m])) % MOD;
    }
  }

  windowStart = found.length ? found[0] : 0;
  const foundText = found.length ? `${found.join(', ')}번 위치` : '없음';
  pushStep(found.length ? 11 : 15, 'done',
    `끝. "${pattern}" 을 찾은 위치: ${foundText}. ` +
    `해시로 걸러 실제 비교는 최소화 — 기대 O(n+m), 최악(충돌 다발) O(n·m)`,
    { caption: `찾은 위치: ${foundText}`, windowState: found.length ? 3 : 2 });

  return steps;
}
