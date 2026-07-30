// app/renderers/geometry.js — 2D 점/선 렌더러(type='geometry').
//
// 계산 기하 알고리즘용. 평면 위의 점들과, 그 위에 만들어지는 다각형/경로(껍질 등)를 그린다.
//
// 슬롯 규약 — 스텝의 step.geometry 를 읽는다:
//   step.geometry = {
//     points: [{ x, y }],       // 정규화 좌표 0..1 (원본 좌표는 생성기가 정규화해 넘긴다)
//     states: [int],            // 점 상태 0 기본 · 1 껍질후보 · 2 지금 보는 점 · 3 확정 · 4 버려짐
//     labels: [str],            // (선택) 점 옆 짧은 라벨(인덱스 등)
//     hull:   [i0, i1, ...],    // 현재 껍질을 이루는 점 인덱스 순서(열린 경로)
//     closed: bool,             // 참이면 hull 을 닫아 다각형으로
//     testEdge: [i, j],         // (선택) 지금 방향 판정 중인 변 — 강조
//     testApex: k,              // (선택) 판정 대상 점(테스트 삼각형의 꼭짓점)
//     caption: str,
//   }
//
// 점 집합이 그대로면 SVG 를 재사용하고(WeakMap 캐시), 매 스텝엔 class·껍질 경로만 갱신한다.

import { registerRenderer } from './registry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW = 100, PAD = 8;                 // viewBox 좌표계, 가장자리 여백
const caches = new WeakMap();              // host → { svg, dots, hullPath, testLine, structureKey }

// 정규화 좌표(0..1, y 위쪽이 큰 수학 좌표) → SVG 좌표(y 아래로 증가)
const sx = (x) => PAD + x * (VIEW - 2 * PAD);
const sy = (y) => PAD + (1 - y) * (VIEW - 2 * PAD);

export function renderGeometry(host, step) {
  const geo = step?.geometry;
  if (!geo || !Array.isArray(geo.points)) return;

  const structureKey = 'g:' + geo.points.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(';');
  let cache = caches.get(host);
  if (!cache || cache.structureKey !== structureKey || !host.contains(cache.svg)) {
    cache = buildSvg(host, geo, structureKey);
    caches.set(host, cache);
  }

  // 껍질 경로 갱신
  const hull = Array.isArray(geo.hull) ? geo.hull : [];
  const pointsAttr = hull.map(i => `${sx(geo.points[i].x)},${sy(geo.points[i].y)}`).join(' ');
  cache.hullPath.setAttribute('points', pointsAttr);
  cache.hullPath.setAttribute('class', 'geo-hull' + (geo.closed ? ' closed' : ''));

  // 방향 판정 변(있으면)
  if (Array.isArray(geo.testEdge) && geo.testEdge.length === 2) {
    const [i, j] = geo.testEdge;
    const a = geo.points[i], b = geo.points[j];
    cache.testLine.setAttribute('x1', sx(a.x)); cache.testLine.setAttribute('y1', sy(a.y));
    cache.testLine.setAttribute('x2', sx(b.x)); cache.testLine.setAttribute('y2', sy(b.y));
    cache.testLine.setAttribute('class', 'geo-test');
    cache.testLine.style.display = '';
  } else {
    cache.testLine.style.display = 'none';
  }

  // 점 상태·라벨
  for (const [index, dot] of cache.dots.entries()) {
    dot.circle.setAttribute('class', 'geo-dot s' + (geo.states?.[index] ?? 0));
    dot.label.textContent = geo.labels?.[index] ?? '';
  }
}

function buildSvg(host, geo, structureKey) {
  host.innerHTML = '';
  host.classList.add('geometry');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);
  svg.setAttribute('class', 'geo-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '평면 위 점과 껍질 시각화');

  // 껍질 다각형/경로(점 아래에 깔린다)
  const hullPath = document.createElementNS(SVG_NS, 'polyline');
  hullPath.setAttribute('class', 'geo-hull');
  svg.append(hullPath);

  // 방향 판정 변
  const testLine = document.createElementNS(SVG_NS, 'line');
  testLine.setAttribute('class', 'geo-test');
  testLine.style.display = 'none';
  svg.append(testLine);

  const dots = new Map();
  geo.points.forEach((p, index) => {
    const group = document.createElementNS(SVG_NS, 'g');

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', sx(p.x)); circle.setAttribute('cy', sy(p.y));
    circle.setAttribute('r', 2.3);
    circle.setAttribute('class', 'geo-dot s0');

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', sx(p.x)); label.setAttribute('y', sy(p.y) - 3.4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', 3.4);
    label.setAttribute('class', 'geo-label');

    group.append(circle, label);
    svg.append(group);
    dots.set(index, { circle, label });
  });

  host.append(svg);
  return { svg, dots, hullPath, testLine, structureKey };
}

registerRenderer('geometry', renderGeometry);
