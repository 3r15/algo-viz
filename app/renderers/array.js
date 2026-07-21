// app/renderers/array.js — 배열/막대 렌더러(type='array').
//
// 규칙(트레이스 계약의 렌더링 파트):
//  · 매 렌더마다 DOM 을 리빌드하지 않는다 → 요소를 재사용해 CSS transition 으로 "이동"을 보인다.
//  · 값이 아니라 인덱스 슬롯 기준으로 그린다(중복 값이 있어도 슬롯이 안 섞이게).
//
// 캐시는 host 요소별로 WeakMap 에 둔다(CH·A, CH·2 두 채널이 각자 캐시를 가진다).

import { registerRenderer } from './registry.js';

const caches = new WeakMap(); // host element → [{col,val,bar}, ...]

export function renderArray(host, step) {
  host.classList.remove('blank');
  const vals = step.values;
  const maxV = Math.max(...vals, 1);

  let cache = caches.get(host);
  // 캐시가 없거나, 길이가 다르거나, host 가 외부에서 비워졌으면(detached) 재구축
  const stale = !cache || cache.length !== vals.length || cache[0].col.parentNode !== host;
  if (stale) {
    host.innerHTML = '';
    cache = vals.map((_, idx) => {
      const col = document.createElement('div'); col.className = 'bar-col';
      const val = document.createElement('div'); val.className = 'bar-val';
      const bar = document.createElement('div'); bar.className = 'bar';
      const ix  = document.createElement('div'); ix.className = 'bar-ix'; ix.textContent = idx;
      col.append(val, bar, ix); host.append(col);
      return { col, val, bar };
    });
    caches.set(host, cache);
  }

  vals.forEach((v, idx) => {
    const { col, val, bar } = cache[idx];
    val.textContent = v;
    bar.style.height = (12 + (v / maxV) * 120) + 'px';
    col.classList.toggle('sorted', idx >= step.sortedFrom);
    col.classList.toggle('cmp', step.op === 'compare' && (idx === step.a || idx === step.b));
    col.classList.toggle('swp', step.op === 'swap' && (idx === step.a || idx === step.b));
  });
}

registerRenderer('array', renderArray);
