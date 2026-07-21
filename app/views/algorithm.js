// app/views/algorithm.js — 단일 채널 알고리즘 플레이어(Model A).
// #/algo/:id 라우트가 렌더한다. Model 2(C++→WASM)는 제품에서 제거됐고
// CI 검증 오라클(reference-trace)로만 남는다 → 여기선 traceA 하나만 재생한다.
//
// renderAlgorithm(container, id) → teardown 함수 반환(라우터가 이탈 시 호출).

import { createStore } from '../store.js';
import { loadAlgorithm } from '../algorithm-loader.js';
import { getRenderer } from '../renderers/registry.js';
import '../renderers/array.js'; // 기본 렌더러 등록(side-effect)

const TEMPLATE = `
<div class="player">
  <header>
    <div class="brand">
      <a class="back" href="#/catalog">← 목록</a>
      <h1 class="algo-title"></h1>
      <div class="algo-sub"></div>
    </div>
    <div class="controls">
      <div class="inputrow">
        <label for="arr">input[]</label>
        <input id="arr" spellcheck="false" />
        <button class="btn primary" data-act="run">Run</button>
      </div>
      <div class="inputrow">
        <button class="btn" data-act="rand">Randomize</button>
        <button class="btn" data-act="reset">Default</button>
      </div>
      <div class="note"></div>
    </div>
  </header>

  <section class="chan">
    <div class="code"></div>
    <div class="viz"></div>
    <div class="readout"></div>
  </section>

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
</div>`;

export async function renderAlgorithm(container, id) {
  container.innerHTML = TEMPLATE;
  const q = sel => container.querySelector(sel);

  const el = {
    title: q('.algo-title'), sub: q('.algo-sub'), note: q('.note'), arr: q('#arr'),
    code: q('.code'), viz: q('.viz'), readout: q('.readout'),
    scrub: q('.scrub'), speed: q('.speed-range'), counter: q('.counter'),
    play: q('[data-act=play]'),
  };

  let current;
  try {
    current = await loadAlgorithm(id);
  } catch (e) {
    container.innerHTML =
      `<header><div class="brand"><a class="back" href="#/catalog">← 목록</a>` +
      `<h1>로드 실패</h1><div class="sub">알고리즘 <code>${id}</code> 를 불러오지 못했습니다 — ${e.message}</div>` +
      `</div></header>`;
    return () => {};
  }

  el.title.textContent = current.title;
  el.sub.innerHTML = subLine(current);
  el.arr.value = current.defaultInput.join(' ');

  const store = createStore();

  /* ── 렌더 ── */
  function renderCode(step) {
    const code = current.code;
    if (el.code.childElementCount !== code.length) {
      el.code.innerHTML = '';
      code.forEach((txt, idx) => {
        const row = document.createElement('div');
        row.className = 'cl'; row.dataset.line = idx + 1;
        const ln = document.createElement('span'); ln.className = 'ln'; ln.textContent = idx + 1;
        const c = document.createElement('span'); c.textContent = txt;
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
      'pass-end': 'PASS-END', done: 'DONE' }[step.op] || step.op;
    el.readout.innerHTML =
      `<span>line <b>${step.line}</b></span>` +
      (step.i != null ? `<span>i <b>${step.i}</b></span>` : '') +
      (step.j != null ? `<span>j <b>${step.j}</b></span>` : '') +
      `<span>op <span class="op">${opLabel}</span></span>` +
      `<span class="exp">${step.explain}</span>`;
  }

  store.subscribe(state => {
    const s = store.stepFor(state.traceA);
    renderCode(s); paintViz(s); renderReadout(s);
    const max = store.maxSteps();
    el.scrub.max = max - 1; el.scrub.value = state.step;
    el.counter.textContent = `${state.step + 1} / ${max}`;
    el.play.textContent = state.playing ? '⏸' : '▶';
  });

  /* ── 입력 / 실행 ── */
  function run() {
    const parsed = parseInput(el.arr.value);
    el.note.textContent = '';
    if (!parsed) { el.note.textContent = '입력이 비었습니다'; return; }
    if (parsed.err) { el.note.textContent = parsed.err; return; }
    store.setTraces({ traceA: current.generate(parsed.nums), trace2Valid: false });
  }

  /* ── 이벤트 배선 ── */
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

  const onKey = e => {
    if (e.target.tagName === 'INPUT' && e.target.id === 'arr') return;
    if (e.key === 'ArrowRight') { store.stopPlay(); store.next(); }
    if (e.key === 'ArrowLeft')  { store.stopPlay(); store.prev(); }
    if (e.key === ' ')          { e.preventDefault(); store.togglePlay(); }
  };
  document.addEventListener('keydown', onKey);

  run();

  // teardown: 재생 타이머 정지 + 키보드 리스너 해제
  return () => {
    store.stopPlay();
    document.removeEventListener('keydown', onKey);
  };
}

function subLine(a) {
  const parts = [];
  if (a.category) parts.push(a.category);
  if (a.complexity?.time?.avg) parts.push(`시간 <b>${a.complexity.time.avg}</b> (avg)`);
  if (a.complexity?.space) parts.push(`공간 ${a.complexity.space}`);
  if (a.difficulty) parts.push(a.difficulty);
  return parts.join(' · ') + ' · step-back enabled';
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
