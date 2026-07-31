// algorithms/closest-pair/generator.js — Model A 생성기(최근접 점 쌍, 분할 정복).
//
// 평면 위 점들 중 **가장 가까운 두 점**을 찾는다. 모든 쌍 비교는 O(n²).
//   분할 정복: x 로 정렬해 반으로 나누고(세로 분할선), 각 절반의 최근접을 재귀로 구한다.
//   두 답 중 작은 거리 d 를 얻은 뒤, 분할선에서 좌우 d 안의 **띠(strip)** 만 검사한다.
//   띠 안에서는 y 로 정렬하면 각 점당 상수 개만 비교하면 되어, 전체 O(n log n).
//
// 입력은 정수쌍(x y …, 최대 6점). 시각화: geometry 슬롯(점 + 분할선 + 최근접 쌍 선).

export const category = 'geometry';
export const defaultInput = [1, 3, 2, 8, 4, 5, 6, 7, 7, 2, 8, 6];   // 6점
export const inputLabel = '점 (x y …)';
export const inputHint = '정수를 둘씩 묶어 점 (x, y). 가장 가까운 두 점을 분할 정복으로 찾는다.';

export function randomInput() {
  const count = 5 + Math.floor(Math.random() * 2);
  const seen = new Set(), out = [];
  while (out.length < count * 2) {
    const x = Math.floor(Math.random() * 12), y = Math.floor(Math.random() * 12);
    const key = x + ',' + y;
    if (seen.has(key)) continue;
    seen.add(key); out.push(x, y);
  }
  return out;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// x 로 정렬된 점들에서 최근접 쌍 거리(제곱)',
  'long long closest(vector<P>& px) {',
  '    int n = px.size();',
  '    if (n <= 3) return brute(px);            // 작으면 전수 비교',
  '    int mid = n / 2;',
  '    long long midX = px[mid].x;              // 세로 분할선',
  '    long long dl = closest(left half);       // 왼쪽 재귀',
  '    long long dr = closest(right half);      // 오른쪽 재귀',
  '    long long d = min(dl, dr);',
  '    // 분할선에서 ±√d 안의 점만 모아(띠)',
  '    vector<P> strip = { |x - midX|² < d 인 점 };',
  '    sort(strip by y);',
  '    for (i : strip)                          // 띠 안에서',
  '        for (j : 다음 몇 개, y차²<d)',
  '            d = min(d, dist²(strip[i], strip[j]));',
  '    return d;',
  '}',
];

export function generate(input) {
  const raw = (Array.isArray(input) && input.length >= 4) ? input : defaultInput;
  const pts = [];
  const seen = new Set();
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const x = Math.trunc(Number(raw[i]) || 0), y = Math.trunc(Number(raw[i + 1]) || 0);
    const key = x + ',' + y;
    if (seen.has(key)) continue;
    seen.add(key); pts.push({ x, y });
  }
  const n = pts.length;

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1, spanY = maxY - minY || 1;
  const normPoints = pts.map(p => ({ x: (p.x - minX) / spanX, y: (p.y - minY) / spanY }));
  const labels = pts.map(p => `${p.x},${p.y}`);
  const normX = i => (pts[i].x - minX) / spanX;

  const state = new Array(n).fill(0);
  const dist2 = (i, j) => (pts[i].x - pts[j].x) ** 2 + (pts[i].y - pts[j].y) ** 2;
  let best = { i: -1, j: -1, d2: Infinity };
  let caption = '';

  const steps = [];
  const push = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1, values: [], sortedFrom: 0, explain,
    geometry: {
      points: normPoints, states: state.slice(), labels,
      hull: best.i >= 0 ? [best.i, best.j] : [],
      testEdge: extra.testEdge, divideX: extra.divideX, caption,
    },
  });

  if (n < 2) {
    return [{ line: 2, op: 'done', a: -1, b: -1, values: [], sortedFrom: 0, explain: '점이 2개 미만',
      geometry: { points: normPoints, states: state, labels, hull: [], caption: '점 부족' } }];
  }

  const order = pts.map((_, i) => i).sort((a, b) => (pts[a].x - pts[b].x) || (pts[a].y - pts[b].y));
  caption = `점 ${n}개 — x 로 정렬 후 분할 정복`;
  push(2, 'start',
    `평면 위 점 ${n}개 중 가장 가까운 두 점을 찾는다. x 로 정렬하고, 세로 분할선으로 반씩 나눠 재귀한다`);

  const consider = (i, j, tag) => {
    const d2 = dist2(i, j);
    const better = d2 < best.d2;
    if (better) { best = { i, j, d2 }; }
    for (let k = 0; k < n; k++) if (state[k] === 2) state[k] = 0;
    state[i] = 2; state[j] = 2;
    caption = better ? `새 최소! d² = ${d2} (${labels[i]}–${labels[j]})` : `d² = ${d2} ≥ 현재 최소 ${best.d2}`;
    push(better ? 14 : 13, better ? 'write' : 'compare',
      `${tag}: (${labels[i]})–(${labels[j]}) 거리² = ${d2}` + (better ? ` — 지금까지 최소로 갱신` : ` (그대로)`),
      { a: i, b: j, testEdge: [i, j] });
  };

  // 분할 정복 (idxList: x 정렬된 인덱스들)
  const solve = (idxList, depth) => {
    const m = idxList.length;
    if (m <= 3) {
      for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) consider(idxList[a], idxList[b], `기저(${m}점 전수)`);
      return;
    }
    const mid = m >> 1;
    const dX = (normX(idxList[mid - 1]) + normX(idxList[mid])) / 2;
    const midRealX = (pts[idxList[mid - 1]].x + pts[idxList[mid]].x) / 2;
    caption = `분할 — 세로선 x≈${midRealX} 기준 좌 ${mid} · 우 ${m - mid}`;
    push(6, 'set', `점들을 세로 분할선으로 나눈다(왼쪽 ${mid}개, 오른쪽 ${m - mid}개). 각각 재귀로 최근접을 구한다`,
      { divideX: dX });

    solve(idxList.slice(0, mid), depth + 1);
    solve(idxList.slice(mid), depth + 1);

    // 띠: 분할선에서 ±√d 안의 점만, y 로 정렬해 이웃 몇 개만 비교
    const d = Math.sqrt(best.d2);
    const strip = idxList.filter(i => Math.abs(pts[i].x - midRealX) < d).sort((a, b) => pts[a].y - pts[b].y);
    for (let k = 0; k < n; k++) if (state[k] === 1) state[k] = 0;
    for (const i of strip) state[i] = 1;
    caption = `띠 검사 — 분할선 ±${d.toFixed(1)} 안 ${strip.length}점(y 정렬). 각 점당 상수 개만`;
    push(11, 'read', `분할선 좌우 √d=${d.toFixed(2)} 안의 ${strip.length}점만 띠에 모아 비교한다(대부분 걸러진다)`,
      { divideX: dX });
    for (let a = 0; a < strip.length; a++) {
      for (let b = a + 1; b < strip.length && (pts[strip[b]].y - pts[strip[a]].y) ** 2 < best.d2; b++) {
        consider(strip[a], strip[b], '띠');
      }
    }
    for (let k = 0; k < n; k++) if (state[k] === 1) state[k] = 0;
  };

  solve(order, 0);

  for (let k = 0; k < n; k++) state[k] = 0;
  state[best.i] = 3; state[best.j] = 3;
  caption = `최근접 점 쌍: ${labels[best.i]} — ${labels[best.j]}, 거리 ${Math.sqrt(best.d2).toFixed(3)}`;
  push(16, 'done',
    `가장 가까운 두 점: (${labels[best.i]})–(${labels[best.j]}), 거리² = ${best.d2} (거리 ${Math.sqrt(best.d2).toFixed(3)}). ` +
    `x 정렬 O(n log n) + 각 병합의 띠 검사가 상수라 전체 O(n log n)`);

  return steps;
}
