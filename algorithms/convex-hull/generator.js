// algorithms/convex-hull/generator.js — Model A 생성기(볼록 껍질, 앤드루 모노톤 체인).
//
// 평면 위 점들을 모두 감싸는 가장 작은 볼록 다각형을 구한다.
//   ① x(그다음 y) 로 정렬한다.
//   ② 아래 껍질: 왼쪽부터 훑으며, 마지막 두 점과 새 점이 **좌회전이 아니면** 마지막 점을 버린다.
//   ③ 위 껍질: 오른쪽부터 같은 방식으로.
//   방향 판정은 외적 cross(O,A,B) 의 부호 하나로 한다(>0 좌회전=반시계).
//
// 입력은 정수쌍(x y x y …)으로 읽는다. 시각화: geometry 슬롯(점 + 만들어지는 껍질).

export const category = 'geometry';
export const defaultInput = [1, 2, 4, 6, 7, 2, 5, 4, 3, 7, 8, 6];   // 6개 점(x,y 쌍)
export const inputLabel = '점 (x y …)';
export const inputHint = '정수를 둘씩 묶어 점 (x, y). 예: 1 2 4 6 7 2 → (1,2) (4,6) (7,2).';

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  const count = 5 + Math.floor(Math.random() * 2);   // 5..6 개 점
  const seen = new Set(), out = [];
  while (out.length < count * 2) {
    const x = Math.floor(Math.random() * 10), y = Math.floor(Math.random() * 10);
    const key = x + ',' + y;
    if (seen.has(key)) continue;
    seen.add(key); out.push(x, y);
  }
  return out;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'long long cross(P O, P A, P B) {              // >0: 좌회전(반시계)',
  '    return (A.x-O.x)*(B.y-O.y) - (A.y-O.y)*(B.x-O.x);',
  '}',
  'vector<P> convexHull(vector<P> p) {',
  '    sort(p.begin(), p.end());                 // x, 그다음 y',
  '    int n = p.size(), k = 0;',
  '    vector<P> h(2*n);',
  '    for (int i = 0; i < n; i++) {             // 아래 껍질',
  '        while (k >= 2 && cross(h[k-2], h[k-1], p[i]) <= 0) k--;',
  '        h[k++] = p[i];',
  '    }',
  '    for (int i = n-2, t = k+1; i >= 0; i--) { // 위 껍질',
  '        while (k >= t && cross(h[k-2], h[k-1], p[i]) <= 0) k--;',
  '        h[k++] = p[i];',
  '    }',
  '    h.resize(k-1);                            // 마지막은 시작점과 겹침',
  '    return h;',
  '}',
];

const cross = (pts, o, a, b) =>
  (pts[a].x - pts[o].x) * (pts[b].y - pts[o].y) - (pts[a].y - pts[o].y) * (pts[b].x - pts[o].x);

export function generate(input) {
  const raw = (Array.isArray(input) && input.length >= 4) ? input : defaultInput;
  // 정수쌍 → 점(입력 순서 유지). 중복 좌표는 제거.
  const pts = [];
  const seen = new Set();
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const x = Math.trunc(Number(raw[i]) || 0), y = Math.trunc(Number(raw[i + 1]) || 0);
    const key = x + ',' + y;
    if (seen.has(key)) continue;
    seen.add(key); pts.push({ x, y });
  }
  const n = pts.length;

  // 표시용 정규화(0..1). 원본 좌표는 외적 계산에 그대로 쓴다.
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const normPoints = pts.map(p => ({ x: (p.x - minX) / spanX, y: (p.y - minY) / spanY }));
  const labels = pts.map(p => `${p.x},${p.y}`);

  const state = new Array(n).fill(0);
  let caption = '';
  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],
    sortedFrom: 0,
    explain,
    geometry: {
      points: normPoints,
      states: state.slice(),
      labels,
      hull: (extra.hull || []).slice(),
      closed: !!extra.closed,
      testEdge: extra.testEdge,
      caption,
    },
  });

  if (n < 3) {
    caption = '점이 3개 미만 — 껍질은 점들 자체';
    for (let i = 0; i < n; i++) state[i] = 3;
    return [{ line: 16, op: 'done', a: -1, b: -1, values: [], sortedFrom: 0,
      explain: '점이 3개 미만이라 볼록 껍질을 이룰 수 없다',
      geometry: { points: normPoints, states: state, labels, hull: pts.map((_, i) => i), closed: false, caption } }];
  }

  caption = `점 ${n}개의 볼록 껍질을 구한다`;
  pushStep(4, 'start',
    `평면 위 점 ${n}개를 모두 감싸는 가장 작은 볼록 다각형을 구한다. ` +
    `먼저 x(그다음 y) 로 정렬한다`, {});

  // ── ① 정렬 ──
  const order = pts.map((_, i) => i).sort((i, j) => (pts[i].x - pts[j].x) || (pts[i].y - pts[j].y));
  caption = `정렬 순서: ${order.map(i => labels[i]).join(' → ')}`;
  pushStep(5, 'set', `x, 그다음 y 로 정렬했다. 가장 왼쪽 점부터 아래 껍질을 만든다`, {});

  const hull = [];   // 현재 껍질(입력 인덱스)
  const clearActive = () => { for (let i = 0; i < n; i++) if (state[i] === 2) state[i] = hull.includes(i) ? 1 : 0; };

  // 방향 판정 + 후퇴(pop)를 함께 처리하는 껍질 성장 헬퍼
  const grow = (idx, minSize, pushLine, popLine, phase) => {
    // 판정 대상 점을 활성 표시
    clearActive(); state[idx] = 2;
    while (hull.length >= minSize) {
      const a = hull[hull.length - 2], b = hull[hull.length - 1];
      const turn = cross(pts, a, b, idx);
      if (turn > 0) {
        pushStep(popLine, 'compare',
          `${phase}: (${labels[a]})→(${labels[b]})→(${labels[idx]}) 는 좌회전(cross=${turn}>0) → 유지`,
          { hull, testEdge: [a, b], a: b, b: idx });
        break;
      }
      // 우회전/일직선 → 마지막 점 b 를 버린다
      state[b] = 4;
      pushStep(popLine, 'compare',
        `${phase}: (${labels[a]})→(${labels[b]})→(${labels[idx]}) 는 ${turn === 0 ? '일직선' : '우회전'}(cross=${turn}≤0) → ${labels[b]} 버림`,
        { hull, testEdge: [a, b], a: b, b: idx });
      hull.pop();
      state[b] = 0;
    }
    hull.push(idx);
    clearActive();
    for (const h of hull) state[h] = 1;
    caption = `${phase} — 현재 껍질: ${hull.map(i => labels[i]).join(' → ')}`;
    pushStep(pushLine, 'write', `${phase}: (${labels[idx]}) 를 껍질에 넣는다`, { hull, a: idx });
  };

  // ── ② 아래 껍질 ──
  caption = '아래 껍질 만들기';
  for (const idx of order) grow(idx, 2, 10, 9, '아래 껍질');
  const lowerSize = hull.length;

  // ── ③ 위 껍질 ── (오른쪽에서 두 번째부터, 시작점 전까지)
  caption = '위 껍질 만들기';
  const minSizeUpper = lowerSize + 1;
  for (let oi = order.length - 2; oi >= 0; oi--) grow(order[oi], minSizeUpper, 14, 13, '위 껍질');

  // 마지막 점은 시작점과 겹치므로 뺀다
  hull.pop();
  for (let i = 0; i < n; i++) state[i] = hull.includes(i) ? 3 : 0;
  caption = `볼록 껍질 완성 — 꼭짓점 ${hull.length}개: ${hull.map(i => labels[i]).join(' → ')}`;
  pushStep(16, 'done',
    `볼록 껍질 완성 — 꼭짓점 ${hull.length}개. 정렬 O(n log n) 뒤 각 점을 상수 번 넣고 빼 O(n)`,
    { hull, closed: true });

  return steps;
}
