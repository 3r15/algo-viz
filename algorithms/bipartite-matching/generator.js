// algorithms/bipartite-matching/generator.js — Model A 생성기(이분 매칭, 쿤 알고리즘).
//
// 이분 그래프(왼쪽·오른쪽 두 집합)에서 서로 겹치지 않는 간선을 최대한 많이 고른다(최대 매칭).
//   쿤 알고리즘: 왼쪽 정점을 하나씩 보며 **증가 경로**를 DFS 로 찾는다.
//   빈 오른쪽 정점을 만나거나, 이미 매칭된 오른쪽의 짝을 **다른 곳으로 밀어내면** 매칭이 하나 늘어난다.
//   이는 단위 용량 [최대 유량](max-flow)의 조합론적 형태다.
//
// 입력은 이분 그래프(정점 x<0.5 = 왼쪽, x≥0.5 = 오른쪽). 시각화: graph 슬롯(매칭 간선 강조).

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: false, weighted: false };

export const defaultGraph = {
  directed: false,
  weighted: false,
  start: 0,
  nodes: [
    { id: 0, label: 'L0', x: 0.22, y: 0.20 },
    { id: 1, label: 'L1', x: 0.22, y: 0.50 },
    { id: 2, label: 'L2', x: 0.22, y: 0.80 },
    { id: 3, label: 'R0', x: 0.78, y: 0.20 },
    { id: 4, label: 'R1', x: 0.78, y: 0.50 },
    { id: 5, label: 'R2', x: 0.78, y: 0.80 },
  ],
  edges: [[0, 3], [0, 4], [1, 3], [1, 5], [2, 4], [2, 5]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int matchR[MAXN];                        // 오른쪽 → 짝지은 왼쪽(-1=없음)',
  'bool visited[MAXN];',
  'bool tryKuhn(int u) {                     // 왼쪽 u 의 증가 경로 찾기',
  '    for (int v : adj[u]) {                // u 의 오른쪽 이웃들',
  '        if (!visited[v]) {',
  '            visited[v] = true;',
  '            if (matchR[v] == -1 || tryKuhn(matchR[v])) {',
  '                matchR[v] = u;            // v 를 u 와 짝짓는다',
  '                return true;',
  '            }',
  '        }',
  '    }',
  '    return false;                         // 증가 경로 없음',
  '}',
  'int maxMatching(int L) {',
  '    int cnt = 0;',
  '    for (int u = 0; u < L; u++) {',
  '        fill(visited, visited+R, false);',
  '        if (tryKuhn(u)) cnt++;            // u 를 매칭에 편입',
  '    }',
  '    return cnt;                           // 최대 매칭 크기',
  '}',
];

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const n = graph.nodes.length;
  if (n === 0) return [{ line: 15, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];

  // 이분: x<0.5 왼쪽, 그 외 오른쪽
  const isLeft = graph.nodes.map(nd => (nd.x ?? 0) < 0.5);
  const adj = Array.from({ length: n }, () => []);
  const edgeIndexOf = new Map();
  graph.edges.forEach((edge, i) => {
    const [u, v] = edge;
    if (u < 0 || v < 0 || u >= n || v >= n || u === v) return;
    // 왼쪽→오른쪽만 매칭 간선으로 본다
    let l = u, r = v;
    if (isLeft[v] && !isLeft[u]) { l = v; r = u; }
    if (isLeft[l] && !isLeft[r]) { adj[l].push(r); edgeIndexOf.set(l + ',' + r, i); }
  });
  for (const list of adj) list.sort((a, b) => a - b);

  const matchR = new Array(n).fill(-1);   // 오른쪽 → 왼쪽
  const matchL = new Array(n).fill(-1);   // 왼쪽 → 오른쪽
  const nodeState = new Array(n).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);

  const matchedEdges = () => {
    const st = new Array(graph.edges.length).fill(0);
    for (let l = 0; l < n; l++) if (matchL[l] >= 0) {
      const idx = edgeIndexOf.get(l + ',' + matchL[l]);
      if (idx != null) st[idx] = 3;   // 매칭 간선(초록)
    }
    return st;
  };
  const labels = () => graph.nodes.map((nd) => {
    if (isLeft[nd.id]) return matchL[nd.id] >= 0 ? `→${graph.nodes[matchL[nd.id]].label}` : '';
    return matchR[nd.id] >= 0 ? '매칭' : '';
  });

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => {
    const merged = matchedEdges();
    if (extra.tryEdge != null) merged[extra.tryEdge] = extra.tryState ?? 1;
    steps.push({
      line, op, a: extra.a ?? -1, b: extra.b ?? -1,
      sortedFrom: n, values: nodeState.slice(),
      nodeLabels: labels(), edgeStates: merged,
      explain,
    });
  };

  const leftNodes = graph.nodes.filter(nd => isLeft[nd.id]).map(nd => nd.id);
  pushStep(16, 'start',
    `이분 그래프의 최대 매칭을 쿤 알고리즘으로 찾는다. 왼쪽 정점 ${leftNodes.length}개를 하나씩 보며 ` +
    `증가 경로로 매칭을 늘린다`);

  let cnt = 0;
  const tryKuhn = (u, visited, depth) => {
    for (const v of adj[u]) {
      if (!visited[v]) {
        visited[v] = true;
        const idx = edgeIndexOf.get(u + ',' + v);
        if (matchR[v] === -1) {
          pushStep(7, 'read', `${label(u)} → ${label(v)} 가 비어 있다 → 바로 짝짓는다`, { a: u, b: v, tryEdge: idx, tryState: 2 });
          matchR[v] = u; matchL[u] = v;
          pushStep(8, 'write', `매칭 추가: ${label(u)} — ${label(v)}`, { a: u, b: v });
          return true;
        }
        pushStep(7, 'read', `${label(u)} → ${label(v)} 는 이미 ${label(matchR[v])} 와 매칭 → ${label(matchR[v])} 를 다른 곳으로 밀어 본다`, { a: u, b: v, tryEdge: idx, tryState: 1 });
        const prev = matchR[v];
        if (tryKuhn(prev, visited, depth + 1)) {
          matchR[v] = u; matchL[u] = v;
          pushStep(8, 'write', `밀어내기 성공 → ${label(u)} — ${label(v)} 로 재매칭`, { a: u, b: v });
          return true;
        }
      }
    }
    pushStep(13, 'compare', `${label(u)} 의 증가 경로 없음`, { a: u });
    return false;
  };
  const label = (id) => graph.nodes[id].label;

  for (const u of leftNodes) {
    for (let i = 0; i < n; i++) nodeState[i] = matchL[i] >= 0 || matchR[i] >= 0 ? 3 : 0;
    nodeState[u] = 2;
    const visited = new Array(n).fill(false);
    pushStep(19, 'visit', `${label(u)} 의 짝을 찾는다`, { a: u });
    if (tryKuhn(u, visited, 0)) cnt++;
  }

  for (let i = 0; i < n; i++) nodeState[i] = (matchL[i] >= 0 || matchR[i] >= 0) ? 3 : 0;
  const pairs = [];
  for (let l = 0; l < n; l++) if (matchL[l] >= 0) pairs.push(`${label(l)}—${label(matchL[l])}`);
  pushStep(21, 'done',
    `최대 매칭 크기 ${cnt}: ${pairs.join(', ')}. ` +
    `쿤 = 단위 용량 최대 유량의 조합론적 형태 — 각 왼쪽 정점마다 증가 경로 한 번, O(V·E)`);

  return steps;
}
