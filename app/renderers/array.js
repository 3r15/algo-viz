// app/renderers/array.js — 배열/막대 렌더러(type='array').
//
// 규칙(트레이스 계약의 렌더링 파트):
//  · 매 렌더마다 DOM 을 리빌드하지 않는다 → 요소를 재사용해 CSS transition 으로 "이동"을 보인다.
//  · 값이 아니라 인덱스 슬롯 기준으로 그린다(중복 값이 있어도 슬롯이 안 섞이게).
//
// 캐시는 host 요소별로 WeakMap 에 둔다(여러 viz 슬롯이 각자 캐시를 가진다).

import { registerRenderer } from './registry.js';

const barCaches = new WeakMap(); // host 요소 → [{ column, valueLabel, bar }, ...]

const BAR_MIN_PX = 12, BAR_RANGE_PX = 120;

export function renderArray(host, step) {
  host.classList.remove('blank');
  const values = step.values;
  const maxValue = Math.max(...values, 1);

  let bars = barCaches.get(host);
  // 캐시가 없거나, 길이가 다르거나, host 가 외부에서 비워졌으면(detached) 재구축
  const stale = !bars || bars.length !== values.length || bars[0].column.parentNode !== host;
  if (stale) {
    host.innerHTML = '';
    bars = values.map((_, index) => {
      const column = document.createElement('div'); column.className = 'bar-col';
      const valueLabel = document.createElement('div'); valueLabel.className = 'bar-val';
      const bar = document.createElement('div'); bar.className = 'bar';
      const indexLabel = document.createElement('div');
      indexLabel.className = 'bar-ix'; indexLabel.textContent = index;
      column.append(valueLabel, bar, indexLabel); host.append(column);
      return { column, valueLabel, bar };
    });
    barCaches.set(host, bars);
  }

  // 확정 구간(초록): 뒤쪽 [sortedFrom, n) OR 앞쪽 [0, sortedTo)
  // bubble 은 뒤에서 채워지고(sortedFrom), insertion 은 앞에서 채워진다(sortedTo).
  const sortedTo = step.sortedTo ?? 0;
  values.forEach((value, index) => {
    const { column, valueLabel, bar } = bars[index];
    valueLabel.textContent = value;
    bar.style.height = (BAR_MIN_PX + (value / maxValue) * BAR_RANGE_PX) + 'px';
    column.classList.toggle('sorted', index >= step.sortedFrom || index < sortedTo);
    column.classList.toggle('cmp', step.op === 'compare' && (index === step.a || index === step.b));
    column.classList.toggle('swp', step.op === 'swap' && (index === step.a || index === step.b));
  });
}

registerRenderer('array', renderArray);
