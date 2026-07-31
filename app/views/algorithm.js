// app/views/algorithm.js — 단일 채널 Model A 플레이어(#/algo/:id).
//
// 레이아웃: 상단 3정보(분류/시간/공간) → 툴바(입력 + 조작 패널) → 코드 → viz → 태그 → 해설 문서.
// 조작 패널을 코드 위에 두어, 아래쪽 viz 높이 변화가 조작 패널을 밀지 않게 한다.
// 상단 분류·하단 태그는 클릭 시 카탈로그 검색(#/catalog?q=...)으로 연결된다.
// 맨 아래 해설(notes.md)은 "도구는 위, 읽을거리는 아래" 원칙으로 항상 펼쳐 둔다.
//
// renderAlgorithm(container, id) → teardown 함수 반환.

import { createStore } from '../store.js';
import { loadAlgorithm } from '../algorithm-loader.js';
import { getRenderer, hasRenderer } from '../renderers/registry.js';
import { highlightCpp } from '../highlight.js';
import { createGraphEditor } from '../graph-editor.js';
import { renderMarkdown } from '../markdown.js';
import { loadParadigms, paradigmsOfAlgorithm } from '../paradigm-data.js';
import '../renderers/array.js';
import '../renderers/graph.js';
import '../renderers/matrix.js';
import '../renderers/tree.js';
import '../renderers/heap.js';
import '../renderers/board.js';
import '../renderers/stack.js';
import '../renderers/queue.js';
import '../renderers/geometry.js';

// 렌더러가 스텝에서 읽는 데이터 슬롯. 슬롯이 비어 있는 스텝에서는 그 viz 를 숨긴다.
// (array/graph 는 step.values 를 그대로 쓰므로 슬롯이 없다.)
const VIZ_SLOT = {
  tree: 'tree', matrix: 'matrix', heap: 'heap', board: 'board',
  stack: 'stack', queue: 'queue', geometry: 'geometry',
};

const CAT_LABEL = {
  sorting: '정렬', graph: '그래프', dp: 'DP', search: '탐색', greedy: '그리디',
  string: '문자열', tree: '트리', math: '수학', backtracking: '백트래킹', geometry: '기하',
};
// "O(n^2)" → "O(n²)"
const prettyComplexity = text => String(text).replace(/\^2/g, '²').replace(/\^3/g, '³');

const HTML_ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = text => String(text).replace(/[&<>"]/g, ch => HTML_ENTITIES[ch]);

// 상단: 분류(클릭 가능) · 시간복잡도 · 공간복잡도 — 딱 3가지
function topInfo(algo) {
  const categoryBadge = algo.category
    ? `<button class="badge cat" data-q="${escapeHtml(algo.category)}" title="이 분류로 검색">` +
      `${escapeHtml(CAT_LABEL[algo.category] || algo.category)}</button>`
    : '';
  const worstTime = algo.complexity?.time?.worst || algo.complexity?.time?.avg;
  const timeBadge = worstTime
    ? `<span class="badge cpx">시간 ${escapeHtml(prettyComplexity(worstTime))}</span>` : '';
  const spaceBadge = algo.complexity?.space
    ? `<span class="badge cpx">공간 ${escapeHtml(prettyComplexity(algo.complexity.space))}</span>` : '';
  return categoryBadge + timeBadge + spaceBadge;
}

// 하단: 태그(클릭 → 해당 태그로 검색)
function tagsBar(algo) {
  if (!algo.tags?.length) return '';
  return `<div class="tags"><span class="tags-label">태그</span>` +
    algo.tags.map(tag => `<button class="tag" data-q="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('') +
    `</div>`;
}

// 이 알고리즘이 어떤 "유형"(그리디·DP·분할정복…)에 속하는지 상단에 배지로 덧붙인다.
// 알고리즘 meta 에 유형을 적어 두지 않고 paradigms 쪽 match 규칙으로 역참조하므로,
// 페이지 렌더를 막지 않도록 비동기로 붙인다(실패해도 페이지는 그대로 동작).
async function attachParadigmBadges(container, algorithm) {
  const topInfoEl = container.querySelector('.topinfo');
  if (!topInfoEl) return;
  let paradigms;
  try { paradigms = await loadParadigms(); } catch { return; }
  const matched = paradigmsOfAlgorithm(paradigms, algorithm);
  if (!matched.length) return;
  topInfoEl.insertAdjacentHTML('beforeend', matched.map(paradigm =>
    `<a class="badge para" href="#/paradigm/${escapeHtml(paradigm.id)}" ` +
    `title="${escapeHtml(paradigm.summary || '')}">${escapeHtml(paradigm.title)}</a>`).join(''));
}

// [data-q] 요소 클릭 → 카탈로그 검색 결과로 이동
function wireSearchLinks(container) {
  container.querySelectorAll('[data-q]').forEach(button =>
    button.addEventListener('click', () => {
      location.hash = '#/catalog?q=' + encodeURIComponent(button.dataset.q);
    }));
}

// 해설 문서는 두 층이다.
//   차근차근(walkthrough.md) — 처음 보는 사람용. 구체적 예시로 원리를 쌓아 올린다.
//   깊이 보기(notes.md)      — 불변식·증명·복잡도.
// 둘 다 항상 DOM 에 둔다(탭으로 감추지 않는다) — Ctrl+F 검색·스크린리더·인쇄가 그대로 동작하게.
// 대신 맨 위 층 선택 버튼과 문서별로 묶인 목차로 긴 페이지를 넘나든다.
const DOC_LEVELS = [
  { key: 'walkthrough', anchor: 'doc-walkthrough', label: '차근차근',
    hint: '처음 보는 사람용 — 예시를 따라가며 원리를 쌓는다' },
  { key: 'notes', anchor: 'doc-notes', label: '깊이 보기',
    hint: '불변식과 증명, 복잡도 분석' },
];

function docsSection(algo) {
  const docs = DOC_LEVELS
    .map(level => ({ ...level, source: algo[level.key] }))
    .filter(doc => doc.source && doc.source.trim())
    .map(doc => ({ ...doc, ...renderMarkdown(doc.source, { idPrefix: doc.key }) }));

  if (!docs.length) return '';

  const levelNav = docs.length > 1
    ? `<div class="doc-levels" role="group" aria-label="문서 수준 선택">
         ${docs.map(doc =>
           `<button class="doc-level" data-goto="${doc.anchor}">
              <span class="doc-level-label">${escapeHtml(doc.label)}</span>
              <span class="doc-level-hint">${escapeHtml(doc.hint)}</span>
            </button>`).join('')}
       </div>`
    : '';

  // 목차는 문서별로 묶어서 보여 준다(둘이 섞이면 어느 층의 절인지 알 수 없다)
  const tocNav = docs.some(doc => doc.toc.length >= 3)
    ? `<nav class="notes-toc" aria-label="해설 목차">
         ${docs.map(doc =>
           `<div class="toc-label">${escapeHtml(doc.label)}</div>
            <ul>${doc.toc.map(entry =>
              `<li class="lv${entry.level}"><button class="toc-link" data-goto="${escapeHtml(entry.id)}">` +
              `${escapeHtml(entry.text)}</button></li>`).join('')}</ul>`).join('')}
       </nav>`
    : '';

  const articles = docs.map(doc =>
    `<article class="md doc" id="${doc.anchor}" aria-labelledby="${doc.anchor}-h">
       <h2 class="doc-title" id="${doc.anchor}-h">${escapeHtml(doc.label)}
         <span class="doc-title-hint">${escapeHtml(doc.hint)}</span></h2>
       ${doc.html}
     </article>`).join('');

  return `<section class="notes">
      ${levelNav}
      <div class="notes-body">${tocNav}<div class="doc-stack">${articles}</div></div>
    </section>`;
}

function wireTocLinks(container) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  container.querySelectorAll('[data-goto]').forEach(link =>
    link.addEventListener('click', () => {
      const target = container.querySelector(`[id="${CSS.escape(link.dataset.goto)}"]`);
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });   // 스크린리더 포커스도 함께 이동
    }));
}

export async function renderAlgorithm(container, id) {
  let current;
  try {
    current = await loadAlgorithm(id);
  } catch (err) {
    container.innerHTML =
      `<div class="algo-head"><a class="back" href="#/catalog">← 목록</a>` +
      `<h1 class="algo-title">로드 실패</h1>` +
      `<div class="cs-sum">알고리즘 <code>${escapeHtml(id)}</code> 를 불러오지 못했습니다 — ${escapeHtml(err.message)}</div></div>`;
    return () => {};
  }

  // 준비 중(placeholder) — 플레이어 없이 정보/태그만
  if (current.placeholder) {
    container.innerHTML = `
      <div class="algo-head">
        <a class="back" href="#/catalog">← 목록</a>
        <h1 class="algo-title">${escapeHtml(current.title)}</h1>
        <div class="topinfo">${topInfo(current)}</div>
      </div>
      <div class="coming-soon">
        <div class="cs-badge">준비 중</div>
        ${current.summary ? `<p class="cs-sum">${escapeHtml(current.summary)}</p>` : ''}
        <p class="cs-note">이 알고리즘의 시각화는 아직 구현되지 않았습니다.</p>
      </div>
      ${tagsBar(current)}
      ${docsSection(current)}`;
    wireSearchLinks(container);
    wireTocLinks(container);
    attachParadigmBadges(container, current);
    return () => {};
  }

  // viz 슬롯: meta.dataStructures 중 렌더러가 등록된 것만(예: bfs 의 'queue' 는 건너뜀).
  const vizTypes = current.dataStructures.filter(type => hasRenderer(type));
  if (!vizTypes.length) vizTypes.push('array');

  container.innerHTML = `
    <div class="player">
      <div class="algo-head">
        <a class="back" href="#/catalog">← 목록</a>
        <h1 class="algo-title">${escapeHtml(current.title)}</h1>
        <div class="topinfo">${topInfo(current)}</div>
      </div>

      <div class="toolbar">
        <div class="inputrow">
          <label for="arr">${escapeHtml(current.inputLabel)}</label>
          <input id="arr" spellcheck="false" aria-describedby="arr-hint" />
          <button class="btn primary" data-act="run">Run</button>
          <button class="btn" data-act="rand">Randomize</button>
          <button class="btn" data-act="reset">Default</button>
        </div>
        ${current.inputHint ? `<div class="inputhint" id="arr-hint">${escapeHtml(current.inputHint)}</div>` : ''}
        <div class="editor-slot"></div>
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
        <div class="vizstack">
          ${vizTypes.map(type => `<div class="viz" data-type="${escapeHtml(type)}"></div>`).join('')}
        </div>
        <div class="readout"></div>
      </section>

      ${tagsBar(current)}
      ${docsSection(current)}
    </div>`;

  const find = selector => container.querySelector(selector);
  const vizHosts = [...container.querySelectorAll('.viz')];
  const ui = {
    message: find('.note'), input: find('#arr'),
    codePanel: find('.code'), readout: find('.readout'),
    scrubber: find('.scrub'), speedSlider: find('.speed-range'),
    counter: find('.counter'), playButton: find('[data-act=play]'),
  };
  // 입력은 두 종류다: 정수 배열(기본) 또는 자유 텍스트(inputKind='text', 예: LCS 의 두 문자열).
  const usesTextInput = current.inputKind === 'text';
  const formatInput = value => (Array.isArray(value) ? value.join(' ') : String(value));
  ui.input.value = formatInput(current.defaultInput);

  // 그래프 알고리즘: 배열 입력행 대신 그래프 편집기를 붙인다.
  // 단, 그래프를 "그리지 않고" 입력에서 파생만 하는 경우(2-SAT 의 함의 그래프)는
  // defaultGraph 를 export 하지 않는다 → 편집기 없이 일반 입력을 받고, 렌더는 step.graph 로 한다.
  const usesGraphInput = current.dataStructure === 'graph' && !!current.defaultGraph;
  let activeGraph = usesGraphInput ? (current.defaultGraph || { nodes: [], edges: [], start: 0 }) : null;
  if (usesGraphInput) {
    find('.inputrow').style.display = 'none';
    const editor = createGraphEditor(current.defaultGraph, {
      onRun: graph => run(graph),
      capabilities: current.capabilities,
    });
    find('.editor-slot').append(editor.el);
  }

  const store = createStore();

  function renderCode(step) {
    const sourceLines = current.code;
    if (ui.codePanel.childElementCount !== sourceLines.length) {
      ui.codePanel.innerHTML = '';
      sourceLines.forEach((text, index) => {
        const row = document.createElement('div');
        row.className = 'cl'; row.dataset.line = index + 1;
        const lineNo = document.createElement('span');
        lineNo.className = 'ln'; lineNo.textContent = index + 1;
        const source = document.createElement('span');
        source.className = 'ct'; source.innerHTML = highlightCpp(text);
        row.append(lineNo, source); ui.codePanel.append(row);
      });
    }

    let activeRow = null;
    for (const row of ui.codePanel.children) {
      const isActive = !!step && Number(row.dataset.line) === step.line;
      row.classList.toggle('on', isActive);
      if (isActive) activeRow = row;
    }

    // 코드 패널이 스크롤 가능한 경우(긴 소스) 활성 줄을 화면 안으로 끌어온다
    if (activeRow && ui.codePanel.scrollHeight > ui.codePanel.clientHeight) {
      const rowTop = activeRow.offsetTop, rowHeight = activeRow.offsetHeight;
      const viewTop = ui.codePanel.scrollTop, viewHeight = ui.codePanel.clientHeight;
      if (rowTop < viewTop || rowTop + rowHeight > viewTop + viewHeight)
        ui.codePanel.scrollTop = rowTop - (viewHeight - rowHeight) / 2;
    }
  }

  // 슬롯마다 해당 타입 렌더러를 호출한다. 스텝에 그 슬롯 데이터가 없으면 그 viz 는 감춘다
  // (예: 세그먼트 트리 build 단계엔 표가 없다).
  function paintViz(step) {
    if (!step) return;
    for (const host of vizHosts) {
      const type = host.dataset.type;
      const slotKey = VIZ_SLOT[type];
      const hasData = !slotKey || step[slotKey];
      host.hidden = !hasData;
      // step.graph 가 있으면(파생 그래프: 2-SAT 의 함의 그래프) 그걸로 그린다. 없으면 편집기 그래프.
      if (hasData) (getRenderer(type) || getRenderer('array'))(host, step, { graph: step.graph || activeGraph });
    }
  }

  const OP_LABEL = {
    start: 'START', compare: 'COMPARE', swap: 'SWAP', 'pass-end': 'PASS-END', done: 'DONE',
    write: 'WRITE', set: 'SET', read: 'READ', visit: 'VISIT',
    enqueue: 'ENQUEUE', dequeue: 'DEQUEUE', mark: 'MARK',
  };

  function renderReadout(step) {
    if (!step) { ui.readout.innerHTML = ''; return; }
    ui.readout.innerHTML =
      `<span>line <b>${step.line}</b></span>` +
      (step.i != null ? `<span>i <b>${step.i}</b></span>` : '') +
      (step.j != null ? `<span>j <b>${step.j}</b></span>` : '') +
      `<span>op <span class="op">${OP_LABEL[step.op] || step.op}</span></span>` +
      `<span class="exp">${escapeHtml(step.explain)}</span>`;
  }

  store.subscribe(state => {
    const step = store.stepFor(state.traceA);
    renderCode(step); paintViz(step); renderReadout(step);
    const stepCount = store.maxSteps();
    ui.scrubber.max = stepCount - 1; ui.scrubber.value = state.step;
    ui.counter.textContent = `${state.step + 1} / ${stepCount}`;
    ui.playButton.textContent = state.playing ? '⏸' : '▶';
  });

  function run(graphOverride) {
    ui.message.textContent = '';
    if (usesGraphInput) {                    // 그래프: 편집기로 그린 그래프를 입력으로
      const graph = graphOverride || activeGraph;
      if (!graph.nodes.length) {
        ui.message.textContent = '정점을 1개 이상 추가한 뒤 실행하세요';
        return;
      }
      activeGraph = graph;                   // 렌더러가 이 그래프로 그린다
      store.setTraces({ traceA: current.generate(graph), trace2Valid: false });
      return;
    }
    if (usesTextInput) {                     // 문자열 입력: 생성기가 직접 파싱한다
      const text = ui.input.value.trim();
      if (!text) { ui.message.textContent = '입력이 비었습니다'; return; }
      if (text.length > MAX_TEXT_LENGTH) {
        ui.message.textContent = `최대 ${MAX_TEXT_LENGTH}자까지 지원`;
        return;
      }
      store.setTraces({ traceA: current.generate(text), trace2Valid: false });
      return;
    }
    const parsed = parseInput(ui.input.value);
    if (!parsed) { ui.message.textContent = '입력이 비었습니다'; return; }
    if (parsed.error) { ui.message.textContent = parsed.error; return; }
    store.setTraces({ traceA: current.generate(parsed.values), trace2Valid: false });
  }

  const actions = {
    run,
    reset: () => { ui.input.value = formatInput(current.defaultInput); run(); },
    // 입력 형식이 특수한 알고리즘(배낭의 "용량 w v w v …", LCS 의 두 문자열)은
    // 생성기가 randomInput() 을 export 해 자기 형식에 맞는 예시를 만든다.
    rand: () => {
      const length = 5 + Math.floor(Math.random() * 3);
      ui.input.value = formatInput(current.randomInput
        ? current.randomInput()
        : Array.from({ length }, () => Math.floor(Math.random() * 20)));
      run();
    },
    first: () => { store.stopPlay(); store.first(); },
    last:  () => { store.stopPlay(); store.last(); },
    prev:  () => { store.stopPlay(); store.prev(); },
    next:  () => { store.stopPlay(); store.next(); },
    play:  () => store.togglePlay(),
  };
  container.querySelectorAll('[data-act]').forEach(button =>
    button.addEventListener('click', () => actions[button.dataset.act]()));
  ui.scrubber.addEventListener('input', event => {
    store.stopPlay();
    store.setStep(Number(event.target.value));
  });
  ui.speedSlider.addEventListener('input', event => store.setSpeed(event.target.value));
  wireSearchLinks(container);
  wireTocLinks(container);
  attachParadigmBadges(container, current);

  const onKeyDown = event => {
    // 입력란·버튼에 포커스가 있으면 그쪽 키 동작(스페이스=클릭 등)을 가로채지 않는다
    if (/^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight') { store.stopPlay(); store.next(); }
    if (event.key === 'ArrowLeft')  { store.stopPlay(); store.prev(); }
    if (event.key === ' ')          { event.preventDefault(); store.togglePlay(); }
  };
  document.addEventListener('keydown', onKeyDown);

  run();

  return () => {
    store.stopPlay();
    document.removeEventListener('keydown', onKeyDown);
  };
}

// "5 2 9" / "5,2,9" → { values: [5,2,9] } · 실패하면 { error } · 비었으면 null
const MAX_INPUT_LENGTH = 12, MAX_INPUT_ABS = 999;
const MAX_TEXT_LENGTH = 24;          // inputKind='text' 일 때 입력란 길이 상한

function parseInput(raw) {
  const tokens = raw.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  if (tokens.length > MAX_INPUT_LENGTH) return { error: `최대 ${MAX_INPUT_LENGTH}개까지 지원` };
  const values = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isInteger(value) || Math.abs(value) > MAX_INPUT_ABS)
      return { error: `정수(±${MAX_INPUT_ABS})만` };
    values.push(value);
  }
  return { values };
}
