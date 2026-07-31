// algorithms/max-subarray/generator.js — Model A 생성기(최대 부분합, 카데인).
//
// 연속한 부분 배열의 합 중 최댓값을 O(n) 에 구한다.
//   카데인: "여기서 끝나는 최대 합" cur 을 이어 간다. 앞이 도움이 안 되면(cur<0) 여기서 새로 시작.
//     cur = max(a[i], cur + a[i]);  best = max(best, cur);
//   1D DP 의 가장 단순한 형태 — 한 번 훑기.
//
// 입력은 정수 배열. 시각화: matrix 슬롯(값 한 줄 — 현재 구간·최대 구간을 색으로).

export const category = 'dp';
export const defaultInput = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열(음수 포함). 연속 부분 배열의 최대 합을 카데인으로 구한다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 최대 부분 배열 합 (연속 구간)',
  'int kadane(vector<int>& a) {',
  '    int cur = a[0], best = a[0];',
  '    for (int i = 1; i < a.size(); i++) {',
  '        cur = max(a[i], cur + a[i]);    // 잇거나, 여기서 새로 시작',
  '        best = max(best, cur);          // 지금까지 최대',
  '    }',
  '    return best;',
  '}',
];

export function generate(input) {
  const a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.trunc(Number(x) || 0)).slice(0, 12);
  const n = a.length;
  if (n === 0) {
    return [{ line: 8, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  let cur = a[0], best = a[0], curStart = 0, bestL = 0, bestR = 0;
  let caption = '';

  const buildMatrix = (i, restart) => {
    const states = new Array(n).fill(0);
    for (let t = bestL; t <= bestR; t++) states[t] = 3;      // 최대 구간(초록)
    for (let t = curStart; t <= i; t++) if (states[t] !== 3) states[t] = 1;   // 현재 구간
    if (i >= 0) states[i] = restart ? 4 : 2;                 // 현재 원소(재시작=빨강)
    return {
      rows: 1, cols: n,
      values: a.slice(),
      states,
      rowLabels: ['a'],
      colLabels: Array.from({ length: n }, (_, t) => String(t)),
      caption,
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, i, restart) => steps.push({
    line, op, a: i, b: -1, values: a.slice(), sortedFrom: n,
    matrix: buildMatrix(i, restart), explain,
  });

  caption = `cur = ${cur}, best = ${best}`;
  pushStep(3, 'set', `cur = best = a[0] = ${a[0]}. cur 은 "여기서 끝나는 최대 합"`, 0, false);

  for (let i = 1; i < n; i++) {
    const extend = cur + a[i];
    const restart = extend < a[i];   // cur < 0 이면 여기서 새로 시작
    if (restart) { cur = a[i]; curStart = i; }
    else cur = extend;
    caption = `i=${i}: cur = ${cur} ${restart ? '(앞이 손해라 여기서 새로 시작)' : `(a[${i}]=${a[i]} 를 이어 붙임)`}`;
    pushStep(5, restart ? 'set' : 'write',
      `cur = max(a[${i}]=${a[i]}, cur+a[${i}]=${extend}) = ${cur}` +
      (restart ? ` — 앞 구간(cur<0)을 버리고 ${i} 에서 새로 시작` : ` — 현재 구간을 늘린다`),
      i, restart);

    if (cur > best) {
      best = cur; bestL = curStart; bestR = i;
      caption = `새 최대! best = ${best} · 구간 [${bestL}, ${bestR}]`;
      pushStep(6, 'write', `best = ${best} 갱신 → 최대 구간 [${bestL}..${bestR}] = ${a.slice(bestL, bestR + 1).join('+').replace(/\+-/g, '−')}`, i, false);
    }
  }

  caption = `최대 부분합 = ${best} · 구간 [${bestL}, ${bestR}]`;
  pushStep(8, 'done',
    `최대 부분합 = ${best} (구간 [${bestL}..${bestR}] = ${a.slice(bestL, bestR + 1).join(', ')}). ` +
    `한 번 훑기 O(n) — 앞이 손해면 버리는 게 카데인의 전부`, bestR, false);

  return steps;
}
