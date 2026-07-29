// app/graph-editor.js — 그래프 직접 입력 편집기.
//
// 사용자가 정점/간선을 그려 그래프를 만들고, 인접 리스트/행렬로 변환해 보여준다.
// "실행" 시 onRun(getGraph()) 을 호출한다.
//
//   createGraphEditor(initialGraph, { onRun, capabilities }) → { el, getGraph, setGraph }
//
// 옵션(방향 / 가중치)은 두 조건이 모두 참일 때만 설정 가능:
//   (1) 편집기에 해당 기능이 구현됨(IMPLEMENTED)   (2) 알고리즘이 지원함(capabilities)
// 그렇지 않으면 비활성 + 사유 표시("준비 중" = 미구현, "미지원" = 알고리즘이 안 씀).
//
// 간선은 [u, v, w] 3원소(가중치). 기본 가중치 w=1. 정점 id = 배열 인덱스(삭제 시 재번호).
// 방향 그래프에서는 u→v 와 v→u 가 서로 다른 간선이다.

const NS = 'http://www.w3.org/2000/svg';
const clamp01 = value => Math.max(0.05, Math.min(0.95, value));

// 편집기에 실제 구현된 기능
const IMPLEMENTED = { directed: true, weighted: true };

const NODE_RADIUS = 5.2;          // viewBox 단위
const NODE_HIT_RADIUS = 7;
const EDGE_HIT_RADIUS = 2.6;
const MAX_WEIGHT = 9;             // 라벨이 한 자리로 유지되도록

const MODES = [
  { id: 'node',   label: '＋ 정점',   hint: '빈 곳을 클릭해 정점을 추가' },
  { id: 'edge',   label: '／ 간선',   hint: '정점 두 개를 차례로 클릭해 간선 연결' },
  { id: 'weight', label: '⚖ 가중치', hint: `간선을 클릭할 때마다 가중치 +1 (${MAX_WEIGHT} 다음엔 1)`,
    needs: 'weighted' },
  { id: 'start',  label: '▶ 시작점',  hint: '정점을 클릭해 시작점으로 지정' },
  { id: 'delete', label: '🗑 삭제',   hint: '정점을 클릭해 (연결된 간선과 함께) 삭제' },
];

export function createGraphEditor(initial, { onRun, capabilities } = {}) {
  const caps = { directed: false, weighted: false, ...(capabilities || {}) };
  const canUse = option => caps[option] && IMPLEMENTED[option];

  const state = {
    nodes: (initial?.nodes || []).map(node => ({ x: node.x, y: node.y })),
    edges: (initial?.edges || []).map(([u, v, w]) => [u, v, w ?? 1]),
    start: initial?.start ?? 0,
    // 알고리즘이 지원하고 편집기가 구현했을 때만 초기값을 살린다
    directed: canUse('directed') ? !!initial?.directed : false,
    weighted: canUse('weighted') ? !!initial?.weighted : false,
    mode: 'node',
    pending: -1,        // 간선 모드에서 먼저 고른 정점
    adjView: 'list',
  };

  // 옵션 상태: enabled(설정 가능) + note(비활성 사유)
  const optionState = option => {
    if (!caps[option]) return { enabled: false, note: '미지원' };
    if (!IMPLEMENTED[option]) return { enabled: false, note: '준비 중' };
    return { enabled: true, note: '' };
  };
  const optionRow = (option, label) => {
    const status = optionState(option);
    return `<label class="ge-opt${status.enabled ? '' : ' ge-disabled'}">` +
      `<input type="checkbox" data-opt="${option}" ${status.enabled ? '' : 'disabled'}` +
      `${state[option] ? ' checked' : ''}> ${label}` +
      `${status.note ? `<span class="ge-soon">${status.note}</span>` : ''}</label>`;
  };

  const root = document.createElement('div');
  root.className = 'geditor';
  root.innerHTML = `
    <div class="ge-bar">
      <div class="ge-modes">
        ${MODES.map(mode =>
          `<button type="button" class="ge-mode${mode.id === 'node' ? ' on' : ''}" ` +
          `data-mode="${mode.id}">${mode.label}</button>`).join('')}
      </div>
      <div class="ge-right">
        <div class="ge-opts">
          ${optionRow('directed', '방향')}
          ${optionRow('weighted', '가중치')}
        </div>
        <button type="button" class="ge-clear">전체 지우기</button>
        <button type="button" class="btn primary ge-run">실행</button>
      </div>
    </div>
    <div class="ge-hint"></div>
    <svg class="ge-canvas" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
      <defs>
        <marker id="ge-arrow" viewBox="0 0 6 6" refX="5.4" refY="3"
                markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 z" class="ge-arrowhead" />
        </marker>
      </defs>
    </svg>
    <div class="ge-adj">
      <div class="ge-adj-head"><span class="ge-adj-title">인접 리스트</span>
        <button type="button" class="ge-adj-toggle">행렬로</button></div>
      <pre class="ge-adj-body"></pre>
    </div>`;

  const svg = root.querySelector('.ge-canvas');
  const defs = svg.querySelector('defs');
  const hintEl = root.querySelector('.ge-hint');
  const adjBody = root.querySelector('.ge-adj-body');

  root.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    state.pending = -1;
    draw();
  }));
  root.querySelectorAll('[data-opt]').forEach(checkbox => checkbox.addEventListener('change', () => {
    state[checkbox.dataset.opt] = checkbox.checked;
    if (checkbox.dataset.opt === 'weighted' && !checkbox.checked && state.mode === 'weight')
      state.mode = 'node';                      // 가중치를 끄면 가중치 모드에서 빠져나온다
    draw();
  }));
  root.querySelector('.ge-clear').addEventListener('click', () => {
    state.nodes = []; state.edges = []; state.start = 0; state.pending = -1; draw();
  });
  root.querySelector('.ge-run').addEventListener('click', () => onRun && onRun(getGraph()));
  root.querySelector('.ge-adj-toggle').addEventListener('click', () => {
    state.adjView = state.adjView === 'list' ? 'matrix' : 'list';
    root.querySelector('.ge-adj-title').textContent = state.adjView === 'list' ? '인접 리스트' : '인접 행렬';
    root.querySelector('.ge-adj-toggle').textContent = state.adjView === 'list' ? '행렬로' : '리스트로';
    drawAdj();
  });
  svg.addEventListener('click', onCanvasClick);

  /* ── 좌표 / 히트 판정 ── */

  // 화면 좌표(클릭) → viewBox 좌표(0..100 × 0..60)
  function toViewbox(event) {
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) return null;
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX; screenPoint.y = event.clientY;
    const viewPoint = screenPoint.matrixTransform(screenMatrix.inverse());
    return { x: viewPoint.x, y: viewPoint.y };
  }

  const nodeX = node => node.x * 100;
  const nodeY = node => node.y * 60;

  // 클릭 지점에서 가장 가까운 정점. 반경 밖이면 -1.
  function findNode(x, y) {
    let nearest = -1, nearestDistSq = NODE_HIT_RADIUS * NODE_HIT_RADIUS;
    state.nodes.forEach((node, index) => {
      const dx = nodeX(node) - x, dy = nodeY(node) - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) { nearestDistSq = distSq; nearest = index; }
    });
    return nearest;
  }

  // 점과 선분 사이 거리의 제곱
  function pointToSegmentDistSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
    const cx = ax + t * dx, cy = ay + t * dy;
    return (px - cx) ** 2 + (py - cy) ** 2;
  }

  // 클릭 지점에서 가장 가까운 간선의 인덱스. 반경 밖이면 -1.
  function findEdge(x, y) {
    let nearest = -1, nearestDistSq = EDGE_HIT_RADIUS * EDGE_HIT_RADIUS;
    state.edges.forEach(([u, v], index) => {
      const from = state.nodes[u], to = state.nodes[v];
      if (!from || !to) return;
      const distSq = pointToSegmentDistSq(x, y, nodeX(from), nodeY(from), nodeX(to), nodeY(to));
      if (distSq < nearestDistSq) { nearestDistSq = distSq; nearest = index; }
    });
    return nearest;
  }

  function onCanvasClick(event) {
    const point = toViewbox(event);
    if (!point || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 60) return;

    if (state.mode === 'weight') {              // 간선을 클릭 → 가중치 순환
      const edgeIndex = findEdge(point.x, point.y);
      if (edgeIndex >= 0) {
        const edge = state.edges[edgeIndex];
        edge[2] = (edge[2] % MAX_WEIGHT) + 1;
      }
      draw();
      return;
    }

    const hit = findNode(point.x, point.y);
    if (state.mode === 'node') {
      if (hit < 0) state.nodes.push({ x: clamp01(point.x / 100), y: clamp01(point.y / 60) });
    } else if (state.mode === 'edge') {
      if (hit >= 0) {
        if (state.pending < 0) state.pending = hit;
        else if (state.pending !== hit) { addEdge(state.pending, hit); state.pending = -1; }
        else state.pending = -1;
      }
    } else if (state.mode === 'start') {
      if (hit >= 0) state.start = hit;
    } else if (state.mode === 'delete') {
      if (hit >= 0) deleteNode(hit);
    }
    draw();
  }

  // 무방향에서는 (u,v) 와 (v,u) 가 같은 간선이지만, 방향 그래프에서는 서로 다르다.
  function addEdge(u, v) {
    const duplicate = state.edges.some(([from, to]) =>
      (from === u && to === v) || (!state.directed && from === v && to === u));
    if (!duplicate) state.edges.push([u, v, 1]);
  }

  // 정점 하나를 지우면 뒤쪽 정점들의 번호가 한 칸씩 당겨지므로 간선도 함께 재번호한다
  function deleteNode(removed) {
    state.nodes.splice(removed, 1);
    state.edges = state.edges
      .filter(([u, v]) => u !== removed && v !== removed)
      .map(([u, v, w]) => [u > removed ? u - 1 : u, v > removed ? v - 1 : v, w]);
    if (state.start === removed) state.start = 0;
    else if (state.start > removed) state.start--;
    if (state.start >= state.nodes.length) state.start = Math.max(0, state.nodes.length - 1);
    state.pending = -1;
  }

  /* ── 렌더 ── */

  function draw() {
    // 가중치를 못 쓰는 상태에서 가중치 모드에 머물지 않게
    if (state.mode === 'weight' && !state.weighted) state.mode = 'node';
    drawModes(); drawHint(); drawCanvas(); drawAdj();
  }

  function drawModes() {
    root.querySelectorAll('[data-mode]').forEach(button => {
      const mode = MODES.find(candidate => candidate.id === button.dataset.mode);
      button.hidden = !!mode.needs && !state[mode.needs];
      button.classList.toggle('on', button.dataset.mode === state.mode);
    });
  }

  function drawHint() {
    const mode = MODES.find(candidate => candidate.id === state.mode);
    const pendingNote = state.mode === 'edge' && state.pending >= 0
      ? ` — ${state.pending} 선택됨, 두 번째 정점 클릭` : '';
    const kind = `${state.directed ? '방향' : '무방향'}·${state.weighted ? '가중' : '비가중'}`;
    hintEl.innerHTML =
      `<b>${mode.label.replace(/^\S+\s/, '')}</b> 모드: ${mode.hint}${pendingNote}` +
      `<span class="ge-stat">${kind} · 정점 ${state.nodes.length} · 간선 ${state.edges.length} · ` +
      `시작 ${state.nodes.length ? state.start : '—'}</span>`;
  }

  // 간선을 정점 원 바깥에서 시작·끝나게 잘라 낸다(화살촉이 원에 파묻히지 않도록)
  function edgeGeometry(from, to) {
    const ax = nodeX(from), ay = nodeY(from), bx = nodeX(to), by = nodeY(to);
    const dx = bx - ax, dy = by - ay;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length, uy = dy / length;
    return {
      x1: ax + ux * NODE_RADIUS, y1: ay + uy * NODE_RADIUS,
      x2: bx - ux * NODE_RADIUS, y2: by - uy * NODE_RADIUS,
      midX: (ax + bx) / 2, midY: (ay + by) / 2,
      normalX: -uy, normalY: ux,          // 가중치 라벨을 선 옆으로 밀 방향
    };
  }

  function drawCanvas() {
    while (svg.lastChild && svg.lastChild !== defs) svg.removeChild(svg.lastChild);

    state.edges.forEach(([u, v, weight]) => {
      const from = state.nodes[u], to = state.nodes[v];
      if (!from || !to) return;
      const geom = edgeGeometry(from, to);

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', geom.x1); line.setAttribute('y1', geom.y1);
      line.setAttribute('x2', geom.x2); line.setAttribute('y2', geom.y2);
      line.setAttribute('class', 'ge-edge');
      if (state.directed) line.setAttribute('marker-end', 'url(#ge-arrow)');
      svg.appendChild(line);

      if (state.weighted) {
        const label = document.createElementNS(NS, 'text');
        label.setAttribute('x', geom.midX + geom.normalX * 2.6);
        label.setAttribute('y', geom.midY + geom.normalY * 2.6);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'central');
        label.setAttribute('class', 'ge-weight');
        label.textContent = weight;
        svg.appendChild(label);
      }
    });

    state.nodes.forEach((node, index) => {
      const group = document.createElementNS(NS, 'g');
      let className = 'ge-node';
      if (index === state.start) className += ' start';
      if (index === state.pending) className += ' pending';
      group.setAttribute('class', className);

      const cx = nodeX(node), cy = nodeY(node);
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
      circle.setAttribute('r', NODE_RADIUS);

      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', cx); label.setAttribute('y', cy);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.textContent = index;

      group.append(circle, label);
      svg.appendChild(group);
    });
  }

  function drawAdj() {
    const nodeCount = state.nodes.length;
    if (!nodeCount) { adjBody.textContent = '(정점 없음)'; return; }

    const adj = Array.from({ length: nodeCount }, () => new Map());   // 이웃 → 가중치
    for (const [u, v, weight] of state.edges) {
      if (u >= nodeCount || v >= nodeCount) continue;
      adj[u].set(v, weight);
      if (!state.directed) adj[v].set(u, weight);
    }
    const neighbors = adj.map(byNeighbor => [...byNeighbor.keys()].sort((a, b) => a - b));

    if (state.adjView === 'list') {
      adjBody.textContent = neighbors.map((row, u) =>
        `${u}: ${row.map(v => state.weighted ? `${v}(${adj[u].get(v)})` : v).join(', ') || '∅'}`
      ).join('\n');
    } else {
      // 가중치 모드에서는 1/0 대신 가중치를, 연결 없음은 · 로 표시한다
      const cellWidth = state.weighted ? 3 : 2;
      const header = ' '.repeat(cellWidth + 1) +
        neighbors.map((_, v) => String(v).padStart(cellWidth)).join('');
      const rows = neighbors.map((_, u) =>
        String(u).padStart(cellWidth) + ' ' +
        Array.from({ length: nodeCount }, (_, v) => {
          if (!adj[u].has(v)) return (state.weighted ? '·' : '0').padStart(cellWidth);
          return String(state.weighted ? adj[u].get(v) : 1).padStart(cellWidth);
        }).join(''));
      adjBody.textContent = [header, ...rows].join('\n');
    }
  }

  /* ── 외부 API ── */

  function getGraph() {
    return {
      directed: state.directed,
      weighted: state.weighted,
      start: state.nodes.length ? state.start : 0,
      nodes: state.nodes.map((node, index) => ({ id: index, x: node.x, y: node.y, label: String(index) })),
      edges: state.edges.map(([u, v, w]) => [u, v, w ?? 1]),
    };
  }

  function setGraph(graph) {
    state.nodes = (graph?.nodes || []).map(node => ({ x: node.x, y: node.y }));
    state.edges = (graph?.edges || []).map(([u, v, w]) => [u, v, w ?? 1]);
    state.start = graph?.start ?? 0;
    state.pending = -1;
    draw();
  }

  draw();
  return { el: root, getGraph, setGraph };
}
