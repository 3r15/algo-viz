// algorithms/huffman/generator.js — Model A 생성기(허프만 코딩).
//
// 글자마다 길이가 다른 부호를 주어 전체 비트 수를 최소로 만든다.
//   가장 드문 글자 둘을 골라 형제로 묶고, 합친 빈도를 가진 새 노드로 되돌린다.
//   이걸 하나가 남을 때까지 반복하면, 드문 글자가 자연히 깊은(긴 부호) 자리로 밀려난다.
// 그리디인데 최적이다 — 근거는 notes.md 의 교환 논법.
//
// 입력은 문자열 하나(inputKind='text'). 그 안의 글자 빈도로 부호를 만든다.
//
// 시각화(두 슬롯):
//   heap 슬롯  — 후보 노드들의 우선순위 큐. 실제 이진 힙이 아니라 정렬된 배열이므로 shape:'list'.
//   tree 슬롯  — kind:'rooted'. 합치는 중에는 트리가 여러 개라 roots 로 **숲**을 그린다.
//     노드 상태: 0 기본 · 1 이번에 고른 둘 · 2 방금 만든 부모 · 3 부호가 확정된 리프

export const category = 'greedy';
export const inputKind = 'text';
export const defaultInput = 'ABRACADABRA';
export const inputLabel = '문자열';
export const inputHint = '이 문자열의 글자 빈도로 부호를 만든다. 자주 나오는 글자에 짧은 부호가 붙는다.';

const MAX_SYMBOLS = 8;          // 트리가 화면을 넘지 않도록 글자 종류를 제한한다

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const alphabet = 'ABCDE';
  // 앞 글자를 더 자주 뽑아 빈도 차이를 만든다(전부 같으면 트리가 재미없다)
  const weighted = 'AAAAABBBCCDE';
  return Array.from(
    { length: 10 + Math.floor(Math.random() * 8) },
    () => weighted[Math.floor(Math.random() * weighted.length)],
  ).join('') || alphabet;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// (빈도, 노드) 최소 힙에서 가장 드문 둘을 꺼내 묶는다',
  'Node* huffman(map<char,int>& freq) {',
  '    priority_queue<pair<int,Node*>, vector<pair<int,Node*>>,',
  '                   greater<>> pq;',
  '    for (auto [ch, f] : freq)',
  '        pq.push({f, new Node(ch)});         // 글자마다 잎 하나',
  '    while (pq.size() > 1) {',
  '        auto [f1, left]  = pq.top(); pq.pop();   // 가장 드문 것',
  '        auto [f2, right] = pq.top(); pq.pop();   // 그다음 드문 것',
  '        Node* merged = new Node(f1 + f2, left, right);',
  '        pq.push({f1 + f2, merged});         // 합쳐서 되돌린다',
  '    }',
  '    return pq.top().second;                 // 남은 하나가 루트',
  '}',
  '',
  '// 왼쪽으로 내려가면 0, 오른쪽으로 내려가면 1',
  'void assign(Node* v, string path) {',
  '    if (v->isLeaf()) { codeOf[v->ch] = path; return; }',
  '    assign(v->left,  path + "0");',
  '    assign(v->right, path + "1");',
  '}',
];

function countFrequencies(input) {
  const text = typeof input === 'string' ? input : (Array.isArray(input) ? input.join('') : '');
  const counts = new Map();
  for (const ch of text.trim().replace(/\s+/g, '')) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  // 빈도 오름차순, 같으면 글자순 — 순수 함수가 되도록 순서를 완전히 결정한다
  return [...counts.entries()]
    .sort((left, right) => left[1] - right[1] || (left[0] < right[0] ? -1 : 1))
    .slice(0, MAX_SYMBOLS);
}

export function generate(input) {
  const frequencies = countFrequencies(input);
  const symbolCount = frequencies.length;

  if (symbolCount === 0) {
    return [{ line: 5, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [],
      explain: '글자를 하나 이상 입력하세요 (예: ABRACADABRA)' }];
  }

  // 노드: 잎은 0..symbolCount-1, 내부 노드는 그 뒤로 만들어진 순서대로
  const parent = [];
  const leftChild = [];
  const rightChild = [];
  const weight = [];
  const symbol = [];

  for (const [ch, count] of frequencies) {
    parent.push(-1); leftChild.push(-1); rightChild.push(-1);
    weight.push(count); symbol.push(ch);
  }

  const nodeState = () => new Array(parent.length).fill(0);
  const codeOf = new Map();

  // 우선순위 큐: 학습용이라 배열 + 매번 정렬로 둔다(힙과 순서가 같고 스냅샷 찍기 쉽다)
  const queue = frequencies.map((_, index) => index);
  const sortQueue = () => queue.sort((left, right) =>
    weight[left] - weight[right] || left - right);
  sortQueue();

  const labelOf = node => (symbol[node] !== undefined ? `${symbol[node]}` : '•');
  const nodeText = node => (symbol[node] !== undefined
    ? `${symbol[node]}:${weight[node]}`
    : String(weight[node]));

  const steps = [];
  let caption = '';
  let treeCaption = '';

  const pushStep = (line, op, explain, extra = {}) => {
    const states = extra.states ?? nodeState();
    // 리프에 부호가 정해졌으면 확정색으로 남긴다
    for (let node = 0; node < symbolCount; node++)
      if (codeOf.has(symbol[node]) && states[node] === 0) states[node] = 3;

    steps.push({
      line, op,
      a: extra.a ?? -1, b: extra.b ?? -1,
      values: [],                        // 배열 자료구조가 없다 — 트리와 큐가 전부다
      sortedFrom: 0,
      heap: {
        values: queue.map(labelOf),
        labels: queue.map(node => `${weight[node]}`),
        states: queue.map((_, index) => (index < 2 && queue.length > 1 ? 4 : 0)),
        shape: 'list',                   // 정렬된 배열 PQ — 이진 힙이 아니므로 트리로 그리지 않는다
        caption,
      },
      tree: {
        kind: 'rooted',
        parent: parent.slice(),
        roots: currentRoots(),           // 합치는 중에는 루트가 여러 개다(숲)
        values: parent.map((_, node) => nodeText(node)),
        states,
        marks: Object.fromEntries([...codeOf.entries()]
          .map(([ch, bits]) => [symbol.indexOf(ch), bits])),
        caption: treeCaption,
      },
      explain,
    });
  };

  // 부모가 없는 노드 = 아직 합쳐지지 않은 트리의 뿌리
  function currentRoots() {
    const roots = [];
    for (let node = 0; node < parent.length; node++) if (parent[node] === -1) roots.push(node);
    return roots.length ? roots : [parent.length - 1];
  }

  const totalChars = frequencies.reduce((sum, [, count]) => sum + count, 0);
  caption = 'PQ — 빈도가 작은 순. 앞의 둘을 꺼낸다';
  treeCaption = `글자 ${symbolCount}종, 총 ${totalChars}글자 — 아직 잎만 있다`;
  pushStep(6, 'start',
    `글자 빈도: ${frequencies.map(([ch, count]) => `${ch}=${count}`).join(', ')}. ` +
    `글자마다 잎 하나로 시작한다`);

  if (symbolCount === 1) {
    codeOf.set(symbol[0], '0');
    treeCaption = '글자가 한 종류뿐 — 부호는 1비트로 둔다';
    pushStep(13, 'done',
      `글자가 '${symbol[0]}' 하나뿐이다. 트리를 만들 것이 없어 관례적으로 1비트('0')를 준다`);
    return steps;
  }

  // ── 합치기: 가장 드문 둘을 형제로 묶는다
  while (queue.length > 1) {
    const first = queue[0], second = queue[1];
    const highlight = nodeState();
    highlight[first] = 1; highlight[second] = 1;
    caption = 'PQ — 앞의 둘이 가장 드물다';
    treeCaption = `가장 드문 둘: ${nodeText(first)} 과 ${nodeText(second)}`;
    pushStep(9, 'dequeue',
      `가장 드문 둘을 꺼낸다 — ${nodeText(first)} 과 ${nodeText(second)} ` +
      `(합 ${weight[first] + weight[second]})`,
      { a: first, b: second, states: highlight });

    queue.splice(0, 2);
    const merged = parent.length;
    parent.push(-1); leftChild.push(first); rightChild.push(second);
    weight.push(weight[first] + weight[second]); symbol.push(undefined);
    parent[first] = merged; parent[second] = merged;

    queue.push(merged);
    sortQueue();

    const afterMerge = nodeState();
    afterMerge[merged] = 2;
    afterMerge[first] = 1; afterMerge[second] = 1;
    caption = queue.length > 1
      ? 'PQ — 합친 노드를 되돌렸다. 아직 둘 이상 남았다'
      : 'PQ — 하나만 남았다. 그것이 루트다';
    treeCaption = `${nodeText(first)} 과 ${nodeText(second)} 를 ${weight[merged]} 아래로 묶었다`;
    pushStep(11, 'push',
      `둘을 형제로 묶어 빈도 ${weight[merged]} 인 노드를 만들고 PQ 에 되돌린다. ` +
      `남은 후보 ${queue.length}개`,
      { a: merged, states: afterMerge });
  }

  const root = queue[0];

  // ── 부호 붙이기: 왼쪽 0, 오른쪽 1 로 내려간다
  const order = [];
  (function collect(node, path) {
    if (leftChild[node] === -1) { order.push([node, path]); return; }
    collect(leftChild[node], path + '0');
    collect(rightChild[node], path + '1');
  })(root, '');

  for (const [leaf, path] of order) {
    codeOf.set(symbol[leaf], path);
    const highlight = nodeState();
    // 루트에서 이 잎까지의 경로를 짚는다
    for (let node = leaf; node !== -1; node = parent[node]) highlight[node] = 1;
    highlight[leaf] = 2;
    caption = 'PQ — 비었다(트리 완성)';
    treeCaption = `${symbol[leaf]} 의 부호는 ${path} (${path.length}비트)`;
    pushStep(18, 'mark',
      `루트에서 '${symbol[leaf]}' 까지 왼쪽=0, 오른쪽=1 로 내려가면 ${path} — ` +
      `빈도 ${weight[leaf]} 짜리 글자에 ${path.length}비트`,
      { a: leaf, states: highlight });
  }

  const encodedBits = order.reduce((sum, [leaf, path]) => sum + weight[leaf] * path.length, 0);
  const fixedWidth = Math.max(1, Math.ceil(Math.log2(symbolCount)));
  const fixedBits = totalChars * fixedWidth;

  caption = 'PQ — 비었다';
  treeCaption = `완성 — 총 ${encodedBits}비트`;
  pushStep(13, 'done',
    `부호표: ${order.map(([leaf, path]) => `${symbol[leaf]}=${path}`).join(', ')}. ` +
    `전체 ${encodedBits}비트 — 같은 길이 부호(${fixedWidth}비트씩)로는 ${fixedBits}비트였다` +
    (encodedBits < fixedBits ? ` (${fixedBits - encodedBits}비트 절약)` : ''),
    { a: root });

  return steps;
}
