// algorithms/quickselect/generator.js — Model A 생성기(퀵셀렉트, k번째 최솟값).
//
// 정렬하지 않고 **k번째로 작은 원소** 하나만 평균 O(n) 에 찾는다.
//   [퀵 정렬](quick-sort)의 파티션을 쓰되, 피벗이 자리 i 로 확정되면
//     i == k 면 답, i < k 면 **오른쪽만**, i > k 면 **왼쪽만** 이어서 본다(한쪽만 재귀).
//   매번 문제 크기가 대략 반으로 줄어 n + n/2 + n/4 + … = O(n) (평균).
//
// 입력은 정수 배열. k 는 중앙값 위치(⌊n/2⌋, 0-based). 시각화: matrix 슬롯(활성 범위·피벗·정답).

export const category = 'search';
export const defaultInput = [7, 2, 9, 1, 5, 6, 3];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열. k = ⌊n/2⌋번째(0-based) 최솟값 = 중앙값을 정렬 없이 찾는다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// k번째 최솟값 (0-based) — 한쪽만 이어서 본다',
  'int quickSelect(vector<int>& a, int k) {',
  '    int lo = 0, hi = a.size() - 1;',
  '    while (lo < hi) {',
  '        int pivot = a[hi], i = lo;',
  '        for (int j = lo; j < hi; j++)',
  '            if (a[j] < pivot) swap(a[i++], a[j]);',
  '        swap(a[i], a[hi]);              // 피벗을 제자리 i 로',
  '        if (i == k) break;              // 찾았다',
  '        else if (i < k) lo = i + 1;     // 오른쪽만',
  '        else            hi = i - 1;     // 왼쪽만',
  '    }',
  '    return a[k];',
  '}',
];

export function generate(input) {
  const a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.trunc(Number(x) || 0)).slice(0, 12);
  const n = a.length;
  if (n === 0) return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];

  const k = Math.floor(n / 2);   // 중앙값 위치(0-based)
  let lo = 0, hi = n - 1;
  let caption = '';

  const buildMatrix = (extra) => {
    const states = new Array(n).fill(0);
    for (let t = 0; t < n; t++) states[t] = (t < lo || t > hi) ? 4 : 1;   // 범위 밖=제외(어둡게)
    if (extra?.pivot != null) states[extra.pivot] = 2;
    if (extra?.j != null) states[extra.j] = 2;
    if (extra?.i != null && states[extra.i] !== 4) states[extra.i] = 3;
    if (extra?.found != null) states[extra.found] = 3;
    return {
      rows: 1, cols: n,
      values: a.slice(), states,
      rowLabels: ['a'],
      colLabels: Array.from({ length: n }, (_, t) => t === k ? `k=${t}★` : String(t)),
      caption,
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(), sortedFrom: n, matrix: buildMatrix(extra), explain,
  });

  caption = `k = ${k} (중앙값 위치) 를 찾는다`;
  pushStep(3, 'start',
    `정렬하지 않고 ${k}번째(0-based) 최솟값 = 중앙값을 찾는다. 파티션 후 k 가 있는 쪽만 이어서 본다`);

  while (lo < hi) {
    const pivot = a[hi];
    let i = lo;
    caption = `범위 [${lo}, ${hi}] · 피벗 a[${hi}] = ${pivot}`;
    pushStep(5, 'set', `범위 [${lo}, ${hi}] 에서 피벗 = a[${hi}] = ${pivot}, i = ${lo}`, { pivot: hi });

    for (let j = lo; j < hi; j++) {
      pushStep(6, 'compare', `a[${j}] = ${a[j]} 와 피벗 ${pivot} 비교`, { pivot: hi, j });
      if (a[j] < pivot) {
        if (i !== j) [a[i], a[j]] = [a[j], a[i]];
        pushStep(7, 'swap', `a[${j}] < 피벗 → a[${i}] 로 보낸다(작은 값 앞으로), i = ${i + 1}`, { pivot: hi, i, j });
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    caption = `피벗이 자리 ${i} 로 확정 (그 앞은 작고 뒤는 크다)`;
    pushStep(8, 'swap', `피벗을 제자리 a[${i}] 로 → 피벗은 정렬된 최종 위치 ${i}`, { i });

    if (i === k) {
      caption = `i = k = ${k} → 찾았다! a[${k}] = ${a[k]}`;
      pushStep(9, 'done', `피벗 위치 i = ${i} = k → ${k}번째 최솟값은 a[${k}] = ${a[k]}`, { found: k });
      return steps;
    } else if (i < k) {
      caption = `i = ${i} < k = ${k} → 오른쪽 [${i + 1}, ${hi}] 만 본다`;
      pushStep(10, 'set', `i = ${i} < k → 답은 오른쪽에. lo = ${i + 1} (왼쪽 버림)`, { i });
      lo = i + 1;
    } else {
      caption = `i = ${i} > k = ${k} → 왼쪽 [${lo}, ${i - 1}] 만 본다`;
      pushStep(11, 'set', `i = ${i} > k → 답은 왼쪽에. hi = ${i - 1} (오른쪽 버림)`, { i });
      hi = i - 1;
    }
  }

  caption = `범위가 하나로 좁혀짐 → a[${k}] = ${a[k]}`;
  pushStep(13, 'done', `${k}번째 최솟값 = a[${k}] = ${a[k]}. 한쪽만 재귀해 평균 O(n) — 정렬(O(n log n)) 없이`, { found: k });
  return steps;
}
