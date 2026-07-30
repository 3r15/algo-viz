// app/renderers/graph.js — 그래프 렌더러(type='graph').
//
// 정적 구조(nodes/edges/directed/weighted)는 알고리즘이 만든 그래프를 ctx.graph 로 받는다.
//
// 스텝에서 읽는 것:
//   step.values[i]   정점 i 의 상태: 0 미방문 · 1 발견(잠정) · 2 처리 중 · 3 확정
//   step.edgeStates  간선별 상태(graph.edges 와 같은 순서): 0 기본 · 1 검사 중 · 2 갱신됨 · 3 채택
//   step.nodeLabels  정점 아래 붙는 짧은 텍스트(다익스트라의 dist, A* 의 f=g+h 등)
//   step.queue / step.stack / step.pq   보조 자료구조 한 줄 표시
//
// SVG 는 그래프 구조가 바뀔 때만 재구성(WeakMap 캐시)하고, 매 스텝엔 class·텍스트만 갱신한다.

import { registerRenderer } from './registry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 100, VIEW_H = 60;      // viewBox 좌표계. 정점 x,y 는 0..1 비율
const NODE_RADIUS = 5.4;
const graphCaches = new WeakMap();    // host 요소 → { wrap, nodes, edges, graph }

// 보조 자료구조(스택·큐·PQ)는 이제 각자의 전용 렌더러가 자기 슬롯에서 크게 그린다
// (step.stack → stack 렌더러, step.queue → queue 렌더러, step.pq/heap → heap 렌더러).
// 그래서 graph 렌더러는 한 줄 요약을 더 그리지 않는다 — 같은 것을 두 번 보여 주지 않기 위해서다.

export function renderGraph(host, step, ctx) {
  const graph = ctx?.graph;
  if (!graph || !Array.isArray(step?.values)) return;

  let cache = graphCaches.get(host);
  // 그래프 객체가 바뀌면(사용자가 새로 그려 실행) 정점 수가 같아도 재구성
  if (!cache || cache.graph !== graph || !host.contains(cache.wrap)) {
    cache = buildSvg(host, graph);
    cache.graph = graph;
    graphCaches.set(host, cache);
  }

  step.values.forEach((nodeState, nodeId) => {
    const node = cache.nodes[nodeId];
    if (!node) return;
    node.group.setAttribute('class', 'gnode s' + nodeState);
    if (node.sideLabel) node.sideLabel.textContent = step.nodeLabels?.[nodeId] ?? '';
  });

  cache.edges.forEach((edge, edgeIndex) => {
    const edgeState = step.edgeStates?.[edgeIndex] ?? 0;
    edge.line.setAttribute('class', 'gedge e' + edgeState);
    if (edge.weightLabel) {
      edge.weightLabel.setAttribute('class', 'gweight e' + edgeState);
      // step.edgeLabels 가 있으면 가중치 대신 그 텍스트를 쓴다(예: 유량 "3/5"). 없으면 그대로.
      if (step.edgeLabels && step.edgeLabels[edgeIndex] != null)
        edge.weightLabel.textContent = step.edgeLabels[edgeIndex];
    }
  });
}

// 간선을 정점 원 바깥에서 시작·끝나게 잘라 낸다(화살촉이 원에 파묻히지 않도록)
function edgeGeometry(from, to) {
  const ax = from.x * VIEW_W, ay = from.y * VIEW_H;
  const bx = to.x * VIEW_W, by = to.y * VIEW_H;
  const dx = bx - ax, dy = by - ay;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length, uy = dy / length;
  return {
    x1: ax + ux * NODE_RADIUS, y1: ay + uy * NODE_RADIUS,
    x2: bx - ux * NODE_RADIUS, y2: by - uy * NODE_RADIUS,
    midX: (ax + bx) / 2, midY: (ay + by) / 2,
    normalX: -uy, normalY: ux,
  };
}

function buildSvg(host, graph) {
  host.innerHTML = '';
  host.classList.add('graph');

  const wrap = document.createElement('div');
  wrap.className = 'graphviz';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('class', 'graph-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '그래프 탐색 시각화');

  // 방향 그래프용 화살촉(호스트마다 id 가 겹치지 않도록 정점 수를 섞어 쓴다)
  const arrowId = `g-arrow-${Math.random().toString(36).slice(2, 8)}`;
  if (graph.directed) {
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', arrowId);
    marker.setAttribute('viewBox', '0 0 6 6');
    marker.setAttribute('refX', '5.6'); marker.setAttribute('refY', '3');
    marker.setAttribute('markerWidth', '4'); marker.setAttribute('markerHeight', '4');
    marker.setAttribute('orient', 'auto-start-reverse');
    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute('d', 'M0,0 L6,3 L0,6 z');
    head.setAttribute('class', 'garrowhead');
    marker.appendChild(head);
    defs.appendChild(marker);
    svg.appendChild(defs);
  }

  const edges = graph.edges.map(([u, v, weight]) => {
    const from = graph.nodes[u], to = graph.nodes[v];
    if (!from || !to) return { line: document.createElementNS(SVG_NS, 'line') };
    const geom = edgeGeometry(from, to);

    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', geom.x1); line.setAttribute('y1', geom.y1);
    line.setAttribute('x2', geom.x2); line.setAttribute('y2', geom.y2);
    line.setAttribute('class', 'gedge e0');
    if (graph.directed) line.setAttribute('marker-end', `url(#${arrowId})`);
    svg.appendChild(line);

    let weightLabel = null;
    if (graph.weighted) {
      weightLabel = document.createElementNS(SVG_NS, 'text');
      weightLabel.setAttribute('x', geom.midX + geom.normalX * 2.6);
      weightLabel.setAttribute('y', geom.midY + geom.normalY * 2.6);
      weightLabel.setAttribute('text-anchor', 'middle');
      weightLabel.setAttribute('dominant-baseline', 'central');
      weightLabel.setAttribute('class', 'gweight e0');
      weightLabel.textContent = weight ?? 1;
      svg.appendChild(weightLabel);
    }
    return { line, weightLabel };
  });

  const nodes = graph.nodes.map((node, nodeId) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'gnode s0');
    const cx = node.x * VIEW_W, cy = node.y * VIEW_H;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
    circle.setAttribute('r', NODE_RADIUS);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.textContent = node.label ?? nodeId;

    // 정점 아래 붙는 보조 라벨(거리 등). 값이 없으면 빈 문자열이라 보이지 않는다.
    const sideLabel = document.createElementNS(SVG_NS, 'text');
    sideLabel.setAttribute('x', cx);
    sideLabel.setAttribute('y', cy + NODE_RADIUS + 3.4);
    sideLabel.setAttribute('text-anchor', 'middle');
    sideLabel.setAttribute('class', 'gdist');

    group.append(circle, label, sideLabel);
    svg.appendChild(group);
    return { group, circle, label, sideLabel };
  });

  wrap.appendChild(svg);
  host.appendChild(wrap);

  return { wrap, nodes, edges };
}

registerRenderer('graph', renderGraph);
