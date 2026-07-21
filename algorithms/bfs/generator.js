// algorithms/bfs/generator.js — Model A 생성기(그래프 알고리즘, visited 벡터 방식).
//
// 그래프 알고리즘 계약:
//   export const defaultGraph = { directed, start, nodes:[{id,x,y,label}], edges:[[u,v,w]] }
//   export const capabilities = { directed, weighted }  — 알고리즘이 지원하는 옵션
//   export function generate(graph)  — 인자가 그래프가 아니면 defaultGraph 로 대체(검증기 호환)
//
// values[i] = 정점 i 상태: 0 미방문 · 1 큐 대기 · 2 방문 중 · 3 완료. step.queue = 큐 스냅샷.
// BFS 는 무방향·비가중 그래프에서 visited 불리언 벡터로 방문을 관리한다.

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: false }; // BFS: 방향 가능(편집기 미구현), 가중치 미사용

export const defaultGraph = {
  directed: false,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.10, y: 0.50 },
    { id: 1, label: '1', x: 0.34, y: 0.25 },
    { id: 2, label: '2', x: 0.34, y: 0.75 },
    { id: 3, label: '3', x: 0.61, y: 0.25 },
    { id: 4, label: '4', x: 0.61, y: 0.75 },
    { id: 5, label: '5', x: 0.88, y: 0.50 },
  ],
  edges: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5]],
};

// 표시 코드 스타일 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void bfs(vector<vector<int>>& adj, int s) {',
  '    vector<bool> visited(adj.size(), false);',
  '    queue<int> q;',
  '    q.push(s); visited[s] = true;',
  '    while (!q.empty()) {',
  '        int u = q.front(); q.pop();',
  '        // u 처리(방문 확정)',
  '        for (int v : adj[u]) {',
  '            if (!visited[v]) {',
  '                visited[v] = true;',
  '                q.push(v);',
  '            }',
  '        }',
  '    }',
  '}',
];

// 간선 목록 → 인접 리스트(무방향이면 양방향, 자기루프·중복 제거). 가중치는 BFS 에서 무시.
function buildAdj(g) {
  const N = g.nodes.length;
  const adj = Array.from({ length: N }, () => new Set());
  for (const e of g.edges) {
    const u = e[0], v = e[1];
    if (!Number.isInteger(u) || !Number.isInteger(v)) continue;
    if (u < 0 || v < 0 || u >= N || v >= N || u === v) continue;
    adj[u].add(v);
    if (!g.directed) adj[v].add(u);
  }
  return adj.map(s => [...s].sort((a, b) => a - b));
}

export function generate(arg) {
  const g = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const N = g.nodes.length;
  const steps = [];
  const state = new Array(N).fill(0);
  const push = (line, op, ai, bi, q, explain) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: N, values: state.slice(), queue: q.slice(), explain });

  if (N === 0) {
    steps.push({ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], queue: [], explain: '빈 그래프' });
    return steps;
  }

  const adj = buildAdj(g);
  const start = (Number.isInteger(g.start) && g.start >= 0 && g.start < N) ? g.start : 0;

  const q = [start];
  state[start] = 1;
  push(4, 'enqueue', start, -1, q, `시작 정점 ${start}: visited=true, 큐에 넣음`);

  while (q.length) {
    const u = q.shift();
    state[u] = 2;
    push(6, 'dequeue', u, -1, q, `큐에서 ${u} 을(를) 꺼냄`);
    push(7, 'visit', u, -1, q, `정점 ${u} 처리`);
    for (const v of adj[u]) {
      push(9, 'read', v, u, q, `이웃 ${v} 의 visited 확인`);
      if (state[v] === 0) {
        state[v] = 1;
        q.push(v);
        push(10, 'enqueue', v, u, q, `${v}: visited=true, 큐에 넣음`);
      }
    }
    state[u] = 3;
    push(13, 'mark', u, -1, q, `정점 ${u} 처리 완료`);
  }

  steps.push({ line: 15, op: 'done', a: -1, b: -1, sortedFrom: N, values: state.slice(), queue: [], explain: 'BFS 완료 — 도달 가능한 모든 정점 방문' });
  return steps;
}
