// algorithms/topological-sort/generator.js — Model A 생성기(위상 정렬, 칸 알고리즘).
//
// 방향 비순환 그래프(DAG)의 정점을 "모든 간선이 왼쪽에서 오른쪽으로 향하도록" 줄 세운다.
// 칸(Kahn) 알고리즘은 진입 차수가 0 인 정점 — 즉 선행 조건이 남지 않은 정점 — 을
// 큐에서 꺼내며 순서를 만든다. 다 꺼내지 못하면 그래프에 사이클이 있다는 뜻이다.
//
// 시각화(graph 슬롯):
//   values[v]     0 대기(진입 차수 남음) · 1 큐에 있음(차수 0) · 2 처리 중 · 3 순서 확정
//   nodeLabels[v] 남은 진입 차수 → 확정되면 "#순번"
//   edgeStates[e] 0 기본 · 1 차수를 줄이는 중 · 3 순서에 기여한 간선
//   queue         큐 스냅샷

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: false };   // 방향이 없으면 정의되지 않는다

export const defaultGraph = {
  directed: true,
  weighted: false,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.10, y: 0.50 },
    { id: 1, label: '1', x: 0.34, y: 0.22 },
    { id: 2, label: '2', x: 0.34, y: 0.78 },
    { id: 3, label: '3', x: 0.60, y: 0.28 },
    { id: 4, label: '4', x: 0.60, y: 0.76 },
    { id: 5, label: '5', x: 0.88, y: 0.50 },
  ],
  // 선수 과목 그래프처럼 읽으면 된다: 0 을 들어야 1, 2 를 들을 수 있다
  edges: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [4, 5]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'vector<int> topoSort(vector<vector<int>>& adj, int n) {',
  '    vector<int> indeg(n, 0), order;',
  '    for (int u = 0; u < n; u++)',
  '        for (int v : adj[u]) indeg[v]++;',
  '    queue<int> q;',
  '    for (int v = 0; v < n; v++)',
  '        if (indeg[v] == 0) q.push(v);       // 선행 조건이 없는 정점',
  '    while (!q.empty()) {',
  '        int u = q.front(); q.pop();',
  '        order.push_back(u);',
  '        for (int v : adj[u])',
  '            if (--indeg[v] == 0) q.push(v); // 마지막 선행 조건이 사라짐',
  '    }',
  '    if (order.size() < n) return {};        // 남았다면 사이클이 있다',
  '    return order;',
  '}',
];

// 방향 간선만 의미가 있다. 무방향 그래프가 들어오면 양방향으로 보아
// (거의 항상) 사이클이 되고, 알고리즘이 그 사실을 알려 준다.
function buildAdjacency(graph) {
  const nodeCount = graph.nodes.length;
  const adjacency = Array.from({ length: nodeCount }, () => []);
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v] = edge;
    if (!Number.isInteger(u) || !Number.isInteger(v)) return;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) return;
    adjacency[u].push({ to: v, edgeIndex });
    if (!graph.directed) adjacency[v].push({ to: u, edgeIndex });
  });
  for (const list of adjacency) list.sort((a, b) => a.to - b.to);
  return adjacency;
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const adjacency = buildAdjacency(graph);
  const inDegree = new Array(nodeCount).fill(0);
  for (const list of adjacency) for (const { to } of list) inDegree[to]++;

  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const orderIndex = new Array(nodeCount).fill(-1);
  const queue = [];
  const order = [];

  const steps = [];
  const labels = () => inDegree.map((degree, node) =>
    orderIndex[node] >= 0 ? `#${orderIndex[node]}` : String(degree));

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: labels(),
    edgeStates: edgeState.slice(),
    queue: queue.slice(),
    explain,
  });

  const clearInspection = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1) edgeState[index] = 0;
  };

  pushStep(4, 'set',
    `진입 차수를 센다 — ${inDegree.map((degree, node) => `${node}:${degree}`).join(', ')}`);

  for (let node = 0; node < nodeCount; node++) {
    if (inDegree[node] === 0) {
      queue.push(node);
      nodeState[node] = 1;
    }
  }
  pushStep(7, 'enqueue',
    queue.length
      ? `진입 차수가 0 인 정점 [${queue.join(', ')}] 을 큐에 넣는다 — 선행 조건이 없어 지금 당장 처리할 수 있다`
      : `진입 차수가 0 인 정점이 하나도 없다 — 그래프 전체가 사이클에 묶여 있다`);

  while (queue.length) {
    const current = queue.shift();
    clearInspection();
    nodeState[current] = 2;
    orderIndex[current] = order.length;
    order.push(current);
    pushStep(10, 'dequeue',
      `${current} 을 꺼내 순서 ${orderIndex[current]}번에 놓는다 → 지금까지 [${order.join(', ')}]`,
      { a: current });

    for (const { to: neighbor, edgeIndex } of adjacency[current]) {
      clearInspection();
      edgeState[edgeIndex] = 1;
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
        nodeState[neighbor] = 1;
        edgeState[edgeIndex] = 3;
        pushStep(12, 'write',
          `${current}→${neighbor}: 진입 차수 0 이 되었다 — ${neighbor} 의 선행 조건이 모두 끝났으므로 큐에 넣는다`,
          { a: current, b: neighbor });
      } else {
        pushStep(12, 'read',
          `${current}→${neighbor}: 진입 차수 ${inDegree[neighbor] + 1} → ${inDegree[neighbor]} (아직 남았다)`,
          { a: current, b: neighbor });
      }
    }

    clearInspection();
    nodeState[current] = 3;
    pushStep(8, 'mark', `${current} 처리 완료`, { a: current });
  }

  clearInspection();
  if (order.length === nodeCount) {
    pushStep(15, 'done',
      `위상 순서 완성 — ${order.join(' → ')} . 모든 간선이 이 순서에서 앞→뒤 방향이다`);
  } else {
    const remaining = [];
    for (let node = 0; node < nodeCount; node++) if (orderIndex[node] < 0) remaining.push(node);
    pushStep(14, 'done',
      `${order.length}/${nodeCount} 개만 나왔다 — 남은 정점 [${remaining.join(', ')}] 은 서로를 기다리는 ` +
      `사이클에 묶여 있다. DAG 가 아니므로 위상 순서가 존재하지 않는다`);
  }

  return steps;
}
