// algorithms/dfs/generator.js — Model A 생성기(그래프 알고리즘, visited 벡터 방식).
// 재귀 DFS: visited 불리언 벡터로 방문을 관리하고, 재귀 호출 경로를 스택으로 보여준다.
//
// values[i] = 정점 i 상태: 0 미방문 · 1 스택 대기(재귀 중) · 2 방문 중(현재) · 3 완료. step.stack = 재귀 스택.

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: false }; // DFS: 방향 가능(편집기 미구현), 가중치 미사용

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
  'void dfs(vector<vector<int>>& adj, int u,',
  '         vector<bool>& visited) {',
  '    visited[u] = true;                // 방문',
  '    for (int v : adj[u]) {',
  '        if (!visited[v]) {',
  '            dfs(adj, v, visited);',
  '        }',
  '    }',
  '}',
];

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
  const stack = [];
  const push = (line, op, ai, bi, ex) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: N, values: state.slice(), stack: stack.slice(), explain: ex });

  if (N === 0) {
    steps.push({ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], stack: [], explain: '빈 그래프' });
    return steps;
  }

  const adj = buildAdj(g);
  const start = (Number.isInteger(g.start) && g.start >= 0 && g.start < N) ? g.start : 0;

  const dfs = (u) => {
    state[u] = 2;
    stack.push(u);
    push(3, 'visit', u, -1, `정점 ${u}: visited=true`);
    for (const v of adj[u]) {
      push(5, 'read', v, u, `이웃 ${v} 의 visited 확인`);
      if (state[v] === 0) {
        state[u] = 1;                       // u 는 스택에서 대기
        push(6, 'read', v, u, `미방문 ${v} 로 재귀 진입`);
        dfs(v);
        state[u] = 2;                       // 재귀 반환 → u 로 복귀
        push(4, 'visit', u, -1, `정점 ${u} 로 복귀`);
      }
    }
    state[u] = 3;
    stack.pop();
    push(9, 'mark', u, -1, `정점 ${u} 처리 완료(반환)`);
  };
  dfs(start);

  steps.push({ line: 9, op: 'done', a: -1, b: -1, sortedFrom: N, values: state.slice(), stack: [], explain: 'DFS 완료 — 시작점에서 도달 가능한 정점 방문' });
  return steps;
}
