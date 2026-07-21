// app/store.js — 공용 플레이어 상태 + 트랜스포트.
// DOM 을 모른다(순수 상태 기계). 구독자가 상태 변화를 받아 렌더한다.
//
// 트레이스 계약: 되감기는 step 인덱스 이동일 뿐이다. undo 로직을 만들지 마라.
// 각 스텝이 전체 스냅샷(values)을 담으므로 i-1 로 되돌리면 그만이다.

export function createStore() {
  const state = {
    traceA: [],          // Model A (generator.js)
    trace2: [],          // Model 2 (reference-trace.json / WASM)
    trace2Valid: false,  // trace2 가 현재 입력에 대응하는가
    step: 0,
    playing: false,
    speed: 5,            // 1..10
    _timer: null,
  };

  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(state); };

  const maxSteps = () =>
    Math.max(state.traceA.length, state.trace2Valid ? state.trace2.length : 0, 1);

  function setTraces({ traceA = [], trace2 = [], trace2Valid = false } = {}) {
    stopPlay();                 // 재생 중이면 멈춤(emit 포함)
    state.traceA = traceA;
    state.trace2 = trace2;
    state.trace2Valid = !!trace2Valid;
    state.step = 0;
    emit();
  }

  function setStep(i) {
    state.step = Math.max(0, Math.min(i, maxSteps() - 1));
    emit();
  }
  const next  = () => setStep(state.step + 1);
  const prev  = () => setStep(state.step - 1);
  const first = () => setStep(0);
  const last  = () => setStep(maxSteps() - 1);

  function stopPlay() {
    if (state._timer) clearInterval(state._timer);
    state._timer = null;
    if (state.playing) { state.playing = false; emit(); }
  }

  function togglePlay() {
    if (state.playing) { stopPlay(); return; }
    if (state.step >= maxSteps() - 1) state.step = 0;
    state.playing = true;
    const delay = 1350 - state.speed * 115;
    state._timer = setInterval(() => {
      if (state.step >= maxSteps() - 1) { stopPlay(); return; }
      setStep(state.step + 1);
    }, delay);
    emit();
  }

  function setSpeed(v) {
    state.speed = Math.max(1, Math.min(10, Number(v) || 5));
    if (state.playing) { stopPlay(); togglePlay(); }  // 새 속도로 재시작
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // 특정 트레이스에서 현재 스텝의 스냅샷(트레이스가 더 짧으면 마지막에 고정)
  function stepFor(trace) {
    return trace.length ? trace[Math.min(state.step, trace.length - 1)] : null;
  }

  return {
    state, subscribe, maxSteps, stepFor,
    setTraces, setStep, next, prev, first, last,
    togglePlay, stopPlay, setSpeed,
  };
}
