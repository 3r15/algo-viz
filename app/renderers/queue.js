// app/renderers/queue.js — 큐 렌더러(type='queue').
//
// 왼쪽 head 에서 빼고(dequeue) 오른쪽 tail 에 넣는(enqueue) FIFO 자료구조.
// BFS 의 방문 큐, 위상 정렬(칸)의 진입차수 0 큐를 그린다.
//
// 슬롯 규약 — 스텝의 step.queue 를 읽는다. 두 형식을 모두 받는다:
//   ① 배열          — [0, 2, 5]  (값만. 기존 BFS/위상정렬 generator 가 이 형식)
//   ② 객체          — { values, states, labels, caption }
//        values: [...]        head(왼쪽) → tail(오른쪽) 순서
//        states: [...]        (선택) 0 기본 · 1 head(다음에 꺼낼 것) · 2 방금 enqueue · 3 방금 dequeue · 4 결과
//        labels: [...]        (선택) 칸 아래 짧은 텍스트
//        caption              (선택) 한 줄 설명
//
// 렌더링 규칙: 칸을 재사용해 CSS transition 으로 넣고 빠짐을 보인다.

import { registerRenderer } from './registry.js';

const queueCaches = new WeakMap(); // host 요소 → { wrap, caption, row, emptyNote, slots }

function normalize(slot) {
  if (Array.isArray(slot)) return { values: slot, states: [], labels: [], caption: '' };
  return {
    values: Array.isArray(slot.values) ? slot.values : [],
    states: slot.states ?? [],
    labels: slot.labels ?? [],
    caption: slot.caption ?? '',
  };
}

export function renderQueue(host, step) {
  const raw = step?.queue;
  if (raw == null) return;
  const queue = normalize(raw);

  let cache = queueCaches.get(host);
  if (!cache || !host.contains(cache.wrap)) {
    cache = build(host);
    queueCaches.set(host, cache);
  }

  cache.caption.textContent = queue.caption || '';

  ensureSlots(cache, queue.values.length);
  cache.slots.forEach((slot, index) => {
    const inQueue = index < queue.values.length;
    slot.cell.hidden = !inQueue;
    if (!inQueue) return;
    slot.valueLabel.textContent = queue.values[index];
    slot.sideLabel.textContent = queue.labels[index] ?? '';
    // 명시 상태가 없으면 맨 앞만 head(1)로 강조
    const state = queue.states[index] ?? (index === 0 ? 1 : 0);
    slot.cell.className = 'q-cell s' + state;
  });

  cache.emptyNote.hidden = queue.values.length > 0;
  // head/tail 화살표는 큐가 비었을 때 숨긴다
  cache.ends.hidden = queue.values.length === 0;
}

function ensureSlots(cache, needed) {
  while (cache.slots.length < needed) {
    const cell = document.createElement('div');
    cell.className = 'q-cell s0';
    const valueLabel = document.createElement('span');
    valueLabel.className = 'q-val';
    const sideLabel = document.createElement('span');
    sideLabel.className = 'q-side';
    cell.append(valueLabel, sideLabel);
    cache.row.append(cell);
    cache.slots.push({ cell, valueLabel, sideLabel });
  }
}

function build(host) {
  host.innerHTML = '';
  host.classList.add('queue');

  const wrap = document.createElement('div');
  wrap.className = 'queueviz';

  const caption = document.createElement('div');
  caption.className = 'q-caption';

  const track = document.createElement('div');
  track.className = 'q-track';

  const ends = document.createElement('div');
  ends.className = 'q-ends';
  ends.innerHTML = '<span class="q-end">head ↑ (다음)</span><span class="q-end">↑ tail (넣는 곳)</span>';

  const row = document.createElement('div');
  row.className = 'q-row';

  const emptyNote = document.createElement('div');
  emptyNote.className = 'q-empty';
  emptyNote.textContent = '(비어 있음)';

  track.append(row, emptyNote);
  wrap.append(caption, track, ends);
  host.append(wrap);

  return { wrap, caption, row, ends, emptyNote, slots: [] };
}

registerRenderer('queue', renderQueue);
