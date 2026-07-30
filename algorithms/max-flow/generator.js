// algorithms/max-flow/generator.js — Model A 생성기(최대 유량 / 최소 컷, 에드몬드-카프).
//
// 소스 s 에서 싱크 t 로 보낼 수 있는 최대 유량을 구한다. 각 간선엔 용량이 있다.
//   포드-풀커슨: **잔여 그래프**에서 증가 경로를 찾아, 그 경로의 병목만큼 유량을 흘린다. 반복.
//   에드몬드-카프: 증가 경로를 **BFS(최단)** 로 찾는다 → O(V·E²) 보장.
//   끝나면 소스에서 잔여 그래프로 닿는 집합이 **최소 컷** — 최대 유량 = 최소 컷(쌍대성).
//
// 입력은 그래프(방향+가중=용량). 소스 = graph.start, 싱크 = 가장 큰 정점 번호.
// 시각화: graph 슬롯 — 간선 라벨은 "유량/용량", 증가 경로·포화·컷을 색으로.

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };   // 용량 = 가중치

export const defaultGraph = {
  directed: true,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: 'S', x: 0.06, y: 0.50 },
    { id: 1, label: '1', x: 0.35, y: 0.22 },
    { id: 2, label: '2', x: 0.35, y: 0.78 },
    { id: 3, label: '3', x: 0.68, y: 0.22 },
    { id: 4, label: '4', x: 0.68, y: 0.78 },
    { id: 5, label: 'T', x: 0.94, y: 0.50 },
  ],
  // 반평행 간선(u→v 와 v→u)이 없도록 구성 — 유량/용량 매핑이 깔끔하다
  edges: [[0, 1, 16], [0, 2, 13], [1, 2, 10], [1, 3, 12], [2, 4, 14], [3, 2, 9], [4, 3, 7], [3, 5, 20], [4, 5, 4]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int maxflow(int s, int t) {                  // s=소스, t=싱크',
  '    int flow = 0;',
  '    while (true) {',
  '        vector<int> par(n, -1); par[s] = s;   // BFS 로 증가 경로',
  '        queue<int> q; q.push(s);',
  '        while (!q.empty()) {',
  '            int u = q.front(); q.pop();',
  '            for (int v = 0; v < n; v++)',
  '                if (par[v] < 0 && cap[u][v] > 0)',
  '                    par[v] = u, q.push(v);',
  '        }',
  '        if (par[t] < 0) break;                // 더 못 보내면 끝',
  '        int bott = INF;                        // 경로의 최소 잔여 = 병목',
  '        for (int v = t; v != s; v = par[v])',
  '            bott = min(bott, cap[par[v]][v]);',
  '        for (int v = t; v != s; v = par[v])    // 잔여 그래프 갱신',
  '            cap[par[v]][v] -= bott, cap[v][par[v]] += bott;',
  '        flow += bott;',
  '    }',
  '    return flow;                              // 최대 유량 = 최소 컷',
  '}',
];

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const N = graph.nodes.length;
  const source = Number.isInteger(graph.start) ? graph.start : 0;
  const sink = N - 1;

  if (N < 2) {
    return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: N, values: new Array(N).fill(0), explain: '정점이 부족하다' }];
  }

  // 잔여 용량 행렬 + 원본 간선(라벨용)
  const cap = Array.from({ length: N }, () => new Array(N).fill(0));
  const drawn = graph.edges.map(([u, v, w]) => [u, v, (w == null ? 1 : w)]);
  const fwdIndex = new Map();          // "u,v" → 그린 간선 인덱스
  drawn.forEach(([u, v, c], i) => { if (u !== v) { cap[u][v] += c; fwdIndex.set(u + ',' + v, i); } });

  const nodeState = new Array(N).fill(0);
  const nodeLabels = () => graph.nodes.map(nd => (nd.id === source ? 'S' : nd.id === sink ? 'T' : ''));
  const edgeLabels = () => drawn.map(([u, v, c]) => `${c - cap[u][v]}/${c}`);
  let caption = '';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: N,
    values: nodeState.slice(),
    nodeLabels: nodeLabels(),
    edgeStates: (extra.edgeStates || new Array(drawn.length).fill(0)).slice(),
    edgeLabels: edgeLabels(),
    explain,
  });

  // 경로의 (pu→v) 잔여 이동을 그린 간선 인덱스로 매핑(정방향/역방향)
  const edgeOnPath = (pu, v) => {
    if (fwdIndex.has(pu + ',' + v)) return { idx: fwdIndex.get(pu + ',' + v), forward: true };
    if (fwdIndex.has(v + ',' + pu)) return { idx: fwdIndex.get(v + ',' + pu), forward: false };
    return null;
  };

  caption = `소스 S(${source}) → 싱크 T(${sink}) 최대 유량`;
  pushStep(2, 'start',
    `소스 S 에서 싱크 T 로 보낼 수 있는 최대 유량을 구한다. ` +
    `잔여 그래프에서 증가 경로를 BFS 로 찾아 병목만큼 흘리기를 반복한다`);

  let totalFlow = 0;
  const MAX_AUG = 100;

  for (let round = 0; round < MAX_AUG; round++) {
    // ── BFS 로 증가 경로 ──
    const par = new Array(N).fill(-1); par[source] = source;
    const queue = [source];
    while (queue.length) {
      const u = queue.shift();
      for (let v = 0; v < N; v++)
        if (par[v] < 0 && cap[u][v] > 0) { par[v] = u; queue.push(v); }
    }

    if (par[sink] < 0) {
      pushStep(12, 'compare',
        `잔여 그래프에서 S→T 경로가 더 없다 → 최대 유량 ${totalFlow} 확정`);
      break;
    }

    // 경로 복원 + 병목
    const path = [];
    for (let v = sink; v !== source; v = par[v]) path.push([par[v], v]);
    path.reverse();
    let bott = Infinity;
    for (const [pu, v] of path) bott = Math.min(bott, cap[pu][v]);

    const pathEdges = new Array(drawn.length).fill(0);
    const pathNodes = new Set([source]);
    for (const [pu, v] of path) {
      const hit = edgeOnPath(pu, v);
      if (hit) pathEdges[hit.idx] = hit.forward ? 1 : 2;   // 1 정방향 · 2 역방향(되돌림)
      pathNodes.add(v);
    }
    for (let v = 0; v < N; v++) nodeState[v] = pathNodes.has(v) ? 2 : 0;

    caption = `증가 경로 ${path.map(([, v]) => (v === sink ? 'T' : v === source ? 'S' : v)).join('→')} · 병목 ${bott}`;
    pushStep(15, 'read',
      `BFS 가 찾은 증가 경로: S→${path.map(([, v]) => (v === sink ? 'T' : v)).join('→')}. ` +
      `경로의 최소 잔여(병목) = ${bott} 만큼 흘릴 수 있다`,
      { edgeStates: pathEdges, a: source, b: sink });

    // ── 잔여 그래프 갱신(유량 흘리기) ──
    for (const [pu, v] of path) { cap[pu][v] -= bott; cap[v][pu] += bott; }
    totalFlow += bott;

    caption = `유량 ${bott} 흘림 → 누적 ${totalFlow}`;
    pushStep(17, 'write',
      `경로를 따라 ${bott} 을 흘렸다(간선 라벨 유량/용량 갱신). 누적 유량 ${totalFlow}`,
      { edgeStates: pathEdges, a: source, b: sink });
  }

  // ── 최소 컷: 소스에서 잔여 그래프로 닿는 집합 ──
  const reach = new Array(N).fill(false); reach[source] = true;
  const q2 = [source];
  while (q2.length) {
    const u = q2.shift();
    for (let v = 0; v < N; v++) if (!reach[v] && cap[u][v] > 0) { reach[v] = true; q2.push(v); }
  }
  const cutEdges = new Array(drawn.length).fill(0);
  const cutList = [];
  drawn.forEach(([u, v, c], i) => {
    if (reach[u] && !reach[v]) { cutEdges[i] = 3; cutList.push(`${u}→${v}(${c})`); }
  });
  for (let v = 0; v < N; v++) nodeState[v] = reach[v] ? 2 : 3;

  caption = `최대 유량 = 최소 컷 = ${totalFlow}`;
  pushStep(20, 'done',
    `최대 유량 = ${totalFlow}. 소스에서 잔여로 닿는 집합 {${[...reach.keys()].filter(i => reach[i]).join(',')}} 과 ` +
    `나머지를 가르는 **최소 컷** 간선: ${cutList.join(', ')} (용량 합 ${totalFlow}) — 최대 유량 = 최소 컷`,
    { edgeStates: cutEdges, a: source, b: sink });

  return steps;
}
