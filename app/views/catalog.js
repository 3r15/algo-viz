// app/views/catalog.js — 메인(카탈로그) 뷰: 검색 + 파셋 필터 + 카드 그리드.
// index.json 을 소비해 클라이언트에서 필터/검색하고, 카드 클릭 → #/algo/:id.
//
// renderCatalog(container) → teardown 함수 반환.

import { loadCatalog, facetValues, filterCatalog } from '../catalog-data.js';

// 표시할 파셋(순서대로). key 는 레코드 필드명.
const FACETS = [
  { key: 'categories', label: '분류' },
  { key: 'dataStructures', label: '자료구조' },
  { key: 'difficulty', label: '난이도' },
];

const DIFF_ORDER = { beginner: 0, intermediate: 1, advanced: 2 };

export async function renderCatalog(container) {
  let records;
  try {
    records = await loadCatalog();
  } catch (e) {
    container.innerHTML =
      `<header><div class="brand"><h1>algo-viz</h1>` +
      `<div class="sub" style="color:var(--warn)">카탈로그 로드 실패 — ${e.message}</div></div></header>`;
    return () => {};
  }

  const state = { q: '', facets: {} };           // facets: { key: Set }
  for (const f of FACETS) state.facets[f.key] = new Set();

  container.innerHTML = `
    <header>
      <div class="brand">
        <h1>algo-viz // 알고리즘 시각화</h1>
        <div class="sub">C++ 알고리즘을 라인별로 실행·되감기하며 자료구조 변화를 본다. 검색하거나 카드를 눌러 알고리즘을 여세요.</div>
      </div>
    </header>
    <div class="search-row">
      <input id="search" type="search" placeholder="알고리즘 검색 (이름·태그·분류…)" autocomplete="off" spellcheck="false" />
      <span class="count"></span>
    </div>
    <div class="facets"></div>
    <div class="cards"></div>`;

  const searchEl = container.querySelector('#search');
  const facetsEl = container.querySelector('.facets');
  const cardsEl  = container.querySelector('.cards');
  const countEl  = container.querySelector('.count');

  // ── 파셋 칩 렌더(1회) ──
  for (const f of FACETS) {
    let vals = facetValues(records, f.key);
    if (f.key === 'difficulty') vals = vals.sort((a, b) => (DIFF_ORDER[a] ?? 9) - (DIFF_ORDER[b] ?? 9));
    if (!vals.length) continue;
    const group = document.createElement('div');
    group.className = 'facet-group';
    group.innerHTML = `<span class="flabel">${f.label}</span>`;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const v of vals) {
      const chip = document.createElement('button');
      chip.className = 'chip'; chip.type = 'button';
      chip.textContent = v; chip.dataset.key = f.key; chip.dataset.val = v;
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => {
        const set = state.facets[f.key];
        if (set.has(v)) set.delete(v); else set.add(v);
        chip.classList.toggle('on', set.has(v));
        chip.setAttribute('aria-pressed', String(set.has(v)));
        renderResults();
      });
      chips.append(chip);
    }
    group.append(chips);
    facetsEl.append(group);
  }

  // ── 결과(카드) 렌더 ──
  function renderResults() {
    const hits = filterCatalog(records, state)
      .sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id, 'ko'));
    countEl.textContent = `${hits.length} / ${records.length}`;
    cardsEl.innerHTML = '';
    if (!hits.length) {
      cardsEl.innerHTML = `<div class="empty">일치하는 알고리즘이 없습니다.</div>`;
      return;
    }
    for (const rec of hits) cardsEl.append(card(rec));
  }

  const onSearch = () => { state.q = searchEl.value; renderResults(); };
  searchEl.addEventListener('input', onSearch);

  renderResults();

  return () => { searchEl.removeEventListener('input', onSearch); };
}

function card(rec) {
  const el = document.createElement('button');
  el.className = 'card'; el.type = 'button';
  el.addEventListener('click', () => { location.hash = `#/algo/${rec.id}`; });

  const verified = Array.isArray(rec.generation) && rec.generation.includes('model-2');
  const avg = rec.complexity?.time?.avg;

  el.innerHTML = `
    <h3>${esc(rec.title || rec.id)}</h3>
    <div class="card-id">${esc(rec.id)}</div>
    ${rec.summary ? `<div class="card-sum">${esc(rec.summary)}</div>` : ''}
    <div class="card-meta">
      ${(rec.categories || []).map(c => `<span class="badge cat">${esc(c)}</span>`).join('')}
      ${avg ? `<span class="badge cpx">${esc(avg)}</span>` : ''}
      ${rec.difficulty ? `<span class="badge diff">${esc(rec.difficulty)}</span>` : ''}
      ${verified ? `<span class="badge verified" title="네이티브 C++ 트레이스와 CI 대조됨">C++ 검증됨</span>` : ''}
    </div>`;
  return el;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
