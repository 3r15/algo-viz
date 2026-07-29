// app/views/paradigm.js — 알고리즘 "유형"(패러다임) 뷰.
//
//   #/paradigms        유형 목록
//   #/paradigm/:id     유형 문서 + 이 유형에 속하는 알고리즘 목록(자동)
//
// 유형 문서는 알고리즘 문서와 섹션 어휘가 다르다(언제 쓸 수 있나 / 구현 골격 / 잘 맞는 문제).
// 알고리즘 목록은 손으로 적지 않고 meta.match 로 카탈로그를 걸러서 만든다 —
// 알고리즘이 늘어나면 유형 페이지가 저절로 따라온다.

import { loadCatalog } from '../catalog-data.js';
import { loadParadigms, loadParadigmNotes, algorithmsOfParadigm, paradigmSearchTerms }
  from '../paradigm-data.js';
import { renderMarkdown } from '../markdown.js';

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = text => String(text).replace(/[&<>"]/g, ch => HTML_ENTITIES[ch]);

function algorithmCard(algorithm) {
  return `<a class="pa-card" href="#/algo/${escapeHtml(algorithm.id)}">
      <span class="pa-card-title">${escapeHtml(algorithm.title)}</span>
      ${algorithm.summary ? `<span class="pa-card-sum">${escapeHtml(algorithm.summary)}</span>` : ''}
    </a>`;
}

/** #/paradigms — 유형 목록 */
export async function renderParadigmList(container) {
  let paradigms = [], algorithms = [];
  try {
    [paradigms, algorithms] = await Promise.all([loadParadigms(), loadCatalog()]);
  } catch (err) {
    container.innerHTML = `<div class="empty">유형 목록을 불러오지 못했습니다 — ${escapeHtml(err.message)}</div>`;
    return () => {};
  }

  container.innerHTML = `
    <header>
      <div class="brand">
        <a class="back" href="#/catalog">← 알고리즘 목록</a>
        <h1>알고리즘 유형</h1>
        <div class="sub">개별 알고리즘이 아니라 <b>문제를 푸는 방식</b>을 정리한 문서입니다.
          어떤 조건에서 그 방식이 성립하는지, 무엇을 증명해야 하는지, 어떤 문제에 잘 맞는지를 다룹니다.</div>
      </div>
    </header>
    <div class="pcards">
      ${paradigms.map(paradigm => {
        const members = algorithmsOfParadigm(algorithms, paradigm);
        return `<a class="pcard" href="#/paradigm/${escapeHtml(paradigm.id)}">
            <h3>${escapeHtml(paradigm.title)}</h3>
            ${paradigm.tagline ? `<div class="pcard-tagline">${escapeHtml(paradigm.tagline)}</div>` : ''}
            <p class="pcard-sum">${escapeHtml(paradigm.summary || '')}</p>
            <div class="pcard-meta"><span class="badge">알고리즘 ${members.length}</span></div>
          </a>`;
      }).join('')}
    </div>`;
  return () => {};
}

/** #/paradigm/:id — 유형 문서 */
export async function renderParadigm(container, id) {
  let paradigms = [], algorithms = [], notes = null;
  try {
    [paradigms, algorithms, notes] = await Promise.all([
      loadParadigms(), loadCatalog(), loadParadigmNotes(id),
    ]);
  } catch (err) {
    container.innerHTML = `<div class="empty">불러오지 못했습니다 — ${escapeHtml(err.message)}</div>`;
    return () => {};
  }

  const paradigm = paradigms.find(candidate => candidate.id === id);
  if (!paradigm) {
    container.innerHTML =
      `<div class="algo-head"><a class="back" href="#/paradigms">← 유형 목록</a>` +
      `<h1 class="algo-title">없는 유형</h1></div>` +
      `<div class="empty"><code>${escapeHtml(id)}</code> 유형을 찾을 수 없습니다.</div>`;
    return () => {};
  }

  const members = algorithmsOfParadigm(algorithms, paradigm);
  const { html, toc } = notes ? renderMarkdown(notes) : { html: '', toc: [] };

  const tocNav = toc.length >= 3
    ? `<nav class="notes-toc" aria-label="문서 목차">
         <div class="toc-label">목차</div>
         <ul>${toc.map(entry =>
           `<li class="lv${entry.level}"><button class="toc-link" data-goto="${escapeHtml(entry.id)}">` +
           `${escapeHtml(entry.text)}</button></li>`).join('')}</ul>
       </nav>`
    : '';

  // 이 유형을 모으는 검색어들 — 클릭하면 기존 태그 검색으로 이어진다
  const searchChips = paradigmSearchTerms(paradigm).map(term =>
    `<button class="tag" data-q="${escapeHtml(term)}">${escapeHtml(term)}</button>`).join('');

  container.innerHTML = `
    <div class="algo-head">
      <a class="back" href="#/paradigms">← 유형 목록</a>
      <h1 class="algo-title">${escapeHtml(paradigm.title)}</h1>
      ${paradigm.tagline ? `<div class="para-tagline">${escapeHtml(paradigm.tagline)}</div>` : ''}
      <div class="topinfo"><span class="badge cpx">알고리즘 ${members.length}</span></div>
    </div>

    <section class="para-members">
      <h2 class="notes-title">이 유형의 알고리즘</h2>
      <p class="para-note">아래 검색어 중 하나라도 가진 알고리즘이 자동으로 모입니다 — 새 알고리즘을 추가하면 여기에도 바로 나타납니다.</p>
      <div class="tags">${searchChips}</div>
      <div class="pa-cards">${members.map(algorithmCard).join('') || '<div class="empty">아직 없습니다.</div>'}</div>
    </section>

    ${html ? `<section class="notes" aria-labelledby="para-notes-h">
      <h2 class="notes-title" id="para-notes-h">유형 해설</h2>
      <div class="notes-body">${tocNav}<article class="md">${html}</article></div>
    </section>` : ''}`;

  container.querySelectorAll('[data-q]').forEach(button =>
    button.addEventListener('click', () => {
      location.hash = '#/catalog?q=' + encodeURIComponent(button.dataset.q);
    }));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  container.querySelectorAll('[data-goto]').forEach(link =>
    link.addEventListener('click', () => {
      const target = container.querySelector(`[id="${CSS.escape(link.dataset.goto)}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }));

  return () => {};
}
