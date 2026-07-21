// algorithms/bfs/generator.js — Model A 생성기(그래프 알고리즘).
// 고정 그래프에서 정점 0 을 시작으로 너비 우선 탐색을 수행한다. 입력 배열은 쓰지 않는다.
// values[i] = 정점 i 상태: 0 미방문 · 1 큐 대기 · 2 방문 중 · 3 완료. step.queue = 큐 스냅샷.

export const category = 'graph';
export const defaultInput = [];   // BFS 는 배열 입력을 쓰지 않음(시작 정점 = 0)

// 정적 그래프: 좌표는 0..1 정규화(그래프 렌더러가 뷰포트로 매핑)
export const graph = {
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
  '    vector<int> state(adj.size(), 0);',
  '    queue<int> q;',
  '    q.push(s); state[s] = 1;',
  '    while (!q.empty()) {',
  '        int u = q.front(); q.pop();',
  '        state[u] = 2;                // 현재 방문 중',
  '        for (int v : adj[u]) {',
  '            if (state[v] == 0) {',
  '                state[v] = 1;',
  '                q.push(v);',
  '            }',
  '        }',
  '        state[u] = 3;                // 처리 완료',
  '    }',
  '}',
];

export function generate() {
  const N = graph.nodes.length;
  const adj = Array.from({ length: N }, () => []);
  for (const [u, v] of graph.edges) { adj[u].push(v); adj[v].push(u); }
  for (const a of adj) a.sort((x, y) => x - y);

  const state = new Array(N).fill(0);
  const steps = [];
  const push = (line, op, ai, bi, q, explain) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: N, values: state.slice(), queue: q.slice(), explain });

  const s = 0;
  const q = [s];
  state[s] = 1;
  push(4, 'enqueue', s, -1, q, `시작 정점 ${s} 을(를) 큐에 넣음`);

  while (q.length) {
    const u = q.shift();
    state[u] = 2;
    push(6, 'dequeue', u, -1, q, `큐에서 ${u} 을(를) 꺼냄`);
    push(7, 'visit', u, -1, q, `정점 ${u} 방문`);
    for (const v of adj[u]) {
      push(9, 'read', v, u, q, `${u} 의 이웃 ${v} 방문 여부 확인`);
      if (state[v] === 0) {
        state[v] = 1;
        q.push(v);
        push(11, 'enqueue', v, u, q, `미방문 ${v} 을(를) 큐에 넣음`);
      }
    }
    state[u] = 3;
    push(14, 'mark', u, -1, q, `정점 ${u} 처리 완료`);
  }

  steps.push({ line: 16, op: 'done', a: -1, b: -1, sortedFrom: N, values: state.slice(), queue: [], explain: 'BFS 완료 — 도달 가능한 모든 정점 방문' });
  return steps;
}
