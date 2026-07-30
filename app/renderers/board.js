// app/renderers/board.js — 체스판 렌더러(type='board').
//
// 격자 위에 말을 놓고 옮기는 알고리즘(N-퀸 · 나이트 여행 · 미로)을 위한 렌더러.
// matrix 렌더러와 겹치는 것 같지만 보는 것이 다르다:
//   matrix — 칸마다 **값**을 채워 나가는 표(DP 테이블). 숫자를 읽는 것이 목적.
//   board  — 칸의 **상태**(비었나 · 말이 있나 · 공격받나 · 되돌렸나)를 색으로 본다.
//            체스판 명암, 정사각 칸, 말 기호, 이동 경로 선까지 여기서 다룬다.
//
// 슬롯 규약 — 스텝의 step.board 를 읽는다:
//   step.board = {
//     rows, cols,
//     states: [...],       // rows*cols 행 우선.
//                          //   0 빈칸 · 1 후보(검사 중, 테두리만) · 2 공격받음/못 쓰는 칸
//                          //   3 말이 놓임(확정) · 4 방금 놓음 · 5 방금 물러남(백트래킹)
//                          //   6 후보이면서 공격받음 — 왜 건너뛰는지 보이게 둘을 겹친 상태
//     labels: [...],       // (선택) 칸 안 짧은 텍스트(방문 순서 등)
//     marks:  [...],       // (선택) 칸 안 기호(♛ ♞). labels 보다 크게 그린다
//     path:   [i, j, ...], // (선택) 칸 인덱스 순서대로 이동 경로 선을 그린다(나이트 여행)
//     caption,
//   }
//
// 렌더링 규칙: 칸 DOM 은 격자 크기가 바뀔 때만 다시 만들고, 매 스텝엔 class·텍스트만 갱신한다.
// 경로 선은 SVG 오버레이 하나에 <polyline> 으로 그린다(칸 위에 겹친다).

import { registerRenderer } from './registry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const boardCaches = new WeakMap(); // host 요소 → { wrap, cells, caption, overlay, polyline, rows, cols }

export function renderBoard(host, step) {
  const board = step?.board;
  if (!board || !Number.isInteger(board.rows) || !Number.isInteger(board.cols)) return;

  let cache = boardCaches.get(host);
  if (!cache || cache.rows !== board.rows || cache.cols !== board.cols || !host.contains(cache.wrap)) {
    cache = build(host, board);
    boardCaches.set(host, cache);
  }

  cache.caption.textContent = board.caption || '';

  cache.cells.forEach((cell, flatIndex) => {
    const row = Math.floor(flatIndex / board.cols);
    const col = flatIndex % board.cols;
    const dark = (row + col) % 2 === 1;          // 체스판 명암은 칸 위치가 정한다
    cell.el.className = `bcell${dark ? ' dark' : ''} s${board.states?.[flatIndex] ?? 0}`;
    cell.mark.textContent = board.marks?.[flatIndex] ?? '';
    cell.label.textContent = board.labels?.[flatIndex] ?? '';
  });

  drawPath(cache, board);
}

// 이동 경로: 칸 중심을 이어 폴리라인 하나로 그린다. 좌표계는 격자 칸 수 그대로 쓴다.
function drawPath(cache, board) {
  const path = Array.isArray(board.path) ? board.path : [];
  if (path.length < 2) {
    cache.polyline.setAttribute('points', '');
    return;
  }
  const points = path.map(flatIndex => {
    const row = Math.floor(flatIndex / board.cols);
    const col = flatIndex % board.cols;
    return `${col + 0.5},${row + 0.5}`;          // 칸 중심
  });
  cache.polyline.setAttribute('points', points.join(' '));
}

function build(host, board) {
  host.innerHTML = '';
  host.classList.add('board');

  const wrap = document.createElement('div');
  wrap.className = 'boardviz';

  const caption = document.createElement('div');
  caption.className = 'bcaption';

  // 격자와 경로 오버레이를 같은 상자에 겹쳐 둔다
  const stage = document.createElement('div');
  stage.className = 'bstage';
  stage.style.setProperty('--bcols', board.cols);

  const grid = document.createElement('div');
  grid.className = 'bgrid';
  grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;

  const cells = [];
  for (let index = 0; index < board.rows * board.cols; index++) {
    const el = document.createElement('div');
    el.className = 'bcell';
    const mark = document.createElement('span');
    mark.className = 'bmark';
    const label = document.createElement('span');
    label.className = 'blabel';
    el.append(mark, label);
    grid.append(el);
    cells.push({ el, mark, label });
  }

  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.setAttribute('class', 'bpath');
  overlay.setAttribute('viewBox', `0 0 ${board.cols} ${board.rows}`);
  overlay.setAttribute('preserveAspectRatio', 'none');
  const polyline = document.createElementNS(SVG_NS, 'polyline');
  polyline.setAttribute('class', 'bpath-line');
  overlay.append(polyline);

  stage.append(grid, overlay);
  wrap.append(caption, stage);
  host.append(wrap);

  return { wrap, cells, caption, overlay, polyline, rows: board.rows, cols: board.cols };
}

registerRenderer('board', renderBoard);
