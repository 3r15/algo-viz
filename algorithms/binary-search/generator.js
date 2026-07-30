// algorithms/binary-search/generator.js — Model A 생성기(이분 탐색).
//
// 정렬된 배열에서 목표값을 찾는다. 후보 구간 [lo, hi] 의 가운데를 보고 절반을 버린다.
//   a[mid] < target → 답은 오른쪽 절반 → lo = mid + 1
//   a[mid] > target → 답은 왼쪽 절반  → hi = mid - 1
// 한 번 볼 때마다 후보가 절반이 되므로 비교 횟수가 ⌊log₂ n⌋ + 1 을 넘지 않는다.
//
// 입력은 정렬해서 쓴다(이분 탐색의 전제). 목표값은 입력의 마지막 수로 받는다.
//
// 시각화: array 슬롯. sortedTo/sortedFrom 으로 "버려진 구간" 을 회색이 아니라 확정색으로
//   보이게 하는 대신, a/b 로 lo·hi 를 짚고 op='compare' 로 mid 를 강조한다.

export const category = 'search';
export const defaultInput = [5, 2, 9, 1, 5, 6, 3, 8, 6];
export const inputLabel = 'a[] … target';
export const inputHint = '마지막 수가 찾을 값(target), 그 앞은 배열. 배열은 자동으로 정렬해서 탐색한다.';

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const length = 6 + Math.floor(Math.random() * 3);
  const values = Array.from({ length }, () => Math.floor(Math.random() * 30));
  // 절반은 존재하는 값, 절반은 없을 수도 있는 값으로 — 실패 경로도 보이게
  const target = Math.random() < 0.6
    ? values[Math.floor(Math.random() * values.length)]
    : Math.floor(Math.random() * 30);
  return [...values, target];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// a 는 오름차순으로 정렬돼 있어야 한다',
  'int binarySearch(vector<int>& a, int target) {',
  '    int lo = 0, hi = a.size() - 1;',
  '    while (lo <= hi) {                      // 후보 구간이 남아 있는 동안',
  '        int mid = lo + (hi - lo) / 2;       // 오버플로 안전한 중간',
  '        if (a[mid] == target)',
  '            return mid;                     // 찾았다',
  '        if (a[mid] < target)',
  '            lo = mid + 1;                   // 왼쪽 절반을 버린다',
  '        else',
  '            hi = mid - 1;                   // 오른쪽 절반을 버린다',
  '    }',
  '    return -1;                              // 없다',
  '}',
];

export function generate(input) {
  const numbers = (Array.isArray(input) && input.length >= 2) ? input.slice() : defaultInput.slice();
  const target = numbers[numbers.length - 1];
  const a = numbers.slice(0, -1).sort((x, y) => x - y);   // 이분 탐색의 전제를 강제한다
  const n = a.length;

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.lo != null ? { i: extra.lo } : {}),
    ...(extra.hi != null ? { j: extra.hi } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    // 후보 구간 밖(버려진 부분)을 확정색으로 보인다: [0, lo) 와 [hi+1, n)
    sortedTo: extra.lo ?? 0,
    sortedFrom: extra.hi != null ? extra.hi + 1 : n,
    explain,
  });

  if (n === 0) {
    return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '배열이 비었다 — 찾을 수 없다' }];
  }

  let lo = 0, hi = n - 1, comparisons = 0;

  pushStep(3, 'start',
    `정렬한 배열 [${a.join(', ')}] 에서 ${target} 을 찾는다. ` +
    `후보 구간은 처음엔 전체 [0, ${hi}]`,
    { lo, hi });

  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    comparisons++;

    pushStep(5, 'read',
      `후보 구간 [${lo}, ${hi}] 의 가운데는 ${mid} 번, 값은 ${a[mid]}`,
      { lo, hi, a: mid });

    if (a[mid] === target) {
      pushStep(7, 'done',
        `a[${mid}] = ${target} — 찾았다. 비교 ${comparisons}번 (배열 ${n}개, ` +
        `한 번에 절반을 버려서 ⌊log₂ ${n}⌋ + 1 = ${Math.floor(Math.log2(n)) + 1} 번 이내)`,
        { lo, hi, a: mid });
      return steps;
    }

    if (a[mid] < target) {
      const discarded = mid - lo + 1;
      lo = mid + 1;
      pushStep(9, 'compare',
        `a[${mid}] = ${a[mid]} < ${target} → 목표는 오른쪽에 있다. ` +
        `왼쪽 ${discarded}칸을 한 번에 버리고 lo = ${lo}`,
        { lo, hi, a: mid });
    } else {
      const discarded = hi - mid + 1;
      hi = mid - 1;
      pushStep(11, 'compare',
        `a[${mid}] = ${a[mid]} > ${target} → 목표는 왼쪽에 있다. ` +
        `오른쪽 ${discarded}칸을 한 번에 버리고 hi = ${hi}`,
        { lo, hi, a: mid });
    }
  }

  // lo > hi — 후보 구간이 비었다. lo 는 "target 이 들어갈 자리" 이기도 하다.
  pushStep(13, 'done',
    `후보 구간이 비었다(lo=${lo} > hi=${hi}) — ${target} 은 배열에 없다. ` +
    `비교 ${comparisons}번. 참고로 lo=${lo} 는 ${target} 을 끼워 넣을 자리다`,
    { lo: Math.min(lo, n), hi: Math.max(hi, -1) });

  return steps;
}
