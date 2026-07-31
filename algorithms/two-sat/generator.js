// algorithms/two-sat/generator.js — Model A 생성기(2-SAT, 함의 그래프 + SCC).
//
// 2-SAT: 각 절이 리터럴 두 개의 OR 인 논리식 (a∨b)∧(c∨d)∧… 을 참으로 만드는 배정이 있는지.
//   절 (a∨b) 는 "a 가 거짓이면 b 는 참, b 가 거짓이면 a 는 참" 이라는 두 **함의**와 같다.
//   리터럴 x, ¬x 를 정점으로 하는 **함의 그래프**를 만들고 **강한 연결 요소(SCC)** 를 구한다.
//     x 와 ¬x 가 같은 SCC 면 모순 → 충족 불가.
//     아니면 위상적으로 뒤에 오는 리터럴을 참으로 배정하면 된다.
//   SCC 계산은 [코사라주](kosaraju-scc)/[타잔](tarjan-scc)을 그대로 쓴다.
//
// 입력은 절들(정수쌍, 리터럴 부호 = 변수 ±). 예: 1 2 -1 3 = (x1∨x2)(¬x1∨x3).
// dataStructure='graph' 이지만 defaultGraph 를 export 하지 않아 편집기 없이 숫자 입력을 받고,
// 파생 함의 그래프를 step.graph 로 렌더한다.

export const category = 'graph';
export const defaultInput = [1, 2, -1, 3, -2, -3, 1, 3];   // (x1∨x2)(¬x1∨x3)(¬x2∨¬x3)(x1∨x3)
export const inputLabel = '절 (리터럴쌍)';
export const inputHint = '정수를 둘씩 묶어 절 (a∨b). 부호는 변수의 참/거짓. 예: 1 2 -1 3 → (x1∨x2)(¬x1∨x3).';

export function randomInput() {
  const samples = [
    [1, 2, -1, 3, -2, -3, 1, 3],
    [1, -2, 2, -3, 3, -1],
    [1, 2, -1, -2, 1, -2, -1, 2],   // 충족 불가 예
    [1, 1, 2, 2, -1, 2],
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 절 (a ∨ b)  ≡  함의 ¬a→b, ¬b→a',
  '// 리터럴 x, ¬x 를 정점으로 하는 함의 그래프를 만든다',
  'void addClause(int a, int b) {',
  '    g.add_edge(neg(a), b);              // a 가 거짓이면 b 는 참',
  '    g.add_edge(neg(b), a);              // b 가 거짓이면 a 는 참',
  '}',
  'bool twoSat(int n) {',
  '    auto comp = scc(g);                 // 강한 연결 요소',
  '    for (int v = 0; v < n; v++)',
  '        if (comp[node(v,true)] == comp[node(v,false)])',
  '            return false;               // x 와 ¬x 가 한 SCC → 모순',
  '    for (int v = 0; v < n; v++)          // 값 배정',
  '        x[v] = comp[node(v,true)] > comp[node(v,false)];',
  '    return true;                        // 충족 가능',
  '}',
];

const MAX_VARS = 4, MAX_CLAUSES = 6;

export function generate(input) {
  const raw = (Array.isArray(input) && input.length >= 2) ? input : defaultInput;
  // 정수쌍 → 절. 리터럴 0 은 건너뛰고, 변수 번호는 MAX_VARS 로 제한.
  const clauses = [];
  for (let i = 0; i + 1 < raw.length && clauses.length < MAX_CLAUSES; i += 2) {
    let a = Math.trunc(Number(raw[i]) || 0), b = Math.trunc(Number(raw[i + 1]) || 0);
    if (a === 0 || b === 0) continue;
    const clamp = (L) => { const v = Math.min(Math.abs(L), MAX_VARS); return L < 0 ? -v : v; };
    clauses.push([clamp(a), clamp(b)]);
  }
  const vars = clauses.length ? Math.max(...clauses.flat().map(Math.abs)) : 1;
  const N = 2 * vars;

  // 리터럴 → 정점: 변수 v(0-based) 의 참 노드 2v, 거짓 노드 2v+1
  const nodeOf = (L) => { const v = Math.abs(L) - 1; return L > 0 ? 2 * v : 2 * v + 1; };
  const negNode = (node) => node ^ 1;
  const litLabel = (node) => `${node & 1 ? '¬' : ''}x${(node >> 1) + 1}`;

  // 함의 그래프(파생) — 모든 스텝이 이 한 객체를 참조한다(렌더러 캐시 안정).
  const nodes = [];
  for (let v = 0; v < vars; v++) {
    const y = vars === 1 ? 0.5 : 0.15 + (v * 0.7) / (vars - 1);
    nodes.push({ id: 2 * v, label: `x${v + 1}`, x: 0.26, y });
    nodes.push({ id: 2 * v + 1, label: `¬x${v + 1}`, x: 0.74, y });
  }
  const edges = [];        // [u, v]
  const edgeClause = [];   // 각 간선이 나온 절 인덱스
  clauses.forEach(([a, b], k) => {
    edges.push([negNode(nodeOf(a)), nodeOf(b)]); edgeClause.push(k);
    edges.push([negNode(nodeOf(b)), nodeOf(a)]); edgeClause.push(k);
  });
  const graph = { directed: true, weighted: false, start: 0, nodes, edges };

  // 인접/역인접
  const adj = Array.from({ length: N }, () => []);
  const radj = Array.from({ length: N }, () => []);
  edges.forEach(([u, v]) => { adj[u].push(v); radj[v].push(u); });

  const nodeState = new Array(N).fill(0);
  const nodeLabels = new Array(N).fill('');
  const edgeState = new Array(edges.length).fill(0);

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: nodeState.slice(), sortedFrom: N,
    nodeLabels: nodeLabels.slice(), edgeStates: edgeState.slice(),
    graph, explain,
  });

  pushStep(2, 'start',
    `2-SAT: 절 ${clauses.length}개, 변수 ${vars}개. 각 절 (a∨b) 를 함의 ¬a→b, ¬b→a 로 바꿔 ` +
    `리터럴(x, ¬x) 정점의 함의 그래프를 만든다`);

  // ── ① 함의 간선 추가(절별로) ──
  clauses.forEach(([a, b], k) => {
    for (let i = 0; i < edgeState.length; i++) if (edgeState[i] === 2) edgeState[i] = 1;
    edges.forEach((_, ei) => { if (edgeClause[ei] === k) edgeState[ei] = 2; });
    const la = a > 0 ? `x${a}` : `¬x${-a}`, lb = b > 0 ? `x${b}` : `¬x${-b}`;
    const na = a > 0 ? `¬x${a}` : `x${-a}`, nb = b > 0 ? `¬x${b}` : `x${-b}`;
    pushStep(4, 'write',
      `절 (${la}∨${lb}): 함의 ${na}→${lb}, ${nb}→${la} 추가 (한쪽이 거짓이면 다른 쪽이 참이어야 한다)`,
      { a: negNode(nodeOf(a)), b: nodeOf(b) });
  });
  for (let i = 0; i < edgeState.length; i++) if (edgeState[i] === 2) edgeState[i] = 1;

  // ── ② SCC (코사라주) ──
  const vis = new Array(N).fill(false), order = [];
  const dfs1 = (u) => { vis[u] = true; for (const v of adj[u]) if (!vis[v]) dfs1(v); order.push(u); };
  for (let u = 0; u < N; u++) if (!vis[u]) dfs1(u);
  const comp = new Array(N).fill(-1); let c = 0;
  const dfs2 = (u, cc) => { comp[u] = cc; for (const v of radj[u]) if (comp[v] < 0) dfs2(v, cc); };
  for (let i = N - 1; i >= 0; i--) { const u = order[i]; if (comp[u] < 0) dfs2(u, c++); }

  for (let node = 0; node < N; node++) nodeLabels[node] = `C${comp[node]}`;
  pushStep(8, 'set',
    `함의 그래프의 강한 연결 요소(SCC) ${c}개를 구했다(코사라주/타잔). ` +
    `한 SCC 안의 리터럴들은 반드시 **같은 값**이어야 한다`);

  // ── ③ 변수별로 x 와 ¬x 가 같은 SCC 인지 검사 ──
  let sat = true, conflictVar = -1;
  for (let v = 0; v < vars; v++) {
    for (let i = 0; i < N; i++) if (nodeState[i] === 2) nodeState[i] = 0;
    nodeState[2 * v] = 2; nodeState[2 * v + 1] = 2;
    if (comp[2 * v] === comp[2 * v + 1]) {
      sat = false; conflictVar = v;
      pushStep(11, 'compare',
        `변수 x${v + 1}: x${v + 1} 와 ¬x${v + 1} 가 같은 SCC(C${comp[2 * v]}) → **모순**. 충족 불가능`,
        { a: 2 * v, b: 2 * v + 1 });
      break;
    }
    pushStep(10, 'read',
      `변수 x${v + 1}: x${v + 1}(C${comp[2 * v]}) 와 ¬x${v + 1}(C${comp[2 * v + 1]}) 는 다른 SCC → 이 변수는 배정 가능`,
      { a: 2 * v, b: 2 * v + 1 });
  }

  // ── ④ 결과 ──
  if (!sat) {
    for (let i = 0; i < N; i++) nodeState[i] = 0;
    nodeState[2 * conflictVar] = 2; nodeState[2 * conflictVar + 1] = 2;
    pushStep(11, 'done',
      `충족 불가능(UNSAT) — x${conflictVar + 1} 와 ¬x${conflictVar + 1} 가 한 SCC 라 둘 다 같은 값이어야 하는데 ` +
      `그건 불가능하다`, { a: 2 * conflictVar, b: 2 * conflictVar + 1 });
    return steps;
  }

  // 배정: comp[참노드] > comp[거짓노드] 이면 참
  const assign = [];
  for (let v = 0; v < vars; v++) {
    const isTrue = comp[2 * v] > comp[2 * v + 1];
    assign.push(isTrue);
    for (let i = 0; i < N; i++) if (nodeState[i] === 2) nodeState[i] = 0;
    // 참으로 배정된 리터럴 노드를 초록으로
    nodeState[isTrue ? 2 * v : 2 * v + 1] = 3;
  }
  const assignText = assign.map((t, v) => `x${v + 1}=${t ? 'T' : 'F'}`).join(', ');
  pushStep(14, 'done',
    `충족 가능(SAT) — 배정 ${assignText}. ` +
    `각 변수는 위상적으로 뒤에 오는 리터럴(더 큰 SCC 번호)을 참으로 두면 모든 함의가 만족된다`);

  return steps;
}
