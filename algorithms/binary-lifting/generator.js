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
    const p = Number.isInteger(raw[i]) ? raw[i] : 0;
    parent[i] = Math.min(Math.max(p, 0), i - 1);
  }

  if (n <= 1) {
    return [{ line: 3, op: 'done', a: -1, b: -1, sortedFrom: n, values: new Array(n).fill(0),
      explain: '정점이 1개뿐이라 올라갈 곳이 없다' }];
  }

  const depth = new Array(n).fill(0);
  for (let v = 1; v < n; v++) depth[v] = depth[parent[v]] + 1;

  const LOG = Math.floor(Math.log2(n)) + 1;                   // 2^LOG > 최대 깊이(n-1)
  const up = Array.from({ length: LOG }, () => new Array(n).fill(null));
  const cell = Array.from({ length: LOG }, () => new Array(n).fill(0));  // 표 셀 상태
  const node = new Array(n).fill(0);                                     // 트리 노드 상태

  const rowLabels = Array.from({ length: LOG }, (_, k) => `k=${k}  ↑${1 << k}`);
  const colLabels = Array.from({ length: n }, (_, v) => String(v));
  const titles = Array.from({ length: n }, (_, v) => `정점 ${v} · depth ${depth[v]}`);
  let caption = 'up[k][v] = 정점 v 의 2^k 번째 조상';

  const steps = [];
  const push = (line, op, explain, ex = {}) => steps.push({
    line, op,
    a: ex.a ?? -1, b: ex.b ?? -1,
    values: depth.slice(),
    sortedFrom: n,
    explain,
    tree: { kind: 'rooted', parent, root: 0, values: Array.from({ length: n }, (_, v) => v),
      states: node.slice(), titles, marks: ex.marks },
    matrix: { rows: LOG, cols: n, values: up.flat(), states: cell.flat(), rowLabels, colLabels, caption },
  });

  const clearCells = () => { for (let k = 0; k < LOG; k++) for (let v = 0; v < n; v++) if (cell[k][v]) cell[k][v] = 1; };
  const clearNodes = () => node.fill(0);

  // ---------- build: k = 0 ----------
  push(3, 'start', `정점 ${n}개, 최대 깊이 ${Math.max(...depth)} → LOG = ${LOG} (2^${LOG} = ${1 << LOG} > 깊이)`);

  for (let v = 0; v < n; v++) {
    up[0][v] = parent[v];
    cell[0][v] = 3;
    clearNodes();
    node[v] = 2; node[parent[v]] = 3;
    push(5, 'write', `up[0][${v}] = parent[${v}] = ${parent[v]}`, { a: v, marks: { [v]: 'v' } });
    cell[0][v] = 1;
  }

  // ---------- build: k ≥ 1 — 한 칸에 두 번의 점프를 합성 ----------
  for (let k = 1; k < LOG; k++) {
    caption = `k=${k}: 2^${k} = ${1 << k} 칸 = 2^${k - 1} 칸 두 번`;
    for (let v = 0; v < n; v++) {
      const mid = up[k - 1][v];
      up[k][v] = up[k - 1][mid];
      cell[k - 1][v] = 2; cell[k - 1][mid] = 2; cell[k][v] = 3;
      clearNodes();
      node[v] = 2; node[mid] = 1; node[up[k][v]] = 3;
      push(8, 'write',
        `up[${k}][${v}] = up[${k - 1}][ up[${k - 1}][${v}] ] = up[${k - 1}][${mid}] = ${up[k][v]}   (${v} → ${mid} → ${up[k][v]})`,
        { a: v, b: mid, marks: { [v]: 'v', [mid]: `↑${1 << (k - 1)}`, [up[k][v]]: `↑${1 << k}` } });
      clearCells();
    }
  }

  // ---------- 질의할 두 정점: 거리가 가장 먼 쌍(두 단계 모두 보이게) ----------
  const anc = (x, steps2) => { for (let k = 0; k < LOG; k++) if (steps2 >> k & 1) x = up[k][x]; return x; };
  const lcaOf = (x, y) => {
    if (depth[x] < depth[y]) [x, y] = [y, x];
    x = anc(x, depth[x] - depth[y]);
    if (x === y) return x;
    for (let k = LOG - 1; k >= 0; k--) if (up[k][x] !== up[k][y]) { x = up[k][x]; y = up[k][y]; }
    return up[0][x];
  };
  let qu = 0, qv = n - 1, best = -1;
  for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
    const d = depth[x] + depth[y] - 2 * depth[lcaOf(x, y)];
    if (d > best) { best = d; qu = x; qv = y; }
  }

  // ---------- lca(u, v) ----------
  let u = qu, v = qv;
  caption = `LCA(${u}, ${v}) 질의 중`;
  clearCells(); clearNodes();
  node[u] = 2; node[v] = 2;
  push(11, 'start', `LCA(${u}, ${v}) — depth[${u}] = ${depth[u]}, depth[${v}] = ${depth[v]}`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  if (depth[u] < depth[v]) {
    [u, v] = [v, u];
    push(12, 'set', `u 가 더 깊도록 교환 → u = ${u}, v = ${v}`, { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
  }

  const diff = depth[u] - depth[v];
  push(13, 'set',
    `깊이 차 = ${diff} = 2진수 ${diff.toString(2)} — 1인 비트마다 그 크기만큼 한 번에 올린다`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  // 1단계: 깊이 맞추기 (diff 의 이진 분해)
  for (let k = 0; k < LOG; k++) {
    if (!(diff >> k & 1)) continue;
    const nu = up[k][u];
    clearCells(); clearNodes();
    cell[k][u] = 2;
    node[u] = 1; node[nu] = 2; node[v] = 2;
    push(16, 'read',
      `diff 의 ${k}번 비트가 1 → u 를 2^${k} = ${1 << k} 칸 위로: ${u} → ${nu}`,
      { a: u, b: nu, marks: { [u]: 'u', [nu]: `u+${1 << k}`, [v]: 'v' } });
    u = nu;
  }

  clearCells(); clearNodes();
  node[u] = 2; node[v] = 2;
  push(17, 'read',
    u === v ? `u == v == ${u} — 한쪽이 다른 쪽의 조상이었다. 여기가 LCA` : `u = ${u}, v = ${v} — 깊이는 같지만 아직 다른 정점이다`,
    { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });

  if (u !== v) {
    // 2단계: "갈라진 상태를 유지하며" 큰 점프부터 시도 → 마지막에 부모가 LCA
    for (let k = LOG - 1; k >= 0; k--) {
      const au = up[k][u], av = up[k][v];
      clearCells(); clearNodes();
      cell[k][u] = 2; cell[k][v] = 2;
      node[u] = 2; node[v] = 2; node[au] = 1; node[av] = 1;
      if (au !== av) {
        push(19, 'read',
          `up[${k}][${u}] = ${au} ≠ up[${k}][${v}] = ${av} → 아직 LCA 아래다. 둘 다 2^${k} 칸 올린다`,
          { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
        u = au; v = av;
        clearNodes();
        node[u] = 2; node[v] = 2;
        push(20, 'set', `u = ${u}, v = ${v}`, { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
      } else {
        push(19, 'read',
          `up[${k}][${u}] = up[${k}][${v}] = ${au} → 같다. 여기서 올리면 LCA 를 지나친다. 건너뜀`,
          { a: u, b: v, marks: { [u]: 'u', [v]: 'v' } });
      }
    }
  }

  const ans = u === v ? u : up[0][u];
  clearCells(); clearNodes();
  if (u !== v) cell[0][u] = 4;
  node[ans] = 3;
  caption = `LCA(${qu}, ${qv}) = ${ans}`;
  push(u === v ? 17 : 21, 'done',
    u === v ? `LCA(${qu}, ${qv}) = ${ans}` : `u = ${u}, v = ${v} 가 LCA 바로 아래에서 멈췄다 → LCA = up[0][${u}] = ${ans}`,
    { a: ans, b: -1, marks: { [ans]: 'LCA' } });

  return steps;
}
