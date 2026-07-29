// algorithms/kruskal/generator.js — Model A 생성기(크루스칼 최소 신장 트리).
//
// 간선을 가중치 오름차순으로 훑으면서, 사이클을 만들지 않는 간선만 채택한다.
// "사이클을 만드는가"는 유니온 파인드(서로소 집합)로 O(α(n)) 에 판정한다.
//
// 시각화(graph 슬롯):
//   values[v]     0 아직 트리에 없음 · 2 지금 잇는 간선의 양 끝 · 3 트리에 포함됨
//   nodeLabels[v] 이 정점이 속한 집합의 대표(root)
//   edgeStates[e] 0 미검토 · 1 검사 중 · 2 사이클이라 버림 · 3 MST 채택

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: false, weighted: true };   // MST 는 무방향 가중 그래프

export const defaultGraph = {
  directed: false,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.12, y: 0.28 },
    { id: 1, label: '1', x: 0.40, y: 0.15 },
    { id: 2, label: '2', x: 0.38, y: 0.72 },
    { id: 3, label: '3', x: 0.66, y: 0.35 },
    { id: 4, label: '4', x: 0.64, y: 0.84 },
    { id: 5, label: '5', x: 0.90, y: 0.60 },
  ],
  // 같은 가중치(3)가 두 번 나오고, 사이클을 만드는 간선도 섞여 있다
  edges: [
    [0, 1, 2], [0, 2, 4], [1, 2, 3], [1, 3, 3],
    [2, 4, 6], [3, 4, 5], [3, 5, 1], [4, 5, 4],
  ],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int parent[MAXN];',
  '',
  'int find(int x) {                       // 경로 압축',
  '    return parent[x] == x ? x : parent[x] = find(parent[x]);',
  '}',
  'bool unite(int a, int b) {',
  '    a = find(a); b = find(b);',
  '    if (a == b) return false;           // 이미 같은 집합 = 사이클',
  '    parent[b] = a;',
  '    return true;',
  '}',
  '',
  'int kruskal(vector<Edge>& edges, int n) {',
  '    sort(edges.begin(), edges.end());   // 가중치 오름차순',
  '    for (int v = 0; v < n; v++) parent[v] = v;',
  '    int total = 0, picked = 0;',
  '    for (auto [w, u, v] : edges) {',
  '        if (unite(u, v)) {              // 사이클이 아니면 채택',
  '            total += w;',
  '            if (++picked == n - 1) break;',
  '        }',
  '    }',
  '    return total;',
  '}',
];

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);

  // 유니온 파인드 — 경로 압축만(랭크 없이도 학습용 크기에서는 충분)
  const parent = Array.from({ length: nodeCount }, (_, node) => node);
  const find = node => (parent[node] === node ? node : (parent[node] = find(parent[node])));

  const steps = [];
  const rootLabels = () => parent.map((_, node) => String(find(node)));

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: rootLabels(),
    edgeStates: edgeState.slice(),
    explain,
  });

  const clearInspection = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1) edgeState[index] = 0;
    for (let node = 0; node < nodeCount; node++)
      if (nodeState[node] === 2) nodeState[node] = 3;
  };

  // 유효한 간선만, 가중치 오름차순(동점이면 원래 순서 — 결정적이어야 한다)
  const sortedEdges = graph.edges
    .map((edge, edgeIndex) => ({
      u: edge[0], v: edge[1],
      weight: Number.isFinite(edge[2]) ? edge[2] : 1,
      edgeIndex,
    }))
    .filter(({ u, v }) =>
      Number.isInteger(u) && Number.isInteger(v) &&
      u >= 0 && v >= 0 && u < nodeCount && v < nodeCount && u !== v)
    .sort((a, b) => a.weight - b.weight || a.edgeIndex - b.edgeIndex);

  pushStep(14, 'start',
    `간선 ${sortedEdges.length}개를 가중치 오름차순으로 정렬: ` +
    sortedEdges.map(edge => `${edge.u}-${edge.v}(${edge.weight})`).join(', '));
  pushStep(15, 'set', `모든 정점을 자기 자신이 대표인 1인 집합으로 초기화한다`);

  let totalWeight = 0, pickedCount = 0;

  for (const { u, v, weight, edgeIndex } of sortedEdges) {
    clearInspection();
    edgeState[edgeIndex] = 1;
    if (nodeState[u] !== 3) nodeState[u] = 2;
    if (nodeState[v] !== 3) nodeState[v] = 2;

    const rootU = find(u), rootV = find(v);
    pushStep(17, 'read',
      `간선 ${u}-${v}(가중치 ${weight}) 검사 — find(${u})=${rootU}, find(${v})=${rootV}`,
      { a: u, b: v });

    if (rootU === rootV) {
      edgeState[edgeIndex] = 2;
      pushStep(8, 'compare',
        `대표가 같다 → 이미 연결된 두 정점이므로 이 간선을 넣으면 사이클이 생긴다. 버린다`,
        { a: u, b: v });
      continue;
    }

    parent[rootV] = rootU;
    edgeState[edgeIndex] = 3;
    nodeState[u] = 3; nodeState[v] = 3;
    totalWeight += weight;
    pickedCount++;
    pushStep(18, 'write',
      `대표가 다르다 → 채택. 두 집합을 합치고 총 가중치 ${totalWeight} (${pickedCount}/${nodeCount - 1}개)`,
      { a: u, b: v });

    if (pickedCount === nodeCount - 1) {
      pushStep(20, 'mark', `간선 ${nodeCount - 1}개를 모았다 — 신장 트리 완성이므로 나머지는 볼 필요가 없다`);
      break;
    }
  }

  clearInspection();
  const connected = pickedCount === nodeCount - 1;
  pushStep(23, 'done',
    connected
      ? `최소 신장 트리 완성 — 간선 ${pickedCount}개, 총 가중치 ${totalWeight}`
      : `그래프가 연결되어 있지 않다 — 신장 트리 대신 최소 신장 숲(간선 ${pickedCount}개, 가중치 ${totalWeight})`);

  return steps;
}
