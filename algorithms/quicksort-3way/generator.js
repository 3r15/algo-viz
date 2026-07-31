// algorithms/quicksort-3way/generator.js — Model A 생성기(3-way 파티션 퀵 정렬, 네덜란드 국기).
//
// 배열을 피벗 기준 **세 덩이**로 나눈다: 작은 것 · 같은 것 · 큰 것(네덜란드 국기 분할).
//   같은 값 구간은 **최종 위치가 확정**되어 재귀에서 빠진다 → 중복이 많은 입력에 강하다.
//   일반 퀵 정렬(Lomuto/Hoare)이 중복에서 O(n²) 로 퇴화하는 것을 3-way 가 막는다.
//
// 입력은 정수 배열. 시각화: matrix 슬롯(< · = · > 세 구간을 색으로, 확정 구간은 초록).

export const category = 'sorting';
export const defaultInput = [5, 3, 8, 3, 1, 3, 9, 5];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열(중복 많아도 좋다). 피벗 기준 <·=·> 세 구간으로 나눠 정렬한다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 3-way 파티션 퀵 정렬 (네덜란드 국기) — 중복에 강하다',
  'void sort3(vector<int>& a, int lo, int hi) {',
  '    if (lo >= hi) return;',
  '    int pivot = a[lo];',
  '    int lt = lo, gt = hi, i = lo + 1;',
  '    while (i <= gt) {',
  '        if (a[i] < pivot)      swap(a[lt++], a[i++]); // 작으면 왼쪽으로',
  '        else if (a[i] > pivot) swap(a[i], a[gt--]);   // 크면 오른쪽으로',
  '        else                   i++;                    // 같으면 가운데',
  '    }',
  '    // a[lt..gt] 는 피벗과 같음 → 최종 위치 확정',
  '    sort3(a, lo, lt - 1);',
  '    sort3(a, gt + 1, hi);',
  '}',
];

export function generate(input) {
  const a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.trunc(Number(x) || 0)).slice(0, 12);
  const n = a.length;
  if (n === 0) return [{ line: 14, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];

  const st = new Array(n).fill(0);   // 0 미처리 · 1 <피벗 · 2 현재 · 3 확정(=피벗/정렬) · 4 >피벗
  let caption = '';

  const buildMatrix = () => ({
    rows: 1, cols: n,
    values: a.slice(), states: st.slice(),
    rowLabels: ['a'],
    colLabels: Array.from({ length: n }, (_, t) => String(t)),
    caption,
  });

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(), sortedFrom: n, matrix: buildMatrix(), explain,
  });

  // 현재 파티션 [lo,hi] 의 구간 색을 st 에 칠한다(확정=3 은 유지)
  const paint = (lo, hi, lt, gt, i) => {
    for (let t = lo; t <= hi; t++) {
      if (t < lt) st[t] = 1;              // <피벗
      else if (t >= lt && t < i) st[t] = 3;   // =피벗(확정)
      else if (t > gt) st[t] = 4;         // >피벗
      else st[t] = 0;                     // 아직 안 봄
    }
    if (i >= lo && i <= hi && i <= gt) st[i] = 2;   // 현재 원소
  };

  pushStep(2, 'start',
    `3-way 퀵 정렬 — 피벗 기준 작은 것·같은 것·큰 것 셋으로 나눈다. ` +
    `같은 값 구간은 바로 확정돼 중복 입력에 강하다`);

  const sort3 = (lo, hi) => {
    if (lo > hi) return;
    if (lo === hi) { st[lo] = 3; return; }
    const pivot = a[lo];
    let lt = lo, gt = hi, i = lo + 1;
    caption = `범위 [${lo}, ${hi}] · 피벗 a[${lo}] = ${pivot}`;
    paint(lo, hi, lt, gt, i);
    pushStep(4, 'set', `범위 [${lo}, ${hi}] 의 피벗 = a[${lo}] = ${pivot}. lt=${lt}, gt=${gt}, i=${i}`, { a: lo });

    while (i <= gt) {
      if (a[i] < pivot) {
        if (i !== lt) [a[lt], a[i]] = [a[i], a[lt]];
        paint(lo, hi, lt + 1, gt, i + 1);
        pushStep(7, 'swap', `a[${i}]=${a[lt]} < 피벗 ${pivot} → lt(${lt})와 교환, 왼쪽 구간으로. lt=${lt + 1}, i=${i + 1}`, { a: lt, b: i });
        lt++; i++;
      } else if (a[i] > pivot) {
        if (i !== gt) [a[i], a[gt]] = [a[gt], a[i]];
        paint(lo, hi, lt, gt - 1, i);
        pushStep(8, 'swap', `a[${i}]=${a[gt]} > 피벗 ${pivot} → gt(${gt})와 교환, 오른쪽 구간으로. gt=${gt - 1}`, { a: i, b: gt });
        gt--;
      } else {
        paint(lo, hi, lt, gt, i + 1);
        pushStep(9, 'compare', `a[${i}]=${a[i]} = 피벗 ${pivot} → 가운데(확정). i=${i + 1}`, { a: i });
        i++;
      }
    }
    // [lt..gt] 확정
    for (let t = lt; t <= gt; t++) st[t] = 3;
    caption = `[${lt}, ${gt}] 는 피벗 ${pivot} 과 같아 최종 확정`;
    pushStep(11, 'mark', `a[${lt}..${gt}] = 피벗 ${pivot} → 최종 위치 확정. 좌 [${lo},${lt - 1}] · 우 [${gt + 1},${hi}] 재귀`, { a: lt, b: gt });

    sort3(lo, lt - 1);
    sort3(gt + 1, hi);
  };
  sort3(0, n - 1);

  for (let t = 0; t < n; t++) st[t] = 3;
  caption = `정렬 완료: ${a.join(', ')}`;
  pushStep(14, 'done',
    `정렬 완료. 3-way 는 같은 값을 한 번에 확정해 중복 많은 입력에서 O(n) 에 가깝다 ` +
    `(일반 퀵 정렬이 O(n²) 로 퇴화하는 지점)`);

  return steps;
}
