// app/main.js — 앱 셸. 해시 라우팅으로 알고리즘을 로드하고, 공용 플레이어(store)와
// 렌더러 레지스트리를 배선한다. index.html 은 이 모듈을 부르는 얇은 셸일 뿐이다.
//
//   #/algo/:id  →  algorithms/:id/ 를 로드 (없으면 bubble-sort 기본)
//
// CH·A = Model A(generator.js), CH·2 = Model 2(reference-trace.json / WASM).
// 두 트레이스가 스텝 단위로 같으면 LOCK 램프가 켜진다.

import { createStore } from './store.js';
import { loadAlgorithm } from './algorithm-loader.js';
import { getRenderer } from './renderers/registry.js';
import { tracesEquivalent } from './equivalence.js';
import './renderers/array.js'; // 기본 렌더러 등록(side-effect)

const DEFAULT_ID = 'bubble-sort';

const $ = id => document.getElementById(id);
const el = {
  arr: $('arr'), run: $('run'), rand: $('rand'), reset: $('reset'),
  lamp: $('lamp'), note: $('note'), algoName: $('algoName'),
  codeA: $('codeA'), vizA: $('vizA'), readA: $('readA'),
  codeB: $('codeB'), vizB: $('vizB'), readB: $('readB'), statusB: $('statusB'),
  first: $('first'), prev: $('prev'), play: $('play'), next: $('next'), last: $('last'),
  scrub: $('scrub'), speed: $('speed'), counter: $('counter'), verdict: $('verdictText'),
};

const store = createStore();
let current = null; // 로드된 알고리즘
let wasm = null;    // { ready, run } | null

/* ── 렌더링 ─────────────────────────────────────────────── */

function renderCode(host, step, code) {
  if (host.childElementCount !== code.length) {
    host.innerHTML = '';
    code.forEach((txt, idx) => {
      const row = document.createElement('div');
      row.className = 'cl'; row.dataset.line = idx + 1;
      const ln = document.createElement('span'); ln.className = 'ln'; ln.textContent = idx + 1;
      const c = document.createElement('span'); c.textContent = txt;
      row.append(ln, c); host.append(row);
    });
  }
  for (const row of host.children)
    row.classList.toggle('on', !!step && Number(row.dataset.line) === step.line);
}

function paintViz(host, step, type) {
  if (!step) {
    host.classList.add('blank');
    host.innerHTML =
      'CH·2 트레이스 없음<br>기본 입력 <code>' + current.defaultInput.join(' ') +
      '</code> 로 되돌리거나<br>WASM 을 빌드하세요';
    return;
  }
  const render = getRenderer(type) || getRenderer('array');
  render(host, step);
}

function renderReadout(host, step) {
  if (!step) { host.innerHTML = ''; return; }
  const opLabel = { start: 'START', compare: 'COMPARE', swap: 'SWAP',
    'pass-end': 'PASS-END', done: 'DONE' }[step.op] || step.op;
  host.innerHTML =
    `<span>line <b>${step.line}</b></span>` +
    `<span>i <b>${step.i}</b></span><span>j <b>${step.j}</b></span>` +
    `<span>op <span class="op">${opLabel}</span></span>` +
    `<span class="exp">${step.explain}</span>`;
}

function updateLamp(state) {
  const txt = el.lamp.querySelector('.txt');
  el.lamp.classList.remove('lock', 'mismatch');
  if (!state.trace2Valid) { txt.textContent = 'N/A'; return; }
  if (tracesEquivalent(state.traceA, state.trace2)) {
    el.lamp.classList.add('lock'); txt.textContent = 'LOCK ✓ 동일';
  } else {
    el.lamp.classList.add('mismatch'); txt.textContent = 'MISMATCH';
  }
}

store.subscribe(state => {
  if (!current) return;
  const sa = store.stepFor(state.traceA);
  const sb = state.trace2Valid ? store.stepFor(state.trace2) : null;
  renderCode(el.codeA, sa, current.code); paintViz(el.vizA, sa, current.dataStructure); renderReadout(el.readA, sa);
  renderCode(el.codeB, sb, current.code); paintViz(el.vizB, sb, current.dataStructure); renderReadout(el.readB, sb);

  const max = store.maxSteps();
  el.scrub.max = max - 1; el.scrub.value = state.step;
  el.counter.textContent = `${state.step + 1} / ${max}`;
  el.play.textContent = state.playing ? '⏸' : '▶';
  updateLamp(state);
});

/* ── 입력 / 실행 ────────────────────────────────────────── */

function note(msg) { el.note.textContent = msg || ''; }
function arraysEqual(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
function setStatusB(cls, txt) { el.statusB.className = 'chan-status ' + cls; el.statusB.textContent = txt; }

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

function run() {
  const parsed = parseInput(el.arr.value);
  note('');
  if (!parsed) { note('입력이 비었습니다'); return; }
  if (parsed.err) { note(parsed.err); return; }

  const inputA = parsed.nums;
  const traceA = current.generate(inputA);

  let trace2 = [], trace2Valid = false;
  if (wasm?.ready) {
    trace2 = wasm.run(inputA); trace2Valid = true;
    setStatusB('live', 'LIVE · WASM');
  } else if (current.referenceTrace && arraysEqual(inputA, current.defaultInput)) {
    trace2 = current.referenceTrace; trace2Valid = true;
    setStatusB('pre', '사전계산 · 네이티브 C++');
  } else {
    setStatusB('pre', 'WASM 미빌드 — 기본 입력만');
    note('CH·2는 WASM 빌드 전이라 기본 입력만 재생합니다 (CH·A는 실시간).');
  }
  store.setTraces({ traceA, trace2, trace2Valid });
}

/* ── Model 2 WASM(선택) ─────────────────────────────────── */
// meta.json 에 "wasm": { "export": "createX", "run": "run_trace" } 가 있고
// 해당 glue 스크립트가 로드돼 window[export] 가 있으면 라이브로 전환.

async function initWasm(algo) {
  const w = algo.wasm;
  if (!w || typeof window[w.export] !== 'function') return null;
  try {
    const Module = await window[w.export]();
    const runTrace = Module.cwrap(w.run || 'run_trace', 'string', ['string']);
    return { ready: true, run: input => JSON.parse(runTrace(input.join(' '))) };
  } catch (e) { console.warn('WASM init 실패:', e); return null; }
}

function renderVerdict() {
  if (wasm?.ready) {
    el.verdict.innerHTML =
      '<span style="color:var(--green)">WASM 로드됨 — 화면의 C++ 그대로 컴파일된 모듈이 임의 입력을 실시간 실행합니다.</span> ' +
      'CH·A(JS)와 스텝 단위로 대조되어 LOCK 램프로 동치 여부가 표시됩니다.';
  } else {
    el.verdict.innerHTML =
      '<span style="color:var(--warn)">WASM 미빌드</span> — CH·2는 계측 C++ 을 네이티브 컴파일해 뽑은 ' +
      `<b>기본 입력 참조 트레이스</b>(<code>algorithms/${current.id}/reference-trace.json</code>)를 재생 중입니다. ` +
      '<code>build.sh</code>로 WASM 을 만들고 meta.json 에 <code>wasm</code> 필드를 추가하면 CH·2가 임의 입력까지 실시간 실행합니다. ' +
      '이 "빌드가 있어야 켜진다"는 점이 두 방식의 핵심 차이입니다.';
  }
}

/* ── 트랜스포트 / 입력 배선 ─────────────────────────────── */

el.run.onclick = run;
el.reset.onclick = () => { el.arr.value = current.defaultInput.join(' '); run(); };
el.rand.onclick = () => {
  const n = 5 + Math.floor(Math.random() * 3);
  el.arr.value = Array.from({ length: n }, () => Math.floor(Math.random() * 20)).join(' ');
  run();
};
el.first.onclick = () => { store.stopPlay(); store.first(); };
el.last.onclick  = () => { store.stopPlay(); store.last(); };
el.prev.onclick  = () => { store.stopPlay(); store.prev(); };
el.next.onclick  = () => { store.stopPlay(); store.next(); };
el.play.onclick  = () => store.togglePlay();
el.scrub.oninput = e => { store.stopPlay(); store.setStep(Number(e.target.value)); };
el.speed.oninput = e => store.setSpeed(e.target.value);

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.id === 'arr') return;
  if (e.key === 'ArrowRight') { store.stopPlay(); store.next(); }
  if (e.key === 'ArrowLeft')  { store.stopPlay(); store.prev(); }
  if (e.key === ' ')          { e.preventDefault(); store.togglePlay(); }
});

/* ── 라우팅 / 부팅 ──────────────────────────────────────── */

async function route() {
  const m = location.hash.match(/^#\/algo\/([\w-]+)/);
  const id = m ? m[1] : DEFAULT_ID;
  try {
    current = await loadAlgorithm(id);
  } catch (e) {
    note(`알고리즘 로드 실패: ${id} — ${e.message}`);
    return;
  }
  if (el.algoName) el.algoName.textContent = current.title;
  el.arr.value = current.defaultInput.join(' ');
  wasm = await initWasm(current);
  if (!wasm) setStatusB('pre', '사전계산 · 네이티브 C++');
  run();
  renderVerdict();
}

window.addEventListener('hashchange', route);
route();
