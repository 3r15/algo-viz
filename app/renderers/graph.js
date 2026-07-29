// app/renderers/graph.js — 그래프 렌더러(type='graph').
//
// 정적 구조(nodes/edges)는 알고리즘이 export 한 graph 를 ctx.graph 로 받는다.
// 스텝의 values[i] = 정점 i 의 상태: 0 미방문 · 1 큐 대기 · 2 방문 중 · 3 완료.
// step.queue 는 현재 큐 내용(표시용).
//
// SVG 는 host 별로 1회 구성(WeakMap 캐시)하고, 매 스텝엔 정점 class 와 큐 텍스트만 갱신한다.

import { registerRenderer } from './registry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 100, VIEW_H = 60;                  // viewBox 좌표계. 정점 x,y 는 0..1 비율
const graphCaches = new WeakMap();                // host 요소 → { wrap, nodes, queueLabel, graph }

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

  step.values.forEach((state, nodeId) => {
    const node = cache.nodes[nodeId];
    if (node) node.group.setAttribute('class', 'gnode s' + state);
  });

  // 보조 자료구조: DFS 는 stack, BFS 는 queue
  const usesStack = Array.isArray(step.stack);
  const items = (usesStack ? step.stack : step.queue) || [];
  cache.queueLabel.textContent = (usesStack ? 'stack' : 'queue') + '  [ ' + items.join('   ') + ' ]';
}

function buildSvg(host, graph) {
  host.innerHTML = '';
  host.classList.add('graph');

  const wrap = document.createElement('div');
  wrap.className = 'graphviz';

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('class', 'graph-svg');

  for (const [from, to] of graph.edges) {
    const a = graph.nodes[from], b = graph.nodes[to];
    const edge = document.createElementNS(SVG_NS, 'line');
    edge.setAttribute('x1', a.x * VIEW_W); edge.setAttribute('y1', a.y * VIEW_H);
    edge.setAttribute('x2', b.x * VIEW_W); edge.setAttribute('y2', b.y * VIEW_H);
    edge.setAttribute('class', 'gedge');
    svg.appendChild(edge);
  }

  const nodes = graph.nodes.map((node, nodeId) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'gnode s0');
    const cx = node.x * VIEW_W, cy = node.y * VIEW_H;

    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', '5.4');

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy);
    label.setAttribute('text-anchor', 'middle'); label.setAttribute('dominant-baseline', 'central');
    label.textContent = node.label ?? nodeId;

    group.append(circle, label);
    svg.appendChild(group);
    return { group, circle, label };
  });

  wrap.appendChild(svg);
  const queueLabel = document.createElement('div');
  queueLabel.className = 'graph-queue';
  queueLabel.textContent = 'queue  [ ]';
  wrap.appendChild(queueLabel);
  host.appendChild(wrap);

  return { wrap, nodes, queueLabel };
}

registerRenderer('graph', renderGraph);
