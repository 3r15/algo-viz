// algorithms/two-pointers/generator.js — Model A 생성기(투 포인터: 합이 target 인 두 수).
//
// 정렬된 배열의 양 끝에서 포인터 둘을 마주 보게 두고, 합을 보고 한쪽만 움직인다.
//   합이 작다 → 왼쪽을 오른쪽으로(더 큰 수를 쓴다)
//   합이 크다 → 오른쪽을 왼쪽으로(더 작은 수를 쓴다)
// 매 단계에서 포인터 하나가 반드시 한 칸 움직이므로 전체가 O(n) 이다.
// 모든 쌍을 보는 O(n²) 를, "버려도 되는 쌍" 을 한 번에 지워 O(n) 으로 줄인 것이다.
//
// 입력은 정렬해서 쓴다(투 포인터의 전제). 목표 합은 입력의 마지막 수로 받는다.
//
// 시각화: array 슬롯. a/b 로 lo·hi 를 짚고, 버려진 양쪽 구간을 확정색으로 보인다.

export const category = 'search';
export const defaultInput = [5, 2, 9, 1, 5, 6, 3, 8, 11];
export const inputLabel = 'a[] … target';
export const inputHint = '마지막 수가 목표 합(target), 그 앞은 배열. 배열은 자동으로 정렬해서 탐색한다.';

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const length = 6 + Math.floor(Math.random() * 3);
  const values = Array.from({ length }, () => 1 + Math.floor(Math.random() * 20));
  // 60% 는 실제로 존재하는 쌍의 합 — 성공 경로와 실패 경로를 둘 다 보게 한다
  let target;
  if (Math.random() < 0.6 && values.length >= 2) {
    const first = Math.floor(Math.random() * values.length);
    let second = Math.floor(Math.random() * values.length);
    if (second === first) second = (first + 1) % values.length;
    target = values[first] + values[second];
  } else {
    target = 1 + Math.floor(Math.random() * 40);
  }
  return [...values, target];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// a 는 오름차순 정렬. 합이 target 인 두 수를 찾는다',
  'pair<int,int> twoSum(vector<int>& a, int target) {',
  '    int lo = 0, hi = a.size() - 1;          // 양 끝에서 시작',
  '    while (lo < hi) {                       // 서로 만나기 전까지',
  '        int sum = a[lo] + a[hi];',
  '        if (sum == target)',
  '            return {lo, hi};                // 찾았다',
  '        if (sum < target)',
  '            lo++;                           // 합을 키워야 한다',
  '        else',
  '            hi--;                           // 합을 줄여야 한다',
  '    }',
  '    return {-1, -1};                        // 그런 쌍이 없다',
  '}',
];

export function generate(input) {
  const numbers = (Array.isArray(input) && input.length >= 2) ? input.slice() : defaultInput.slice();
  const target = numbers[numbers.length - 1];
  const a = numbers.slice(0, -1).sort((x, y) => x - y);   // 투 포인터의 전제를 강제한다
  const n = a.length;

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.lo != null ? { i: extra.lo } : {}),
    ...(extra.hi != null ? { j: extra.hi } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    // 포인터가 지나친 양쪽 구간은 다시 볼 일이 없다 — 확정색으로 보인다
    sortedTo: extra.lo ?? 0,
    sortedFrom: extra.hi != null ? extra.hi + 1 : n,
    explain,
  });

  if (n < 2) {
    return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: a.slice(),
      explain: '원소가 2개 미만이라 쌍을 만들 수 없다' }];
  }

  let lo = 0, hi = n - 1, examined = 0;

  pushStep(3, 'start',
    `정렬한 배열 [${a.join(', ')}] 에서 합이 ${target} 인 두 수를 찾는다. ` +
    `양 끝 0 과 ${hi} 에서 시작한다`,
    { lo, hi, a: lo, b: hi });

  while (lo < hi) {
    const sum = a[lo] + a[hi];
    examined++;

    if (sum === target) {
      pushStep(7, 'done',
        `a[${lo}] + a[${hi}] = ${a[lo]} + ${a[hi]} = ${target} — 찾았다. ` +
        `쌍을 ${examined}번만 봤다(전부 보면 ${n * (n - 1) / 2}번)`,
        { lo, hi, a: lo, b: hi });
      return steps;
    }

    if (sum < target) {
      // a[lo] 는 남은 가장 큰 수 a[hi] 와도 부족하다 → a[lo] 를 쓰는 쌍은 전부 불가능
      pushStep(9, 'compare',
        `${a[lo]} + ${a[hi]} = ${sum} < ${target} — 부족하다. ` +
        `a[${lo}]=${a[lo]} 는 남은 가장 큰 수와 짝지어도 모자라니, 이 수를 쓰는 쌍은 전부 버린다`,
        { lo, hi, a: lo, b: hi });
      lo++;
    } else {
      pushStep(11, 'compare',
        `${a[lo]} + ${a[hi]} = ${sum} > ${target} — 넘친다. ` +
        `a[${hi}]=${a[hi]} 는 남은 가장 작은 수와 짝지어도 넘치니, 이 수를 쓰는 쌍은 전부 버린다`,
        { lo, hi, a: lo, b: hi });
      hi--;
    }
  }

  pushStep(13, 'done',
    `두 포인터가 만났다(lo=${lo}, hi=${hi}) — 합이 ${target} 인 쌍은 없다. ` +
    `쌍을 ${examined}번만 보고 결론 냈다`,
    { lo, hi });

  return steps;
}
