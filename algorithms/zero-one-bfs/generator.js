// algorithms/zero-one-bfs/generator.js — Model A 생성기(0-1 BFS).
//
// 간선 가중치가 0 또는 1 뿐인 그래프의 최단 경로를, 우선순위 큐 없이 **덱(deque)** 으로 O(V+E) 에.
//   덱은 항상 거리가 최대 1만 차이 나는 정점들을 담는다.
//   완화 성공 시: 가중치 0이면 덱 **앞**(같은 거리)으로, 1이면 **뒤**(거리 +1)로 넣는다.
//   그러면 앞에서 꺼내는 순서가 곧 거리 오름차순 — BFS 와 다익스트라의 중간이다.
//
// 입력은 그래프(가중치 0/1 로 클램프). 시각화: graph 슬롯 + queue 슬롯(덱).

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: false, weighted: true };   // 가중치는 0/1 로 다룬다

export const defaultGraph = {
  directed: false,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.10, y: 0.50 },
    { id: 1, label: '1', x: 0.36, y: 0.20 },
    { id: 2, label: '2', x: 0.36, y: 0.80 },
    { id: 3, label: '3', x: 0.63, y: 0.50 },
    { id: 4, label: '4', x: 0.88, y: 0.24 },
    { id: 5, label: '5', x: 0.88, y: 0.76 },
  ],
  // 0-간선(지름길)과 1-간선이 섞여 있다
  edges: [[0, 1, 1], [0, 2, 0], [1, 3, 0], [2, 3, 1], [1, 4, 1], [3, 4, 1], [3, 5, 0], [4, 5, 1]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void bfs01(int s) {',
  '    deque<int> dq;',
  '    dist[s] = 0; dq.push_back(s);',
  '    while (!dq.empty()) {',
  '        int u = dq.front(); dq.pop_front();',
  '        if (done[u]) continue;                // 이미 확정',
  '        done[u] = true;',
  '        for (auto [v, w] : adj[u]) {          // w 는 0 또는 1',
  '            if (dist[u] + w < dist[v]) {',
  '                dist[v] = dist[u] + w;',
  '                if (w == 0) dq.push_front(v); //  0이면 앞으로',
  '                else        dq.push_back(v);  //  1이면 뒤로',
  '            }',
  '        }',
  '    }',
  '}',
];

function buildAdjacency(graph) {
  const n = graph.nodes.length;
  const adj = Array.from({ length: n }, () => []);
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v, w] = edge;
    const weight = (w == null || w > 0) ? 1 : 0;    // 0/1 로 클램프
    if (!Number.isInteger(u) || !Number.isInteger(v) || u === v) return;
    if (u < 0 || v < 0 || u >= n || v >= n) return;
    adj[u].push({ to: v, w: weight, edgeIndex });
    if (!graph.directed) adj[v].push({ to: u, w: weight, edgeIndex });
  });
  for (const list of adj) list.sort((a, b) => a.to - b.to);
  return adj;
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const n = graph.nodes.length;
  const source = Number.isInteger(graph.start) ? graph.start : 0;

  if (n === 0) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const adj = buildAdjacency(graph);
  const INF = Infinity;
  const dist = new Array(n).fill(INF);
  const done = new Array(n).fill(false);
  const nodeState = new Array(n).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const deque = [];

  const labels = () => dist.map(d => (d === INF ? '∞' : String(d)));
  const dequeSnap = () => ({
    values: deque.slice(),
    states: deque.map((_, i) => (i === 0 ? 2 : 1)),
    labels: deque.map((v, i) => (i === 0 ? `${v}◀앞` : String(v))),
    caption: deque.length ? '덱 — 앞(왼쪽)에서 꺼낸다 · 0간선은 앞, 1간선은 뒤로' : '덱 비었음',
  });
  const clearEdges = () => { for (let i = 0; i < edgeState.length; i++) if (edgeState[i] === 1) edgeState[i] = 0; };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: n, values: nodeState.slice(),
    nodeLabels: labels(), edgeStates: edgeState.slice(),
    queue: dequeSnap(), explain,
  });

  dist[source] = 0;
  deque.push(source);
  nodeState[source] = 1;
  pushStep(3, 'start',
    `0-1 BFS 로 정점 ${source} 에서의 최단 거리를 구한다. dist[${source}]=0, 덱에 넣는다. ` +
    `가중치 0은 덱 앞, 1은 뒤로 — 덱이 거리 순서를 지킨다`, { a: source });

  const MAX_STEPS = 400;
  while (deque.length && steps.length < MAX_STEPS) {
    const u = deque.shift();
    if (done[u]) {
      nodeState[u] = 3;
      pushStep(6, 'read', `정점 ${u} 는 이미 확정됨(더 짧은 경로로 처리 완료) → 건너뛴다`, { a: u });
      continue;
    }
    done[u] = true;
    nodeState[u] = 2;
    pushStep(7, 'visit', `덱 앞에서 ${u} 를 꺼낸다 — dist[${u}]=${dist[u]} 확정`, { a: u });

    for (const { to: v, w, edgeIndex } of adj[u]) {
      clearEdges();
      edgeState[edgeIndex] = 1;
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        edgeState[edgeIndex] = 2;
        if (w === 0) { deque.unshift(v); nodeState[v] = done[v] ? nodeState[v] : 1;
          pushStep(11, 'write', `간선 ${u}—${v} (w=0): dist[${v}] = ${dist[v]}. 같은 거리 → 덱 **앞**으로`, { a: u, b: v });
        } else { deque.push(v); nodeState[v] = done[v] ? nodeState[v] : 1;
          pushStep(12, 'write', `간선 ${u}—${v} (w=1): dist[${v}] = ${dist[v]}. 거리 +1 → 덱 **뒤**로`, { a: u, b: v });
        }
      } else {
        pushStep(9, 'compare', `간선 ${u}—${v} (w=${w}): dist[${u}]+${w}=${dist[u] + w} ≥ dist[${v}]=${dist[v] === INF ? '∞' : dist[v]} → 그대로`, { a: u, b: v });
      }
    }
    clearEdges();
    nodeState[u] = 3;
  }

  for (let v = 0; v < n; v++) nodeState[v] = dist[v] === INF ? 0 : 3;
  const distText = dist.map((d, v) => `${v}:${d === INF ? '∞' : d}`).join(' · ');
  pushStep(15, 'done',
    `완성 — 정점 ${source} 에서의 최단 거리: ${distText}. ` +
    `우선순위 큐 없이 덱만으로 O(V+E) — BFS 와 다익스트라의 중간`);

  return steps;
}
