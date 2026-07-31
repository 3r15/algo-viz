// algorithms/activity-selection/generator.js — Model A 생성기(활동 선택, 그리디).
//
// 시작·끝 시각이 있는 활동들 중 **서로 겹치지 않게 최대 개수**를 고른다.
//   그리디: **끝나는 시각이 이른 순**으로 정렬하고, 직전 선택과 안 겹치면 고른다.
//   "빨리 끝나는 걸 고르면 남는 시간이 최대" 라는 교환 논법으로 최적이 증명된다.
//
// 입력은 정수쌍(start end …, 최대 6개 활동). 시각화: matrix 슬롯(간트 차트 — 행=활동, 열=시각).

export const category = 'greedy';
export const defaultInput = [1, 3, 2, 5, 4, 7, 1, 8, 5, 9, 8, 10];   // 6개 활동 (start,end)
export const inputLabel = '활동 (s e …)';
export const inputHint = '정수를 둘씩 묶어 활동 (시작, 끝). 예: 1 3 2 5 → 활동 [1,3) [2,5).';

export function randomInput() {
  const count = 5 + Math.floor(Math.random() * 2);
  const out = [];
  for (let k = 0; k < count; k++) {
    const s = Math.floor(Math.random() * 9);
    const e = s + 1 + Math.floor(Math.random() * 4);
    out.push(s, e);
  }
  return out;
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 활동 (start, end) 들 중 겹치지 않게 최대 개수',
  'int activitySelection(vector<Act>& a) {',
  '    sort(a.begin(), a.end(), byEndTime);   // 끝나는 시각 오름차순',
  '    int count = 0, lastEnd = -INF;',
  '    for (Act act : a) {',
  '        if (act.start >= lastEnd) {         // 직전 선택과 안 겹치면',
  '            count++;                        // 선택한다',
  '            lastEnd = act.end;              // 끝 시각 갱신',
  '        }',
  '    }',
  '    return count;                           // 최대 개수',
  '}',
];

export function generate(input) {
  const raw = (Array.isArray(input) && input.length >= 2) ? input : defaultInput;
  const acts = [];
  for (let i = 0; i + 1 < raw.length && acts.length < 6; i += 2) {
    let s = Math.max(0, Math.trunc(Number(raw[i]) || 0));
    let e = Math.trunc(Number(raw[i + 1]) || 0);
    if (e <= s) e = s + 1;
    acts.push({ s: Math.min(s, 20), e: Math.min(e, 21) });
  }
  const n = acts.length;
  if (n === 0) {
    return [{ line: 11, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '활동이 없다' }];
  }

  // 끝나는 시각 오름차순 정렬(같으면 시작 이른 순)
  acts.sort((a, b) => (a.e - b.e) || (a.s - b.s));
  const maxEnd = Math.max(...acts.map(a => a.e));
  const cols = maxEnd;

  // 활동 상태: 0 대기 · 2 지금 검토 · 3 선택 · 4 기각
  const status = new Array(n).fill(0);
  let lastEnd = -Infinity, count = 0, caption = '';

  const buildMatrix = () => {
    const values = new Array(n * cols).fill(null);
    const states = new Array(n * cols).fill(0);
    for (let i = 0; i < n; i++) {
      for (let t = acts[i].s; t < acts[i].e; t++) {
        const idx = i * cols + t;
        values[idx] = '█';
        states[idx] = status[i] === 0 ? 1 : status[i];   // 점유=1, 나머진 활동 상태색
      }
    }
    return {
      rows: n, cols,
      values, states,
      rowLabels: acts.map(a => `[${a.s},${a.e})`),
      colLabels: Array.from({ length: cols }, (_, t) => String(t)),
      caption,
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: [], sortedFrom: 0, matrix: buildMatrix(), explain,
  });

  caption = '끝나는 시각 오름차순으로 정렬됨';
  pushStep(3, 'set',
    `활동 ${n}개를 **끝나는 시각** 이른 순으로 정렬했다: ${acts.map(a => `[${a.s},${a.e})`).join(' ')}. ` +
    `빨리 끝나는 것부터 고른다`);

  for (let i = 0; i < n; i++) {
    status[i] = 2;
    const fits = acts[i].s >= lastEnd;
    caption = `검토: [${acts[i].s},${acts[i].e}) · 직전 끝 시각 lastEnd = ${lastEnd === -Infinity ? '−∞' : lastEnd}`;
    pushStep(6, 'compare',
      `활동 [${acts[i].s},${acts[i].e}): 시작 ${acts[i].s} ${fits ? '≥' : '<'} lastEnd ${lastEnd === -Infinity ? '−∞' : lastEnd} → ` +
      (fits ? '안 겹친다 → 선택' : '겹친다 → 기각'),
      { a: i });
    if (fits) {
      status[i] = 3; count++; lastEnd = acts[i].e;
      caption = `선택! count = ${count}, lastEnd = ${lastEnd}`;
      pushStep(8, 'write', `[${acts[i].s},${acts[i].e}) 선택 → count = ${count}, lastEnd = ${lastEnd}`, { a: i });
    } else {
      status[i] = 4;
      pushStep(6, 'read', `[${acts[i].s},${acts[i].e}) 기각(직전 선택과 겹침)`, { a: i });
    }
  }

  const chosen = acts.filter((_, i) => status[i] === 3).map(a => `[${a.s},${a.e})`);
  caption = `최대 ${count}개 선택: ${chosen.join(' ')}`;
  pushStep(11, 'done',
    `겹치지 않는 활동 최대 ${count}개: ${chosen.join(' ')}. ` +
    `끝 시각 순 그리디가 최적(교환 논법). 정렬 O(n log n) + 한 번 훑기 O(n)`);

  return steps;
}
