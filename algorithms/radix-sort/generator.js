// algorithms/radix-sort/generator.js — Model A 생성기(기수 정렬, LSD).
//
// 자릿수별로 [계수 정렬](counting-sort)을 반복한다 — **낮은 자리(1의 자리)부터**.
//   각 자리에서 안정 정렬(같은 자릿수는 순서 유지)을 하면, 마지막 자리까지 마쳤을 때 전체가 정렬된다.
//   비교를 하지 않으므로 O(d·(n + b)) — d = 자릿수, b = 진법(여기선 10).
//
// 시각화(두 슬롯):
//   array 슬롯 — 각 자리 정렬이 끝날 때마다 재배열되는 배열
//   matrix 슬롯 — 이번 자리의 숫자별(0~9) 버킷 개수
//     셀 상태: 1 채워짐 · 2 이번에 담는 칸 · 3 방금 갱신 · 4 결과

export const category = 'sorting';
export const defaultInput = [42, 8, 17, 25, 63, 4, 51, 30];
export const inputLabel = 'a[]';
export const inputHint = '음이 아닌 정수 배열. 1의 자리 → 10의 자리 순으로 계수 정렬을 반복한다.';

const BASE = 10;

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 낮은 자리부터 자릿수별로 안정 계수 정렬',
  'void radixSort(vector<int>& a) {',
  '    int mx = *max_element(a.begin(), a.end());',
  '    for (int exp = 1; mx / exp > 0; exp *= 10) {   // 1, 10, 100 …',
  '        vector<int> out(a.size()), count(10, 0);',
  '        for (int x : a) count[(x / exp) % 10]++;    // 자릿수 세기',
  '        for (int d = 1; d < 10; d++) count[d] += count[d-1];',
  '        for (int i = a.size() - 1; i >= 0; i--) {   // 뒤에서(안정성)',
  '            int d = (a[i] / exp) % 10;',
  '            out[--count[d]] = a[i];',
  '        }',
  '        a = out;',
  '    }',
  '}',
];

export function generate(input) {
  let a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.max(0, Math.trunc(x)));      // 기수 정렬(LSD)은 음이 아닌 정수 대상
  const n = a.length;

  if (n === 0) {
    return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  const maxValue = Math.max(...a);
  const passCount = Math.max(1, String(maxValue).length);
  const colLabels = Array.from({ length: BASE }, (_, d) => String(d));
  const rowLabels = ['개수'];
  let caption = '';

  const steps = [];
  const pushStep = (line, op, explain, count, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    sortedFrom: n,
    matrix: {
      rows: 1, cols: BASE,
      values: count.slice(),
      states: extra.states ?? new Array(BASE).fill(1),
      rowLabels, colLabels,
      caption,
    },
    explain,
  });
  const highlight = (digit, state, base) => {
    const s = base ?? new Array(BASE).fill(1);
    s[digit] = state;
    return s;
  };
  caption = `가장 큰 수 ${maxValue} → 자릿수 ${passCount}. 낮은 자리부터 정렬한다`;
  pushStep(2, 'start',
    `${n}개를 정렬한다. 자릿수마다 안정 계수 정렬을 하되 **1의 자리부터** 올라간다 — ` +
    `그래야 마지막 자리까지 마쳤을 때 전체가 정렬된다`, new Array(BASE).fill(0));

  let exp = 1;
  for (let pass = 0; pass < passCount; pass++) {
    const placeLabel = ['1의 자리', '10의 자리', '100의 자리', '1000의 자리'][pass] || `${exp}의 자리`;
    const count = new Array(BASE).fill(0);

    caption = `${placeLabel} 기준 — 버킷을 0 으로`;
    pushStep(4, 'set', `${placeLabel}로 정렬한다(exp = ${exp})`, count, { states: new Array(BASE).fill(0) });

    // 자릿수 세기
    for (let i = 0; i < n; i++) {
      const digit = Math.floor(a[i] / exp) % BASE;
      count[digit]++;
      caption = `${placeLabel} — ${a[i]} 의 자릿수는 ${digit}`;
      pushStep(5, 'write',
        `a[${i}] = ${a[i]} → ${placeLabel} 숫자는 ${digit}. count[${digit}] = ${count[digit]}`,
        count, { a: i, states: highlight(digit, 3) });
    }

    // 안정 재배열: 뒤에서부터 채워 같은 자릿수의 순서를 유지한다
    const prefix = count.slice();
    for (let d = 1; d < BASE; d++) prefix[d] += prefix[d - 1];
    const out = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(a[i] / exp) % BASE;
      out[--prefix[digit]] = a[i];
    }
    a = out;

    caption = `${placeLabel} 정렬 완료 — 같은 자릿수는 순서 유지(안정)`;
    pushStep(11, 'mark',
      `${placeLabel} 기준으로 재배열: [${a.join(', ')}]`, count,
      { states: new Array(BASE).fill(1) });

    exp *= BASE;
  }

  caption = '완성 — 오름차순 정렬 (비교 0회)';
  pushStep(13, 'done',
    `${passCount}개 자리를 모두 마쳤다 → 전체 정렬 완료. 비교 없이 O(${passCount}·(n + ${BASE}))`,
    new Array(BASE).fill(4), { states: new Array(BASE).fill(4) });

  return steps;
}
