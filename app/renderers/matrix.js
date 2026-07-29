// app/renderers/matrix.js — 2차원 표 렌더러(type='matrix').
//
// DP 테이블 · 희소 배열(st[k][i]) · 이진 상승 표(up[k][v]) 처럼
// "행 × 열 격자에 값을 채워 나가는" 알고리즘을 위한 렌더러.
//
// 슬롯 규약 — 스텝의 step.matrix 를 읽는다(다른 렌더러와 데이터가 섞이지 않게):
//   step.matrix = {
//     rows, cols,                 // 격자 크기
//     values: [...],              // rows*cols 행 우선(row-major). null = 빈 칸
//     states: [...],              // 같은 길이. 0 없음 · 1 채워짐 · 2 읽는 중 · 3 방금 씀 · 4 결과
//     rowLabels: [...], colLabels: [...],
//     caption,                    // (선택) 표 위 한 줄 설명
//   }
//
// 렌더링 규칙: 매 스텝 DOM 을 리빌드하지 않고 셀을 재사용한다(CSS transition 이 살아 있어야 함).

import { registerRenderer } from './registry.js';

const caches = new WeakMap(); // host → { root, cells, rows, cols, caption }

export function renderMatrix(host, step) {
  const m = step?.matrix;
  if (!m) return;

  let cache = caches.get(host);
  if (!cache || cache.rows !== m.rows || cache.cols !== m.cols || !host.contains(cache.root)) {
    cache = build(host, m);
    caches.set(host, cache);
  }

  cache.caption.textContent = m.caption || '';
  for (let k = 0; k < cache.cells.length; k++) {
    const cell = cache.cells[k];
    const v = m.values[k];
    cell.textContent = (v === null || v === undefined) ? '' : v;
    cell.className = 'mcell c' + (m.states?.[k] ?? 0);
  }
}

function build(host, m) {
  host.innerHTML = '';
  host.classList.add('matrix');

  const wrap = document.createElement('div');
  wrap.className = 'matrixviz';

  const caption = document.createElement('div');
  caption.className = 'mcaption';

  const grid = document.createElement('div');
  grid.className = 'mgrid';
  // 좌측 행 라벨 열 1개 + 데이터 열 cols 개
  grid.style.gridTemplateColumns = `auto repeat(${m.cols}, minmax(30px, 1fr))`;

  // 헤더 행: 빈 칸 + 열 라벨
  grid.append(labelEl('mcorner', ''));
  for (let c = 0; c < m.cols; c++) grid.append(labelEl('mcol', m.colLabels?.[c] ?? c));

  const cells = [];
  for (let r = 0; r < m.rows; r++) {
    grid.append(labelEl('mrow', m.rowLabels?.[r] ?? r));
    for (let c = 0; c < m.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'mcell c0';
      grid.append(cell);
      cells.push(cell);
    }
  }

  wrap.append(caption, grid);
  host.append(wrap);
  return { root: wrap, cells, caption, rows: m.rows, cols: m.cols };
}

function labelEl(cls, text) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return el;
}

registerRenderer('matrix', renderMatrix);
