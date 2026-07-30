// algorithms/kmp/generator.js — Model A 생성기(KMP 문자열 검색).
//
// 텍스트에서 패턴을 찾는다. 순진한 방법은 어긋날 때마다 텍스트 포인터를 되돌리지만,
// KMP 는 **패턴이 자기 자신과 겹치는 정도(실패 함수)** 를 미리 계산해 텍스트를 절대 되돌리지 않는다.
//   fail[i] = 패턴 앞부분 pattern[0..i] 의 "접두사이면서 접미사인" 가장 긴 조각의 길이.
//   어긋나면 텍스트는 그대로 두고 패턴만 fail 만큼 앞으로 미끄러뜨린다 → 전체 O(n + m).
//
// 입력은 문자열 두 개(inputKind='text'): 텍스트 · 패턴.
//
// 시각화(두 슬롯):
//   matrix 슬롯 — 위: 텍스트, 아래: 정렬된 패턴 + 실패 함수 표
//   array 슬롯은 쓰지 않는다(문자열이라 값 배열이 없다)

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = 'ababcababa ababa';
export const inputLabel = '텍스트 패턴';
export const inputHint = '공백으로 구분한 텍스트와 패턴. 텍스트에서 패턴이 처음 나오는 위치를 찾는다.';

const MAX_TEXT = 22, MAX_PATTERN = 12;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const samples = ['ababcababa ababa', 'aaaaab aab', 'abcabcabd abcabd', 'mississippi issip', 'abababab abab'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// fail[i] = pattern[0..i] 의 최장 "접두사=접미사" 길이',
  'vector<int> buildFail(string p) {',
  '    vector<int> fail(p.size(), 0);',
  '    for (int i = 1, k = 0; i < p.size(); i++) {',
  '        while (k > 0 && p[i] != p[k]) k = fail[k-1];',
  '        if (p[i] == p[k]) k++;',
  '        fail[i] = k;',
  '    }',
  '    return fail;',
  '}',
  'int kmp(string t, string p) {',
  '    vector<int> fail = buildFail(p);',
  '    for (int i = 0, k = 0; i < t.size(); i++) {',
  '        while (k > 0 && t[i] != p[k]) k = fail[k-1];  // 패턴만 미끄러뜨린다',
  '        if (t[i] == p[k]) k++;',
  '        if (k == p.size()) return i - k + 1;          // 찾았다',
  '    }',
  '    return -1;',
  '}',
];

function parseWords(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join(' ') : '');
  const [first = '', second = ''] = text.trim().split(/\s+/);
  return [first.slice(0, MAX_TEXT), second.slice(0, MAX_PATTERN)];
}

export function generate(input) {
  const [text, pattern] = parseWords(input);
  const n = text.length, m = pattern.length;

  const steps = [];
  if (!n || !m) {
    return [{
      line: 11, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '텍스트와 패턴을 공백으로 구분해 입력하세요 (예: ababcababa ababa)',
    }];
  }

  const fail = new Array(m).fill(0);

  // matrix: 3행 — 텍스트 / 정렬된 패턴 / fail. 열은 텍스트 길이에 맞춘다.
  // 패턴은 offset 만큼 오른쪽으로 밀어 그린다(현재 정렬 위치).
  let patternOffset = 0;
  const buildMatrix = (extra) => {
    const cols = n;
    const values = new Array(3 * cols).fill(null);
    const states = new Array(3 * cols).fill(0);
    // 0행: 텍스트
    for (let c = 0; c < n; c++) { values[c] = text[c]; states[c] = 1; }
    // 1행: 패턴(offset 위치에)
    for (let j = 0; j < m; j++) {
      const c = patternOffset + j;
      if (c >= 0 && c < cols) { values[cols + c] = pattern[j]; states[cols + c] = 1; }
    }
    // 2행: fail 값(패턴 아래)
    for (let j = 0; j < m; j++) {
      const c = patternOffset + j;
      if (c >= 0 && c < cols) { values[2 * cols + c] = fail[j]; states[2 * cols + c] = 1; }
    }
    // 강조 덧칠
    if (extra?.textCol != null && extra.textCol < cols) states[extra.textCol] = extra.textState ?? 2;
    if (extra?.patCol != null && extra.patCol >= 0 && extra.patCol < cols)
      states[cols + extra.patCol] = extra.patState ?? 2;
    return {
      rows: 3, cols,
      values, states,
      rowLabels: ['텍스트', '패턴', 'fail'],
      colLabels: Array.from({ length: cols }, (_, c) => String(c)),
      caption: extra?.caption ?? '',
    };
  };

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],
    sortedFrom: 0,
    matrix: buildMatrix(extra),
    explain,
  });

  // ── ① 실패 함수 만들기 ──
  patternOffset = 0;
  pushStep(2, 'start',
    `패턴 "${pattern}" 의 실패 함수부터 만든다. ` +
    `fail[i] = pattern[0..i] 의 "접두사이면서 접미사" 인 가장 긴 조각의 길이다`,
    { caption: `① 실패 함수 만들기 — "${pattern}"` });

  for (let i = 1, k = 0; i < m; i++) {
    while (k > 0 && pattern[i] !== pattern[k]) {
      pushStep(5, 'read',
        `pattern[${i}]='${pattern[i]}' ≠ pattern[${k}]='${pattern[k]}' → k 를 fail[${k - 1}]=${fail[k - 1]} 로 되돌린다`,
        { patCol: i, textState: 2, caption: `① 겹침이 깨졌다 — k 를 줄인다`, a: i });
      k = fail[k - 1];
    }
    if (pattern[i] === pattern[k]) k++;
    fail[i] = k;
    pushStep(7, 'write',
      `pattern[${i}]='${pattern[i]}' ${k > 0 && pattern[i] === pattern[k - 1] ? '가 겹침을 늘린다' : ''} → fail[${i}] = ${k}`,
      { patCol: i, patState: 3, caption: `① fail[${i}] = ${k}`, a: i });
  }

  pushStep(9, 'mark',
    `실패 함수 완성: [${fail.join(', ')}]. ` +
    `이제 텍스트를 훑되, 어긋나면 이 표만큼 패턴을 미끄러뜨린다`,
    { caption: `① 실패 함수: [${fail.join(', ')}]` });

  // ── ② 텍스트 훑기 ──
  let found = -1;
  for (let i = 0, k = 0; i < n; i++) {
    while (k > 0 && text[i] !== pattern[k]) {
      patternOffset = i - fail[k - 1];
      pushStep(14, 'read',
        `text[${i}]='${text[i]}' ≠ pattern[${k}]='${pattern[k]}' — 어긋났다. ` +
        `텍스트는 그대로, 패턴을 fail[${k - 1}]=${fail[k - 1]} 로 미끄러뜨린다`,
        { textCol: i, patCol: i, patState: 3, caption: `② 어긋남 — 패턴만 이동`, a: i });
      k = fail[k - 1];
    }
    patternOffset = i - k;
    if (text[i] === pattern[k]) {
      k++;
      pushStep(15, 'compare',
        `text[${i}]='${text[i]}' = pattern[${k - 1}]='${pattern[k - 1]}' — 맞다. 패턴 ${k}글자까지 일치`,
        { textCol: i, patCol: i, textState: 3, patState: 3, caption: `② 일치 ${k}/${m}`, a: i });
    } else {
      pushStep(14, 'compare',
        `text[${i}]='${text[i]}' ≠ pattern[0]='${pattern[0]}' — 처음부터 안 맞는다. 다음 칸으로`,
        { textCol: i, textState: 2, caption: `② 불일치(처음부터)`, a: i });
    }

    if (k === m) {
      found = i - m + 1;
      patternOffset = found;
      pushStep(16, 'done',
        `패턴 ${m}글자가 모두 맞았다 → 텍스트 ${found}번 위치에서 "${pattern}" 을 찾았다`,
        { textCol: i, caption: `② 찾았다 — ${found}번 위치`, a: found });
      return steps;
    }
  }

  pushStep(18, 'done',
    `텍스트 끝까지 훑었지만 "${pattern}" 을 찾지 못했다. ` +
    `텍스트 포인터를 한 번도 되돌리지 않아 전체가 O(${n} + ${m})`,
    { caption: `② 못 찾음` });
  return steps;
}
