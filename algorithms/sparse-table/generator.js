// algorithms/sparse-table/generator.js — Model A 생성기(희소 배열 / Sparse Table, RMQ).
//
// st[k][i] = a[i .. i+2^k-1] 의 최솟값.  build 는 O(n log n), 질의는 O(1).
// 시각화는 matrix 슬롯(step.matrix)에 st 표를 채워 나가는 과정을 그린다.
//   셀 상태: 0 빈 칸 · 1 채워짐 · 2 읽는 중 · 3 방금 씀 · 4 결과

export const category = 'dp';
export const defaultInput = [5, 2, 9, 1, 5, 6, 3, 8];
export const inputLabel = 'a[]';
export const inputHint = '정적 배열. build 후 [l, r] 구간 최솟값을 O(1) 에 답한다(질의 구간은 자동 선택).';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int st[LOG][MAXN];                 // st[k][i] = a[i .. i+2^k-1] 의 최솟값',
  '',
  'void build(vector<int>& a) {',
  '    int n = a.size();',
  '    for (int i = 0; i < n; i++)',
  '        st[0][i] = a[i];                       // 길이 1 구간',
  '    for (int k = 1; (1 << k) <= n; k++)',
  '        for (int i = 0; i + (1 << k) <= n; i++)',
  '            st[k][i] = min(st[k-1][i], st[k-1][i + (1 << (k-1))]);',
  '}',
  '',
  'int query(int l, int r) {          // [l, r] 최솟값 — O(1)',
  '    int k = log2(r - l + 1);',
  '    return min(st[k][l], st[k][r - (1 << k) + 1]);',
  '}',
];

// ⌊log2(x)⌋ — 비트 시프트만 사용(부동소수 오차 없음)
function logFloor(x) {
  let k = 0;
  while ((1 << (k + 1)) <= x) k++;
  return k;
}

export function generate(input) {
  const a = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const n = a.length;
  const steps = [];

  if (n === 0) {
    return [{ line: 4, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  const K = logFloor(n) + 1;                                   // 레벨 수: k = 0 .. K-1
  const st = Array.from({ length: K }, () => new Array(n).fill(null));
  const states = Array.from({ length: K }, () => new Array(n).fill(0));

  const rowLabels = Array.from({ length: K }, (_, k) => `k=${k}  len ${1 << k}`);
  const colLabels = Array.from({ length: n }, (_, i) => String(i));
  let caption = 'st[k][i] = a[i .. i+2^k-1] 의 최솟값';

  const push = (line, op, explain, ex = {}) => steps.push({
    line, op,
    a: ex.a ?? -1, b: ex.b ?? -1,
    values: a.slice(),
    sortedFrom: n,
    explain,
    matrix: {
      rows: K, cols: n,
      values: st.flat(), states: states.flat(),
      rowLabels, colLabels, caption,
    },
  });

  push(4, 'start', `n = ${n} → 레벨 ${K}개(k = 0..${K - 1}). 표 크기는 ${K}×${n}`);

  // k = 0: 길이 1 구간 = 원소 그 자체
  for (let i = 0; i < n; i++) {
    st[0][i] = a[i];
    states[0][i] = 3;
    push(6, 'write', `st[0][${i}] = a[${i}] = ${a[i]}  (길이 1 구간)`, { a: i });
    states[0][i] = 1;
  }

  // k ≥ 1: 길이 2^k 구간 = 길이 2^(k-1) 구간 두 개의 최솟값
  for (let k = 1; k < K; k++) {
    const half = 1 << (k - 1), len = 1 << k;
    for (let i = 0; i + len <= n; i++) {
      const j = i + half;
      states[k - 1][i] = 2; states[k - 1][j] = 2;
      caption = `k=${k}: 길이 ${half} 구간 두 개를 이어 붙여 길이 ${len} 구간을 만든다`;
      push(9, 'read',
        `st[${k - 1}][${i}]=${st[k - 1][i]} 와 st[${k - 1}][${j}]=${st[k - 1][j]} 를 비교`,
        { a: i, b: j });
      states[k - 1][i] = 1; states[k - 1][j] = 1;

      st[k][i] = Math.min(st[k - 1][i], st[k - 1][j]);
      states[k][i] = 3;
      push(9, 'write',
        `st[${k}][${i}] = ${st[k][i]}  →  a[${i}..${i + len - 1}] 의 최솟값`,
        { a: i });
      states[k][i] = 1;
    }
  }

  // ---- 질의: 겹쳐도 되는 두 구간으로 [l, r] 을 덮는다 ----
  const l = n >= 4 ? 1 : 0;
  const r = n >= 4 ? n - 2 : n - 1;
  const len = r - l + 1;
  const k = logFloor(len);
  const j = r - (1 << k) + 1;

  caption = `질의 [${l}, ${r}]`;
  push(12, 'start', `질의: a[${l}..${r}] 의 최솟값 (길이 ${len})`, { a: l, b: r });
  push(13, 'set', `k = ⌊log2(${len})⌋ = ${k}  →  2^${k} = ${1 << k} ≤ ${len} < ${1 << (k + 1)}`, { a: l, b: r });

  states[k][l] = 2; states[k][j] = 2;
  push(14, 'read',
    `st[${k}][${l}] = a[${l}..${l + (1 << k) - 1}] , st[${k}][${j}] = a[${j}..${r}] — 두 구간이 겹치면서 [${l}, ${r}] 를 정확히 덮는다`,
    { a: l, b: j });

  const res = Math.min(st[k][l], st[k][j]);
  states[k][l] = 4; states[k][j] = 4;
  caption = `질의 [${l}, ${r}] = ${res}`;
  push(14, 'done',
    `min(${st[k][l]}, ${st[k][j]}) = ${res}. min 은 멱등(중복 계산 무해)이라 겹쳐도 정답 — 표 조회 2번, O(1)`,
    { a: l, b: j });

  return steps;
}
