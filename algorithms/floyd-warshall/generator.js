// algorithms/floyd-warshall/generator.js — Model A 생성기(플로이드-워셜 모든 쌍 최단 경로).
//
// dist[i][j] 를 "중간 경유지를 0..k-1 에서만 고를 때의 최단 거리"로 두고 k 를 하나씩 늘린다.
//   k 를 새로 허용하면 각 (i,j) 는 "k 를 안 거치는 기존 값" 과 "i→k→j" 중 작은 쪽이 된다.
// 3중 반복문 한 덩어리로 모든 쌍의 최단 거리를 얻는다.
//
// 시각화: graph 슬롯(경유지 k 강조) + matrix 슬롯(dist 표).
//   matrix 셀 상태: 1 채워짐 · 2 읽는 중(dist[i][k], dist[k][j]) · 3 방금 갱신 · 0 ∞
//
// 스텝 수를 감당하려면 모든 (i,j) 를 다 찍을 수 없다(n³). k 마다 한 번,
// 그리고 실제로 값이 줄어든 순간마다 한 번씩만 기록한다.

export const category = 'graph';
export const defaultInput = [];
export const capabilities = { directed: true, weighted: true };

const INFINITY_LABEL = '∞';

export const defaultGraph = {
  directed: true,
  weighted: true,
  start: 0,
  nodes: [
    { id: 0, label: '0', x: 0.14, y: 0.30 },
    { id: 1, label: '1', x: 0.50, y: 0.14 },
    { id: 2, label: '2', x: 0.50, y: 0.78 },
    { id: 3, label: '3', x: 0.86, y: 0.30 },
    { id: 4, label: '4', x: 0.86, y: 0.82 },
  ],
  // 방향 그래프라 dist 표가 비대칭이 되고, 경유가 이득인 쌍이 여럿 생긴다
  edges: [
    [0, 1, 4], [0, 2, 2], [1, 3, 3], [2, 1, 1],
    [2, 4, 7], [3, 4, 2], [4, 0, 6], [3, 2, 1],
  ],
};

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// dist[i][j] = i → j 최단 거리. 없으면 INF, dist[i][i] = 0',
  'void floydWarshall(vector<vector<int>>& dist, int n) {',
  '    for (int k = 0; k < n; k++)          // 경유를 허용할 정점',
  '        for (int i = 0; i < n; i++)',
  '            for (int j = 0; j < n; j++)',
  '                if (dist[i][k] + dist[k][j] < dist[i][j])',
  '                    dist[i][j] = dist[i][k] + dist[k][j];',
  '}',
];

export function generate(arg) {
  const graph = (arg && Array.isArray(arg.nodes)) ? arg : defaultGraph;
  const nodeCount = graph.nodes.length;

  if (nodeCount === 0) {
    return [{ line: 2, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 그래프' }];
  }

  // dist 초기화: 자기 자신 0, 간선이 있으면 그 가중치(중복 간선은 최솟값)
  const dist = Array.from({ length: nodeCount }, (_, i) =>
    Array.from({ length: nodeCount }, (_, j) => (i === j ? 0 : Infinity)));
  for (const edge of graph.edges) {
    const [u, v] = edge;
    const weight = Number.isFinite(edge[2]) ? edge[2] : 1;
    if (!Number.isInteger(u) || !Number.isInteger(v)) continue;
    if (u < 0 || v < 0 || u >= nodeCount || v >= nodeCount || u === v) continue;
    dist[u][v] = Math.min(dist[u][v], weight);
    if (!graph.directed) dist[v][u] = Math.min(dist[v][u], weight);
  }

  const nodeState = new Array(nodeCount).fill(0);
  const cellState = Array.from({ length: nodeCount }, () => new Array(nodeCount).fill(0));
  const refreshCellStates = () => {
    for (let i = 0; i < nodeCount; i++)
      for (let j = 0; j < nodeCount; j++)
        cellState[i][j] = dist[i][j] === Infinity ? 0 : 1;
  };
  refreshCellStates();

  const labels = Array.from({ length: nodeCount }, (_, index) => String(index));
  let caption = 'dist[i][j] = i 에서 j 로 가는 최단 거리';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    sortedFrom: nodeCount,
    values: nodeState.slice(),
    edgeStates: new Array(graph.edges.length).fill(0),
    matrix: {
      rows: nodeCount, cols: nodeCount,
      values: dist.flat().map(value => (value === Infinity ? INFINITY_LABEL : value)),
      states: cellState.flat(),
      rowLabels: labels.map(index => `i=${index}`),
      colLabels: labels,
      caption,
    },
    explain,
  });

  caption = '초기 상태 — 간선이 있는 쌍만 채워져 있다';
  pushStep(1, 'start',
    `정점 ${nodeCount}개. dist[i][i]=0, 간선이 있으면 그 가중치, 나머지는 ${INFINITY_LABEL} 로 시작한다`);

  let improvements = 0;

  for (let k = 0; k < nodeCount; k++) {
    nodeState.fill(0);
    nodeState[k] = 2;                       // 지금 경유를 허용한 정점
    refreshCellStates();
    // k 행·열은 이번 라운드에서 계속 읽히는 자리다
    for (let index = 0; index < nodeCount; index++) {
      if (cellState[k][index]) cellState[k][index] = 2;
      if (cellState[index][k]) cellState[index][k] = 2;
    }
    caption = `k = ${k} — 정점 ${k} 를 경유지로 허용한다(강조된 ${k}행·${k}열이 재료)`;
    pushStep(3, 'set',
      `k = ${k}: 이제부터 0..${k} 만 경유지로 쓸 수 있다. 각 (i, j) 를 "${k} 를 거칠까?" 로 다시 판단한다`,
      { a: k });

    for (let i = 0; i < nodeCount; i++) {
      if (dist[i][k] === Infinity) continue;          // i→k 가 없으면 경유 불가
      for (let j = 0; j < nodeCount; j++) {
        if (dist[k][j] === Infinity) continue;
        const throughK = dist[i][k] + dist[k][j];
        if (throughK >= dist[i][j]) continue;

        const previous = dist[i][j] === Infinity ? INFINITY_LABEL : dist[i][j];
        dist[i][j] = throughK;
        improvements++;

        refreshCellStates();
        cellState[i][k] = 2; cellState[k][j] = 2; cellState[i][j] = 3;
        caption = `k = ${k} — dist[${i}][${j}] 갱신`;
        pushStep(6, 'write',
          `dist[${i}][${j}] : ${previous} → ${throughK} ` +
          `(${i}→${k} 가 ${dist[i][k]}, ${k}→${j} 가 ${dist[k][j]})`,
          { a: i, b: j });
      }
    }
  }

  nodeState.fill(0);
  refreshCellStates();
  for (let i = 0; i < nodeCount; i++)
    for (let j = 0; j < nodeCount; j++)
      if (dist[i][j] !== Infinity) cellState[i][j] = 4;

  const unreachable = dist.flat().filter(value => value === Infinity).length;
  caption = '완성 — 모든 쌍의 최단 거리';
  pushStep(8, 'done',
    `완료 — 갱신이 일어난 횟수 ${improvements}회. 모든 쌍 ${nodeCount}×${nodeCount} 의 최단 거리를 얻었다` +
    (unreachable ? `(도달 불가 ${unreachable}쌍은 ${INFINITY_LABEL})` : ''));

  return steps;
}
