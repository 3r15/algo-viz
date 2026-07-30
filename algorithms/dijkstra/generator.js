// algorithms/dijkstra/generator.js — Model A 생성기(다익스트라 최단 경로).
//
// 우선순위 큐에서 "잠정 거리가 가장 작은 정점"을 꺼내면 그 거리는 확정된다.
// 꺼낸 정점의 이웃을 완화(relax)하며 잠정 거리를 줄여 나간다.
//
// 시각화(graph 슬롯):
//   values[v]     0 미방문(∞) · 1 발견(PQ 안, 잠정) · 2 처리 중 · 3 확정
//   nodeLabels[v] 현재 dist 값(∞ 포함)
//   edgeStates[e] 0 기본 · 1 완화 시도 · 2 완화 성공(거리 줄어듦) · 3 최단 경로 트리 간선
//   heap          우선순위 큐 스냅샷(heap 렌더러의 목록형 슬롯)

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };

const INFINITY_LABEL = '∞';

export const defaultGraph = {
  directed: false,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.10, y: 0.50 },
    { id: 1, label: '1', x: 0.34, y: 0.25 },
    { id: 2, label: '2', x: 0.34, y: 0.75 },
    { id: 3, label: '3', x: 0.61, y: 0.25 },
    { id: 4, label: '4', x: 0.61, y: 0.75 },
    { id: 5, label: '5', x: 0.88, y: 0.50 },
  ],
  // 0→2→1 이 0→1 보다 짧아서 완화가 한 번 더 일어나고, 낡은 PQ 항목도 생긴다
  edges: [[0, 1, 4], [0, 2, 1], [1, 3, 1], [2, 1, 2], [2, 4, 3], [3, 5, 3], [4, 5, 1]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void dijkstra(vector<vector<pair<int,int>>>& adj, int s) {',
  '    vector<int> dist(adj.size(), INF);',
  '    priority_queue<pair<int,int>, vector<pair<int,int>>,',
  '                   greater<>> pq;          // (거리, 정점) 최소 힙',
  '    dist[s] = 0;',
  '    pq.push({0, s});',
  '    while (!pq.empty()) {',
  '        auto [d, u] = pq.top(); pq.pop();',
  '        if (d > dist[u]) continue;         // 낡은 항목 — 버린다',
  '        for (auto [v, w] : adj[u]) {',
  '            if (dist[u] + w < dist[v]) {   // 완화(relax) 성공',
  '                dist[v] = dist[u] + w;',
  '                pq.push({dist[v], v});',
  '            }',
  '        }',
  '    }',
  '}',
];

// 간선 목록 → 인접 리스트. 각 원소는 { to, weight, edgeIndex }.
// edgeIndex 를 들고 다녀야 시각화에서 "지금 보고 있는 간선"을 칠할 수 있다.
function buildAdjacency(graph) {
  const nodeCount = graph.nodes.length;
  const adjacency = Array.from({ length: nodeCount }, () => []);
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v] = edge;
    const weight = Number.isFinite(edge[2]) ? edge[2] : 1;
    if (!Number.isInteger(u) || !Number.isInteger(v)) return;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) return;
    adjacency[u].push({ to: v, weight, edgeIndex });
    if (!graph.directed) adjacency[v].push({ to: u, weight, edgeIndex });
  });
  for (const list of adjacency) list.sort((a, b) => a.to - b.to);
  return adjacency;
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;
  const steps = [];

  if (nodeCount === 0) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const adjacency = buildAdjacency(graph);
  const start = (Number.isInteger(graph.start) && graph.start >= 0 && graph.start < nodeCount)
    ? graph.start : 0;

  const dist = new Array(nodeCount).fill(Infinity);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const treeEdge = new Array(nodeCount).fill(-1);   // 각 정점에 최단 거리를 준 간선

  // 우선순위 큐: 학습용이라 배열 + 매번 정렬로 둔다(힙과 순서가 같고 스냅샷 찍기 쉽다)
  const priorityQueue = [];
  const pushQueue = (distance, node) => {
    priorityQueue.push({ distance, node });
    priorityQueue.sort((a, b) => a.distance - b.distance || a.node - b.node);
  };
  // heap 슬롯: 이 PQ 는 배열+정렬이라 내부가 이진 힙이 아니다 → shape='list' 로 트리를 그리지 않는다.
  const queueHeapSlot = () => ({
    values: priorityQueue.map(entry => entry.node),
    labels: priorityQueue.map(entry => `d=${entry.distance}`),
    states: priorityQueue.map((_, index) => (index === 0 ? 4 : 0)),   // 맨 앞이 다음에 꺼낼 것
    shape: 'list',
    caption: priorityQueue.length
      ? `PQ — 거리가 작은 순. 다음에 꺼낼 것은 정점 ${priorityQueue[0].node} (거리 ${priorityQueue[0].distance})`
      : 'PQ 가 비었다',
  });
  const distanceLabels = () => dist.map(value => value === Infinity ? INFINITY_LABEL : String(value));

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: distanceLabels(),
    edgeStates: edgeState.slice(),
    heap: queueHeapSlot(),
    explain,
  });

  // 간선 강조는 한 스텝만 유지한다. 최단 경로 트리(3)로 확정된 간선은 남긴다.
  const clearEdgeHighlights = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1 || edgeState[index] === 2) edgeState[index] = 0;
  };

  dist[start] = 0;
  nodeState[start] = 1;
  pushQueue(0, start);
  pushStep(6, 'enqueue', `시작 정점 ${start}: dist=0 으로 두고 PQ 에 넣는다`, { a: start });

  while (priorityQueue.length) {
    const { distance, node: current } = priorityQueue.shift();
    clearEdgeHighlights();

    // 같은 정점이 더 좋은 거리로 다시 들어갔다면, 먼저 넣은 항목은 낡은 것이다
    if (distance > dist[current]) {
      pushStep(9, 'read',
        `PQ 에서 (${distance}, ${current}) 를 꺼냈지만 dist[${current}]=${dist[current]} 가 더 작다 — 낡은 항목이므로 버린다`,
        { a: current });
      continue;
    }

    nodeState[current] = 2;
    pushStep(8, 'dequeue',
      `PQ 의 최솟값 (${distance}, ${current}) 을 꺼낸다 → dist[${current}]=${distance} 확정`,
      { a: current });

    for (const { to: neighbor, weight, edgeIndex } of adjacency[current]) {
      clearEdgeHighlights();
      edgeState[edgeIndex] = 1;
      const relaxed = dist[current] + weight;
      pushStep(11, 'read',
        `간선 ${current}→${neighbor}(가중치 ${weight}) 검사: ${dist[current]} + ${weight} = ${relaxed} ` +
        `vs dist[${neighbor}]=${dist[neighbor] === Infinity ? INFINITY_LABEL : dist[neighbor]}`,
        { a: current, b: neighbor });

      if (relaxed < dist[neighbor]) {
        const previous = dist[neighbor] === Infinity ? INFINITY_LABEL : dist[neighbor];
        dist[neighbor] = relaxed;
        if (nodeState[neighbor] === 0) nodeState[neighbor] = 1;
        // 이 정점에 거리를 준 간선을 최단 경로 트리로 교체한다
        if (treeEdge[neighbor] >= 0) edgeState[treeEdge[neighbor]] = 0;
        treeEdge[neighbor] = edgeIndex;
        edgeState[edgeIndex] = 2;
        pushQueue(relaxed, neighbor);
        pushStep(12, 'write',
          `완화 성공 — dist[${neighbor}] : ${previous} → ${relaxed}. PQ 에 (${relaxed}, ${neighbor}) 추가`,
          { a: current, b: neighbor });
      } else {
        pushStep(11, 'compare',
          `완화 실패 — 이미 알고 있는 ${dist[neighbor]} 이하로 줄지 않는다`,
          { a: current, b: neighbor });
      }
    }

    clearEdgeHighlights();
    nodeState[current] = 3;
    if (treeEdge[current] >= 0) edgeState[treeEdge[current]] = 3;
    pushStep(9, 'mark', `정점 ${current} 처리 완료 — dist[${current}]=${dist[current]} 는 더 이상 바뀌지 않는다`,
      { a: current });
  }

  // 남은 최단 경로 트리 간선을 모두 확정 색으로
  for (let node = 0; node < nodeCount; node++)
    if (treeEdge[node] >= 0 && dist[node] !== Infinity) edgeState[treeEdge[node]] = 3;

  const unreachable = dist.filter(value => value === Infinity).length;
  pushStep(17, 'done',
    `완료 — 시작점 ${start} 에서의 최단 거리 확정` +
    (unreachable ? `. 도달 불가 정점 ${unreachable}개는 ${INFINITY_LABEL} 로 남는다` : ''));

  return steps;
}
