// algorithms/kosaraju-scc/generator.js — Model A 생성기(코사라주 강한 연결 요소).
//
// [타잔](tarjan-scc)과 같은 문제(SCC)를 **두 번의 DFS** 로 푼다.
//   ① 원래 그래프를 DFS 하며 끝나는 순서대로 정점을 스택에 쌓는다(완료 시각 순).
//   ② 간선을 모두 뒤집은 그래프에서, 스택 위에서부터 꺼내 DFS 한다.
//      한 번의 DFS 로 닿는 정점들이 SCC 하나다.
//   왜 되는가: 완료 시각이 가장 늦은 정점은 위상적으로 "가장 앞선" SCC 에 있고,
//   뒤집은 그래프에서는 그 SCC 밖으로 못 나가므로 딱 그 덩어리만 닿는다.
//
// 시각화(graph 슬롯 + stack 슬롯):
//   values[v]     0 미방문 · 1 방문 완료(스택에 있음) · 2 지금 처리 중 · 3 SCC 확정
//   nodeLabels[v] ②에서 확정된 SCC 번호(C0, C1 …)
//   edgeStates[e] 0 기본 · 1 지금 따라가는 간선(②에서는 거꾸로) · 3 DFS 트리 간선
//   stack         ①의 완료 순서 스택(②에서 위에서부터 꺼낸다)

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: false };   // SCC 는 방향 그래프의 개념

// 타잔과 같은 그래프 — 같은 문제를 다른 방법으로 푸는 것을 비교하게.
export const defaultGraph = {
  directed: true,
  weighted: false,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.12, y: 0.28 },
    { id: 1, label: '1', x: 0.12, y: 0.74 },
    { id: 2, label: '2', x: 0.38, y: 0.50 },
    { id: 3, label: '3', x: 0.64, y: 0.24 },
    { id: 4, label: '4', x: 0.64, y: 0.76 },
    { id: 5, label: '5', x: 0.90, y: 0.50 },
  ],
  // SCC 세 덩이: {0,1,2} (사이클) · {3,4} (사이클) · {5} (혼자)
  edges: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 3], [4, 5]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'vector<int> order;                         // 완료 순서 스택',
  'void dfs1(int u) {                          // ① 원래 그래프',
  '    visited[u] = true;',
  '    for (int v : adj[u])',
  '        if (!visited[v]) dfs1(v);',
  '    order.push_back(u);                     //    끝나면 쌓는다',
  '}',
  'void dfs2(int u, int c) {                   // ② 뒤집은 그래프',
  '    comp[u] = c;                            //    같은 SCC 번호',
  '    for (int v : radj[u])                   //    거꾸로 간선',
  '        if (comp[v] < 0) dfs2(v, c);',
  '}',
  'int kosaraju(int n) {                       // ① 전부 DFS → order',
  '    for (int u = 0; u < n; u++)',
  '        if (!visited[u]) dfs1(u);',
  '    int c = 0;                              // ② order 위에서부터',
  '    for (int i = n - 1; i >= 0; i--) {',
  '        int u = order[i];',
  '        if (comp[u] < 0) dfs2(u, c++);      //    새 DFS = 새 SCC',
  '    }',
  '    return c;                               // SCC 개수',
  '}',
];

function buildAdjacency(graph) {
  const nodeCount = graph.nodes.length;
  const forward = Array.from({ length: nodeCount }, () => []);
  const reverse = Array.from({ length: nodeCount }, () => []);
  graph.edges.forEach((edge, edgeIndex) => {
    const [u, v] = edge;
    if (!Number.isInteger(u) || !Number.isInteger(v)) return;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) return;
    forward[u].push({ to: v, edgeIndex });
    reverse[v].push({ to: u, edgeIndex });
  });
  for (const list of forward) list.sort((a, b) => a.to - b.to);
  for (const list of reverse) list.sort((a, b) => a.to - b.to);
  return { forward, reverse };
}

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 13, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const { forward, reverse } = buildAdjacency(graph);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const comp = new Array(nodeCount).fill(-1);
  const order = [];                     // 완료 순서 스택

  const labels = () => comp.map(c => (c < 0 ? '' : `C${c}`));
  const stackSnapshot = () => ({
    values: order.slice(),
    states: order.map(() => 3),         // 완료된 정점(초록)
    shape: 'list',
    caption: order.length ? '완료 순서 — 위에서부터(오른쪽) 꺼낸다' : '완료 순서 스택',
  });

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: labels(),
    edgeStates: edgeState.slice(),
    stack: stackSnapshot(),
    explain,
  });
  const clearEdges = () => {
    for (let i = 0; i < edgeState.length; i++) if (edgeState[i] === 1) edgeState[i] = 0;
  };

  pushStep(12, 'start',
    `강한 연결 요소(SCC)를 두 번의 DFS 로 찾는다. ` +
    `①먼저 원래 그래프를 DFS 하며 끝나는 순서대로 스택에 쌓는다`);

  // ── ① 원래 그래프 DFS: 완료 순서 쌓기 ──
  const visited = new Array(nodeCount).fill(false);
  const dfs1 = (u) => {
    visited[u] = true;
    nodeState[u] = 2;
    pushStep(3, 'visit', `① 정점 ${u} 방문 시작`, { a: u });
    for (const { to: v, edgeIndex } of forward[u]) {
      clearEdges();
      edgeState[edgeIndex] = 1;
      if (!visited[v]) {
        pushStep(5, 'read', `① ${u} → ${v} (미방문) → 따라 내려간다`, { a: u, b: v });
        edgeState[edgeIndex] = 3;
        dfs1(v);
      } else {
        pushStep(5, 'compare', `① ${u} → ${v} (이미 방문) → 건너뛴다`, { a: u, b: v });
      }
    }
    clearEdges();
    nodeState[u] = 1;
    order.push(u);
    pushStep(6, 'push', `① 정점 ${u} 완료 → 스택에 쌓는다`, { a: u });
  };

  for (let u = 0; u < nodeCount; u++)
    if (!visited[u]) {
      pushStep(14, 'set', `① 아직 안 본 정점 ${u} 에서 DFS 를 시작한다`, { a: u });
      dfs1(u);
    }

  pushStep(16, 'mark',
    `① 완료 — 스택(아래→위): [${order.join(', ')}]. ` +
    `이제 ②간선을 뒤집고, 스택 위에서부터 꺼내 DFS 한다`);

  // ── ② 뒤집은 그래프 DFS: SCC 배정 ──
  let sccCount = 0;
  const dfs2 = (u, c) => {
    comp[u] = c;
    nodeState[u] = 3;
    pushStep(8, 'write', `② 정점 ${u} 를 SCC C${c} 에 넣는다`, { a: u });
    for (const { to: v, edgeIndex } of reverse[u]) {
      clearEdges();
      edgeState[edgeIndex] = 1;         // 원래 간선을 거꾸로 따라간다
      if (comp[v] < 0) {
        pushStep(10, 'read', `② ${u} ←${v} (뒤집은 간선, 미배정) → 같은 SCC`, { a: u, b: v });
        dfs2(v, c);
      } else {
        pushStep(10, 'compare', `② ${u} ←${v} 는 이미 배정됨 → 건너뛴다`, { a: u, b: v });
      }
    }
    clearEdges();
  };

  for (let i = order.length - 1; i >= 0; i--) {
    const u = order[i];
    if (comp[u] < 0) {
      pushStep(18, 'set',
        `② 스택 맨 위 ${u} 는 아직 SCC 가 없다 → 새 SCC C${sccCount} 를 시작한다`, { a: u });
      dfs2(u, sccCount);
      sccCount++;
    }
  }

  // SCC별로 묶어 설명
  const groups = {};
  for (let v = 0; v < nodeCount; v++) (groups[comp[v]] ??= []).push(v);
  const groupText = Object.entries(groups)
    .map(([c, members]) => `C${c}={${members.join(',')}}`).join(', ');

  pushStep(20, 'done',
    `완성 — 강한 연결 요소 ${sccCount}개: ${groupText}. ` +
    `타잔과 같은 답을 두 번의 DFS 로 얻었다`);

  return steps;
}
