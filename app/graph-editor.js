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
    nodes: (initial?.nodes || []).map(n => ({ x: n.x, y: n.y })),
    edges: (initial?.edges || []).map(([u, v, w]) => [u, v, w ?? 1]),
    start: initial?.start ?? 0,
    directed: false,   // 옵션이 설정 가능해질 때만 바뀐다(현재 항상 false)
    weighted: false,
    mode: 'node',
    pending: -1,
    adjView: 'list',
  };

  // 옵션 상태: enabled(설정 가능) + note(비활성 사유)
  const optState = opt => {
    if (!caps[opt]) return { enabled: false, note: '미지원' };
    if (!IMPLEMENTED[opt]) return { enabled: false, note: '준비 중' };
    return { enabled: true, note: '' };
  };
  const optRow = (opt, label) => {
    const s = optState(opt);
    return `<label class="ge-opt${s.enabled ? '' : ' ge-disabled'}">` +
      `<input type="checkbox" data-opt="${opt}" ${s.enabled ? '' : 'disabled'}> ${label}` +
      `${s.note ? `<span class="ge-soon">${s.note}</span>` : ''}</label>`;
  };

  const el = document.createElement('div');
  el.className = 'geditor';
  el.innerHTML = `
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

  const svg = el.querySelector('.ge-canvas');
  const hintEl = el.querySelector('.ge-hint');
  const adjBody = el.querySelector('.ge-adj-body');

  el.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    state.mode = b.dataset.mode; state.pending = -1;
    el.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
    draw();
  }));
  // 설정 가능한 옵션만 반응(현재는 전부 비활성)
  el.querySelectorAll('[data-opt]').forEach(cb => cb.addEventListener('change', () => {
    state[cb.dataset.opt] = cb.checked; draw();
  }));
  el.querySelector('.ge-clear').addEventListener('click', () => {
    state.nodes = []; state.edges = []; state.start = 0; state.pending = -1; draw();
  });
  el.querySelector('.ge-run').addEventListener('click', () => onRun && onRun(getGraph()));
  el.querySelector('.ge-adj-toggle').addEventListener('click', () => {
    state.adjView = state.adjView === 'list' ? 'matrix' : 'list';
    el.querySelector('.ge-adj-title').textContent = state.adjView === 'list' ? '인접 리스트' : '인접 행렬';
    el.querySelector('.ge-adj-toggle').textContent = state.adjView === 'list' ? '행렬로' : '리스트로';
    drawAdj();
  });
  svg.addEventListener('click', onCanvasClick);

  /* ── 좌표 / 히트 ── */
  function toViewbox(e) {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function findNode(x, y) {
    let best = -1, bd = 49;
    state.nodes.forEach((n, i) => {
      const dx = n.x * 100 - x, dy = n.y * 60 - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function onCanvasClick(e) {
    const p = toViewbox(e);
    if (!p || p.x < 0 || p.x > 100 || p.y < 0 || p.y > 60) return;
    const hit = findNode(p.x, p.y);
    if (state.mode === 'node') {
      if (hit < 0) state.nodes.push({ x: clamp01(p.x / 100), y: clamp01(p.y / 60) });
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
  function deleteNode(k) {
    state.nodes.splice(k, 1);
    state.edges = state.edges
      .filter(([a, b]) => a !== k && b !== k)
      .map(([a, b, w]) => [a > k ? a - 1 : a, b > k ? b - 1 : b, w]);
    if (state.start === k) state.start = 0; else if (state.start > k) state.start--;
    if (state.start >= state.nodes.length) state.start = Math.max(0, state.nodes.length - 1);
    state.pending = -1;
  }

  /* ── 렌더 ── */
  function draw() { drawHint(); drawCanvas(); drawAdj(); }

  function drawHint() {
    const info = MODES.find(o => o.m === state.mode);
    const extra = state.mode === 'edge' && state.pending >= 0 ? ` — ${state.pending} 선택됨, 두 번째 정점 클릭` : '';
    hintEl.innerHTML = `<b>${info.label.replace(/^\S+\s/, '')}</b> 모드: ${info.hint}${extra}` +
      `<span class="ge-stat">정점 ${state.nodes.length} · 간선 ${state.edges.length} · 시작 ${state.nodes.length ? state.start : '—'}</span>`;
  }

  function drawCanvas() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    for (const [u, v] of state.edges) {
      const a = state.nodes[u], b = state.nodes[v];
      if (!a || !b) continue;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', a.x * 100); ln.setAttribute('y1', a.y * 60);
      ln.setAttribute('x2', b.x * 100); ln.setAttribute('y2', b.y * 60);
      ln.setAttribute('class', 'ge-edge');
      svg.appendChild(ln);
    }
    state.nodes.forEach((n, i) => {
      const g = document.createElementNS(NS, 'g');
      let cls = 'ge-node';
      if (i === state.start) cls += ' start';
      if (i === state.pending) cls += ' pending';
      g.setAttribute('class', cls);
      const cx = n.x * 100, cy = n.y * 60;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', '5.2');
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', cx); t.setAttribute('y', cy);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
      t.textContent = i;
      g.append(c, t); svg.appendChild(g);
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
    const nbrs = adj.map(m => [...m.keys()].sort((a, b) => a - b));
    if (state.adjView === 'list') {
      adjBody.textContent = nbrs.map((l, i) =>
        `${i}: ${l.map(v => state.weighted ? `${v}(${adj[i].get(v)})` : v).join(', ') || '∅'}`).join('\n');
    } else {
      const header = '   ' + nbrs.map((_, i) => String(i).padStart(2)).join('');
      const rows = nbrs.map((l, i) => {
        const set = new Set(l);
        return String(i).padStart(2) + ' ' + Array.from({ length: N }, (_, j) => (set.has(j) ? ' 1' : ' 0')).join('');
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
      nodes: state.nodes.map((n, i) => ({ id: i, x: n.x, y: n.y, label: String(i) })),
      edges: state.edges.map(([u, v, w]) => [u, v, w ?? 1]),
    };
  }
  function setGraph(g) {
    state.nodes = (g?.nodes || []).map(n => ({ x: n.x, y: n.y }));
    state.edges = (g?.edges || []).map(([u, v, w]) => [u, v, w ?? 1]);
    state.start = g?.start ?? 0;
    state.pending = -1;
    draw();
  }

  draw();
  return { el, getGraph, setGraph };
}
