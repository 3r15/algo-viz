// algorithms/monotonic-stack/generator.js — Model A 생성기(단조 스택 — 다음 큰 원소).
//
// 각 원소에 대해 **오른쪽에서 처음으로 더 큰 원소**(next greater element)를 O(n) 에 찾는다.
//   값이 감소하는 인덱스 스택을 유지한다. 새 원소 a[i] 가 오면, 스택 top 의 값이 a[i] 보다 작은 동안
//   pop 하며 "그 원소의 다음 큰 값 = a[i]" 로 확정한다. 그 뒤 i 를 push.
//   각 원소는 한 번 push, 최대 한 번 pop → 분할상환 O(n).
//
// 입력은 정수 배열. 시각화: matrix 슬롯(값 행 + 답 행) + stack 슬롯(단조 스택).

export const category = 'search';
export const defaultInput = [2, 1, 5, 6, 2, 3];
export const inputLabel = 'a[]';
export const inputHint = '정수 배열. 각 원소의 오른쪽 첫 더 큰 원소(다음 큰 원소)를 찾는다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'vector<int> nextGreater(vector<int>& a) {',
  '    int n = a.size();',
  '    vector<int> ans(n, -1);              // 기본: 없음',
  '    stack<int> st;                        // 값이 감소하는 인덱스 스택',
  '    for (int i = 0; i < n; i++) {',
  '        while (!st.empty() && a[st.top()] < a[i]) {',
  '            ans[st.top()] = a[i];         // a[i] 가 그 원소의 다음 큰 값',
  '            st.pop();',
  '        }',
  '        st.push(i);                       // i 를 쌓는다',
  '    }',
  '    return ans;                           // 남은 것은 -1(없음)',
  '}',
];

export function generate(input) {
  const a = ((Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice())
    .map(x => Math.trunc(Number(x) || 0)).slice(0, 12);
  const n = a.length;

  if (n === 0) {
    return [{ line: 12, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [], explain: '빈 배열' }];
  }

  const ans = new Array(n).fill(null);   // null = 아직 · -1 = 없음(확정)
  const stack = [];                       // 인덱스
  let caption = '값이 감소하는 인덱스 스택';

  // matrix 2행: 값 / 답. col = 인덱스.
  const cellState = new Array(2 * n).fill(0);
  const buildMatrix = () => ({
    rows: 2, cols: n,
    values: [...a, ...ans.map(v => (v === null ? null : v === -1 ? '—' : v))],
    states: cellState.slice(),
    rowLabels: ['a', '다음 큰'],
    colLabels: Array.from({ length: n }, (_, i) => String(i)),
    caption,
  });
  const stackSnap = () => ({
    values: stack.map(i => a[i]),
    labels: stack.map(i => `#${i}`),
    states: stack.map(() => 1),
    caption: stack.length ? '단조 스택(위로 갈수록 최근·값 감소)' : '스택 비어 있음',
  });
  const clearCells = () => { for (let k = 0; k < cellState.length; k++) if (cellState[k]) cellState[k] = 0; };

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: a.slice(),
    sortedFrom: n,
    explain,
    matrix: buildMatrix(),
    stack: stackSnap(),
  });

  pushStep(4, 'start',
    `각 원소의 "다음 큰 원소"(오른쪽 첫 더 큰 값)를 단조 스택으로 O(n) 에 찾는다. ` +
    `스택엔 아직 답을 못 찾은 인덱스가 값이 감소하는 순서로 쌓인다`);

  for (let i = 0; i < n; i++) {
    clearCells();
    cellState[i] = 2;                        // 현재 값
    pushStep(5, 'read', `i=${i}: a[${i}]=${a[i]} 를 본다. 스택 top 부터 이보다 작은 것들의 답을 채운다`, { a: i });

    while (stack.length && a[stack[stack.length - 1]] < a[i]) {
      const j = stack[stack.length - 1];
      ans[j] = a[i];
      clearCells();
      cellState[i] = 2; cellState[j] = 3; cellState[n + j] = 3;   // 답 확정 표시
      pushStep(7, 'write',
        `a[${j}]=${a[j]} < a[${i}]=${a[i]} → a[${j}] 의 다음 큰 원소는 ${a[i]}. 스택에서 ${j} 를 뺀다`,
        { a: i, b: j });
      stack.pop();
    }

    stack.push(i);
    clearCells();
    cellState[i] = 1;
    caption = `${i} 를 스택에 쌓았다 — 아직 다음 큰 원소를 기다린다`;
    pushStep(10, 'push', `top 이 a[${i}] 이상이거나 비었다 → ${i} 를 스택에 push`, { a: i });
    caption = '값이 감소하는 인덱스 스택';
  }

  // 남은 스택 원소는 다음 큰 원소가 없음(-1)
  clearCells();
  for (const j of stack) { ans[j] = -1; cellState[n + j] = 4; }
  const ansText = ans.map(v => (v === -1 ? '없음' : v)).join(', ');
  caption = '남은 스택 원소 → 다음 큰 원소 없음(—)';
  pushStep(12, 'done',
    `끝. 스택에 남은 ${stack.length}개는 오른쪽에 더 큰 값이 없다(—). ` +
    `다음 큰 원소: [${ansText}]. 각 원소 한 번 push·한 번 pop → O(n)`);

  return steps;
}
