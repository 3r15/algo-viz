// algorithms/knights-tour/generator.js — Model A 생성기(나이트 여행, 백트래킹 + 바른스도르프).
//
// 나이트(체스의 말)가 모든 칸을 정확히 한 번씩 밟는 경로를 찾는다.
//   순수 백트래킹은 n=6 만 되어도 탐색이 폭발한다(경로 수가 천문학적).
//   그래서 후보를 훑는 **순서**에 규칙을 준다 — 바른스도르프(Warnsdorff) 규칙:
//     "다음에 갈 곳이 가장 적은 칸부터 간다."
//   구석처럼 출입구가 적은 칸을 나중으로 미루면 그 칸이 고립되므로, 먼저 처리하는 것이다.
//   이건 **휴리스틱**이라 항상 성공을 보장하지 않는다 — 그래서 백트래킹을 그대로 남겨 둔다.
//
// 입력은 판 크기 n 하나(정수). 시작은 항상 (0, 0).
//
// 시각화: board 슬롯. labels 에 방문 순서, marks 에 지금 위치, path 로 이동 경로 선.
//   칸 상태 0 안 밟음 · 1 다음 후보 · 3 이미 밟음 · 4 지금 위치 · 5 방금 물러남
//   (상태 2 '공격받음/못 씀' 은 N-퀸의 뜻이라 여기서는 쓰지 않는다)

export const category = 'backtracking';
export const defaultInput = [5];
export const inputLabel = 'n (판 크기)';
export const inputHint = 'n×n 판에서 (0,0) 에서 출발해 모든 칸을 한 번씩 밟는다. 5~6 을 권한다.';

const MIN_SIZE = 1, MAX_SIZE = 7;
// 해답이 없는 판(n = 2, 3, 4)은 "없음" 을 증명하려면 전수 탐색이라 스텝이 폭발한다.
// 스크러버로 감당할 수 있는 선에서 끊고, 끊었다는 사실을 스텝에 명시한다.
const MAX_STEPS = 1200;
const KNIGHT = '♞';

// 나이트의 8가지 이동. 순서를 고정해 두어야 generate 가 순수 함수로 남는다.
const MOVE_ROW = [-2, -2, -1, -1, 1, 1, 2, 2];
const MOVE_COL = [-1, 1, -2, 2, -2, 2, -1, 1];

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  return [5 + Math.floor(Math.random() * 2)];      // 5..6
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 나이트가 모든 칸을 정확히 한 번씩 밟는 경로를 찾는다',
  'int dr[8] = {-2,-2,-1,-1, 1, 1, 2, 2};',
  'int dc[8] = {-1, 1,-2, 2,-2, 2,-1, 1};',
  '',
  'bool tour(int r, int c, int step, int total) {',
  '    order[r][c] = step;                     // 이 칸의 방문 순서를 적는다',
  '    if (step == total) return true;         // 모든 칸을 밟았다',
  '    for (int k : movesByDegree(r, c)) {     // 갈 곳이 적은 쪽부터 (바른스도르프)',
  '        int nr = r + dr[k], nc = c + dc[k];',
  '        if (!inside(nr, nc) || order[nr][nc]) continue;',
  '        if (tour(nr, nc, step + 1, total)) return true;',
  '    }',
  '    order[r][c] = 0;                        // 물러난다 (백트래킹)',
  '    return false;',
  '}',
  '',
  '// 그 칸에서 더 갈 수 있는 칸의 수. 적을수록 먼저 간다 —',
  '// 출입구가 적은 칸을 미루면 고립되기 때문이다',
  'int degree(int r, int c) {',
  '    int count = 0;',
  '    for (int k = 0; k < 8; k++) {',
  '        int nr = r + dr[k], nc = c + dc[k];',
  '        if (inside(nr, nc) && !order[nr][nc]) count++;',
  '    }',
  '    return count;',
  '}',
];

export function generate(input) {
  const requested = (Array.isArray(input) && input.length) ? Math.trunc(input[0]) : defaultInput[0];
  const n = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number.isFinite(requested) ? requested : 5));
  const total = n * n;

  const order = new Array(total).fill(0);      // order[cell] = 방문 순서(1부터). 0 = 안 밟음
  const pathCells = [];                        // 지금까지의 경로(칸 인덱스 순서대로)
  const steps = [];
  let caption = '';
  let moves = 0, backtracks = 0;

  const inside = (row, col) => row >= 0 && row < n && col >= 0 && col < n;

  // 그 칸에서 아직 안 밟은 칸으로 갈 수 있는 가짓수
  const degreeOf = (row, col) => {
    let count = 0;
    for (let k = 0; k < 8; k++) {
      const nextRow = row + MOVE_ROW[k], nextCol = col + MOVE_COL[k];
      if (inside(nextRow, nextCol) && !order[nextRow * n + nextCol]) count++;
    }
    return count;
  };

  // 바른스도르프 순서: degree 오름차순, 같으면 이동 번호순(결정적으로 만들기 위해)
  const movesByDegree = (row, col) => {
    const candidates = [];
    for (let k = 0; k < 8; k++) {
      const nextRow = row + MOVE_ROW[k], nextCol = col + MOVE_COL[k];
      if (!inside(nextRow, nextCol) || order[nextRow * n + nextCol]) continue;
      candidates.push({ k, cell: nextRow * n + nextCol, degree: degreeOf(nextRow, nextCol) });
    }
    return candidates.sort((left, right) => left.degree - right.degree || left.k - right.k);
  };

  const pushStep = (line, op, explain, extra = {}) => {
    const states = new Array(total).fill(0);
    const marks = new Array(total).fill('');
    const labels = new Array(total).fill('');

    for (let cell = 0; cell < total; cell++)
      if (order[cell]) { states[cell] = 3; labels[cell] = String(order[cell]); }

    if (extra.candidates) for (const cell of extra.candidates) states[cell] = 1;
    if (extra.cell != null) {
      states[extra.cell] = extra.cellState;
      marks[extra.cell] = KNIGHT;
    }

    steps.push({
      line, op,
      a: extra.a ?? -1, b: extra.b ?? -1,
      values: [],                              // 배열 자료구조가 없다 — 판이 전부다
      sortedFrom: 0,
      board: { rows: n, cols: n, states, marks, labels, path: pathCells.slice(), caption },
      explain,
    });
  };

  if (total === 1) {
    order[0] = 1; pathCells.push(0);
    caption = '1×1 판 — 출발점이 곧 전부다';
    pushStep(7, 'done', '칸이 하나뿐이라 출발하는 것으로 끝난다');
    return steps;
  }

  caption = `${n}×${n} 판 — (0, 0) 에서 출발한다`;
  pushStep(5, 'start',
    `${n}×${n} = ${total} 칸을 모두 한 번씩 밟아야 한다. ` +
    `나이트는 한 번에 "2칸 + 직각으로 1칸" 을 뛴다`);

  let budgetExhausted = false;

  const visit = (row, col, step) => {
    if (steps.length >= MAX_STEPS) { budgetExhausted = true; return false; }
    const cell = row * n + col;
    order[cell] = step;
    pathCells.push(cell);
    moves++;

    if (step === total) {
      caption = `완성 — ${total} 칸을 모두 밟았다`;
      pushStep(7, 'done',
        `${total} 칸을 전부 한 번씩 밟았다. 이동 ${moves}번, 물러남 ${backtracks}번 ` +
        `— 바른스도르프 순서 덕에 거의 물러나지 않았다`,
        { cell, cellState: 4 });
      return true;
    }

    const candidates = movesByDegree(row, col);
    caption = `${step}번째 칸 (${row}, ${col}) — 후보 ${candidates.length}곳`;
    pushStep(8, 'read',
      `(${row}, ${col}) 에 ${step} 번째로 도착. 갈 수 있는 곳은 ${candidates.length}곳이고, ` +
      (candidates.length
        ? `그중 출입구가 가장 적은 곳(${candidates[0].degree}곳)부터 시도한다`
        : '갈 곳이 없다'),
      { cell, cellState: 4, candidates: candidates.map(candidate => candidate.cell), a: step });

    for (const candidate of candidates) {
      const nextRow = row + MOVE_ROW[candidate.k], nextCol = col + MOVE_COL[candidate.k];
      if (order[candidate.cell]) continue;      // 다른 분기에서 이미 밟았을 수 있다
      if (visit(nextRow, nextCol, step + 1)) return true;
      if (budgetExhausted) { order[cell] = 0; pathCells.pop(); return false; }
    }

    // 여기서 막혔다 — 순서를 지우고 물러난다
    order[cell] = 0;
    pathCells.pop();
    backtracks++;
    caption = `(${row}, ${col}) 에서 막혔다 — 물러난다`;
    pushStep(13, 'pop',
      `(${row}, ${col}) 에서 더 나아갈 수 없었다 → ${step} 번째 방문을 취소하고 이전 칸으로 돌아간다`,
      { cell, cellState: 5, a: step });
    return false;
  };

  const solved = visit(0, 0, 1);

  if (!solved && budgetExhausted) {
    caption = `탐색을 중단했다 (${n}×${n})`;
    pushStep(14, 'done',
      `${MAX_STEPS} 스텝까지 탐색했지만 경로를 찾지 못했다 — 여기서 끊었다. ` +
      `${n}×${n} 은 해답이 없을 가능성이 높고(n = 2, 3, 4 가 그렇다), ` +
      `"없음" 을 확인하려면 모든 경우를 봐야 해서 스텝이 폭발한다`);
  } else if (!solved) {
    caption = `해답이 없다 (${n}×${n})`;
    pushStep(14, 'done',
      `${n}×${n} 판에서 (0, 0) 출발로는 모든 칸을 밟을 수 없다. ` +
      `이동 ${moves}번, 물러남 ${backtracks}번 만에 모든 경우를 소진했다 — n = 2, 3, 4 가 그런 경우다`);
  }

  return steps;
}
