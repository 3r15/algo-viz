// algorithms/edit-distance/generator.js — Model A 생성기(편집 거리 / 레벤슈타인 거리).
//
// 문자열 A 를 B 로 바꾸는 데 필요한 최소 편집 횟수(삽입·삭제·교체 각 1). 예: kitten → sitting = 3.
//   dp[i][j] = A 의 앞 i 글자를 B 의 앞 j 글자로 바꾸는 최소 편집 수.
//   마지막 글자가 같으면 그대로(대각선), 다르면 삽입·삭제·교체 세 이웃의 최솟값 + 1.
//
// [LCS](lcs)와 형제다 — 같은 2차원 표를 채우지만, LCS 는 "닮음(최대)" 을, 편집 거리는 "다름(최소)" 을 잰다.
//
// 입력은 문자열 두 개(inputKind='text'). 정수 배열 대신 자유 텍스트를 받는다.
//
// 시각화: matrix 슬롯(dp 표). 배열 자료구조가 없어 values 는 항상 빈 배열이다.
//   셀 상태: 1 채워짐 · 2 읽는 중(세 이웃) · 3 방금 씀 · 4 결과(역추적 경로)

export const category = 'string';
export const inputKind = 'text';
export const defaultInput = 'kitten sitting';
export const inputLabel = 'A B';
export const inputHint = '공백으로 구분한 두 문자열. A 를 B 로 바꾸는 최소 편집 수(삽입·삭제·교체)를 구한다.';

const MAX_LENGTH = 12;          // 표가 화면을 넘지 않도록 각 문자열 길이를 제한한다

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const samples = ['kitten sitting', 'sunday saturday', 'horse ros', 'abc abc', 'flaw lawn', 'cat cut'];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// dp[i][j] = A[1..i] 를 B[1..j] 로 바꾸는 최소 편집 수',
  'int editDistance(string A, string B) {',
  '    int m = A.size(), n = B.size();',
  '    vector<vector<int>> dp(m + 1, vector<int>(n + 1));',
  '    for (int i = 0; i <= m; i++) dp[i][0] = i;    // A 를 다 지운다',
  '    for (int j = 0; j <= n; j++) dp[0][j] = j;    // B 를 다 넣는다',
  '    for (int i = 1; i <= m; i++)',
  '        for (int j = 1; j <= n; j++) {',
  '            if (A[i-1] == B[j-1])',
  '                dp[i][j] = dp[i-1][j-1];           // 같으면 그대로',
  '            else',
  '                dp[i][j] = 1 + min({ dp[i-1][j],   // 삭제',
  '                                     dp[i][j-1],   // 삽입',
  '                                     dp[i-1][j-1] }); // 교체',
  '        }',
  '    return dp[m][n];',
  '}',
];

function parseWords(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join(' ') : '');
  const [first = '', second = ''] = text.trim().split(/\s+/);
  return [first.slice(0, MAX_LENGTH), second.slice(0, MAX_LENGTH)];
}

export function generate(input) {
  const [A, B] = parseWords(input);
  const m = A.length, n = B.length;

  const steps = [];
  if (!m && !n) {
    return [{
      line: 3, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '문자열 두 개를 공백으로 구분해 입력하세요 (예: kitten sitting)',
    }];
  }

  // dp 는 (m+1) × (n+1). 0행·0열은 "한쪽이 빈 문자열" 이라 인덱스가 곧 편집 수다.
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
  const cellState = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  const rowLabels = ['∅', ...A].map((ch, i) => `${i} ${ch}`);
  const colLabels = ['∅', ...B].map((ch, j) => `${j} ${ch}`);
  let caption = `A = ${A || '∅'}, B = ${B || '∅'}`;

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.i != null ? { i: extra.i } : {}),
    ...(extra.j != null ? { j: extra.j } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],
    sortedFrom: 0,
    matrix: {
      rows: m + 1, cols: n + 1,
      values: dp.map(row => row.map(v => (v === null ? null : v))).flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  // 이미 계산된 칸을 "채워짐" 으로 되돌린다(강조는 그 위에 덧칠).
  const settle = (upToRow, upToCol) => {
    for (let i = 0; i <= m; i++)
      for (let j = 0; j <= n; j++)
        cellState[i][j] = (dp[i][j] !== null &&
          (i < upToRow || (i === upToRow && j <= upToCol) || (upToRow < 0))) ? 1 : cellState[i][j];
  };

  // 경계 초기화: 0행·0열
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 0; i <= m; i++) cellState[i][0] = 1;
  for (let j = 0; j <= n; j++) cellState[0][j] = 1;

  caption = 'A(세로) → B(가로). 0행·0열은 빈 문자열로 바꾸는 비용 = 글자 수';
  pushStep(5, 'start',
    `A = "${A}" 를 B = "${B}" 로 바꾸는 최소 편집 수를 구한다. ` +
    `0행·0열은 한쪽이 빈 문자열이라, 나머지를 통째로 넣거나 지우는 횟수 = 글자 수다`);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sameChar = A[i - 1] === B[j - 1];

      if (sameChar) {
        dp[i][j] = dp[i - 1][j - 1];
        settle(i, j - 1);
        cellState[i - 1][j - 1] = 2;
        cellState[i][j] = 3;
        caption = `A[${i}] = B[${j}] = ${A[i - 1]} — 편집 없이 대각선 값 그대로`;
        pushStep(9, 'write',
          `${i}번째와 ${j}번째가 둘 다 '${A[i - 1]}' 이다 → 손댈 것이 없다. ` +
          `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[i][j]}`,
          { i, j });
      } else {
        const del = dp[i - 1][j];       // A 의 글자를 지운다
        const ins = dp[i][j - 1];       // B 의 글자를 넣는다
        const sub = dp[i - 1][j - 1];   // 한 글자를 교체한다
        const best = Math.min(del, ins, sub);
        dp[i][j] = 1 + best;
        settle(i, j - 1);
        cellState[i - 1][j] = 2; cellState[i][j - 1] = 2; cellState[i - 1][j - 1] = 2;
        cellState[i][j] = 3;
        const chosen = best === sub ? '교체' : best === del ? '삭제' : '삽입';
        caption = `A[${i}]=${A[i - 1]} ≠ B[${j}]=${B[j - 1]} — 세 이웃의 최솟값 + 1`;
        pushStep(12, 'write',
          `'${A[i - 1]}' ≠ '${B[j - 1]}' → 삭제 ${del}, 삽입 ${ins}, 교체 ${sub} 중 ` +
          `가장 작은 ${best}(${chosen})에 1 을 더해 dp[${i}][${j}] = ${dp[i][j]}`,
          { i, j });
      }
    }
  }

  // 오른쪽 아래에서 역추적해 실제 편집 연산을 복원한다.
  const ops = [];
  let row = m, col = n;
  while (row > 0 || col > 0) {
    cellState[row][col] = 4;
    if (row > 0 && col > 0 && A[row - 1] === B[col - 1]) {
      ops.push(`유지 '${A[row - 1]}'`); row--; col--;
    } else if (row > 0 && col > 0 && dp[row][col] === dp[row - 1][col - 1] + 1) {
      ops.push(`'${A[row - 1]}'→'${B[col - 1]}' 교체`); row--; col--;
    } else if (row > 0 && dp[row][col] === dp[row - 1][col] + 1) {
      ops.push(`'${A[row - 1]}' 삭제`); row--;
    } else {
      ops.push(`'${B[col - 1]}' 삽입`); col--;
    }
  }
  cellState[0][0] = 4;
  ops.reverse();
  const edits = ops.filter(op => !op.startsWith('유지')).length;

  caption = `완성 — 편집 거리 ${dp[m][n]}`;
  pushStep(16, 'done',
    `dp[${m}][${n}] = ${dp[m][n]} 이 답이다. 한 가지 편집 방법: ${ops.join(', ')} ` +
    `(실제 편집 ${edits}회)`);

  return steps;
}
