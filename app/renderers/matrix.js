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

const matrixCaches = new WeakMap(); // host 요소 → { wrap, cells, caption, rows, cols }

export function renderMatrix(host, step) {
  const matrix = step?.matrix;
  if (!matrix) return;

  let cache = matrixCaches.get(host);
  if (!cache || cache.rows !== matrix.rows || cache.cols !== matrix.cols || !host.contains(cache.wrap)) {
    cache = buildGrid(host, matrix);
    matrixCaches.set(host, cache);
  }

  cache.caption.textContent = matrix.caption || '';
  cache.cells.forEach((cell, flatIndex) => {
    const value = matrix.values[flatIndex];
    cell.textContent = (value === null || value === undefined) ? '' : value;
    cell.className = 'mcell c' + (matrix.states?.[flatIndex] ?? 0);
  });
}

function buildGrid(host, matrix) {
  host.innerHTML = '';
  host.classList.add('matrix');

  const wrap = document.createElement('div');
  wrap.className = 'matrixviz';

  const caption = document.createElement('div');
  caption.className = 'mcaption';

  const grid = document.createElement('div');
  grid.className = 'mgrid';
  // 좌측 행 라벨 열 1개 + 데이터 열 cols 개
  grid.style.gridTemplateColumns = `auto repeat(${matrix.cols}, minmax(30px, 1fr))`;

  // 헤더 행: 빈 모서리 칸 + 열 라벨
  grid.append(labelCell('mcorner', ''));
  for (let col = 0; col < matrix.cols; col++)
    grid.append(labelCell('mcol', matrix.colLabels?.[col] ?? col));

  const cells = [];
  for (let row = 0; row < matrix.rows; row++) {
    grid.append(labelCell('mrow', matrix.rowLabels?.[row] ?? row));
    for (let col = 0; col < matrix.cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'mcell c0';
      grid.append(cell);
      cells.push(cell);              // 행 우선 순서라 flatIndex = row * cols + col
    }
  }

  wrap.append(caption, grid);
  host.append(wrap);
  return { wrap, cells, caption, rows: matrix.rows, cols: matrix.cols };
}

function labelCell(className, text) {
  const el = document.createElement('div');
  el.className = className;
  el.textContent = text;
  return el;
}

registerRenderer('matrix', renderMatrix);
