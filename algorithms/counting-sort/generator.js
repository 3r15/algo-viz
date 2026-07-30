// algorithms/counting-sort/generator.js — Model A 생성기(계수 정렬).
//
// 값을 **비교하지 않는다**. 각 값이 몇 번 나오는지 세어 두고, 작은 값부터 그 횟수만큼 다시 늘어놓는다.
//   비교 정렬의 하한 O(n log n) 을 넘어 O(n + k) 에 정렬한다(k = 값의 범위).
//   단, 값의 범위가 작아야 쓸모 있다 — 버킷을 값마다 하나씩 두기 때문이다.
//
// 시각화(두 슬롯):
//   array 슬롯 — 세는 동안은 입력, 늘어놓는 동안은 앞에서부터 채워지는 결과(sortedTo 로 초록)
//   matrix 슬롯 — count[v] 버킷 한 줄. 세면 늘고, 늘어놓으면 줄어든다
//     셀 상태: 1 채워짐 · 2 읽는 중 · 3 방금 갱신 · 4 결과

export const category = 'sorting';
export const defaultInput = [4, 2, 2, 6, 3, 3, 1, 5];
export const inputLabel = 'a[]';
export const inputHint = '값의 범위가 작은 정수 배열. 값을 세어 다시 늘어놓는다 — 비교하지 않는다.';

const MAX_RANGE = 20;              // 버킷(=값 범위)이 이보다 넓으면 표가 화면을 넘는다

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// a 의 값이 [lo, hi] 라고 하자 (범위가 좁아야 한다)',
  'void countingSort(vector<int>& a, int lo, int hi) {',
  '    vector<int> count(hi - lo + 1, 0);',
  '    for (int x : a) count[x - lo]++;        // ① 값마다 개수를 센다',
  '    int pos = 0;',
  '    for (int v = 0; v <= hi - lo; v++)       // ② 작은 값부터',
  '        while (count[v]-- > 0)               //    센 횟수만큼',
  '            a[pos++] = v + lo;               //    다시 늘어놓는다',
  '}',
];

export function generate(input) {
  const source = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const a = source.map(x => Math.trunc(x));
  const n = a.length;

  if (n === 0) {
    return [{ line: 8, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  let lo = Math.min(...a), hi = Math.max(...a);
  // 범위가 너무 넓으면(계수 정렬이 부적합한 경우) 잘라서 보여 준다
  if (hi - lo + 1 > MAX_RANGE) hi = lo + MAX_RANGE - 1;
  const bucketCount = hi - lo + 1;

  const count = new Array(bucketCount).fill(0);
  const cellState = () => new Array(bucketCount).fill(1);
  const colLabels = Array.from({ length: bucketCount }, (_, i) => String(lo + i));
  const rowLabels = ['개수'];
  let caption = `값 범위 ${lo}..${hi} — 버킷 ${bucketCount}개`;

  const values = a.slice();           // 배열 상태(세는 동안 입력, 늘어놓는 동안 결과)
  let sortedTo = 0;                    // 결과가 확정된 앞쪽 길이

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: values.slice(),
    sortedFrom: n,                    // 오른쪽 확정 표시는 안 쓴다
    sortedTo,                         // 왼쪽부터 채워지는 초록
    matrix: {
      rows: 1, cols: bucketCount,
      values: count.slice(),
      states: extra.states ?? cellState(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  const highlightBucket = (bucketIndex, state) => {
    const s = cellState();
    if (bucketIndex >= 0 && bucketIndex < bucketCount) s[bucketIndex] = state;
    return s;
  };

  caption = `값 범위 ${lo}..${hi} — 버킷을 0 으로 두고 시작`;
  pushStep(3, 'start',
    `${n}개를 정렬한다. 값이 ${lo}..${hi} 뿐이라, 비교하지 않고 ` +
    `각 값이 몇 번 나오는지 세기만 하면 된다`);

  // ① 세기
  for (let i = 0; i < n; i++) {
    const v = a[i];
    if (v < lo || v > hi) continue;   // 잘린 범위 밖(드묾)
    const bucket = v - lo;
    count[bucket]++;
    caption = `① 세기 — a[${i}] = ${v} 의 칸을 하나 올린다`;
    pushStep(4, 'write',
      `a[${i}] = ${v} → count[${v}] 를 ${count[bucket]} 로 올린다`,
      { a: i, states: highlightBucket(bucket, 3) });
  }

  caption = '세기 완료 — 각 값의 개수가 버킷에 담겼다';
  pushStep(4, 'mark',
    `모든 값을 셌다: ${colLabels.map((label, i) => `${label}×${count[i]}`).filter((_, i) => count[i] > 0).join(', ')}`);

  // ② 작은 값부터 늘어놓기
  let pos = 0;
  for (let bucket = 0; bucket < bucketCount; bucket++) {
    const v = bucket + lo;
    while (count[bucket] > 0) {
      count[bucket]--;
      values[pos] = v;
      pos++;
      sortedTo = pos;
      caption = `② 늘어놓기 — ${v} 를 ${pos - 1}번 자리에`;
      pushStep(7, 'write',
        `count[${v}] 에서 하나 꺼내 a[${pos - 1}] = ${v}. ` +
        `남은 ${v}: ${count[bucket]}개`,
        { a: pos - 1, states: highlightBucket(bucket, 2) });
    }
  }

  const finalStates = new Array(bucketCount).fill(4);
  caption = `완성 — 오름차순 정렬 (비교 0회, O(n + k))`;
  pushStep(8, 'done',
    `모든 버킷을 비웠다. 비교를 한 번도 하지 않고 정렬했다 — ` +
    `세기 ${n}번 + 늘어놓기 ${n}번 = O(n + ${bucketCount})`,
    { states: finalStates });

  return steps;
}
