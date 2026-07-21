// app/views/algorithm.js — 단일 채널 Model A 플레이어(#/algo/:id).
//
// 레이아웃: 상단 3정보(분류/시간/공간) → 툴바(입력 + 조작 패널) → 코드 → viz → 하단 태그.
// 조작 패널을 코드 위에 두어, 아래쪽 viz 높이 변화가 조작 패널을 밀지 않게 한다.
// 상단 분류·하단 태그는 클릭 시 카탈로그 검색(#/catalog?q=...)으로 연결된다.
//
// renderAlgorithm(container, id) → teardown 함수 반환.

import { createStore } from '../store.js';
import { loadAlgorithm } from '../algorithm-loader.js';
import { getRenderer } from '../renderers/registry.js';
import { highlightCpp } from '../highlight.js';
import '../renderers/array.js';

const CAT_LABEL = {
  sorting: '정렬', graph: '그래프', dp: 'DP', search: '탐색', greedy: '그리디',
  string: '문자열', tree: '트리', math: '수학', backtracking: '백트래킹', geometry: '기하',
};
const prettyO = s => String(s).replace(/\^2/g, '²').replace(/\^3/g, '³');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// 상단: 분류(클릭 가능) · 시간복잡도 · 공간복잡도 — 딱 3가지
function topInfo(a) {
  const cat = a.category
    ? `<button class="badge cat" data-q="${esc(a.category)}" title="이 분류로 검색">${esc(CAT_LABEL[a.category] || a.category)}</button>`
    : '';
  const t = a.complexity?.time?.worst || a.complexity?.time?.avg;
  const time = t ? `<span class="badge cpx">시간 ${esc(prettyO(t))}</span>` : '';
  const space = a.complexity?.space ? `<span class="badge cpx">공간 ${esc(prettyO(a.complexity.space))}</span>` : '';
  return cat + time + space;
}

// 하단: 태그(클릭 → 해당 태그로 검색)
function tagsBar(a) {
  if (!a.tags?.length) return '';
  return `<div class="tags"><span class="tags-label">태그</span>` +
    a.tags.map(t => `<button class="tag" data-q="${esc(t)}">${esc(t)}</button>`).join('') +
    `</div>`;
}

// [data-q] 요소 클릭 → 카탈로그 검색 결과로 이동
function wireLinks(container) {
  container.querySelectorAll('[data-q]').forEach(b =>
    b.addEventListener('click', () => { location.hash = '#/catalog?q=' + encodeURIComponent(b.dataset.q); }));
}

export async function renderAlgorithm(container, id) {
  let current;
  try {
    current = await loadAlgorithm(id);
  } catch (e) {
    container.innerHTML =
      `<div class="algo-head"><a class="back" href="#/catalog">← 목록</a>` +
      `<h1 class="algo-title">로드 실패</h1>` +
      `<div class="cs-sum">알고리즘 <code>${esc(id)}</code> 를 불러오지 못했습니다 — ${esc(e.message)}</div></div>`;
    return () => {};
  }

  // 준비 중(placeholder) — 플레이어 없이 정보/태그만
  if (current.placeholder) {
    container.innerHTML = `
      <div class="algo-head">
        <a class="back" href="#/catalog">← 목록</a>
        <h1 class="algo-title">${esc(current.title)}</h1>
        <div class="topinfo">${topInfo(current)}</div>
      </div>
      <div class="coming-soon">
        <div class="cs-badge">준비 중</div>
        ${current.summary ? `<p class="cs-sum">${esc(current.summary)}</p>` : ''}
        <p class="cs-note">이 알고리즘의 시각화는 아직 구현되지 않았습니다.</p>
      </div>
      ${tagsBar(current)}`;
    wireLinks(container);
    return () => {};
  }

  container.innerHTML = `
    <div class="player">
      <div class="algo-head">
        <a class="back" href="#/catalog">← 목록</a>
        <h1 class="algo-title">${esc(current.title)}</h1>
        <div class="topinfo">${topInfo(current)}</div>
      </div>

      <div class="toolbar">
        <div class="inputrow">
          <label for="arr">input[]</label>
          <input id="arr" spellcheck="false" />
          <button class="btn primary" data-act="run">Run</button>
          <button class="btn" data-act="rand">Randomize</button>
          <button class="btn" data-act="reset">Default</button>
        </div>
        <div class="transport">
          <div class="tbtns">
            <button class="tbtn" data-act="first" title="처음">⏮</button>
            <button class="tbtn" data-act="prev" title="이전 스텝">◀</button>
            <button class="tbtn play" data-act="play" title="재생/정지">▶</button>
            <button class="tbtn" data-act="next" title="다음 스텝">▶</button>
            <button class="tbtn" data-act="last" title="끝">⏭</button>
          </div>
          <input type="range" class="scrub" min="0" max="0" value="0" />
          <div class="speed">속도<input type="range" class="speed-range" min="1" max="10" value="5" /></div>
          <div class="counter">0 / 0</div>
        </div>
        <div class="note"></div>
      </div>

      <section class="chan">
        <div class="code"></div>
        <div class="viz"></div>
        <div class="readout"></div>
      </section>

      ${tagsBar(current)}
    </div>`;

  const q = sel => container.querySelector(sel);
  const el = {
    note: q('.note'), arr: q('#arr'),
    code: q('.code'), viz: q('.viz'), readout: q('.readout'),
    scrub: q('.scrub'), speed: q('.speed-range'), counter: q('.counter'), play: q('[data-act=play]'),
  };
  el.arr.value = current.defaultInput.join(' ');

  const store = createStore();

  function renderCode(step) {
    const code = current.code;
    if (el.code.childElementCount !== code.length) {
      el.code.innerHTML = '';
      code.forEach((txt, idx) => {
        const row = document.createElement('div');
        row.className = 'cl'; row.dataset.line = idx + 1;
        const ln = document.createElement('span'); ln.className = 'ln'; ln.textContent = idx + 1;
        const c = document.createElement('span'); c.className = 'ct'; c.innerHTML = highlightCpp(txt);
        row.append(ln, c); el.code.append(row);
      });
    }
    for (const row of el.code.children)
      row.classList.toggle('on', !!step && Number(row.dataset.line) === step.line);
  }

  function paintViz(step) {
    if (!step) return;
    const render = getRenderer(current.dataStructure) || getRenderer('array');
    render(el.viz, step);
  }

  function renderReadout(step) {
    if (!step) { el.readout.innerHTML = ''; return; }
    const opLabel = { start: 'START', compare: 'COMPARE', swap: 'SWAP',
      'pass-end': 'PASS-END', done: 'DONE', write: 'WRITE', set: 'SET', read: 'READ',
      visit: 'VISIT', enqueue: 'ENQUEUE', dequeue: 'DEQUEUE', mark: 'MARK' }[step.op] || step.op;
    el.readout.innerHTML =
      `<span>line <b>${step.line}</b></span>` +
      (step.i != null ? `<span>i <b>${step.i}</b></span>` : '') +
      (step.j != null ? `<span>j <b>${step.j}</b></span>` : '') +
      `<span>op <span class="op">${opLabel}</span></span>` +
      `<span class="exp">${esc(step.explain)}</span>`;
  }

  store.subscribe(state => {
    const s = store.stepFor(state.traceA);
    renderCode(s); paintViz(s); renderReadout(s);
    const max = store.maxSteps();
    el.scrub.max = max - 1; el.scrub.value = state.step;
    el.counter.textContent = `${state.step + 1} / ${max}`;
    el.play.textContent = state.playing ? '⏸' : '▶';
  });

  function run() {
    const parsed = parseInput(el.arr.value);
    el.note.textContent = '';
    if (!parsed) { el.note.textContent = '입력이 비었습니다'; return; }
    if (parsed.err) { el.note.textContent = parsed.err; return; }
    store.setTraces({ traceA: current.generate(parsed.nums), trace2Valid: false });
  }

  const actions = {
    run,
    reset: () => { el.arr.value = current.defaultInput.join(' '); run(); },
    rand: () => {
      const n = 5 + Math.floor(Math.random() * 3);
      el.arr.value = Array.from({ length: n }, () => Math.floor(Math.random() * 20)).join(' ');
      run();
    },
    first: () => { store.stopPlay(); store.first(); },
    last:  () => { store.stopPlay(); store.last(); },
    prev:  () => { store.stopPlay(); store.prev(); },
    next:  () => { store.stopPlay(); store.next(); },
    play:  () => store.togglePlay(),
  };
  container.querySelectorAll('[data-act]').forEach(btn =>
    btn.addEventListener('click', () => actions[btn.dataset.act]()));
  el.scrub.addEventListener('input', e => { store.stopPlay(); store.setStep(Number(e.target.value)); });
  el.speed.addEventListener('input', e => store.setSpeed(e.target.value));
  wireLinks(container);

  const onKey = e => {
    if (e.target.tagName === 'INPUT' && e.target.id === 'arr') return;
    if (e.key === 'ArrowRight') { store.stopPlay(); store.next(); }
    if (e.key === 'ArrowLeft')  { store.stopPlay(); store.prev(); }
    if (e.key === ' ')          { e.preventDefault(); store.togglePlay(); }
  };
  document.addEventListener('keydown', onKey);

  run();

  return () => {
    store.stopPlay();
    document.removeEventListener('keydown', onKey);
  };
}

function parseInput(str) {
  const parts = str.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  if (parts.length > 12) return { err: '최대 12개까지 지원' };
  const nums = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isInteger(n) || Math.abs(n) > 999) return { err: '정수(±999)만' };
    nums.push(n);
  }
  return { nums };
}
