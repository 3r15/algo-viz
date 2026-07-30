// algorithms/union-find/generator.js — Model A 생성기(유니온 파인드 / 서로소 집합, DSU).
//
// n 개의 원소를 서로소 집합들로 관리한다. 두 연산뿐이다:
//   find(x)  — x 가 속한 집합의 대표(뿌리)를 찾는다. 길을 따라 올라가며 **경로 압축**으로
//              지나온 노드를 뿌리에 직접 매단다 → 다음 find 가 빨라진다.
//   unite(a,b) — 두 집합을 합친다. **작은 나무를 큰 나무에 붙여**(union by size) 높이를 낮게 유지.
//   두 최적화를 함께 쓰면 연산당 상각 O(α(n)) — 사실상 상수.
//
// 입력은 정수 배열을 **쌍으로** 읽어 unite(a,b) 를 차례로 수행한다(예: 0 1 2 3 → unite(0,1), unite(2,3)).
// 시각화: tree 슬롯(서로소 집합 숲) + matrix 슬롯(parent[] · sz[] 표).

export const category = 'tree';
export const defaultInput = [0, 1, 2, 3, 4, 5, 1, 2, 0, 3, 5, 6];
export const inputLabel = 'unite 쌍';
export const inputHint = '정수를 둘씩 묶어 unite(a,b) 를 수행한다. 값은 원소 번호(0부터). 예: 0 1 2 3 → unite(0,1), unite(2,3).';

const MAX_N = 12;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const n = 5 + Math.floor(Math.random() * 3);           // 5..7 개 원소
  const pairCount = 4 + Math.floor(Math.random() * 3);   // 4..6 쌍
  const out = [];
  for (let k = 0; k < pairCount; k++) {
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    if (b === a) b = (b + 1) % n;
    out.push(a, b);
  }
  return out;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int parent[MAXN], sz[MAXN];',
  'void init(int n) {',
  '    for (int i = 0; i < n; i++) parent[i] = i, sz[i] = 1;   // 각자 자기 집합',
  '}',
  'int find(int x) {',
  '    if (parent[x] == x) return x;             // 뿌리를 찾았다',
  '    return parent[x] = find(parent[x]);       // 경로 압축: 뿌리에 직접 매단다',
  '}',
  'void unite(int a, int b) {',
  '    a = find(a); b = find(b);                 // 각자의 뿌리',
  '    if (a == b) return;                       // 이미 같은 집합',
  '    if (sz[a] < sz[b]) swap(a, b);            // 큰 나무에 붙인다(랭크)',
  '    parent[b] = a;                            // b 의 뿌리를 a 아래로',
  '    sz[a] += sz[b];                           // 크기 합치기',
  '}',
];

export function generate(input) {
  const raw = (Array.isArray(input) && input.length >= 2) ? input : defaultInput;
  const nums = raw.map(x => Math.abs(Math.trunc(Number(x) || 0)));
  const n = Math.min(MAX_N, Math.max(2, Math.max(...nums) + 1));

  // 쌍으로 묶어 unite 연산 목록을 만든다(범위를 벗어난 값은 n 으로 접는다).
  const ops = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const a = nums[i] % n, b = nums[i + 1] % n;
    ops.push([a, b]);
  }

  const parent = Array.from({ length: n }, (_, i) => i);
  const sz = new Array(n).fill(1);
  const nodeState = new Array(n).fill(0);

  const rootsNow = () => parent.map((p, i) => (p === i ? i : -1)).filter(i => i >= 0);
  const colLabels = Array.from({ length: n }, (_, i) => String(i));
  const titles = () => Array.from({ length: n }, (_, i) => `원소 ${i} · 크기 ${sz[i]}`);
  let caption = 'parent[i] = i 의 부모 · sz[i] = 뿌리 i 가 이끄는 집합 크기';

  // matrix: 2행(parent, sz). 셀 상태 0 기본 · 2 활성 · 3 방금 바뀜.
  const cellState = new Array(2 * n).fill(0);
  const clearCells = () => { for (let i = 0; i < cellState.length; i++) if (cellState[i]) cellState[i] = 0; };
  const clearNodes = () => nodeState.fill(0);

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: parent.slice(),
    sortedFrom: n,
    explain,
    tree: {
      kind: 'rooted', parent: parent.slice(), roots: rootsNow(),
      values: Array.from({ length: n }, (_, i) => i),
      states: nodeState.slice(), titles: titles(), marks: extra.marks,
    },
    matrix: {
      rows: 2, cols: n,
      values: [...parent, ...sz],
      states: cellState.slice(),
      rowLabels: ['parent', 'sz'],
      colLabels, caption,
    },
  });

  // ── init: 모두 자기 자신이 뿌리인 n 개의 홀로 집합 ──
  pushStep(3, 'start',
    `원소 ${n}개를 각자 홀로 있는 집합으로 시작한다 — parent[i] = i, sz[i] = 1. ` +
    `이제 쌍마다 unite 로 합쳐 나간다`);

  // find: x 에서 뿌리까지의 경로를 반환(압축은 아직 안 함)
  const pathToRoot = (x) => {
    const path = [x];
    while (parent[path[path.length - 1]] !== path[path.length - 1])
      path.push(parent[path[path.length - 1]]);
    return path;                       // 마지막 원소가 뿌리
  };

  // 시각화가 곁들여진 find. 경로를 보여 주고, 압축을 한 스텝으로 적용한다.
  const findViz = (x, who) => {
    const path = pathToRoot(x);
    const root = path[path.length - 1];

    clearNodes(); clearCells();
    for (const nodeId of path) nodeState[nodeId] = 1;
    nodeState[x] = 2; nodeState[root] = 3;
    for (const nodeId of path) cellState[nodeId] = 2;   // parent 행
    if (path.length === 1) {
      pushStep(6, 'read', `find(${x}) — ${x} 는 parent[${x}] = ${x}, 이미 뿌리다`,
        { a: x, marks: { [x]: who, [root]: '뿌리' } });
      return root;
    }
    pushStep(6, 'read',
      `find(${x}) — 뿌리까지 경로: ${path.join(' → ')} (뿌리 ${root})`,
      { a: x, b: root, marks: { [x]: who, [root]: '뿌리' } });

    // 경로 압축: 경로 위 모든 노드(뿌리 제외)를 뿌리에 직접 매단다
    let compressed = false;
    for (const nodeId of path) {
      if (nodeId !== root && parent[nodeId] !== root) { parent[nodeId] = root; compressed = true; }
    }
    if (compressed) {
      clearNodes(); clearCells();
      for (const nodeId of path) { nodeState[nodeId] = 1; cellState[nodeId] = 3; }
      nodeState[root] = 3;
      pushStep(7, 'write',
        `경로 압축 — 경로의 노드들을 뿌리 ${root} 에 직접 매단다. 다음 find 가 한 걸음이 된다`,
        { a: x, b: root, marks: { [root]: '뿌리' } });
    }
    return root;
  };

  // ── unite 연산들 ──
  for (const [a0, b0] of ops) {
    clearNodes(); clearCells();
    nodeState[a0] = 2; nodeState[b0] = 2;
    pushStep(9, 'start', `unite(${a0}, ${b0}) — 두 원소가 속한 집합을 합친다`,
      { a: a0, b: b0, marks: { [a0]: 'a', [b0]: 'b' } });

    const ra = findViz(a0, 'a');
    const rb = findViz(b0, 'b');

    if (ra === rb) {
      clearNodes(); clearCells();
      nodeState[ra] = 3;
      pushStep(11, 'compare',
        `두 뿌리가 ${ra} 로 같다 → 이미 한 집합이다. 아무것도 하지 않는다`,
        { a: ra, marks: { [ra]: '뿌리' } });
      continue;
    }

    // union by size: 큰 나무(a)에 작은 나무(b)를 붙인다
    let a = ra, b = rb;
    if (sz[a] < sz[b]) {
      [a, b] = [b, a];
      clearNodes(); clearCells();
      nodeState[a] = 2; nodeState[b] = 2;
      cellState[n + a] = 2; cellState[n + b] = 2;   // sz 행 비교
      pushStep(12, 'set',
        `sz[${ra}]=${sz[ra]} < sz[${rb}]=${sz[rb]} → 큰 쪽 ${a} 를 뿌리로 삼는다`,
        { a, b, marks: { [a]: '큰뿌리', [b]: '작은뿌리' } });
    }

    parent[b] = a;
    clearNodes(); clearCells();
    nodeState[a] = 3; nodeState[b] = 1;
    cellState[b] = 3;                                // parent[b] 바뀜
    pushStep(13, 'write',
      `parent[${b}] = ${a} — 작은 나무 ${b} 를 큰 나무 ${a} 아래에 붙인다`,
      { a, b, marks: { [a]: '뿌리', [b]: 'a' } });

    sz[a] += sz[b];
    clearCells();
    cellState[n + a] = 3;                            // sz[a] 갱신
    nodeState[a] = 3;
    pushStep(14, 'write',
      `sz[${a}] += sz[${b}] = ${sz[a]} — 합친 집합의 크기`,
      { a, marks: { [a]: '뿌리' } });
  }

  // ── 마무리: 집합들을 요약 ──
  const groups = {};
  for (let i = 0; i < n; i++) {
    const r = pathToRoot(i)[pathToRoot(i).length - 1];
    (groups[r] ??= []).push(i);
  }
  const groupText = Object.values(groups).map(g => `{${g.join(',')}}`).join(', ');
  clearNodes(); clearCells();
  for (const r of rootsNow()) nodeState[r] = 3;
  caption = `서로소 집합 ${Object.keys(groups).length}개`;
  pushStep(9, 'done',
    `완성 — 서로소 집합 ${Object.keys(groups).length}개: ${groupText}. ` +
    `경로 압축 + 크기 합치기로 연산당 상각 O(α(n))`);

  return steps;
}
