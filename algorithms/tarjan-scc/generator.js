// algorithms/tarjan-scc/generator.js — Model A 생성기(타잔 강한 연결 요소).
//
// 방향 그래프에서 "서로 오갈 수 있는" 정점들의 최대 묶음이 강한 연결 요소(SCC)다.
// 타잔은 DFS 를 한 번만 돌면서 두 값을 들고 다닌다.
//   tin[u]  u 를 처음 방문한 시각
//   low[u]  u 의 서브트리에서 "스택에 아직 남아 있는" 정점으로 갈 수 있는 최소 tin
// low[u] == tin[u] 이면 u 가 자기 SCC 의 뿌리이고, 스택에서 u 까지 뽑아내면 그게 한 덩이다.
//
// 시각화(graph 슬롯):
//   values[v]     0 미방문 · 1 스택 위(탐색 중) · 2 지금 보는 정점 · 3 SCC 확정
//   nodeLabels[v] "tin/low" → SCC 확정 후 "C번호"
//   edgeStates[e] 0 기본 · 1 검사 중 · 2 low 갱신에 쓰임 · 3 DFS 트리 간선
//   stack         타잔 스택 스냅샷

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: false };   // SCC 는 방향 그래프의 개념

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
  'int tin[MAXN], low[MAXN], comp[MAXN], timer = 0;',
  'bool onStack[MAXN];',
  'stack<int> st;',
  '',
  'void dfs(int u) {',
  '    tin[u] = low[u] = timer++;',
  '    st.push(u); onStack[u] = true;',
  '    for (int v : adj[u]) {',
  '        if (tin[v] == -1) {              // 처음 보는 정점 → 트리 간선',
  '            dfs(v);',
  '            low[u] = min(low[u], low[v]);',
  '        } else if (onStack[v]) {         // 스택 위 → 같은 SCC 후보',
  '            low[u] = min(low[u], tin[v]);',
  '        }',
  '    }',
  '    if (low[u] == tin[u]) {              // u 가 SCC 의 뿌리',
  '        while (true) {',
  '            int v = st.top(); st.pop();',
  '            onStack[v] = false;',
  '            comp[v] = u;',
  '            if (v == u) break;',
  '        }',
  '    }',
  '}',
];

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
    return [{ line: 5, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  const adjacency = buildAdjacency(graph);
  const tin = new Array(nodeCount).fill(-1);
  const low = new Array(nodeCount).fill(-1);
  const componentOf = new Array(nodeCount).fill(-1);
  const onStack = new Array(nodeCount).fill(false);
  const nodeState = new Array(nodeCount).fill(0);
  const edgeState = new Array(graph.edges.length).fill(0);
  const tarjanStack = [];

  let timer = 0;
  let componentCount = 0;
  const steps = [];

  const labels = () => tin.map((discovered, node) =>
    componentOf[node] >= 0 ? `C${componentOf[node]}`
      : discovered < 0 ? '' : `${discovered}/${low[node]}`);

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    nodeLabels: labels(),
    edgeStates: edgeState.slice(),
    stack: tarjanStack.slice(),
    explain,
  });

  const clearInspection = () => {
    for (let index = 0; index < edgeState.length; index++)
      if (edgeState[index] === 1 || edgeState[index] === 2) edgeState[index] = 0;
  };

  function dfs(current) {
    tin[current] = low[current] = timer++;
    tarjanStack.push(current);
    onStack[current] = true;
    nodeState[current] = 1;
    clearInspection();
    pushStep(6, 'visit',
      `${current} 방문 — tin=low=${tin[current]}. 스택에 올린다`,
      { a: current });

    for (const { to: neighbor, edgeIndex } of adjacency[current]) {
      clearInspection();
      edgeState[edgeIndex] = 1;

      if (tin[neighbor] === -1) {
        pushStep(9, 'read',
          `${current}→${neighbor}: 처음 보는 정점이다 — 트리 간선을 타고 내려간다`,
          { a: current, b: neighbor });
        edgeState[edgeIndex] = 3;
        dfs(neighbor);
        clearInspection();
        edgeState[edgeIndex] = 2;
        const before = low[current];
        low[current] = Math.min(low[current], low[neighbor]);
        pushStep(11, 'write',
          `${neighbor} 에서 돌아왔다 — low[${current}] = min(${before}, low[${neighbor}]=${low[neighbor]}) = ${low[current]}`,
          { a: current, b: neighbor });
      } else if (onStack[neighbor]) {
        const before = low[current];
        low[current] = Math.min(low[current], tin[neighbor]);
        edgeState[edgeIndex] = 2;
        pushStep(13, 'write',
          `${current}→${neighbor}: ${neighbor} 가 아직 스택에 있다 = 같은 SCC 후보. ` +
          `low[${current}] = min(${before}, tin[${neighbor}]=${tin[neighbor]}) = ${low[current]}`,
          { a: current, b: neighbor });
      } else {
        pushStep(12, 'compare',
          `${current}→${neighbor}: ${neighbor} 는 이미 다른 SCC 로 확정됐다 — 무시한다`,
          { a: current, b: neighbor });
      }
    }

    clearInspection();
    if (low[current] === tin[current]) {
      const members = [];
      while (true) {
        const popped = tarjanStack.pop();
        onStack[popped] = false;
        componentOf[popped] = componentCount;
        nodeState[popped] = 3;
        members.push(popped);
        if (popped === current) break;
      }
      componentCount++;
      pushStep(16, 'mark',
        `low[${current}] == tin[${current}] == ${tin[current]} → ${current} 가 뿌리다. ` +
        `스택에서 ${current} 까지 뽑아 SCC C${componentCount - 1} = {${members.slice().reverse().join(', ')}} 확정`,
        { a: current });
    } else {
      pushStep(16, 'compare',
        `low[${current}]=${low[current]} < tin[${current}]=${tin[current]} → ` +
        `위쪽으로 되돌아가는 길이 있다. 아직 뿌리가 아니므로 스택에 남겨 둔다`,
        { a: current });
    }
  }

  const start = (Number.isInteger(graph.start) && graph.start >= 0 && graph.start < nodeCount)
    ? graph.start : 0;

  pushStep(5, 'start',
    `정점 ${nodeCount}개. 시작점 ${start} 부터 DFS 를 돌리고, 남는 정점이 있으면 거기서 다시 시작한다`,
    { a: start });

  // 시작점부터, 그다음 남은 정점 순서대로 — 도달 못 하는 부분도 빠뜨리지 않는다
  for (let offset = 0; offset < nodeCount; offset++) {
    const node = (start + offset) % nodeCount;
    if (tin[node] === -1) dfs(node);
  }

  clearInspection();
  const groups = Array.from({ length: componentCount }, () => []);
  for (let node = 0; node < nodeCount; node++) groups[componentOf[node]].push(node);
  pushStep(24, 'done',
    `SCC ${componentCount}개 — ` +
    groups.map((members, index) => `C${index}={${members.join(',')}}`).join(' , ') +
    `. 확정 순서는 축약 그래프의 위상 역순이다`);

  return steps;
}
