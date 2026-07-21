// app/renderers/graph.js — 그래프 렌더러(type='graph').
//
// 정적 구조(nodes/edges)는 알고리즘이 export 한 graph 를 ctx.graph 로 받는다.
// 스텝의 values[i] = 정점 i 의 상태: 0 미방문 · 1 큐 대기 · 2 방문 중 · 3 완료.
// step.queue 는 현재 큐 내용(표시용).
//
// SVG 는 host 별로 1회 구성(WeakMap 캐시)하고, 매 스텝엔 정점 class 와 큐 텍스트만 갱신한다.

import { registerRenderer } from './registry.js';

const NS = 'http://www.w3.org/2000/svg';
const caches = new WeakMap();

export function renderGraph(host, step, ctx) {
  const graph = ctx?.graph;
  if (!graph || !Array.isArray(step?.values)) return;

  let cache = caches.get(host);
  if (!cache || cache.n !== graph.nodes.length || !host.contains(cache.root)) {
    cache = build(host, graph);
    caches.set(host, cache);
  }

  step.values.forEach((s, i) => {
    const node = cache.nodes[i];
    if (node) node.g.setAttribute('class', 'gnode s' + s);
  });
  const q = step.queue || [];
  cache.queue.textContent = 'queue  [ ' + q.join('   ') + ' ]';
}

function build(host, graph) {
  host.innerHTML = '';
  host.classList.add('graph');

  const wrap = document.createElement('div');
  wrap.className = 'graphviz';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 60');
  svg.setAttribute('class', 'graph-svg');

  for (const [u, v] of graph.edges) {
    const a = graph.nodes[u], b = graph.nodes[v];
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', a.x * 100); ln.setAttribute('y1', a.y * 60);
    ln.setAttribute('x2', b.x * 100); ln.setAttribute('y2', b.y * 60);
    ln.setAttribute('class', 'gedge');
    svg.appendChild(ln);
  }

  const nodes = graph.nodes.map((nd, i) => {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'gnode s0');
    const cx = nd.x * 100, cy = nd.y * 60;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', '5.4');
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', cx); t.setAttribute('y', cy);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
    t.textContent = nd.label ?? i;
    g.append(c, t);
    svg.appendChild(g);
    return { g, c, t };
  });

  wrap.appendChild(svg);
  const queue = document.createElement('div');
  queue.className = 'graph-queue';
  queue.textContent = 'queue  [ ]';
  wrap.appendChild(queue);
  host.appendChild(wrap);

  return { root: wrap, nodes, queue, n: graph.nodes.length };
}

registerRenderer('graph', renderGraph);
