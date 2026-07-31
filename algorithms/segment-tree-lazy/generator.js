// algorithms/segment-tree-lazy/generator.js — Model A 생성기(세그먼트 트리 지연 전파).
//
// 일반 세그먼트 트리는 한 점 갱신만 O(log n). **구간 전체 갱신**([l,r) 에 +v)까지 O(log n) 에 하려면
// **지연 전파(lazy propagation)** 가 필요하다.
//   구간이 노드에 완전히 포함되면, 자식까지 내려가지 않고 그 노드에 "나중에 내릴 값(lazy)" 만 걸어 둔다.
//   그 자식이 실제로 필요할 때(부분 겹침·질의) 비로소 lazy 를 한 단계 내린다(push down).
//   그래서 구간 갱신·구간 질의 모두 O(log n).
//
// 시각화: tree 슬롯(perfect). 노드 값 = 구간 합, 배지(mark) = 아직 안 내린 지연값 "+v".
//   노드 상태: 0 미계산 · 1 계산됨 · 2 활성 · 3 결과 채택.

export const category = 'tree';
export const defaultInput = [3, 1, 4, 1, 5, 9, 2, 6];
export const inputLabel = 'a[]';
export const inputHint = '구간 합 세그먼트 트리(지연 전파). build → 구간 갱신([2,6)+3) → 구간 질의([1,7)) 순으로 재생.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'long long t[4*N], lazy[4*N];',
  'void apply(int i, int l, int r, long long v) {',
  '    t[i] += v * (r - l);                   // 구간 전체에 +v',
  '    lazy[i] += v;                          // 자식엔 나중에(지연)',
  '}',
  'void push(int i, int l, int r) {           // 지연값을 자식으로 내린다',
  '    if (!lazy[i]) return;',
  '    int m = (l + r) / 2;',
  '    apply(2*i, l, m, lazy[i]);',
  '    apply(2*i+1, m, r, lazy[i]);',
  '    lazy[i] = 0;',
  '}',
  'void update(int i,int l,int r,int ql,int qr,long long v) {',
  '    if (qr <= l || r <= ql) return;        // 겹침 없음',
  '    if (ql <= l && r <= qr) { apply(i,l,r,v); return; } // 완전 포함 → 지연',
  '    push(i, l, r);                          // 부분 → 내리고 재귀',
  '    int m = (l + r) / 2;',
  '    update(2*i, l, m, ql, qr, v);',
  '    update(2*i+1, m, r, ql, qr, v);',
  '    t[i] = t[2*i] + t[2*i+1];',
  '}',
  'long long query(int i,int l,int r,int ql,int qr) {',
  '    if (qr <= l || r <= ql) return 0;',
  '    if (ql <= l && r <= qr) return t[i];',
  '    push(i, l, r);',
  '    int m = (l + r) / 2;',
  '    return query(2*i,l,m,ql,qr) + query(2*i+1,m,r,ql,qr);',
  '}',
];

export function generate(input) {
  const a = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const n = a.length;
  if (n === 0) return [{ line: 1, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];

  let sz = 1;
  while (sz < n) sz <<= 1;
  const t = new Array(2 * sz).fill(0);
  const lazy = new Array(2 * sz).fill(0);
  const states = new Array(2 * sz).fill(0);

  const nodeRange = (i) => {
    const d = Math.floor(Math.log2(i)); const span = sz >> d; const p = i - (1 << d);
    return [p * span, (p + 1) * span];
  };
  const titles = new Array(2 * sz).fill('');
  for (let i = 1; i < 2 * sz; i++) { const [l, r] = nodeRange(i); titles[i] = `t[${i}] · [${l}, ${r})`; }

  const marks = () => {
    const m = {};
    for (let i = 1; i < 2 * sz; i++) if (lazy[i]) m[i] = `+${lazy[i]}`;
    return m;
  };
  const nodeValues = () => { const v = t.slice(); v[0] = null; return v; };
  const adopted = new Set();
  const focus = (...ids) => {
    for (let i = 1; i < 2 * sz; i++) if (states[i] === 2) states[i] = adopted.has(i) ? 3 : 1;
    for (const i of ids) states[i] = 2;
  };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op, a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(), sortedFrom: n, explain,
    tree: { kind: 'perfect', sz, values: nodeValues(), states: states.slice(), titles, marks: marks() },
  });

  // ── build ──
  pushStep(1, 'set', `n=${n} → 리프 ${sz}개. 구간 합 세그먼트 트리를 세우고, 이후 구간 갱신/질의를 지연 전파로 처리한다`);
  for (let i = 0; i < n; i++) { t[sz + i] = a[i]; states[sz + i] = 1; }
  for (let i = sz - 1; i >= 1; i--) { t[i] = t[2 * i] + t[2 * i + 1]; states[i] = 1; }
  focus();
  pushStep(1, 'mark', `build 완료 — 루트 t[1] = 전체 합 ${t[1]}. 각 노드는 자기 구간의 합을 든다`);

  const apply = (i, l, r, v, silent) => {
    t[i] += v * (r - l);
    lazy[i] += v;
    if (!silent) { focus(i); pushStep(3, 'write', `apply: 노드 t[${i}] [${l},${r}) 에 +${v} → 합 ${t[i]}, 지연 +${lazy[i]}(자식은 나중에)`, { a: i }); }
  };
  const push = (i, l, r) => {
    if (!lazy[i]) return;
    const m = (l + r) >> 1;
    focus(i);
    pushStep(6, 'read', `push: 노드 t[${i}] 의 지연 +${lazy[i]} 를 두 자식으로 내린다`, { a: i });
    apply(2 * i, l, m, lazy[i]);
    apply(2 * i + 1, m, r, lazy[i]);
    lazy[i] = 0;
  };

  // ── range update [ul, ur) += uv ──
  const update = (i, l, r, ql, qr, v) => {
    if (qr <= l || r <= ql) return;
    if (ql <= l && r <= qr) { apply(i, l, r, v); return; }
    push(i, l, r);
    const m = (l + r) >> 1;
    update(2 * i, l, m, ql, qr, v);
    update(2 * i + 1, m, r, ql, qr, v);
    t[i] = t[2 * i] + t[2 * i + 1];
    focus(i);
    pushStep(20, 'write', `pull: 노드 t[${i}] = t[${2 * i}]+t[${2 * i + 1}] = ${t[i]} (자식 합으로 되올림)`, { a: i });
  };

  const ul = Math.min(2, n), ur = Math.min(6, n), uv = 3;
  if (ur > ul) {
    focus();
    pushStep(13, 'set', `구간 갱신: [${ul}, ${ur}) 의 모든 원소에 +${uv}. 완전히 덮이는 노드엔 지연만 걸고 멈춘다`, { a: ul, b: ur });
    update(1, 0, sz, ul, ur, uv);
  }

  // ── range query [ql, qr) ──
  const query = (i, l, r, ql, qr) => {
    if (qr <= l || r <= ql) return 0;
    if (ql <= l && r <= qr) { adopted.add(i); focus(i); pushStep(24, 'read', `query: 노드 t[${i}] [${l},${r}) 완전 포함 → 합 ${t[i]} 채택`, { a: i }); return t[i]; }
    push(i, l, r);
    const m = (l + r) >> 1;
    return query(2 * i, l, m, ql, qr) + query(2 * i + 1, m, r, ql, qr);
  };

  const qlv = Math.min(1, n === 1 ? 0 : 1), qrv = Math.min(7, n);
  for (const id of adopted) states[id] = 1; adopted.clear(); focus();
  pushStep(22, 'set', `구간 질의: [${qlv}, ${qrv}) 의 합. 부분 겹치는 노드에선 먼저 push 로 지연을 내린다`, { a: qlv, b: qrv });
  const result = query(1, 0, sz, qlv, qrv);

  focus();
  pushStep(27, 'done',
    `[${qlv}, ${qrv}) 구간 합 = ${result}. 구간 갱신도 질의도 O(log n) — 완전히 덮인 노드에 지연을 걸고, ` +
    `필요할 때만 내렸다`);

  return steps;
}
