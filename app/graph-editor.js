// app/graph-editor.js — 그래프 직접 입력 편집기.
//
// 사용자가 정점/간선을 그려 그래프를 만들고, 인접 리스트/행렬로 변환해 보여준다.
// "실행" 시 onRun(getGraph()) 을 호출한다.
//
//   createGraphEditor(initialGraph, { onRun, capabilities }) → { el, getGraph, setGraph }
//
// 옵션(방향 graph / 가중치)은 두 조건이 모두 참일 때만 설정 가능:
//   (1) 편집기에 해당 기능이 구현됨(IMPLEMENTED)   (2) 알고리즘이 지원함(capabilities)
// 그렇지 않으면 비활성 + 사유 표시("준비 중" = 미구현, "미지원" = 알고리즘이 안 씀).
//
// 간선은 [u, v, w] 3원소(가중치). 기본 가중치 w=1. 정점 id = 배열 인덱스(삭제 시 재번호).

const NS = 'http://www.w3.org/2000/svg';
const clamp01 = v => Math.max(0.05, Math.min(0.95, v));

// 편집기에 실제 구현된 기능(둘 다 아직 예정)
const IMPLEMENTED = { directed: false, weighted: false };

const MODES = [
  { m: 'node',   label: '＋ 정점',  hint: '빈 곳을 클릭해 정점을 추가' },
  { m: 'edge',   label: '／ 간선',  hint: '정점 두 개를 차례로 클릭해 간선 연결' },
  { m: 'start',  label: '▶ 시작점', hint: '정점을 클릭해 시작점으로 지정' },
  { m: 'delete', label: '🗑 삭제',  hint: '정점을 클릭해 (연결된 간선과 함께) 삭제' },
];

export function createGraphEditor(initial, { onRun, capabilities } = {}) {
  const caps = { directed: false, weighted: false, ...(capabilities || {}) };

  const state = {
    nodes: (initial?.nodes || []).map(node => ({ x: node.x, y: node.y })),
    edges: (initial?.edges || []).map(([u, v, w]) => [u, v, w ?? 1]),
    start: initial?.start ?? 0,
    directed: false,   // 옵션이 설정 가능해질 때만 바뀐다(현재 항상 false)
    weighted: false,
    mode: 'node',
    pending: -1,
    adjView: 'list',
  };

  // 옵션 상태: enabled(설정 가능) + note(비활성 사유)
  const optionState = opt => {
    if (!caps[opt]) return { enabled: false, note: '미지원' };
    if (!IMPLEMENTED[opt]) return { enabled: false, note: '준비 중' };
    return { enabled: true, note: '' };
  };
  const optRow = (opt, label) => {
    const status = optionState(opt);
    return `<label class="ge-opt${status.enabled ? '' : ' ge-disabled'}">` +
      `<input type="checkbox" data-opt="${opt}" ${status.enabled ? '' : 'disabled'}> ${label}` +
      `${status.note ? `<span class="ge-soon">${status.note}</span>` : ''}</label>`;
  };

  const root = document.createElement('div');
  root.className = 'geditor';
  root.innerHTML = `
    <div class="ge-bar">
      <div class="ge-modes">
        ${MODES.map(o => `<button type="button" class="ge-mode${o.m === 'node' ? ' on' : ''}" data-mode="${o.m}">${o.label}</button>`).join('')}
      </div>
      <div class="ge-right">
        <div class="ge-opts">
          ${optRow('directed', '방향')}
          ${optRow('weighted', '가중치')}
        </div>
        <button type="button" class="ge-clear">전체 지우기</button>
        <button type="button" class="btn primary ge-run">실행</button>
      </div>
    </div>
    <div class="ge-hint"></div>
    <svg class="ge-canvas" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="ge-adj">
      <div class="ge-adj-head"><span class="ge-adj-title">인접 리스트</span>
        <button type="button" class="ge-adj-toggle">행렬로</button></div>
      <pre class="ge-adj-body"></pre>
    </div>`;

  const svg = root.querySelector('.ge-canvas');
  const hintEl = root.querySelector('.ge-hint');
  const adjBody = root.querySelector('.ge-adj-body');

  root.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
    state.mode = button.dataset.mode; state.pending = -1;
    root.querySelectorAll('[data-mode]').forEach(other => other.classList.toggle('on', other === button));
    draw();
  }));
  // 설정 가능한 옵션만 반응(현재는 전부 비활성)
  root.querySelectorAll('[data-opt]').forEach(checkbox => checkbox.addEventListener('change', () => {
    state[checkbox.dataset.opt] = checkbox.checked; draw();
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

  /* ── 좌표 / 히트 ── */
  // 화면 좌표(클릭) → viewBox 좌표(0..100 × 0..60)
  function toViewbox(event) {
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) return null;
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX; screenPoint.y = event.clientY;
    const viewPoint = screenPoint.matrixTransform(screenMatrix.inverse());
    return { x: viewPoint.x, y: viewPoint.y };
  }
  // 클릭 지점에서 가장 가까운 정점(반경 7 이내). 없으면 -1.
  function findNode(x, y) {
    const HIT_RADIUS_SQ = 49;
    let nearest = -1, nearestDistSq = HIT_RADIUS_SQ;
    state.nodes.forEach((node, index) => {
      const dx = node.x * 100 - x, dy = node.y * 60 - y, distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) { nearestDistSq = distSq; nearest = index; }
    });
    return nearest;
  }
  function onCanvasClick(event) {
    const point = toViewbox(event);
    if (!point || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 60) return;
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
  function addEdge(u, v) {
    if (!state.edges.some(([a, b]) => (a === u && b === v) || (a === v && b === u)))
      state.edges.push([u, v, 1]);   // 기본 가중치 1
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
  function draw() { drawHint(); drawCanvas(); drawAdj(); }

  function drawHint() {
    const info = MODES.find(mode => mode.m === state.mode);
    const extra = state.mode === 'edge' && state.pending >= 0 ? ` — ${state.pending} 선택됨, 두 번째 정점 클릭` : '';
    hintEl.innerHTML = `<b>${info.label.replace(/^\S+\s/, '')}</b> 모드: ${info.hint}${extra}` +
      `<span class="ge-stat">정점 ${state.nodes.length} · 간선 ${state.edges.length} · 시작 ${state.nodes.length ? state.start : '—'}</span>`;
  }

  function drawCanvas() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (const [u, v] of state.edges) {
      const a = state.nodes[u], b = state.nodes[v];
      if (!a || !b) continue;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', a.x * 100); line.setAttribute('y1', a.y * 60);
      line.setAttribute('x2', b.x * 100); line.setAttribute('y2', b.y * 60);
      line.setAttribute('class', 'ge-edge');
      svg.appendChild(line);
    }
    state.nodes.forEach((node, index) => {
      const group = document.createElementNS(NS, 'g');
      let className = 'ge-node';
      if (index === state.start) className += ' start';
      if (index === state.pending) className += ' pending';
      group.setAttribute('class', className);
      const cx = node.x * 100, cy = node.y * 60;
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', cx); circle.setAttribute('cy', cy); circle.setAttribute('r', '5.2');
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('x', cx); label.setAttribute('y', cy);
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('dominant-baseline', 'central');
      label.textContent = index;
      group.append(circle, label); svg.appendChild(group);
    });
  }

  function drawAdj() {
    const N = state.nodes.length;
    if (!N) { adjBody.textContent = '(정점 없음)'; return; }
    const adj = Array.from({ length: N }, () => new Map()); // node → weight
    for (const [u, v, w] of state.edges) {
      if (u >= N || v >= N) continue;
      adj[u].set(v, w); if (!state.directed) adj[v].set(u, w);
    }
    const neighbors = adj.map(byNode => [...byNode.keys()].sort((a, b) => a - b));
    if (state.adjView === 'list') {
      adjBody.textContent = neighbors.map((row, u) =>
        `${u}: ${row.map(v => state.weighted ? `${v}(${adj[u].get(v)})` : v).join(', ') || '∅'}`).join('\n');
    } else {
      const header = '   ' + neighbors.map((_, v) => String(v).padStart(2)).join('');
      const rows = neighbors.map((row, u) => {
        const connected = new Set(row);
        return String(u).padStart(2) + ' ' +
          Array.from({ length: N }, (_, v) => (connected.has(v) ? ' 1' : ' 0')).join('');
      });
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
