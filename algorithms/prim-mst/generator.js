// algorithms/prim-mst/generator.js — Model A 생성기(프림 최소 신장 트리).
//
// 한 정점에서 시작해 트리를 **한 정점씩 키운다**. 매 단계에서 트리와 바깥을 잇는 간선
// (경계 간선) 중 가장 싼 것을 골라, 그 반대편 정점을 트리에 넣는다.
//   key[v] = 트리와 v 를 잇는 간선 중 최소 가중치. 정점을 추가할 때마다 이웃의 key 를 낮춘다.
//   [크루스칼](kruskal)이 간선을 정렬해 훑는 "간선 중심" 이라면, 프림은 "정점 중심" 이다.
//
// 시각화(graph 슬롯 + heap 슬롯):
//   values[v]     0 바깥 · 1 경계(트리에 닿아 있음, key 유한) · 2 방금 추가 · 3 트리 안(확정)
//   nodeLabels[v] key 값(트리까지의 최소 간선 가중치)
//   edgeStates[e] 0 기본 · 1 경계 간선 검사 중 · 2 이번에 채택 · 3 MST 간선(확정)
//   heap          경계 간선 PQ(배열+정렬이라 shape:'list')

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: false, weighted: true };   // MST 는 무방향 가중 그래프

const INFINITY_LABEL = '∞';

// 크루스칼과 같은 그래프를 써서 "같은 그래프, 다른 방법" 을 비교하기 좋게 한다.
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
  edges: [
    [0, 1, 2], [0, 2, 4], [1, 2, 3], [1, 3, 3],
    [2, 4, 6], [3, 4, 5], [3, 5, 1], [4, 5, 4],
  ],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// key[v] = 트리와 v 를 잇는 간선 중 최소 가중치',
  'int prim(vector<vector<pair<int,int>>>& adj, int n) {',
  '    vector<int> key(n, INF);',
  '    vector<bool> inMST(n, false);',
  '    priority_queue<pair<int,int>, vector<pair<int,int>>,',
  '                   greater<>> pq;          // (key, 정점) 최소 힙',
  '    key[0] = 0; pq.push({0, 0});',
  '    int total = 0;',
  '    while (!pq.empty()) {',
  '        auto [k, u] = pq.top(); pq.pop();',
  '        if (inMST[u]) continue;            // 낡은 항목',
  '        inMST[u] = true; total += k;       // u 를 트리에 넣는다',
  '        for (auto [v, w] : adj[u])',
  '            if (!inMST[v] && w < key[v]) { // 더 싼 경계 간선을 찾았다',
  '                key[v] = w;',
  '                pq.push({w, v});',
  '            }',
  '    }',
  '    return total;',
  '}',
];

function buildAdjacency(graph) {
  const nodeCount = graph.nodes.length;
  const adjacency = Array.from({ length: nodeCount }, () => []);
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v] = edge;
    const weight = Number.isFinite(edge[2]) ? edge[2] : 1;
    if (!Number.isInteger(u) || !Number.isInteger(v)) return;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) return;
    adjacency[u].push({ to: v, weight, edgeIndex });
    adjacency[v].push({ to: u, weight, edgeIndex });
  });
  for (const list of adjacency) list.sort((a, b) => a.to - b.to);
  return adjacency;
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 2, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const adjacency = buildAdjacency(graph);
  const start = (Number.isInteger(graph.start) && graph.start >= 0 && graph.start < nodeCount)
    ? graph.start : 0;

  const key = new Array(nodeCount).fill(Infinity);
  const inMST = new Array(nodeCount).fill(false);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const keyEdge = new Array(nodeCount).fill(-1);    // 각 정점의 현재 key 를 준 간선

  // 우선순위 큐: 학습용이라 배열+정렬(힙과 순서가 같고 스냅샷 찍기 쉽다).
  const priorityQueue = [];
  const pushQueue = (weight, node, edgeIndex) => {
    priorityQueue.push({ weight, node, edgeIndex });
    priorityQueue.sort((a, b) => a.weight - b.weight || a.node - b.node);
  };
  const queueHeapSlot = () => ({
    values: priorityQueue.map(entry => entry.node),
    labels: priorityQueue.map(entry => `w=${entry.weight}`),
    states: priorityQueue.map((_, index) => (index === 0 ? 4 : 0)),
    shape: 'list',
    caption: priorityQueue.length
      ? `경계 간선 PQ — 가중치가 작은 순. 다음은 정점 ${priorityQueue[0].node} (간선 ${priorityQueue[0].weight})`
      : 'PQ 가 비었다',
  });
  const keyLabels = () => key.map((value, index) =>
    inMST[index] ? '✓' : (value === Infinity ? INFINITY_LABEL : String(value)));

  let total = 0, picked = 0;

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: keyLabels(),
    edgeStates: edgeState.slice(),
    heap: queueHeapSlot(),
    explain,
  });
  const steps = [];

  const clearEdgeHighlights = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1 || edgeState[index] === 2) edgeState[index] = 0;
  };

  key[start] = 0;
  nodeState[start] = 1;
  pushQueue(0, start, -1);
  pushStep(7, 'enqueue',
    `시작 정점 ${start} 하나로 트리를 시작한다. key[${start}] = 0 으로 두고 PQ 에 넣는다`,
    { a: start });

  while (priorityQueue.length) {
    const { weight, node: u, edgeIndex } = priorityQueue.shift();
    clearEdgeHighlights();

    if (inMST[u]) {
      pushStep(11, 'read',
        `PQ 에서 정점 ${u} 를 꺼냈지만 이미 트리에 있다 — 낡은 항목이라 버린다`,
        { a: u });
      continue;
    }

    // u 를 트리에 넣는다. u 를 데려온 간선이 MST 간선이 된다.
    inMST[u] = true;
    nodeState[u] = 2;
    total += weight;
    if (edgeIndex >= 0) { edgeState[edgeIndex] = 3; keyEdge[u] = edgeIndex; picked++; }
    pushStep(12, 'visit',
      edgeIndex >= 0
        ? `가장 싼 경계 간선(가중치 ${weight})으로 정점 ${u} 를 트리에 넣는다. MST 간선 확정, 누적 ${total}`
        : `정점 ${u} 로 트리를 시작한다(간선 없이). 누적 ${total}`,
      { a: u });

    // u 의 이웃을 보며 경계 간선의 key 를 낮춘다
    for (const { to: v, weight: w, edgeIndex: eIndex } of adjacency[u]) {
      if (inMST[v]) continue;
      clearEdgeHighlights();
      edgeState[eIndex] = 1;
      const relaxed = w < key[v];
      pushStep(14, 'read',
        `경계 간선 ${u}—${v}(가중치 ${w}) 검사: ` +
        `현재 key[${v}] = ${key[v] === Infinity ? INFINITY_LABEL : key[v]}`,
        { a: u, b: v });

      if (relaxed) {
        const previous = key[v] === Infinity ? INFINITY_LABEL : key[v];
        key[v] = w;
        keyEdge[v] = eIndex;
        if (nodeState[v] === 0) nodeState[v] = 1;
        edgeState[eIndex] = 2;
        pushQueue(w, v, eIndex);
        pushStep(15, 'write',
          `${w} < ${previous} — 더 싼 경계 간선을 찾았다. key[${v}] = ${w} 로 낮추고 PQ 에 넣는다`,
          { a: u, b: v });
      } else {
        edgeState[eIndex] = 0;
        pushStep(14, 'compare',
          `${w} ≥ key[${v}] = ${key[v]} — 지금이 더 싸지 않으니 그대로 둔다`,
          { a: u, b: v });
      }
    }

    clearEdgeHighlights();
    nodeState[u] = 3;
    for (let node = 0; node < nodeCount; node++)
      if (inMST[node] && keyEdge[node] >= 0) edgeState[keyEdge[node]] = 3;
    pushStep(11, 'mark', `정점 ${u} 를 트리에 확정했다 (트리 정점 ${picked + 1}개)`, { a: u });
  }

  // 남은 MST 간선을 모두 확정 색으로
  clearEdgeHighlights();
  for (let node = 0; node < nodeCount; node++)
    if (inMST[node] && keyEdge[node] >= 0) edgeState[keyEdge[node]] = 3;

  const reached = inMST.filter(Boolean).length;
  const connected = reached === nodeCount;
  pushStep(18, 'done',
    connected
      ? `완성 — 정점 ${nodeCount}개를 잇는 최소 신장 트리. 간선 ${picked}개, 가중치 합 ${total}`
      : `그래프가 연결되어 있지 않다 — ${reached}개 정점만 이었다. 신장 트리가 존재하지 않는다`);

  return steps;
}
