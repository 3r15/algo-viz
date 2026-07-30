// algorithms/lis/generator.js — Model A 생성기(최장 증가 부분 수열, O(n²) DP).
//
// dp[i] = "i 로 끝나는" 최장 증가 부분 수열의 길이.
//   i 앞의 모든 j 를 훑어, a[j] < a[i] 인 j 중 dp[j] 가 가장 큰 것을 골라 뒤에 붙인다.
//   "i 로 끝나는" 으로 상태를 좁힌 것이 이 DP 의 핵심이다 — 그래야 뒤에 이어 붙일 수 있다.
//
// 시각화: array 슬롯(원소 막대, 비교 중인 i·j 강조) + matrix 슬롯(a / dp / prev 세 줄).
//   matrix 셀 상태: 1 채워짐 · 2 읽는 중 · 3 방금 씀 · 4 결과(복원된 부분 수열)

export const category = 'dp';
export const defaultInput = [3, 4, 1, 5, 8, 2, 6, 9];
export const inputLabel = 'a[]';
export const inputHint = '정수 수열. 순서를 지키면서 "커지기만 하는" 가장 긴 부분 수열을 찾는다(연속일 필요 없음).';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// dp[i] = i 로 끝나는 최장 증가 부분 수열의 길이',
  'int lis(vector<int>& a) {',
  '    int n = a.size(), best = 0;',
  '    vector<int> dp(n, 1), prev(n, -1);      // 자기 혼자만으로도 길이 1',
  '    for (int i = 1; i < n; i++) {',
  '        for (int j = 0; j < i; j++) {',
  '            if (a[j] < a[i] && dp[j] + 1 > dp[i]) {',
  '                dp[i] = dp[j] + 1;          // j 뒤에 i 를 이어 붙인다',
  '                prev[i] = j;                // 복원용 발자국',
  '            }',
  '        }',
  '        if (dp[i] > dp[best]) best = i;     // 가장 긴 끝점을 기억',
  '    }',
  '    return dp[best];                        // prev 를 거슬러 가면 수열 자체',
  '}',
];

export function generate(input) {
  const a = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const n = a.length;

  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);
  const cellState = Array.from({ length: 3 }, () => new Array(n).fill(0));

  const ROW_VALUE = 0, ROW_DP = 1, ROW_PREV = 2;
  const rowLabels = ['a[i]', 'dp[i]', 'prev[i]'];
  const colLabels = Array.from({ length: n }, (_, i) => String(i));
  let caption = 'dp[i] = i 로 끝나는 증가 부분 수열의 최대 길이';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.i != null ? { i: extra.i } : {}),      // 판독기는 i/j 가 있으면 그대로 보여 준다
    ...(extra.j != null ? { j: extra.j } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    sortedFrom: n,                       // 정렬 알고리즘이 아니므로 확정 구간 표시는 쓰지 않는다
    matrix: {
      rows: 3, cols: n,
      values: [a.slice(), dp.slice(), prev.map(p => (p < 0 ? '·' : p))].flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  // 모든 칸을 "채워짐" 으로 되돌린다(강조는 그 위에 덧칠한다)
  const clearHighlights = () => {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < n; col++) cellState[row][col] = 1;
  };

  if (n === 0) {
    return [{ line: 3, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 수열' }];
  }

  clearHighlights();
  caption = '초기값 — 어떤 원소든 자기 혼자면 길이 1';
  pushStep(4, 'start',
    `원소 ${n}개. dp 를 전부 1 로 두고 시작한다 — 자기 자신만으로도 길이 1짜리 증가 수열이다`);

  let best = 0;

  for (let i = 1; i < n; i++) {
    clearHighlights();
    cellState[ROW_VALUE][i] = 2;
    cellState[ROW_DP][i] = 2;
    caption = `i = ${i} (a[${i}] = ${a[i]}) — 앞쪽에서 이어 붙일 자리를 찾는다`;
    pushStep(5, 'set',
      `i = ${i}: a[${i}] = ${a[i]} 로 끝나는 수열을 만든다. 앞의 j 를 모두 후보로 본다`,
      { i, a: i });

    for (let j = 0; j < i; j++) {
      clearHighlights();
      cellState[ROW_VALUE][j] = 2; cellState[ROW_VALUE][i] = 2;
      cellState[ROW_DP][j] = 2;    cellState[ROW_DP][i] = 2;

      const extendable = a[j] < a[i];
      const longer = dp[j] + 1 > dp[i];

      if (extendable && longer) {
        dp[i] = dp[j] + 1;
        prev[i] = j;
        clearHighlights();
        cellState[ROW_VALUE][j] = 2; cellState[ROW_DP][j] = 2;
        cellState[ROW_DP][i] = 3;   cellState[ROW_PREV][i] = 3;
        caption = `dp[${i}] 갱신 — a[${j}]=${a[j]} 뒤에 a[${i}]=${a[i]} 를 붙인다`;
        pushStep(8, 'write',
          `a[${j}]=${a[j]} < a[${i}]=${a[i]} 이고 dp[${j}]+1 = ${dp[i]} 이 더 길다 → ` +
          `dp[${i}] = ${dp[i]}, prev[${i}] = ${j}`,
          { i, j, a: j, b: i });
      } else {
        const reason = !extendable
          ? `a[${j}]=${a[j]} 가 a[${i}]=${a[i]} 보다 작지 않아 이어 붙일 수 없다`
          : `이어 붙여도 길이 ${dp[j] + 1} 로, 지금의 dp[${i}]=${dp[i]} 를 넘지 못한다`;
        caption = `i = ${i}, j = ${j} — 후보 검사`;
        pushStep(7, 'compare', reason, { i, j, a: j, b: i });
      }
    }

    if (dp[i] > dp[best]) {
      best = i;
      clearHighlights();
      cellState[ROW_DP][best] = 3;
      caption = `가장 긴 끝점이 i = ${best} 로 바뀌었다`;
      pushStep(12, 'mark',
        `dp[${i}] = ${dp[i]} 로 지금까지 중 가장 길다 → best = ${i}`,
        { i, a: i });
    }
  }

  // prev 를 거슬러 올라가 실제 부분 수열을 복원한다
  const sequenceIndices = [];
  for (let node = best; node !== -1; node = prev[node]) sequenceIndices.push(node);
  sequenceIndices.reverse();

  clearHighlights();
  for (const index of sequenceIndices) {
    cellState[ROW_VALUE][index] = 4;
    cellState[ROW_DP][index] = 4;
  }
  caption = `완성 — 길이 ${dp[best]} 의 증가 부분 수열`;
  pushStep(14, 'done',
    `최장 길이는 dp[${best}] = ${dp[best]}. prev 를 거슬러 복원하면 ` +
    `[${sequenceIndices.map(index => a[index]).join(', ')}] (인덱스 ${sequenceIndices.join(', ')})`,
    { a: best });

  return steps;
}
