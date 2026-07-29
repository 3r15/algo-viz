// algorithms/binary-lifting/generator.js — Model A 생성기(이진 상승 / Binary Lifting, LCA).
//
// up[k][v] = 정점 v 의 2^k 번째 조상.  핵심 점화식은 "2^k 칸 = 2^(k-1) 칸을 두 번":
//   up[k][v] = up[k-1][ up[k-1][v] ]
// 전처리 O(n log n) 후, 임의의 조상 이동과 LCA 를 O(log n) 에 답한다.
//
// 입력은 parent[] 배열이다(parent[0] = 0 = 루트, i > 0 이면 parent[i] < i 로 정규화).
// 시각화는 tree 슬롯(대상 트리) + matrix 슬롯(up 표) 두 개를 함께 쓴다.

export const category = 'tree';
export const defaultInput = [0, 0, 0, 1, 1, 2, 5, 5];
export const inputLabel = 'parent[]';
export const inputHint = 'parent[i] = 정점 i 의 부모(0번은 루트). i 보다 큰 값은 자동으로 i-1 이하로 맞춘다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int up[LOG][MAXN], depth[MAXN];      // up[k][v] = v 의 2^k 번째 조상',
  '',
  'void build(int n) {',
  '    for (int v = 0; v < n; v++)',
  '        up[0][v] = parent[v];                  // 2^0 = 1칸 위 = 부모',
  '    for (int k = 1; k < LOG; k++)',
  '        for (int v = 0; v < n; v++)',
  '            up[k][v] = up[k-1][ up[k-1][v] ];  // 2^k 칸 = 2^(k-1) 칸 두 번',
  '}',
  '',
  'int lca(int u, int v) {',
  '    if (depth[u] < depth[v]) swap(u, v);       // u 가 더 깊게',
  '    int diff = depth[u] - depth[v];',
  '    for (int k = 0; k < LOG; k++)',
  '        if (diff >> k & 1)',
  '            u = up[k][u];                      // 깊이 차의 이진 분해',
  '    if (u == v) return u;                      // v 가 u 의 조상이었던 경우',
  '    for (int k = LOG - 1; k >= 0; k--)',
  '        if (up[k][u] != up[k][v])',
  '            u = up[k][u], v = up[k][v];        // 갈라진 채로 최대한 올린다',
  '    return up[0][u];                           // 한 칸 위가 LCA',
  '}',
];

export function generate(input) {
  // ---- 입력을 유효한 루트 트리로 정규화: parent[0] = 0, 0 ≤ parent[i] ≤ i-1 ----
  const raw = (Array.isArray(input) && input.length) ? input : defaultInput;
  const n = raw.length;
  const parent = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    const given = Number.isInteger(raw[i]) ? raw[i] : 0;
    parent[i] = Math.min(Math.max(given, 0), i - 1);
  }

  if (n <= 1) {
    return [{ line: 3, op: 'done', a: -1, b: -1, sortedFrom: n, values: new Array(n).fill(0),
      explain: '정점이 1개뿐이라 올라갈 곳이 없다' }];
  }

  const depth = new Array(n).fill(0);
  for (let v = 1; v < n; v++) depth[v] = depth[parent[v]] + 1;

  const LOG = Math.floor(Math.log2(n)) + 1;                   // 2^LOG > 최대 깊이(n-1)
  const up = Array.from({ length: LOG }, () => new Array(n).fill(null));
  const cellState = Array.from({ length: LOG }, () => new Array(n).fill(0));  // 표 셀 상태
  const nodeState = new Array(n).fill(0);                                // 트리 노드 상태

  const rowLabels = Array.from({ length: LOG }, (_, k) => `k=${k}  ↑${1 << k}`);
  const colLabels = Array.from({ length: n }, (_, v) => String(v));
  const titles = Array.from({ length: n }, (_, v) => `정점 ${v} · depth ${depth[v]}`);
  let caption = 'up[k][v] = 정점 v 의 2^k 번째 조상';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: depth.slice(),
    sortedFrom: n,
    explain,
    tree: { kind: 'rooted', parent, root: 0, values: Array.from({ length: n }, (_, v) => v),
      states: nodeState.slice(), titles, marks: extra.marks },
    matrix: { rows: LOG, cols: n, values: up.flat(), states: cellState.flat(), rowLabels, colLabels, caption },
  });

  // 강조(2·3·4)를 모두 "채워짐"으로 되돌린다. 다음 스텝의 강조가 깨끗하게 시작되도록.
  const clearCells = () => {
    for (let k = 0; k < LOG; k++)
      for (let v = 0; v < n; v++) if (cellState[k][v]) cellState[k][v] = 1;
  };
  const clearNodes = () => nodeState.fill(0);

  // ---------- build: k = 0 ----------
  pushStep(3, 'start', `정점 ${n}개, 최대 깊이 ${Math.max(...depth)} → LOG = ${LOG} (2^${LOG} = ${1 << LOG} > 깊이)`);

  for (let v = 0; v < n; v++) {
    up[0][v] = parent[v];
    cellState[0][v] = 3;
    clearNodes();
    nodeState[v] = 2; nodeState[parent[v]] = 3;
    pushStep(5, 'write', `up[0][${v}] = parent[${v}] = ${parent[v]}`, { a: v, marks: { [v]: 'v' } });
    cellState[0][v] = 1;
  }

  // ---------- build: k ≥ 1 — 한 칸에 두 번의 점프를 합성 ----------
  for (let k = 1; k < LOG; k++) {
    caption = `k=${k}: 2^${k} = ${1 << k} 칸 = 2^${k - 1} 칸 두 번`;
    for (let v = 0; v < n; v++) {
      const mid = up[k - 1][v];
      up[k][v] = up[k - 1][mid];
      cellState[k - 1][v] = 2; cellState[k - 1][mid] = 2; cellState[k][v] = 3;
      clearNodes();
      nodeState[v] = 2; nodeState[mid] = 1; nodeState[up[k][v]] = 3;
      pushStep(8, 'write',
        `up[${k}][${v}] = up[${k - 1}][ up[${k - 1}][${v}] ] = up[${k - 1}][${mid}] = ${up[k][v]}   (${v} → ${mid} → ${up[k][v]})`,
        { a: v, b: mid, marks: { [v]: 'v', [mid]: `↑${1 << (k - 1)}`, [up[k][v]]: `↑${1 << k}` } });
      clearCells();
    }
  }

  // ---------- 질의할 두 정점: 거리가 가장 먼 쌍(LCA 의 두 단계가 모두 보이도록) ----------
  // 아래 두 헬퍼는 시각화용이 아니라 "어느 쌍을 보여줄지" 고르기 위한 조용한 계산이다.
  const ancestorOf = (node, stepsUp) => {
    for (let k = 0; k < LOG; k++) if (stepsUp >> k & 1) node = up[k][node];
    return node;
  };
  const lcaOf = (x, y) => {
    if (depth[x] < depth[y]) [x, y] = [y, x];
    x = ancestorOf(x, depth[x] - depth[y]);
    if (x === y) return x;
    for (let k = LOG - 1; k >= 0; k--) if (up[k][x] !== up[k][y]) { x = up[k][x]; y = up[k][y]; }
    return up[0][x];
  };

  let queryU = 0, queryV = n - 1, bestDistance = -1;
  for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
    const distance = depth[x] + depth[y] - 2 * depth[lcaOf(x, y)];
    if (distance > bestDistance) { bestDistance = distance; queryU = x; queryV = y; }
  }

  // ---------- lca(u, v) — u, v 는 표시 코드와 같은 이름을 쓴다 ----------
  let u = queryU, v = queryV;
  caption = `LCA(${u}, ${v}) 질의 중`;
  clearCells(); clearNodes();
  nodeState[u] = 2; nodeState[v] = 2;
  pushStep(11, 'start', `LCA(${u}, ${v}) — depth[${u}] = ${depth[u]}, depth[${v}] = ${depth[v]}`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  if (depth[u] < depth[v]) {
    [u, v] = [v, u];
    pushStep(12, 'set', `u 가 더 깊도록 교환 → u = ${u}, v = ${v}`, { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
  }

  const diff = depth[u] - depth[v];
  pushStep(13, 'set',
    `깊이 차 = ${diff} = 2진수 ${diff.toString(2)} — 1인 비트마다 그 크기만큼 한 번에 올린다`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  // 1단계: 깊이 맞추기 (diff 의 이진 분해)
  for (let k = 0; k < LOG; k++) {
    if (!(diff >> k & 1)) continue;
    const liftedU = up[k][u];
    clearCells(); clearNodes();
    cellState[k][u] = 2;
    nodeState[u] = 1; nodeState[liftedU] = 2; nodeState[v] = 2;
    pushStep(16, 'read',
      `diff 의 ${k}번 비트가 1 → u 를 2^${k} = ${1 << k} 칸 위로: ${u} → ${liftedU}`,
      { a: u, b: liftedU, marks: { [u]: 'u', [liftedU]: `u+${1 << k}`, [v]: 'v' } });
    u = liftedU;
  }

  clearCells(); clearNodes();
  nodeState[u] = 2; nodeState[v] = 2;
  pushStep(17, 'read',
    u === v ? `u == v == ${u} — 한쪽이 다른 쪽의 조상이었다. 여기가 LCA` : `u = ${u}, v = ${v} — 깊이는 같지만 아직 다른 정점이다`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  if (u !== v) {
    // 2단계: "갈라진 상태를 유지하며" 큰 점프부터 시도 → 마지막에 부모가 LCA
    for (let k = LOG - 1; k >= 0; k--) {
      const upU = up[k][u], upV = up[k][v];
      clearCells(); clearNodes();
      cellState[k][u] = 2; cellState[k][v] = 2;
      nodeState[u] = 2; nodeState[v] = 2; nodeState[upU] = 1; nodeState[upV] = 1;
      if (upU !== upV) {
        pushStep(19, 'read',
          `up[${k}][${u}] = ${upU} ≠ up[${k}][${v}] = ${upV} → 아직 LCA 아래다. 둘 다 2^${k} 칸 올린다`,
          { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
        u = upU; v = upV;
        clearNodes();
        nodeState[u] = 2; nodeState[v] = 2;
        pushStep(20, 'set', `u = ${u}, v = ${v}`, { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
      } else {
        pushStep(19, 'read',
          `up[${k}][${u}] = up[${k}][${v}] = ${upU} → 같다. 여기서 올리면 LCA 를 지나친다. 건너뜀`,
          { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
      }
    }
  }

  const lcaResult = u === v ? u : up[0][u];
  clearCells(); clearNodes();
  if (u !== v) cellState[0][u] = 4;
  nodeState[lcaResult] = 3;
  caption = `LCA(${queryU}, ${queryV}) = ${lcaResult}`;
  pushStep(u === v ? 17 : 21, 'done',
    u === v ? `LCA(${queryU}, ${queryV}) = ${lcaResult}` : `u = ${u}, v = ${v} 가 LCA 바로 아래에서 멈췄다 → LCA = up[0][${u}] = ${lcaResult}`,
    { a: lcaResult, b: -1, marks: { [lcaResult]: 'LCA' } });

  return steps;
}
