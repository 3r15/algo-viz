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

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 100, VIEW_H = 60, MARGIN_Y = 7;   // viewBox 좌표계(픽셀 아님)
const treeCaches = new WeakMap();                 // host 요소 → { svg, nodes, structureKey }

export function renderTree(host, step) {
  const tree = step?.tree;
  if (!tree) return;

  // 트리 모양이 그대로면 SVG 를 재사용한다(요소 재사용 = transition 유지)
  const structureKey = tree.kind === 'perfect'
    ? `perfect:${tree.sz}`
    : `rooted:${tree.root}:${(tree.parent || []).join(',')}`;

  let cache = treeCaches.get(host);
  if (!cache || cache.structureKey !== structureKey || !host.contains(cache.svg)) {
    cache = buildSvg(host, tree, structureKey);
    treeCaches.set(host, cache);
  }

  for (const [nodeId, node] of cache.nodes) {
    const value = tree.values?.[nodeId];
    node.valueText.textContent = (value === null || value === undefined) ? '' : value;
    node.group.setAttribute('class', 'tnode s' + (tree.states?.[nodeId] ?? 0));
    node.tooltip.textContent = tree.titles?.[nodeId] ?? '';
    node.markText.textContent = tree.marks?.[nodeId] ?? '';
  }
}

// ---- 레이아웃: 노드 id → { x, y, depth } ----

// 완전 이진 트리: 깊이 d 의 노드는 2^d 개이고, 그 안의 순번으로 x 가 정해진다.
function layoutPerfect(leafCount) {
  const levelCount = Math.log2(leafCount) + 1;      // 루트 포함 레벨 수
  const positions = new Map();
  for (let depth = 0; depth < levelCount; depth++) {
    const nodesAtDepth = 1 << depth;
    for (let slot = 0; slot < nodesAtDepth; slot++) {
      const nodeId = nodesAtDepth + slot;
      positions.set(nodeId, {
        x: ((slot + 0.5) / nodesAtDepth) * VIEW_W,
        y: yForDepth(depth, levelCount),
        depth,
      });
    }
  }

  const edges = [];
  for (let parentId = 1; parentId < leafCount; parentId++)
    edges.push([parentId, 2 * parentId], [parentId, 2 * parentId + 1]);

  return { positions, widestLevel: leafCount, edges };
}

// 일반 루트 트리: 리프를 DFS 순서대로 가로로 늘어놓고, 내부 노드는 자식들의 x 평균에 둔다.
function layoutRooted(parent, root) {
  const nodeCount = parent.length;
  const children = Array.from({ length: nodeCount }, () => []);
  for (let node = 0; node < nodeCount; node++)
    if (node !== root) children[parent[node]].push(node);

  const depths = new Array(nodeCount).fill(0);
  const leavesInOrder = [];
  (function walk(node, depth) {
    depths[node] = depth;
    if (!children[node].length) leavesInOrder.push(node);
    for (const child of children[node]) walk(child, depth + 1);
  })(root, 0);

  const levelCount = Math.max(...depths) + 1;
  const leafX = new Map(leavesInOrder.map((leaf, order) =>
    [leaf, ((order + 0.5) / leavesInOrder.length) * VIEW_W]));

  // 자식을 먼저 배치해야 평균을 낼 수 있으므로 후위 순회로 내려갔다 올라온다
  const positions = new Map();
  (function place(node) {
    for (const child of children[node]) place(child);
    const x = children[node].length
      ? children[node].reduce((sum, child) => sum + positions.get(child).x, 0) / children[node].length
      : leafX.get(node);
    positions.set(node, { x, y: yForDepth(depths[node], levelCount), depth: depths[node] });
  })(root);

  const edges = [];
  for (let node = 0; node < nodeCount; node++)
    for (const child of children[node]) edges.push([node, child]);

  return { positions, widestLevel: leavesInOrder.length, edges };
}

function yForDepth(depth, levelCount) {
  return levelCount <= 1
    ? VIEW_H / 2
    : MARGIN_Y + (depth * (VIEW_H - 2 * MARGIN_Y)) / (levelCount - 1);
}

// ---- SVG 구성 ----

function buildSvg(host, tree, structureKey) {
  host.innerHTML = '';
  host.classList.add('tree');

  const { positions, widestLevel, edges } = tree.kind === 'perfect'
    ? layoutPerfect(tree.sz)
    : layoutRooted(tree.parent, tree.root ?? 0);

  // 가장 넓은 레벨에 맞춰 상자 크기를 정한다 — 노드가 많을수록 작고 촘촘하게
  const boxW = Math.max(5, Math.min((VIEW_W / widestLevel) * 0.82, 15));
  const boxH = Math.max(4.6, Math.min(boxW * 0.7, 7));
  const fontSize = Math.min(3.6, boxW * 0.42);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute('class', 'tree-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '트리 구조 시각화');

  for (const [parentId, childId] of edges) {
    const from = positions.get(parentId), to = positions.get(childId);
    if (!from || !to) continue;
    const edge = document.createElementNS(SVG_NS, 'line');
    edge.setAttribute('x1', from.x); edge.setAttribute('y1', from.y + boxH / 2);
    edge.setAttribute('x2', to.x);   edge.setAttribute('y2', to.y - boxH / 2);
    edge.setAttribute('class', 'tedge');
    svg.append(edge);
  }

  const nodes = new Map();
  for (const [nodeId, pos] of positions) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'tnode s0');

    const box = document.createElementNS(SVG_NS, 'rect');
    box.setAttribute('x', pos.x - boxW / 2); box.setAttribute('y', pos.y - boxH / 2);
    box.setAttribute('width', boxW); box.setAttribute('height', boxH);
    box.setAttribute('rx', 1.4);

    const valueText = document.createElementNS(SVG_NS, 'text');
    valueText.setAttribute('x', pos.x); valueText.setAttribute('y', pos.y);
    valueText.setAttribute('text-anchor', 'middle');
    valueText.setAttribute('dominant-baseline', 'central');
    valueText.setAttribute('font-size', fontSize);

    const markText = document.createElementNS(SVG_NS, 'text');   // 포인터 배지(u / v)
    markText.setAttribute('x', pos.x); markText.setAttribute('y', pos.y - boxH / 2 - 1.4);
    markText.setAttribute('text-anchor', 'middle');
    markText.setAttribute('font-size', fontSize * 0.95);
    markText.setAttribute('class', 'tmark');

    const tooltip = document.createElementNS(SVG_NS, 'title');

    group.append(tooltip, box, valueText, markText);
    svg.append(group);
    nodes.set(nodeId, { group, valueText, markText, tooltip });
  }

  host.append(svg);
  return { svg, nodes, structureKey };
}

registerRenderer('tree', renderTree);
