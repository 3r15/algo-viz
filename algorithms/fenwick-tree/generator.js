// algorithms/fenwick-tree/generator.js — Model A 생성기(펜윅 트리 / 이진 인덱스 트리, BIT).
//
// 배열의 **접두사 합**을 O(log n) 에 구하고, 한 원소를 O(log n) 에 갱신한다.
// 비결은 인덱스의 **최하위 1비트** lowbit(i) = i & -i:
//   t[i] 는 구간 (i - lowbit(i), i] 의 합을 담당한다.
//   update: i += lowbit(i) 로 담당 구간들을 타고 오른다.
//   query : i -= lowbit(i) 로 겹치지 않는 구간들을 이어 붙이며 내려간다.
//
// 입력은 정수 배열(1-based 로 다룬다). 시각화: matrix 슬롯 2행 — a(원값) · t(BIT 내부).
// 상태색: 0 기본 · 2 지금 보는 칸 · 3 방금 바뀐 칸.

export const category = 'tree';
export const defaultInput = [3, 2, -1, 6, 5, 4, -3, 3];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열(1-based 로 다룬다). 만들고 나서 접두사 합 질의와 한 점 갱신을 보여 준다.';

const MAX_N = 12;

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int t[MAXN], n;                       // 펜윅 트리 (1-based)',
  'int lowbit(int i) { return i & -i; }  // 최하위 1비트',
  'void update(int i, int delta) {       // a[i] += delta',
  '    for (; i <= n; i += lowbit(i))    //   담당 구간들을 타고 오른다',
  '        t[i] += delta;',
  '}',
  'int query(int i) {                    // 접두사 합 a[1..i]',
  '    int sum = 0;',
  '    for (; i > 0; i -= lowbit(i))     //   구간을 이어 붙이며 내려간다',
  '        sum += t[i];',
  '    return sum;',
  '}',
];

const lowbit = (i) => i & -i;

export function generate(input) {
  const raw = (Array.isArray(input) && input.length) ? input : defaultInput;
  const a = raw.slice(0, MAX_N).map(x => Math.max(-999, Math.min(999, Math.trunc(Number(x) || 0))));
  const n = a.length;

  if (n === 0) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  const A = [0, ...a];                    // A[1..n]
  const t = new Array(n + 1).fill(0);     // t[1..n]
  const cellState = new Array(2 * n).fill(0);   // 0행 a, 1행 t
  const colLabels = Array.from({ length: n }, (_, c) => String(c + 1));
  const rangeTitle = (i) => `t[${i}] = 구간 (${i - lowbit(i)}, ${i}] 의 합`;
  const titles = Array.from({ length: 2 * n }, (_, k) =>
    k < n ? `a[${k + 1}]` : rangeTitle(k - n + 1));
  let caption = 't[i] = 구간 (i − lowbit(i), i] 의 합';

  const clearCells = () => { for (let k = 0; k < cellState.length; k++) if (cellState[k]) cellState[k] = 0; };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: t.slice(1),
    sortedFrom: n,
    explain,
    matrix: {
      rows: 2, cols: n,
      values: [...A.slice(1), ...t.slice(1)],
      states: cellState.slice(),
      rowLabels: ['a', 't (BIT)'],
      colLabels, titles, caption,
    },
  });

  // ── ① 만들기: 각 a[i] 를 담당 구간들에 더해 넣는다 ──
  caption = `${n}개로 BIT 를 만든다 — 각 a[i] 를 담당 구간 t[] 에 더한다`;
  pushStep(1, 'start',
    `펜윅 트리를 만든다. 핵심은 lowbit(i) = i & −i — t[i] 는 구간 (i−lowbit(i), i] 의 합을 담는다`);

  for (let i = 1; i <= n; i++) {
    const path = [];
    for (let j = i; j <= n; j += lowbit(j)) path.push(j);
    for (const j of path) t[j] += A[i];
    clearCells();
    cellState[i - 1] = 2;                              // a[i]
    for (const j of path) cellState[n + (j - 1)] = 3;  // 담당 t 칸들
    caption = `a[${i}] = ${A[i]} → 담당 구간 t[${path.join('], t[')}] 에 더한다`;
    pushStep(5, 'write',
      `a[${i}] = ${A[i]} 를 담당 구간 t[${path.join(', ')}] 에 더한다 (i += lowbit(i) 로 타고 오름)`,
      { a: i });
  }

  clearCells();
  caption = 'BIT 완성 — 이제 접두사 합과 갱신을 O(log n) 에';
  pushStep(1, 'mark',
    `BIT 완성: t = [${t.slice(1).join(', ')}]. ` +
    `이제 접두사 합 질의와 한 점 갱신을 각각 O(log n) 에 처리한다`);

  // ── ② 접두사 합 질의 ──
  const queryViz = (q) => {
    caption = `query(${q}) — a[1..${q}] 의 합`;
    clearCells();
    pushStep(7, 'start', `query(${q}) — 접두사 합 a[1..${q}] 를 구한다. sum = 0 에서 시작`, { a: q });
    let sum = 0, i = q;
    while (i > 0) {
      sum += t[i];
      clearCells();
      cellState[n + (i - 1)] = 2;
      const next = i - lowbit(i);
      caption = `i=${i}: sum += t[${i}] = ${sum} · 다음 i −= lowbit(${i})=${lowbit(i)} → ${next}`;
      pushStep(10, 'read',
        `i=${i}: sum += t[${i}] = ${t[i]} → sum = ${sum}. i −= lowbit(${i}) = ${lowbit(i)} → ${next}`,
        { a: i, b: next });
      i = next;
    }
    clearCells();
    caption = `query(${q}) = ${sum}`;
    pushStep(11, 'mark', `i = 0 → 끝. query(${q}) = ${sum} (a[1..${q}] 의 합)`, { a: q });
    return sum;
  };

  const q = Math.max(1, n - 1);           // 여러 비트가 켜진 인덱스라 점프가 잘 보인다
  queryViz(q);

  // ── ③ 한 점 갱신 ──
  const pos = Math.min(3, n), delta = 5;
  A[pos] += delta;
  caption = `update(${pos}, +${delta}) — a[${pos}] 를 ${delta} 늘린다`;
  clearCells();
  cellState[pos - 1] = 3;
  pushStep(3, 'start',
    `이제 한 점 갱신: a[${pos}] 에 ${delta} 를 더한다. 담당 구간 t[] 들을 i += lowbit(i) 로 타고 오른다`,
    { a: pos });

  let i = pos;
  while (i <= n) {
    t[i] += delta;
    const next = i + lowbit(i);
    clearCells();
    cellState[n + (i - 1)] = 2;
    caption = `i=${i}: t[${i}] += ${delta} = ${t[i]} · 다음 i += lowbit(${i})=${lowbit(i)} → ${next}`;
    pushStep(5, 'write',
      `i=${i}: t[${i}] += ${delta} → ${t[i]}. i += lowbit(${i}) = ${lowbit(i)} → ${next > n ? '끝' : next}`,
      { a: i, b: next <= n ? next : -1 });
    i = next;
  }

  // ── ④ 다시 질의해 변화를 확인 ──
  const after = queryViz(q);
  clearCells();
  caption = `갱신 뒤 query(${q}) = ${after}`;
  pushStep(11, 'done',
    `a[${pos}] 를 ${delta} 늘렸더니 query(${q}) 가 ${delta} 만큼 커졌다 → ${after}. ` +
    `갱신·질의 모두 O(log n) — lowbit 점프 덕분`,
    { a: q });

  return steps;
}
