// algorithms/bit-manipulation/generator.js — Model A 생성기(비트 조작 — 부분집합 열거).
//
// n개 원소의 **모든 부분집합**을 정수 mask(0 .. 2^n−1)로 훑는다.
//   mask 의 j번 비트가 1이면 j번 원소를 넣는다: (mask >> j) & 1, 또는 mask & (1<<j).
//   비트마스크 열거는 부분집합 DP·조합 생성·완전 탐색의 뼈대다.
//   여기선 각 부분집합의 합을 보고 최대 합 부분집합을 고른다(열거 자체가 핵심).
//
// 입력은 정수 배열(최대 5개 → 2^5=32 부분집합). 시각화: matrix 슬롯(값 행 + 선택 비트 행).

export const category = 'math';
export const defaultInput = [3, 1, 4, 2];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열(최대 5개). 모든 부분집합을 비트마스크로 열거한다.';

const MAX_N = 5;

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// n개 원소의 모든 부분집합을 비트마스크로 열거 (2^n 가지)',
  'int best = 0, bestMask = 0;',
  'for (int mask = 0; mask < (1 << n); mask++) {',
  '    int sum = 0;',
  '    for (int j = 0; j < n; j++)',
  '        if (mask & (1 << j))          // j번 비트가 켜졌나',
  '            sum += a[j];              // j번 원소를 넣는다',
  '    if (sum > best) {                 // 더 큰 합을 갱신',
  '        best = sum;',
  '        bestMask = mask;',
  '    }',
  '}',
];

const toBinary = (mask, n) => mask.toString(2).padStart(n, '0');

export function generate(input) {
  const a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.trunc(Number(x) || 0)).slice(0, MAX_N);
  const n = a.length;

  if (n === 0) {
    return [{ line: 11, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  const total = 1 << n;
  let best = -Infinity, bestMask = 0;
  let caption = `원소 ${n}개 → 부분집합 2^${n} = ${total}가지`;

  // matrix 2행: 값 / 선택(0·1). col = 비트 j(원소 j).
  const cellState = new Array(2 * n).fill(0);
  const selectBits = new Array(n).fill(0);
  const buildMatrix = () => ({
    rows: 2, cols: n,
    values: [...a, ...selectBits],
    states: cellState.slice(),
    rowLabels: ['a[j]', '선택'],
    colLabels: Array.from({ length: n }, (_, j) => `j=${j}`),
    caption,
  });
  const clearCells = () => { for (let k = 0; k < cellState.length; k++) if (cellState[k]) cellState[k] = 0; };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    sortedFrom: n,
    explain,
    matrix: buildMatrix(),
  });

  pushStep(3, 'start',
    `원소 ${n}개의 모든 부분집합을 비트마스크 mask = 0 … ${total - 1} 로 훑는다. ` +
    `mask 의 j번 비트가 1이면 a[j] 를 넣는다`);

  for (let mask = 0; mask < total; mask++) {
    let sum = 0;
    clearCells();
    for (let j = 0; j < n; j++) {
      const on = (mask >> j) & 1;
      selectBits[j] = on;
      if (on) { sum += a[j]; cellState[j] = 2; cellState[n + j] = 2; }   // 선택된 원소·비트
    }
    const subset = a.filter((_, j) => (mask >> j) & 1);
    const isBest = sum > best;
    if (isBest) { best = sum; bestMask = mask; }
    caption = `mask = ${toBinary(mask, n)}₂ (${mask}) → {${subset.join(', ') || '∅'}} 합 ${sum}`;
    pushStep(isBest ? 9 : 6, isBest ? 'write' : 'compare',
      `mask=${toBinary(mask, n)}₂(${mask}): 부분집합 {${subset.join(',') || '공집합'}}, 합 ${sum}` +
      (isBest ? ` — 지금까지 최대! best 갱신` : ''),
      { a: mask });
  }

  // 최대 합 부분집합 강조
  clearCells();
  const bestSubset = a.filter((_, j) => (bestMask >> j) & 1);
  for (let j = 0; j < n; j++) {
    selectBits[j] = (bestMask >> j) & 1;
    if (selectBits[j]) { cellState[j] = 3; cellState[n + j] = 3; }
  }
  caption = `최대 합 부분집합: {${bestSubset.join(', ') || '∅'}} = ${best}`;
  pushStep(11, 'done',
    `${total}개 부분집합을 모두 열거했다. 최대 합은 mask=${toBinary(bestMask, n)}₂ → ` +
    `{${bestSubset.join(', ') || '공집합'}} 합 ${best}. 비트마스크 열거는 O(n·2^n)`,
    { a: bestMask });

  return steps;
}
