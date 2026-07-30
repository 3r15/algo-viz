// app/renderers/stack.js — 스택 렌더러(type='stack').
//
// 아래에서 위로 쌓이는 LIFO 자료구조. 맨 위(top)에서만 넣고 뺀다.
// DFS 의 방문 스택, 타잔의 SCC 스택, 괄호 검사·후위 표기법의 연산 스택을 그린다.
//
// 슬롯 규약 — 스텝의 step.stack 을 읽는다. 두 형식을 모두 받는다:
//   ① 배열          — [3, 1, 4]  (값만. 기존 BFS/DFS/타잔 generator 가 이 형식)
//   ② 객체          — { values, states, labels, caption }
//        values: [...]        아래→위 순서(마지막 원소가 top)
//        states: [...]        (선택) 0 기본 · 1 top · 2 방금 push · 3 방금 pop(잔상) · 4 결과
//        labels: [...]        (선택) 칸 옆 짧은 텍스트
//        caption              (선택) 한 줄 설명
//
// 렌더링 규칙: 칸을 재사용해 CSS transition 으로 쌓임/빠짐을 보인다.
// top 을 위에 두려고 컬럼을 column-reverse 로 쌓는다(values 마지막 = 화면 맨 위).

import { registerRenderer } from './registry.js';

const stackCaches = new WeakMap(); // host 요소 → { wrap, caption, slots: [{ cell, valueLabel, sideLabel }], capacity }

// 배열이면 값만 있는 것으로, 객체면 그대로 정규화한다.
function normalize(slot) {
  if (Array.isArray(slot)) return { values: slot, states: [], labels: [], caption: '' };
  return {
    values: Array.isArray(slot.values) ? slot.values : [],
    states: slot.states ?? [],
    labels: slot.labels ?? [],
    caption: slot.caption ?? '',
  };
}

export function renderStack(host, step) {
  const raw = step?.stack;
  if (raw == null) return;
  const stack = normalize(raw);

  let cache = stackCaches.get(host);
  if (!cache || !host.contains(cache.wrap)) {
    cache = build(host);
    stackCaches.set(host, cache);
  }

  cache.caption.textContent = stack.caption || '';

  // 슬롯을 필요한 만큼 늘린다(줄일 땐 감춘다 — 요소를 지우지 않아 잔상 transition 이 산다).
  ensureSlots(cache, stack.values.length);
  cache.slots.forEach((slot, index) => {
    const inStack = index < stack.values.length;
    slot.cell.hidden = !inStack;
    if (!inStack) return;
    slot.valueLabel.textContent = stack.values[index];
    slot.sideLabel.textContent = stack.labels[index] ?? '';
    // 명시 상태가 없으면 맨 위만 top(1)으로 강조
    const state = stack.states[index] ?? (index === stack.values.length - 1 ? 1 : 0);
    slot.cell.className = 'stk-cell s' + state;
  });

  cache.emptyNote.hidden = stack.values.length > 0;
}

function ensureSlots(cache, needed) {
  while (cache.slots.length < needed) {
    const cell = document.createElement('div');
    cell.className = 'stk-cell s0';
    const valueLabel = document.createElement('span');
    valueLabel.className = 'stk-val';
    const sideLabel = document.createElement('span');
    sideLabel.className = 'stk-side';
    cell.append(valueLabel, sideLabel);
    // column-reverse 라 먼저 append 된 것이 아래(바닥)에 온다 = values[0]
    cache.column.append(cell);
    cache.slots.push({ cell, valueLabel, sideLabel });
  }
}

function build(host) {
  host.innerHTML = '';
  host.classList.add('stack');

  const wrap = document.createElement('div');
  wrap.className = 'stackviz';

  const caption = document.createElement('div');
  caption.className = 'stk-caption';

  const frame = document.createElement('div');
  frame.className = 'stk-frame';               // 바닥이 막힌 U 자 통

  const column = document.createElement('div');
  column.className = 'stk-column';

  const emptyNote = document.createElement('div');
  emptyNote.className = 'stk-empty';
  emptyNote.textContent = '(비어 있음)';

  frame.append(column, emptyNote);
  wrap.append(caption, frame);
  host.append(wrap);

  return { wrap, caption, column, emptyNote, slots: [] };
}

registerRenderer('stack', renderStack);
