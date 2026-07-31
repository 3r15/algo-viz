// algorithms/min-cost-max-flow/generator.js — Model A 생성기(최소 비용 최대 유량, MCMF).
//
// [최대 유량](max-flow)에 간선 **비용**을 더한다. 최대 유량을 흘리되, 그중 **총비용이 최소**가 되게.
//   비결: 증가 경로를 BFS(최대 유량)가 아니라 **최단 비용 경로**(벨만-포드/SPFA)로 찾는다.
//   잔여 그래프의 역간선 비용은 −(원래 비용)이라 음수 간선이 생겨 BFS 로는 안 되고 SPFA 를 쓴다.
//   최단 비용 경로로 병목만큼 흘리기를 반복하면, 각 단계가 그 유량에서 최소 비용을 유지한다.
//
// 입력은 그래프(방향+가중=용량; 비용은 defaultGraph 의 넷째 값). 시각화: graph 슬롯(라벨 "유량/용량 ¢비용").

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };

// 간선 [u, v, 용량, 비용]. 편집기로 그리면 비용은 1 로 본다.
export const defaultGraph = {
  directed: true,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: 'S', x: 0.10, y: 0.50 },
    { id: 1, label: '1', x: 0.45, y: 0.22 },
    { id: 2, label: '2', x: 0.45, y: 0.78 },
    { id: 3, label: 'T', x: 0.90, y: 0.50 },
  ],
  edges: [[0, 1, 3, 1], [0, 2, 2, 3], [1, 3, 2, 1], [1, 2, 1, 1], [2, 3, 3, 2]],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int mcmf(int s, int t) {                     // 최소 비용, 최대 유량',
  '    int flow = 0, cost = 0;',
  '    while (true) {',
  '        auto [dist, par] = spfa(s);           // 최단 비용 증가 경로',
  '        if (dist[t] == INF) break;            // 더 못 보내면 끝',
  '        int bott = INF;                        // 경로의 최소 잔여',
  '        for (int v = t; v != s; v = from[par[v]])',
  '            bott = min(bott, cap[par[v]]);',
  '        for (int v = t; v != s; v = from[par[v]]) {',
  '            cap[par[v]]     -= bott;           // 정방향 소모',
  '            cap[par[v] ^ 1] += bott;           // 역방향 잔여(비용 −)',
  '        }',
  '        flow += bott;',
  '        cost += bott * dist[t];               // 이 경로 단가 × 유량',
  '    }',
  '    return cost;                              // 최대 유량에서 최소 비용',
  '}',
];

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const N = graph.nodes.length;
  const source = Number.isInteger(graph.start) ? graph.start : 0;
  const sink = N - 1;
  if (N < 2) return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: N, values: new Array(N).fill(0), explain: '정점 부족' }];

  // 그린 간선: [u,v,cap,cost] (넷째 없으면 비용 1). 렌더 그래프엔 [u,v,cap] 만.
  const drawn = graph.edges.map(([u, v, c, w]) => ({ u, v, cap: (c == null ? 1 : c), cost: (w == null ? 1 : w) }));
  const renderGraph = { directed: true, weighted: true, start: source,
    nodes: graph.nodes, edges: drawn.map(d => [d.u, d.v, d.cap]) };

  // 잔여 간선 리스트: 각 그린 간선 i → 정방향 2i, 역방향 2i+1
  const to = [], rcap = [], rcost = [], from = [], drawnOf = [], isRev = [];
  const adj = Array.from({ length: N }, () => []);
  const addEdge = (u, v, cap, cost, di, rev) => { adj[u].push(to.length); to.push(v); from.push(u); rcap.push(cap); rcost.push(cost); drawnOf.push(di); isRev.push(rev); };
  drawn.forEach((d, i) => { addEdge(d.u, d.v, d.cap, d.cost, i, false); addEdge(d.v, d.u, 0, -d.cost, i, true); });

  const flowOf = new Array(drawn.length).fill(0);
  const nodeState = new Array(N).fill(0);
  const nodeLabels = () => graph.nodes.map(nd => nd.id === source ? 'S' : nd.id === sink ? 'T' : '');
  const edgeLabels = () => drawn.map((d, i) => `${flowOf[i]}/${d.cap} ¢${d.cost}`);

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: N, values: nodeState.slice(),
    nodeLabels: nodeLabels(), edgeStates: (extra.edgeStates || new Array(drawn.length).fill(0)).slice(),
    edgeLabels: edgeLabels(), graph: renderGraph, explain,
  });

  pushStep(2, 'start',
    `최소 비용 최대 유량: S→T 로 최대 유량을 흘리되 총비용을 최소로. ` +
    `증가 경로를 **최단 비용**(SPFA)으로 찾아 흘리기를 반복한다`);

  let totalFlow = 0, totalCost = 0;
  const INF = Infinity, MAX_ROUND = 100;

  for (let round = 0; round < MAX_ROUND; round++) {
    // SPFA: 최단 비용 경로
    const dist = new Array(N).fill(INF), inq = new Array(N).fill(false), pe = new Array(N).fill(-1);
    dist[source] = 0; const q = [source]; inq[source] = true;
    while (q.length) {
      const u = q.shift(); inq[u] = false;
      for (const e of adj[u]) if (rcap[e] > 0 && dist[u] + rcost[e] < dist[to[e]]) {
        dist[to[e]] = dist[u] + rcost[e]; pe[to[e]] = e;
        if (!inq[to[e]]) { inq[to[e]] = true; q.push(to[e]); }
      }
    }
    if (dist[sink] === INF) {
      pushStep(5, 'compare', `잔여 그래프에 S→T 경로가 더 없다 → 최대 유량 ${totalFlow}, 최소 비용 ${totalCost} 확정`);
      break;
    }

    // 경로 복원 + 병목
    const pathEdges = new Array(drawn.length).fill(0);
    const pathNodes = new Set([source]);
    let bott = INF;
    for (let v = sink; v !== source; v = from[pe[v]]) { bott = Math.min(bott, rcap[pe[v]]); }
    const seq = [];
    for (let v = sink; v !== source; v = from[pe[v]]) {
      pathEdges[drawnOf[pe[v]]] = isRev[pe[v]] ? 2 : 1;
      pathNodes.add(v); seq.push(v);
    }
    seq.push(source); seq.reverse();
    for (let v = 0; v < N; v++) nodeState[v] = pathNodes.has(v) ? 2 : 0;

    pushStep(8, 'read',
      `최단 비용 경로 ${seq.map(v => v === source ? 'S' : v === sink ? 'T' : v).join('→')} · 단가 ${dist[sink]} · 병목 ${bott}`,
      { edgeStates: pathEdges, a: source, b: sink });

    // 흘리기
    for (let v = sink; v !== source; v = from[pe[v]]) {
      rcap[pe[v]] -= bott; rcap[pe[v] ^ 1] += bott;
      const di = drawnOf[pe[v]];
      flowOf[di] += isRev[pe[v]] ? -bott : bott;
    }
    totalFlow += bott; totalCost += bott * dist[sink];
    pushStep(14, 'write',
      `${bott} 을 흘렸다(단가 ${dist[sink]}) → 누적 유량 ${totalFlow}, 누적 비용 ${totalCost}`,
      { edgeStates: pathEdges, a: source, b: sink });
  }

  const usedEdges = new Array(drawn.length).fill(0);
  drawn.forEach((d, i) => { if (flowOf[i] > 0) usedEdges[i] = 3; });
  for (let v = 0; v < N; v++) nodeState[v] = 3;
  pushStep(16, 'done',
    `완성 — 최대 유량 ${totalFlow}, 그때의 **최소 비용 ${totalCost}**. ` +
    `싼 경로부터 채우는 게 아니라, 매 단계 **최단 비용 증가 경로**를 골라 전체 최소를 보장한다`,
    { edgeStates: usedEdges, a: source, b: sink });

  return steps;
}
