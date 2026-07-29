// app/renderers/tree.js — 트리 렌더러(type='tree').
//
// 두 가지 트리 모양을 다룬다:
//   · kind:'perfect' — 배열로 저장된 완전 이진 트리(세그먼트 트리). 노드 i 의 자식은 2i, 2i+1.
//   · kind:'rooted'  — parent[] 로 주어진 일반 루트 트리(이진 상승의 대상 트리).
//
// 슬롯 규약 — 스텝의 step.tree 를 읽는다:
//   step.tree = {
//     kind: 'perfect', sz,            // 리프 개수(2의 거듭제곱). 노드 id = 1 .. 2*sz-1
//     kind: 'rooted',  parent, root,  // 노드 id = 0 .. parent.length-1
//     values: [...],                  // 노드 id 로 인덱싱. null/undefined 면 빈 노드
//     states: [...],                  // 0 기본 · 1 경로(관련) · 2 활성 · 3 확정(결과)
//     titles: [...],                  // (선택) <title> 툴팁 — 구간 등 상세 정보
//     marks:  { [id]: 'u' },          // (선택) 노드 위 포인터 배지
//   }
//
// SVG 는 트리 구조가 바뀔 때만 재구성하고(WeakMap 캐시), 매 스텝엔 값·class·배지만 갱신한다.

import { registerRenderer } from './registry.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 100, H = 60, PAD_Y = 7;
const caches = new WeakMap();

export function renderTree(host, step) {
  const t = step?.tree;
  if (!t) return;

  const sig = t.kind === 'perfect' ? `p:${t.sz}` : `r:${t.root}:${(t.parent || []).join(',')}`;
  let cache = caches.get(host);
  if (!cache || cache.sig !== sig || !host.contains(cache.root)) {
    cache = build(host, t, sig);
    caches.set(host, cache);
  }

  for (const [id, node] of cache.nodes) {
    const v = t.values?.[id];
    node.text.textContent = (v === null || v === undefined) ? '' : v;
    node.g.setAttribute('class', 'tnode s' + (t.states?.[id] ?? 0));
    node.title.textContent = t.titles?.[id] ?? '';
    const mark = t.marks?.[id];
    node.mark.textContent = mark ?? '';
  }
}

// ---- 레이아웃: 노드 id → {x, y, depth} ----

function layoutPerfect(sz) {
  const levels = Math.log2(sz) + 1;               // 루트 포함 레벨 수
  const pos = new Map();
  for (let d = 0; d < levels; d++) {
    const count = 1 << d;
    for (let p = 0; p < count; p++) {
      const id = count + p;
      pos.set(id, { x: ((p + 0.5) / count) * W, y: yAt(d, levels), depth: d });
    }
  }
  return { pos, levels, widest: sz, edges: edgesPerfect(sz) };
}

function edgesPerfect(sz) {
  const out = [];
  for (let i = 1; i < sz; i++) { out.push([i, 2 * i], [i, 2 * i + 1]); }
  return out;
}

function layoutRooted(parent, root) {
  const n = parent.length;
  const children = Array.from({ length: n }, () => []);
  for (let v = 0; v < n; v++) if (v !== root) children[parent[v]].push(v);

  const depth = new Array(n).fill(0);
  const order = [];                                // DFS 선행 순서(리프 x 배정용)
  (function dfs(v, d) {
    depth[v] = d;
    if (!children[v].length) order.push(v);
    for (const c of children[v]) dfs(c, d + 1);
  })(root, 0);

  const levels = Math.max(...depth) + 1;
  const pos = new Map();
  const leafX = new Map(order.map((v, k) => [v, ((k + 0.5) / order.length) * W]));

  // 리프는 순서대로, 내부 노드는 자식 x 의 평균 — 아래에서 위로 계산
  (function place(v) {
    for (const c of children[v]) place(c);
    const x = children[v].length
      ? children[v].reduce((s, c) => s + pos.get(c).x, 0) / children[v].length
      : leafX.get(v);
    pos.set(v, { x, y: yAt(depth[v], levels), depth: depth[v] });
  })(root);

  const edges = [];
  for (let v = 0; v < n; v++) for (const c of children[v]) edges.push([v, c]);
  return { pos, levels, widest: order.length, edges };
}

function yAt(d, levels) {
  return levels <= 1 ? H / 2 : PAD_Y + (d * (H - 2 * PAD_Y)) / (levels - 1);
}

// ---- SVG 구성 ----

function build(host, t, sig) {
  host.innerHTML = '';
  host.classList.add('tree');

  const { pos, widest, edges } = t.kind === 'perfect'
    ? layoutPerfect(t.sz)
    : layoutRooted(t.parent, t.root ?? 0);

  const bw = Math.max(5, Math.min((W / widest) * 0.82, 15));   // 노드 상자 너비
  const bh = Math.max(4.6, Math.min(bw * 0.7, 7));
  const fs = Math.min(3.6, bw * 0.42);                         // 상자 폭에 맞춘 글자 크기

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'tree-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '트리 구조 시각화');

  for (const [p, c] of edges) {
    const a = pos.get(p), b = pos.get(c);
    if (!a || !b) continue;
    const ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y + bh / 2);
    ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y - bh / 2);
    ln.setAttribute('class', 'tedge');
    svg.append(ln);
  }

  const nodes = new Map();
  for (const [id, p] of pos) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'tnode s0');

    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', p.x - bw / 2); rect.setAttribute('y', p.y - bh / 2);
    rect.setAttribute('width', bw); rect.setAttribute('height', bh);
    rect.setAttribute('rx', 1.4);

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', p.x); text.setAttribute('y', p.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', fs);

    const mark = document.createElementNS(NS, 'text');   // 포인터 배지(u / v)
    mark.setAttribute('x', p.x); mark.setAttribute('y', p.y - bh / 2 - 1.4);
    mark.setAttribute('text-anchor', 'middle');
    mark.setAttribute('font-size', fs * 0.95);
    mark.setAttribute('class', 'tmark');

    const title = document.createElementNS(NS, 'title');

    g.append(title, rect, text, mark);
    svg.append(g);
    nodes.set(id, { g, text, mark, title });
  }

  host.append(svg);
  return { root: svg, nodes, sig };
}

registerRenderer('tree', renderTree);
