// algorithms/segment-tree/generator.js — Model A 생성기(세그먼트 트리, 구간 합).
//
// 리프 개수를 2의 거듭제곱 sz 로 올린 "완전 이진 트리" 배열 버전:
//   t[1] = 루트,  t[i] 의 자식 = t[2i], t[2i+1],  t[sz + i] = a[i]
// 완전 이진 트리라 인덱스만으로 부모/자식이 정해지고, 시각화 레이아웃도 자명해진다.
//
// 트레이스는 build → query → update → query 순서로 한 편의 이야기를 만든다.
// 시각화는 tree 슬롯(step.tree). 노드 상태: 0 미계산 · 1 계산됨 · 2 활성 · 3 결과에 채택됨

export const category = 'tree';
export const defaultInput = [5, 2, 9, 1, 5, 6, 3, 8];
export const inputLabel = 'a[]';
export const inputHint = '구간 합 세그먼트 트리. build → 구간 질의 → 점 갱신 → 재질의 순서로 재생된다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'int sz;                             // 리프 개수(2의 거듭제곱으로 올림)',
  'vector<long long> t;                // t[1] = 루트, t[sz + i] = a[i]',
  '',
  'void build(vector<int>& a) {',
  '    sz = 1;',
  '    while (sz < a.size()) sz <<= 1;',
  '    t.assign(2 * sz, 0);',
  '    for (int i = 0; i < a.size(); i++)',
  '        t[sz + i] = a[i];                   // 리프에 원소 배치',
  '    for (int i = sz - 1; i >= 1; i--)',
  '        t[i] = t[2*i] + t[2*i + 1];         // 부모 = 두 자식의 합',
  '}',
  '',
  'long long query(int l, int r) {     // [l, r) 구간 합',
  '    long long res = 0;',
  '    for (l += sz, r += sz; l < r; l >>= 1, r >>= 1) {',
  '        if (l & 1) res += t[l++];           // 왼쪽 경계가 오른쪽 자식이면 채택',
  '        if (r & 1) res += t[--r];           // 오른쪽 경계가 오른쪽 자식이면 채택',
  '    }',
  '    return res;',
  '}',
  '',
  'void update(int i, int v) {         // a[i] = v',
  '    i += sz;',
  '    t[i] = v;',
  '    for (i >>= 1; i >= 1; i >>= 1)',
  '        t[i] = t[2*i] + t[2*i + 1];         // 루트까지 경로만 갱신',
  '}',
];

export function generate(input) {
  const a = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const n = a.length;

  if (n === 0) {
    return [{ line: 4, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  let sz = 1;
  while (sz < n) sz <<= 1;
  const levels = Math.log2(sz) + 1;

  const t = new Array(2 * sz).fill(0);
  const states = new Array(2 * sz).fill(0);
  const titles = new Array(2 * sz).fill('');
  for (let i = 1; i < 2 * sz; i++) {
    const d = Math.floor(Math.log2(i));
    const span = sz >> d, p = i - (1 << d);
    titles[i] = `t[${i}] · 구간 [${p * span}, ${(p + 1) * span})`;
  }

  const steps = [];
  const nodeValues = () => {
    const v = t.slice();
    v[0] = null;                      // 0번 칸은 쓰지 않는다
    return v;
  };
  const push = (line, op, explain, ex = {}) => steps.push({
    line, op,
    a: ex.a ?? -1, b: ex.b ?? -1,
    values: a.slice(),
    sortedFrom: n,
    explain,
    tree: { kind: 'perfect', sz, values: nodeValues(), states: states.slice(), titles, marks: ex.marks },
  });

  // 활성(2) 표시는 한 스텝만 유지한다. 질의에서 채택된 노드는 adopted 에 남아,
  // 활성이 풀릴 때 1(계산됨)이 아니라 3(결과)으로 되돌아간다.
  const adopted = new Set();
  const focus = (...ids) => {
    for (let i = 1; i < 2 * sz; i++) if (states[i] === 2) states[i] = adopted.has(i) ? 3 : 1;
    for (const i of ids) states[i] = 2;
  };
  const clearResults = () => {
    for (const i of adopted) states[i] = 1;
    adopted.clear();
  };

  // ---------- build ----------
  push(6, 'set', `n = ${n} → sz = ${sz} (2의 거듭제곱으로 올림). 트리 배열 크기 2·sz = ${2 * sz}, 높이 ${levels}`);

  for (let i = n; i < sz; i++) states[sz + i] = 1;   // 남는 리프: 합의 항등원 0
  push(7, 'set', `t 를 0 으로 초기화. 남는 리프 ${sz - n}칸은 합의 항등원 0 이라 그대로 둬도 안전하다`);

  for (let i = 0; i < n; i++) {
    t[sz + i] = a[i];
    states[sz + i] = 1;
    focus(sz + i);
    push(9, 'write', `t[${sz + i}] = a[${i}] = ${a[i]}  (리프)`, { a: i });
  }

  for (let i = sz - 1; i >= 1; i--) {
    t[i] = t[2 * i] + t[2 * i + 1];
    states[i] = 1;
    focus(i);
    push(11, 'write',
      `t[${i}] = t[${2 * i}](${t[2 * i]}) + t[${2 * i + 1}](${t[2 * i + 1]}) = ${t[i]}   ${titles[i].split('· ')[1]}`,
      { a: 2 * i, b: 2 * i + 1 });
  }

  // ---------- query [ql, qr) ----------
  const ql = n >= 3 ? 1 : 0;
  const qr = n >= 3 ? n - 1 : n;
  runQuery(ql, qr, '첫 질의');

  // ---------- update ----------
  const ui = n >> 1;
  const uv = a[ui] === 1 ? 9 : 1;
  clearResults();
  focus();
  push(24, 'set', `a[${ui}] 를 ${a[ui]} → ${uv} 로 바꾼다. 대응 리프는 t[${sz + ui}]`, { a: ui });

  a[ui] = uv;
  t[sz + ui] = uv;
  focus(sz + ui);
  push(25, 'write', `t[${sz + ui}] = ${uv}`, { a: ui });

  for (let i = (sz + ui) >> 1; i >= 1; i >>= 1) {
    t[i] = t[2 * i] + t[2 * i + 1];
    focus(i);
    push(27, 'write',
      `t[${i}] = ${t[2 * i]} + ${t[2 * i + 1]} = ${t[i]}   — 루트까지 경로 위 노드만 다시 계산한다`,
      { a: 2 * i, b: 2 * i + 1 });
  }

  // ---------- 같은 구간 재질의 ----------
  runQuery(ql, qr, '갱신 후 같은 구간 재질의');

  steps[steps.length - 1].op = 'done';
  return steps;

  // 반복(iterative) 구간 질의 — 아래에서 위로 올라가며 O(log n) 개 노드만 채택한다
  function runQuery(lo, hi, label) {
    clearResults();
    focus();
    let res = 0;
    push(15, 'set', `${label}: [${lo}, ${hi}) 구간 합. res = 0`, { a: lo, b: hi });

    let L = lo + sz, R = hi + sz;
    push(16, 'set', `리프 인덱스로 옮기면 l = ${L}, r = ${R}`, { a: lo, b: hi });

    while (L < R) {
      if (L & 1) {
        res += t[L];
        adopted.add(L); focus(L);
        push(17, 'read', `l = ${L} 이 홀수 = 오른쪽 자식 → t[${L}] = ${t[L]} 채택. res = ${res}`, { a: L });
        L++;
      }
      if (R & 1) {
        R--;
        res += t[R];
        adopted.add(R); focus(R);
        push(18, 'read', `r 을 ${R} 로 줄이니 홀수 = 오른쪽 자식 → t[${R}] = ${t[R]} 채택. res = ${res}`, { a: R });
      }
      L >>= 1; R >>= 1;
      if (L < R) push(16, 'set', `한 레벨 위로: l = ${L}, r = ${R}`, { a: L, b: R });
    }

    focus();
    push(20, 'mark', `${label} 결과 = ${res}  (초록 노드 ${adopted.size}개의 합 — 구간 크기와 무관하게 O(log n)개)`);
  }
}
