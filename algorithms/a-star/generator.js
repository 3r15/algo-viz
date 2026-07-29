// algorithms/a-star/generator.js — Model A 생성기(A* 최단 경로 탐색).
//
// 다익스트라에 "목표까지 얼마나 남았는지"에 대한 추정 h 를 얹은 것이다.
//   f(v) = g(v) + h(v)     g = 시작점에서 v 까지의 실제 비용, h = v 에서 목표까지의 추정 비용
// 우선순위를 g 가 아니라 f 로 매기므로, 목표에서 먼 쪽을 덜 파헤친다.
//
// 목표 정점은 마지막 정점(id = n-1). 시작점은 편집기의 시작점.
//
// 휴리스틱은 정점 좌표 사이의 유클리드 거리에 축척(scale)을 곱해서 쓴다.
//   scale = min(간선 가중치 / 간선의 유클리드 길이)
// 이렇게 두면 어떤 경로든 "유클리드 길이 × scale" 이상의 비용이 들므로 h 가 실제 비용을
// 절대 넘지 않는다(허용 가능, admissible) — 자세한 근거는 notes.md 의 정확성 절 참고.
//
// 시각화(graph 슬롯):
//   values[v]     0 미탐색 · 1 열린 목록(open) · 2 확장 중 · 3 닫힘(확정) — 목표는 마지막에 3
//   nodeLabels[v] "g+h" (합이 곧 f)
//   edgeStates[e] 0 기본 · 1 검사 중 · 2 g 개선됨 · 3 최종 경로
//   pq            열린 목록 스냅샷("f:정점")

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };

export const defaultGraph = {
  directed: false,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.08, y: 0.50 },
    { id: 1, label: '1', x: 0.32, y: 0.18 },
    { id: 2, label: '2', x: 0.32, y: 0.82 },
    { id: 3, label: '3', x: 0.58, y: 0.30 },
    { id: 4, label: '4', x: 0.58, y: 0.72 },
    { id: 5, label: '5', x: 0.80, y: 0.86 },
    { id: 6, label: '6', x: 0.07, y: 0.10 },   // 목표 반대편의 막다른 곁가지
    { id: 7, label: '7', x: 0.93, y: 0.45 },   // 목표(마지막 정점)
  ],
  // 도로망처럼 가중치를 화면상 길이에 대략 비례시켰다. 이래야 유클리드 휴리스틱이
  // 촘촘해진다 — 길이에 비해 유난히 싼 간선이 하나라도 있으면 축척이 그쪽에 끌려
  // 내려가면서 h 가 전체적으로 약해진다(정확성 절의 admissible 조건 때문).
  // 6 은 목표 반대편의 막다른 곁가지: 다익스트라는 확장하지만 A* 는 건드리지 않는다.
  edges: [
    [0, 1, 3], [0, 2, 3], [1, 3, 3], [2, 4, 3],
    [3, 7, 4], [4, 5, 2], [5, 7, 3], [3, 4, 3], [0, 6, 3],
  ],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'double h(int v);            // v 에서 목표까지의 추정 비용(허용 가능해야 함)',
  '',
  'void aStar(vector<vector<pair<int,int>>>& adj, int s, int goal) {',
  '    vector<double> g(adj.size(), INF);',
  '    priority_queue<pair<double,int>, vector<pair<double,int>>,',
  '                   greater<>> open;        // (f, 정점) 최소 힙',
  '    g[s] = 0;',
  '    open.push({h(s), s});',
  '    while (!open.empty()) {',
  '        auto [f, u] = open.top(); open.pop();',
  '        if (u == goal) return;              // 목표를 꺼냈다 = 최적 경로 확정',
  '        if (f > g[u] + h(u)) continue;      // 낡은 항목',
  '        for (auto [v, w] : adj[u]) {',
  '            if (g[u] + w < g[v]) {',
  '                g[v] = g[u] + w;',
  '                open.push({g[v] + h(v), v});',
  '            }',
  '        }',
  '    }',
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
    if (!graph.directed) adjacency[v].push({ to: u, weight, edgeIndex });
  });
  for (const list of adjacency) list.sort((a, b) => a.to - b.to);
  return adjacency;
}

// 화면 좌표계(0..1)를 viewBox 비율(100×60)로 펴서 잰 거리
function euclidean(from, to) {
  return Math.hypot((from.x - to.x) * 100, (from.y - to.y) * 60);
}

// 소수점이 길어지면 라벨이 읽히지 않는다. 표시용으로만 반올림한다.
const round1 = value => Math.round(value * 10) / 10;

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 3, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }
  if (nodeCount === 1) {
    return [{ line: 11, op: 'done', a: 0, b: -1, sortedFrom: 1, values: [3],
      nodeLabels: ['0+0'], edgeStates: [], explain: '정점이 하나뿐 — 시작점이 곧 목표다' }];
  }

  const adjacency = buildAdjacency(graph);
  const start = (Number.isInteger(graph.start) && graph.start >= 0 && graph.start < nodeCount)
    ? graph.start : 0;
  const goal = nodeCount - 1 === start ? 0 : nodeCount - 1;

  // 허용 가능한 휴리스틱을 만드는 축척: 어떤 간선도 "유클리드 길이 × scale" 보다 싸지 않다
  let scale = Infinity;
  for (const edge of graph.edges) {
    const [u, v] = edge;
    if (!graph.nodes[u] || !graph.nodes[v] || u === v) continue;
    const length = euclidean(graph.nodes[u], graph.nodes[v]);
    if (length > 0) scale = Math.min(scale, (Number.isFinite(edge[2]) ? edge[2] : 1) / length);
  }
  if (!Number.isFinite(scale)) scale = 0;      // 간선이 없으면 h ≡ 0 (= 다익스트라)

  const heuristic = graph.nodes.map(node => round1(euclidean(node, graph.nodes[goal]) * scale));

  const gScore = new Array(nodeCount).fill(Infinity);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const cameFromEdge = new Array(nodeCount).fill(-1);
  const cameFromNode = new Array(nodeCount).fill(-1);

  let expandedCount = 0;              // 실제로 이웃까지 훑은 정점 수
  const openList = [];
  const pushOpen = (fScore, node) => {
    openList.push({ fScore, node });
    openList.sort((a, b) => a.fScore - b.fScore || a.node - b.node);
  };

  const steps = [];
  const scoreLabels = () => gScore.map((cost, node) =>
    cost === Infinity ? '' : `${round1(cost)}+${heuristic[node]}`);

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: scoreLabels(),
    edgeStates: edgeState.slice(),
    pq: openList.map(entry => `${round1(entry.fScore)}:${entry.node}`),
    explain,
  });

  const clearEdgeHighlights = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1 || edgeState[index] === 2) edgeState[index] = 0;
  };

  gScore[start] = 0;
  nodeState[start] = 1;
  pushOpen(heuristic[start], start);
  pushStep(8, 'enqueue',
    `시작 ${start}, 목표 ${goal}. g[${start}]=0, h[${start}]=${heuristic[start]} → f=${heuristic[start]} 로 열린 목록에 넣는다`,
    { a: start, b: goal });

  let reachedGoal = false;

  while (openList.length) {
    const { fScore, node: current } = openList.shift();
    clearEdgeHighlights();

    if (current === goal) {
      nodeState[current] = 3;
      pushStep(11, 'mark',
        `목표 ${goal} 을 열린 목록에서 꺼냈다 — h 가 허용 가능하므로 이 순간 g[${goal}]=${round1(gScore[goal])} 가 최적이다. 탐색 종료`,
        { a: goal });
      reachedGoal = true;
      break;
    }

    if (fScore > gScore[current] + heuristic[current] + 1e-9) {
      pushStep(12, 'read',
        `(f=${round1(fScore)}, ${current}) 은 낡은 항목 — 지금 g[${current}]=${round1(gScore[current])} 기준 f 는 ${round1(gScore[current] + heuristic[current])} 이다`,
        { a: current });
      continue;
    }

    nodeState[current] = 2;
    expandedCount++;
    pushStep(10, 'dequeue',
      `f 가 가장 작은 (${round1(fScore)}, ${current}) 를 꺼내 확장한다 ` +
      `— g=${round1(gScore[current])}, h=${heuristic[current]}`,
      { a: current });

    for (const { to: neighbor, weight, edgeIndex } of adjacency[current]) {
      clearEdgeHighlights();
      edgeState[edgeIndex] = 1;
      const candidate = gScore[current] + weight;
      pushStep(13, 'read',
        `간선 ${current}→${neighbor}(${weight}) 검사: g=${round1(gScore[current])}+${weight}=${round1(candidate)} ` +
        `vs 현재 g[${neighbor}]=${gScore[neighbor] === Infinity ? '∞' : round1(gScore[neighbor])}`,
        { a: current, b: neighbor });

      if (candidate < gScore[neighbor]) {
        gScore[neighbor] = candidate;
        if (nodeState[neighbor] === 0) nodeState[neighbor] = 1;
        if (cameFromEdge[neighbor] >= 0) edgeState[cameFromEdge[neighbor]] = 0;
        cameFromEdge[neighbor] = edgeIndex;
        cameFromNode[neighbor] = current;
        edgeState[edgeIndex] = 2;
        const fNext = candidate + heuristic[neighbor];
        pushOpen(fNext, neighbor);
        pushStep(15, 'write',
          `g[${neighbor}] = ${round1(candidate)} 로 갱신. f = ${round1(candidate)} + ${heuristic[neighbor]} = ${round1(fNext)} 로 열린 목록에 넣는다`,
          { a: current, b: neighbor });
      } else {
        pushStep(13, 'compare',
          `더 좋아지지 않는다 — g[${neighbor}] 는 ${round1(gScore[neighbor])} 그대로`,
          { a: current, b: neighbor });
      }
    }

    clearEdgeHighlights();
    nodeState[current] = 3;
    pushStep(9, 'visit', `정점 ${current} 확장 완료(닫힘)`, { a: current });
  }

  // 목표까지의 경로를 거슬러 올라가며 칠한다
  clearEdgeHighlights();
  if (reachedGoal) {
    const path = [goal];
    for (let node = goal; cameFromNode[node] >= 0; node = cameFromNode[node]) {
      edgeState[cameFromEdge[node]] = 3;
      path.push(cameFromNode[node]);
    }
    path.reverse();
    const untouched = nodeState.filter(state => state === 0).length;
    pushStep(19, 'done',
      `최단 경로 ${path.join(' → ')} , 비용 ${round1(gScore[goal])}. ` +
      `확장한 정점 ${expandedCount}개(전체 ${nodeCount})` +
      (untouched ? `, 한 번도 건드리지 않은 정점 ${untouched}개` : '') +
      ` — h 가 목표에서 먼 쪽의 우선순위를 뒤로 미룬 결과다`,
      { a: start, b: goal });
  } else {
    pushStep(19, 'done', `목표 ${goal} 에 도달할 수 없다`, { a: start, b: goal });
  }

  return steps;
}
