// algorithms/lcs/generator.js — Model A 생성기(최장 공통 부분 수열, LCS).
//
// dp[i][j] = A 의 앞 i 글자와 B 의 앞 j 글자만 볼 때의 LCS 길이.
//   마지막 글자가 같으면 그 글자는 반드시 써도 손해가 없다 → 대각선 + 1.
//   다르면 둘 중 하나는 못 쓴다 → 한 글자씩 버려 본 두 경우의 최댓값.
//
// 입력은 문자열 두 개다(inputKind='text'). 정수 배열 입력란 대신 자유 텍스트를 받는다.
//
// 시각화: matrix 슬롯(dp 표) 하나. 배열 구조가 없으므로 values 는 항상 빈 배열이다.
//   셀 상태: 1 채워짐 · 2 읽는 중(비교 대상 칸) · 3 방금 씀 · 4 결과(역추적 경로)

export const category = 'dp';
export const inputKind = 'text';
export const defaultInput = 'ABCBDAB BDCABA';
export const inputLabel = 'A B';
export const inputHint = '공백으로 구분한 두 문자열. 순서를 지키며 양쪽에 모두 나타나는 가장 긴 부분 수열을 찾는다.';

const MAX_LENGTH = 12;          // 표가 화면을 넘지 않도록 각 문자열 길이를 제한한다

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const alphabet = 'ABCD';
  const word = () => Array.from(
    { length: 5 + Math.floor(Math.random() * 3) },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join('');
  return `${word()} ${word()}`;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// dp[i][j] = A 의 앞 i 글자와 B 의 앞 j 글자의 LCS 길이',
  'int lcs(string A, string B) {',
  '    int m = A.size(), n = B.size();',
  '    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));',
  '    for (int i = 1; i <= m; i++) {',
  '        for (int j = 1; j <= n; j++) {',
  '            if (A[i-1] == B[j-1])',
  '                dp[i][j] = dp[i-1][j-1] + 1;              // 같은 글자 → 대각선 + 1',
  '            else',
  '                dp[i][j] = max(dp[i-1][j], dp[i][j-1]);   // 한쪽을 버린 두 경우 중 큰 쪽',
  '        }',
  '    }',
  '    return dp[m][n];        // 오른쪽 아래에서 거슬러 가면 수열 자체를 얻는다',
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
  if (!m || !n) {
    return [{
      line: 3, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '문자열 두 개를 공백으로 구분해 입력하세요 (예: ABCBDAB BDCABA)',
    }];
  }

  // dp 는 (m+1) × (n+1). 0행·0열은 "한쪽이 빈 문자열" 이라 항상 0 이다.
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  const cellState = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  const rowLabels = ['∅', ...A].map((ch, i) => `${i} ${ch}`);
  const colLabels = ['∅', ...B].map((ch, j) => `${j} ${ch}`);
  let caption = `A = ${A}, B = ${B}`;

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    ...(extra.i != null ? { i: extra.i } : {}),
    ...(extra.j != null ? { j: extra.j } : {}),
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                          // 배열 자료구조가 없다 — 표가 전부다
    sortedFrom: 0,
    matrix: {
      rows: m + 1, cols: n + 1,
      values: dp.flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  // 이미 계산된 칸(0행·0열 포함)을 "채워짐" 으로 되돌린다. 강조는 그 위에 덧칠한다.
  const clearHighlights = (upToRow, upToCol) => {
    for (let i = 0; i <= m; i++)
      for (let j = 0; j <= n; j++)
        cellState[i][j] = (i === 0 || j === 0 || i < upToRow || (i === upToRow && j <= upToCol)) ? 1 : 0;
  };

  clearHighlights(0, 0);
  caption = `A = ${A} (세로), B = ${B} (가로) — 0행·0열은 빈 문자열이라 전부 0`;
  pushStep(4, 'start',
    `A 는 ${m}글자, B 는 ${n}글자. 한쪽이 비면 공통 부분 수열도 비므로 0행과 0열은 0 으로 시작한다`);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const sameChar = A[i - 1] === B[j - 1];

      if (sameChar) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        clearHighlights(i, j);
        cellState[i - 1][j - 1] = 2;
        cellState[i][j] = 3;
        caption = `A[${i}] = B[${j}] = ${A[i - 1]} — 대각선 값에 1 을 더한다`;
        pushStep(8, 'write',
          `A 의 ${i}번째와 B 의 ${j}번째가 둘 다 '${A[i - 1]}' 이다 → ` +
          `dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}`,
          { i, j });
      } else {
        const fromAbove = dp[i - 1][j], fromLeft = dp[i][j - 1];
        dp[i][j] = Math.max(fromAbove, fromLeft);
        clearHighlights(i, j);
        cellState[i - 1][j] = 2;
        cellState[i][j - 1] = 2;
        cellState[i][j] = 3;
        caption = `A[${i}] = ${A[i - 1]} ≠ B[${j}] = ${B[j - 1]} — 위·왼쪽 중 큰 쪽`;
        pushStep(10, 'write',
          `'${A[i - 1]}' 과 '${B[j - 1]}' 이 다르다 → 한쪽 글자를 버려야 한다. ` +
          `위 ${fromAbove} 와 왼쪽 ${fromLeft} 중 큰 쪽인 ${dp[i][j]}`,
          { i, j });
      }
    }
  }

  // 오른쪽 아래에서 거슬러 올라가며 실제 부분 수열을 복원한다.
  const matched = [];
  let row = m, col = n;
  while (row > 0 && col > 0) {
    if (A[row - 1] === B[col - 1]) {
      matched.push({ row, col, ch: A[row - 1] });
      row--; col--;
    } else if (dp[row - 1][col] >= dp[row][col - 1]) {
      row--;
    } else {
      col--;
    }
  }
  matched.reverse();

  clearHighlights(m, n);
  for (const cell of matched) cellState[cell.row][cell.col] = 4;
  cellState[m][n] = 4;
  const sequence = matched.map(cell => cell.ch).join('');
  caption = `완성 — LCS 길이 ${dp[m][n]}${sequence ? `, 예: ${sequence}` : ''}`;
  pushStep(13, 'done',
    `dp[${m}][${n}] = ${dp[m][n]} 이 답이다. 오른쪽 아래에서 거슬러 가면 ` +
    (sequence ? `실제 수열 "${sequence}" 를 얻는다` : '공통 부분 수열이 없다'));

  return steps;
}
