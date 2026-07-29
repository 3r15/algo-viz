// algorithms/bellman-ford/generator.js — Model A 생성기(벨만-포드 최단 경로).
//
// 모든 간선을 V-1 번 반복해서 완화한다. 다익스트라와 달리 "확정" 개념이 없어서
// 음수 간선이 있어도 안전하고, 한 번 더 돌려 보면 음수 사이클까지 탐지된다.
//
// 시각화(graph 슬롯):
//   values[v]     0 도달 못 함(∞) · 1 거리 있음 · 2 이번에 갱신됨 · 3 라운드 종료 시 도달됨
//   nodeLabels[v] 현재 dist
//   edgeStates[e] 0 기본 · 1 검사 중 · 2 완화 성공 · 3 최단 경로 트리
//   pq            (미사용) — 벨만-포드는 보조 자료구조가 없다

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };

const INFINITY_LABEL = '∞';

export const defaultGraph = {
  directed: true,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.12, y: 0.50 },
    { id: 1, label: '1', x: 0.38, y: 0.20 },
    { id: 2, label: '2', x: 0.38, y: 0.80 },
    { id: 3, label: '3', x: 0.66, y: 0.50 },
    { id: 4, label: '4', x: 0.90, y: 0.25 },
  ],
  // 3→2 가 음수(-4)라서 0→1→3→2 (6+5-4 = 7) 가 직행 0→2 (9) 보다 짧다.
  // 다익스트라는 2 를 9 로 일찍 확정해 버려 이 그래프에서 틀린 답을 낸다.
  // 사이클 2→1→3→2 의 합은 2+5-4 = 3 > 0 이므로 음수 사이클은 없다.
  edges: [[0, 1, 6], [0, 2, 9], [1, 3, 5], [2, 1, 2], [3, 2, -4], [1, 4, 4], [3, 4, 2]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'bool bellmanFord(vector<Edge>& edges, int n, int s) {',
  '    vector<int> dist(n, INF);',
  '    dist[s] = 0;',
  '    for (int round = 0; round < n - 1; round++) {',
  '        bool changed = false;',
  '        for (auto [u, v, w] : edges)',
  '            if (dist[u] != INF && dist[u] + w < dist[v]) {',
  '                dist[v] = dist[u] + w;',
  '                changed = true;',
  '            }',
  '        if (!changed) break;            // 더 줄 게 없으면 조기 종료',
  '    }',
  '    for (auto [u, v, w] : edges)        // n 번째 라운드에도 줄어들면',
  '        if (dist[u] != INF && dist[u] + w < dist[v])',
  '            return false;               // 음수 사이클 존재',
  '    return true;',
  '}',
];

// 방향 그래프면 간선 그대로, 무방향이면 양쪽 모두 완화 대상이다
function directedEdges(graph) {
  const nodeCount = graph.nodes.length;
  const list = [];
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v] = edge;
    const weight = Number.isFinite(edge[2]) ? edge[2] : 1;
    if (!Number.isInteger(u) || !Number.isInteger(v)) return;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) return;
    list.push({ from: u, to: v, weight, edgeIndex });
    if (!graph.directed) list.push({ from: v, to: u, weight, edgeIndex });
  });
  return list;
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const edges = directedEdges(graph);
  const start = (Number.isInteger(graph.start) && graph.start >= 0 && graph.start < nodeCount)
    ? graph.start : 0;

  const dist = new Array(nodeCount).fill(Infinity);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const treeEdge = new Array(nodeCount).fill(-1);

  const steps = [];
  const distanceLabels = () => dist.map(value => value === Infinity ? INFINITY_LABEL : String(value));
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: distanceLabels(),
    edgeStates: edgeState.slice(),
    explain,
  });

  const clearHighlights = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1 || edgeState[index] === 2) edgeState[index] = 0;
    for (let node = 0; node < nodeCount; node++)
      if (nodeState[node] === 2) nodeState[node] = 1;
  };

  dist[start] = 0;
  nodeState[start] = 1;
  pushStep(3, 'set',
    `시작 정점 ${start}: dist=0, 나머지는 ${INFINITY_LABEL}. ` +
    `간선 ${edges.length}개를 최대 ${nodeCount - 1}번 훑는다`,
    { a: start });

  let finishedRound = 0;

  for (let round = 1; round <= nodeCount - 1; round++) {
    let changed = false;
    pushStep(4, 'start',
      `라운드 ${round}/${nodeCount - 1} — 이 라운드가 끝나면 "간선 ${round}개 이하로 가는 최단 거리"가 확정된다`);

    for (const { from, to, weight, edgeIndex } of edges) {
      clearHighlights();
      if (dist[from] === Infinity) continue;      // 아직 못 간 곳에서는 완화할 수 없다

      edgeState[edgeIndex] = 1;
      const relaxed = dist[from] + weight;
      if (relaxed < dist[to]) {
        const previous = dist[to] === Infinity ? INFINITY_LABEL : dist[to];
        dist[to] = relaxed;
        changed = true;
        nodeState[to] = 2;
        if (treeEdge[to] >= 0 && treeEdge[to] !== edgeIndex) edgeState[treeEdge[to]] = 0;
        treeEdge[to] = edgeIndex;
        edgeState[edgeIndex] = 2;
        pushStep(8, 'write',
          `${from}→${to}(${weight}) 완화 성공 — dist[${to}] : ${previous} → ${relaxed}`,
          { a: from, b: to });
      } else {
        pushStep(7, 'compare',
          `${from}→${to}(${weight}): ${dist[from]} + ${weight} = ${relaxed} 이지만 ` +
          `dist[${to}]=${dist[to] === Infinity ? INFINITY_LABEL : dist[to]} 보다 작지 않다 — 그대로`,
          { a: from, b: to });
      }
    }

    clearHighlights();
    finishedRound = round;
    if (!changed) {
      pushStep(11, 'mark', `라운드 ${round} 에서 아무것도 바뀌지 않았다 → 이미 수렴했으므로 조기 종료`);
      break;
    }
    pushStep(4, 'pass-end', `라운드 ${round} 종료 — 현재 거리: ${distanceLabels().join(' ')}`);
  }

  // 한 번 더 훑어서 여전히 줄어들면 음수 사이클이다
  pushStep(12, 'start',
    `검사 라운드 — ${nodeCount - 1}번을 다 돌았는데도 더 줄어드는 간선이 있다면 음수 사이클이다`);

  let negativeCycleEdge = -1;
  for (const { from, to, weight, edgeIndex } of edges) {
    if (dist[from] === Infinity) continue;
    if (dist[from] + weight < dist[to]) {
      clearHighlights();
      edgeState[edgeIndex] = 2;
      negativeCycleEdge = edgeIndex;
      pushStep(14, 'read',
        `${from}→${to}(${weight}) 이 아직도 줄어든다 (${dist[from] + weight} < ${dist[to]}) — 음수 사이클 발견`,
        { a: from, b: to });
      break;
    }
  }

  clearHighlights();
  for (let node = 0; node < nodeCount; node++) {
    if (dist[node] !== Infinity) nodeState[node] = 3;
    if (treeEdge[node] >= 0 && dist[node] !== Infinity) edgeState[treeEdge[node]] = 3;
  }

  if (negativeCycleEdge >= 0) {
    pushStep(15, 'done',
      `음수 사이클이 존재한다 — 최단 경로가 정의되지 않으므로 위 거리 값들은 의미가 없다`);
  } else {
    const unreachable = dist.filter(value => value === Infinity).length;
    pushStep(16, 'done',
      `음수 사이클 없음 — 라운드 ${finishedRound}회로 수렴했다. 최단 거리: ${distanceLabels().join(' ')}` +
      (unreachable ? ` (도달 불가 ${unreachable}개)` : ''));
  }

  return steps;
}
