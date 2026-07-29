// app/renderers/heap.js — 힙/우선순위 큐 렌더러(type='heap').
//
// 힙은 "배열 하나가 곧 완전 이진 트리" 라는 것이 전부인 자료구조다.
// 그래서 배열 줄과 트리 그림을 **함께** 그린다 — 같은 칸이 위아래로 대응된다.
//   부모 i 의 자식은 2i+1, 2i+2 (0-based).
//
// 슬롯 규약 — 스텝의 step.heap 을 읽는다(다른 렌더러와 데이터가 섞이지 않게):
//   step.heap = {
//     values: [...],       // 배열 표현. 트리 위치는 인덱스가 정한다
//     size,                // (선택) 힙 영역의 크기. 그 뒤는 힙 밖(정렬 완료 구역)
//     states: [...],       // (선택) 0 기본 · 1 비교 중 · 2 교환/갱신 · 3 확정 · 4 주목(루트 등)
//     labels: [...],       // (선택) 칸 아래 짧은 텍스트(거리·키 등)
//     shape: 'tree'        // 'tree'(기본, 진짜 이진 힙) · 'list'(정렬된 목록형 PQ)
//     caption,             // (선택) 한 줄 설명
//   }
//
// shape='list' 는 **트리를 그리지 않는다.** 내부를 이진 힙으로 유지하지 않는 구현
// (다익스트라의 "배열 + 매번 정렬" PQ 등)을 트리로 그리면 알고리즘이 만들지도 않은
// 구조를 보여 주게 되므로, 그럴 땐 정렬된 한 줄로만 그린다.
//
// 렌더링 규칙: 매 스텝 DOM 을 리빌드하지 않고 요소를 재사용한다(CSS transition 유지).
// 힙이 줄어들 때도 트리 노드를 지우지 않고 숨긴다 — 남은 칸의 위치가 흔들리지 않아야 한다.

import { registerRenderer } from './registry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEW_W = 720;
const LEVEL_H = 74, TOP_PAD = 34;
const NODE_R = 15;

const heapCaches = new WeakMap(); // host 요소 → { wrap, cells, nodes, edges, ... }

export function renderHeap(host, step) {
  const heap = step?.heap;
  if (!heap || !Array.isArray(heap.values)) return;

  const values = heap.values;
  const size = Number.isInteger(heap.size) ? Math.max(0, Math.min(heap.size, values.length)) : values.length;
  const asTree = heap.shape !== 'list';

  let cache = heapCaches.get(host);
  if (!cache || cache.count !== values.length || cache.asTree !== asTree || !host.contains(cache.wrap)) {
    cache = build(host, values.length, asTree);
    heapCaches.set(host, cache);
  }

  cache.caption.textContent = heap.caption || '';

  // 배열 줄 — 인덱스 슬롯 기준으로 그린다(중복 값이 있어도 슬롯이 안 섞이게)
  cache.cells.forEach((cell, index) => {
    cell.valueLabel.textContent = values[index] ?? '';
    cell.column.className = 'hcell s' + stateOf(heap, index, size);
    cell.subLabel.textContent = heap.labels?.[index] ?? '';
  });

  if (!asTree) return;

  // 트리 — 위치는 인덱스가 정하므로 힙이 줄어도 남은 노드는 제자리에 있다
  cache.nodes.forEach((node, index) => {
    const outside = index >= size ? ' out' : '';
    node.group.setAttribute('class', `hnode s${stateOf(heap, index, size)}${outside}`);
    node.valueText.textContent = values[index] ?? '';
  });
  cache.edges.forEach((edge, childIndex) => {
    edge.setAttribute('class', childIndex < size ? 'hedge' : 'hedge out');
  });
}

// 힙 밖(정렬 완료 구역)은 명시 상태가 없으면 '확정'(3)으로 본다 — 힙 정렬의 초록 꼬리.
function stateOf(heap, index, size) {
  const explicit = heap.states?.[index];
  if (Number.isInteger(explicit)) return explicit;
  return index < size ? 0 : 3;
}

function build(host, count, asTree) {
  host.innerHTML = '';
  host.classList.add('heap');

  const wrap = document.createElement('div');
  wrap.className = 'heapviz';

  const caption = document.createElement('div');
  caption.className = 'hcaption';

  const strip = document.createElement('div');
  strip.className = 'hstrip';
  const cells = [];
  for (let index = 0; index < count; index++) {
    const column = document.createElement('div');
    column.className = 'hcell s0';
    const valueLabel = document.createElement('div');
    valueLabel.className = 'hval';
    const subLabel = document.createElement('div');
    subLabel.className = 'hsub';
    // 배열 인덱스는 트리 위치와 1:1 이라 트리형에서만 뜻이 있다.
    // 목록형(PQ)에서는 꺼낼 순서일 뿐이라 왼쪽→오른쪽 배치로 충분하다.
    if (asTree) {
      const indexLabel = document.createElement('div');
      indexLabel.className = 'hix'; indexLabel.textContent = index;
      column.append(valueLabel, indexLabel, subLabel);
    } else {
      column.append(valueLabel, subLabel);
    }
    strip.append(column);
    cells.push({ column, valueLabel, subLabel });
  }

  wrap.append(caption, strip);
  host.append(wrap);

  if (!asTree) return { wrap, caption, cells, nodes: [], edges: [], count, asTree };

  const levels = count ? Math.floor(Math.log2(count)) + 1 : 1;
  const viewHeight = TOP_PAD + levels * LEVEL_H;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'heap-svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_W} ${viewHeight}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const positions = Array.from({ length: count }, (_, index) => nodePosition(index));

  // 간선을 먼저 깔아야 노드가 위에 온다. 간선은 "자식 인덱스" 로 식별한다.
  const edges = [];
  for (let index = 0; index < count; index++) {
    if (index === 0) { edges.push(document.createElementNS(SVG_NS, 'line')); continue; }
    const line = document.createElementNS(SVG_NS, 'line');
    const parent = positions[(index - 1) >> 1], child = positions[index];
    line.setAttribute('x1', parent.x); line.setAttribute('y1', parent.y);
    line.setAttribute('x2', child.x);  line.setAttribute('y2', child.y);
    line.setAttribute('class', 'hedge');
    svg.append(line);
    edges.push(line);
  }

  const nodes = positions.map((position, index) => {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'hnode s0');
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', position.x); circle.setAttribute('cy', position.y);
    circle.setAttribute('r', NODE_R);
    const valueText = document.createElementNS(SVG_NS, 'text');
    valueText.setAttribute('x', position.x); valueText.setAttribute('y', position.y + 4.5);
    valueText.setAttribute('text-anchor', 'middle');
    valueText.setAttribute('font-size', '13');
    const indexText = document.createElementNS(SVG_NS, 'text');
    indexText.setAttribute('x', position.x); indexText.setAttribute('y', position.y - NODE_R - 5);
    indexText.setAttribute('text-anchor', 'middle');
    indexText.setAttribute('font-size', '9.5');
    indexText.setAttribute('class', 'hix-svg');
    indexText.textContent = index;
    group.append(circle, valueText, indexText);
    svg.append(group);
    return { group, valueText };
  });

  wrap.append(svg);
  return { wrap, caption, cells, nodes, edges, count, asTree };
}

// 인덱스 → 좌표. 깊이 d 의 노드는 그 층을 2^d 등분한 자리에 놓인다.
function nodePosition(index) {
  const depth = Math.floor(Math.log2(index + 1));
  const offsetInLevel = index - ((1 << depth) - 1);
  const slots = 1 << depth;
  return {
    x: VIEW_W * (2 * offsetInLevel + 1) / (2 * slots),
    y: TOP_PAD + depth * LEVEL_H,
  };
}

registerRenderer('heap', renderHeap);
