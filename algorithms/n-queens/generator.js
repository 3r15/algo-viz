// algorithms/n-queens/generator.js — Model A 생성기(N-퀸, 백트래킹).
//
// n×n 체스판에 퀸 n개를 서로 공격하지 않게 놓는다.
//   퀸은 같은 행·열·대각선을 모두 공격하므로, 한 행에 정확히 하나씩 놓게 된다.
//   그래서 상태는 "row 행까지 놓았고, col[r] 이 각 행의 열" 하나로 줄어든다.
// 위 행부터 한 줄씩 내려가며 놓아 보고, 막히면 **한 칸 물러나 다음 열을 시도**한다.
//
// 이 사이트의 되감기와 궁합이 가장 좋은 알고리즘이다 — 백트래킹의 "물러남" 자체가
// 스냅샷 되감기와 같은 모양이라, 스텝을 앞뒤로 오가며 탐색 트리를 그대로 따라갈 수 있다.
//
// 입력은 판 크기 n 하나(정수). 첫 해답을 찾으면 멈춘다.
//
// 시각화: board 슬롯. 칸 상태 0 빈칸 · 2 공격받음 · 3 퀸 · 4 방금 놓음 · 5 방금 물러남
//   · 6 후보인데 공격받음(붉은 배경 + 테두리 — 왜 건너뛰는지 함께 보인다)

export const category = 'backtracking';
export const defaultInput = [4];
export const inputLabel = 'n (판 크기)';
export const inputHint = 'n×n 판에 퀸 n개를 서로 공격하지 않게 놓는다. 4 는 손으로 따라갈 수 있고, 6~8 은 탐색이 커진다.';

const MIN_SIZE = 1, MAX_SIZE = 8;
// 해답이 없는 판(n = 2, 3)이나 큰 판에서 스텝이 지나치게 늘지 않게 예산을 둔다.
// 끊었으면 끊었다고 스텝에 명시한다(조용히 잘라내지 않는다).
const MAX_STEPS = 1200;
const QUEEN = '♛';

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  return [4 + Math.floor(Math.random() * 4)];      // 4..7
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// col[r] = r 행에 놓은 퀸의 열. 위 행부터 한 줄에 하나씩 놓는다',
  'bool solve(int row, int n) {',
  '    if (row == n) return true;              // 모든 행에 놓았다 = 해답',
  '    for (int c = 0; c < n; c++) {',
  '        if (!safe(row, c)) continue;        // 공격받는 칸은 건너뛴다',
  '        col[row] = c;                       // 놓아 본다',
  '        if (solve(row + 1, n)) return true;',
  '        col[row] = -1;                      // 물러난다 (백트래킹)',
  '    }',
  '    return false;                           // 이 행엔 놓을 자리가 없다',
  '}',
  '',
  'bool safe(int row, int c) {                 // 위쪽 행만 확인하면 된다',
  '    for (int r = 0; r < row; r++)',
  '        if (col[r] == c || abs(col[r] - c) == row - r)',
  '            return false;',
  '    return true;',
  '}',
];

export function generate(input) {
  const requested = (Array.isArray(input) && input.length) ? Math.trunc(input[0]) : defaultInput[0];
  const n = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number.isFinite(requested) ? requested : 6));

  const column = new Array(n).fill(-1);        // column[r] = r 행 퀸의 열(-1 = 아직 없음)
  const steps = [];
  let caption = '';
  let attempts = 0, backtracks = 0;

  // 이미 놓인 퀸들이 공격하는 칸을 모두 칠한다 — 왜 후보가 줄어드는지 눈에 보이게 한다
  const attackedCells = () => {
    const attacked = new Array(n * n).fill(false);
    for (let row = 0; row < n; row++) {
      const queenCol = column[row];
      if (queenCol < 0) continue;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          if (r === row && c === queenCol) continue;
          if (r === row || c === queenCol || Math.abs(r - row) === Math.abs(c - queenCol))
            attacked[r * n + c] = true;
        }
    }
    return attacked;
  };

  const pushStep = (line, op, explain, extra = {}) => {
    const attacked = attackedCells();
    const states = new Array(n * n).fill(0);
    const marks = new Array(n * n).fill('');

    for (let index = 0; index < n * n; index++) if (attacked[index]) states[index] = 2;
    for (let row = 0; row < n; row++) {
      if (column[row] < 0) continue;
      const index = row * n + column[row];
      states[index] = 3;
      marks[index] = QUEEN;
    }
    // 이번 스텝의 주인공 칸을 마지막에 덧칠한다(공격 표시보다 우선)
    if (extra.cell != null) {
      states[extra.cell] = extra.cellState;
      if (extra.cellMark) marks[extra.cell] = extra.cellMark;
    }

    steps.push({
      line, op,
      a: extra.a ?? -1, b: extra.b ?? -1,
      values: [],                              // 배열 자료구조가 없다 — 판이 전부다
      sortedFrom: 0,
      board: { rows: n, cols: n, states, marks, caption },
      explain,
    });
  };

  // safe 검사 — 막은 퀸이 있으면 그 행을 돌려준다(설명에 쓴다)
  const blockingRow = (row, col) => {
    for (let r = 0; r < row; r++)
      if (column[r] === col || Math.abs(column[r] - col) === row - r) return r;
    return -1;
  };

  caption = `${n}×${n} 판 — 아직 아무것도 놓지 않았다`;
  pushStep(2, 'start',
    `${n}×${n} 판에 퀸 ${n}개를 놓는다. 퀸은 같은 행도 공격하므로 ` +
    `한 행에 정확히 하나씩 놓게 된다 — 그래서 행을 하나씩 내려가며 열만 고르면 된다`);

  // 재귀를 그대로 쓰되, 스텝은 의미 있는 지점에서만 남긴다
  let solved = false;

  let budgetExhausted = false;

  const solve = row => {
    if (steps.length >= MAX_STEPS) { budgetExhausted = true; return false; }
    if (row === n) {
      caption = `완성 — 퀸 ${n}개가 서로 공격하지 않는다`;
      pushStep(3, 'done',
        `${n}개를 모두 놓았다. 시도 ${attempts}번, 물러남 ${backtracks}번. ` +
        `열 배치: [${column.join(', ')}]`);
      return true;
    }

    for (let col = 0; col < n; col++) {
      const cell = row * n + col;
      const blocker = blockingRow(row, col);

      if (blocker >= 0) {
        const blockerCol = column[blocker];
        const sameColumn = blockerCol === col;
        caption = `${row}행 ${col}열 — 놓을 수 없다`;
        pushStep(5, 'compare',
          `(${row}, ${col}) 은 ${blocker}행의 퀸에게 ` +
          `${sameColumn ? '같은 열로' : '대각선으로'} 공격받는다 → 건너뛴다`,
          { cell, cellState: 6, a: row, b: col });
        continue;
      }

      attempts++;
      column[row] = col;
      caption = `${row}행에 퀸을 놓았다 (${col}열)`;
      pushStep(6, 'push',
        `(${row}, ${col}) 은 위쪽 어느 퀸에게도 공격받지 않는다 → 놓고 ${row + 1}행으로 내려간다`,
        { cell, cellState: 4, cellMark: QUEEN, a: row, b: col });

      if (solve(row + 1)) return true;
      if (budgetExhausted) { column[row] = -1; return false; }

      // 아래에서 실패했다 — 물러나서 다음 열을 시도한다
      column[row] = -1;
      backtracks++;
      caption = `${row}행 ${col}열에서 물러난다`;
      pushStep(8, 'pop',
        `${row + 1}행 이후에 놓을 자리가 없었다 → (${row}, ${col}) 의 퀸을 거두고 다음 열을 시도한다`,
        { cell, cellState: 5, cellMark: QUEEN, a: row, b: col });
    }

    if (row > 0) {
      caption = `${row}행에는 놓을 자리가 없다`;
      pushStep(10, 'read',
        `${row}행의 모든 열이 공격받는다 → 실패를 위로 알린다(${row - 1}행이 다시 정한다)`,
        { a: row });
    }
    return false;
  };

  solved = solve(0);

  if (!solved && budgetExhausted) {
    caption = `탐색을 중단했다 (n = ${n})`;
    pushStep(10, 'done',
      `${MAX_STEPS} 스텝까지 탐색했지만 배치를 찾지 못했다 — 여기서 끊었다`);
  } else if (!solved) {
    caption = `해답이 없다 (n = ${n})`;
    pushStep(10, 'done',
      `${n}×${n} 판에는 해답이 없다. 시도 ${attempts}번, 물러남 ${backtracks}번 만에 ` +
      `모든 경우를 소진했다 — n = 2, 3 이 그런 경우다`);
  }

  return steps;
}
