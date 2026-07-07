// algorithms/bubble-sort/generator.js
// Model A (JS 그림자 생성기) 표준 계약:
//   export function generate(input) -> Step[]
//   export const defaultInput, code, category   (검증기/플레이어가 사용)
//
// code[] 는 코드 패널에 표시되는 소스이자, 각 step.line 이 가리키는 대상.
// 이 로직은 code/bubble_sort.cpp 와 동일해야 하며, 검증기가 동치를 대조한다.

export const category = 'sorting';
export const defaultInput = [5, 2, 9, 1, 5, 6];

export const code = [
  'void bubbleSort(vector<int>& a) {',
  '  int n = a.size();',
  '  for (int i = 0; i < n - 1; i++) {',
  '    for (int j = 0; j < n - 1 - i; j++) {',
  '      if (a[j] > a[j + 1]) {',
  '        swap(a[j], a[j + 1]);',
  '      }',
  '    }',
  '  }',
  '}',
];

export function generate(input) {
  const a = input.slice();
  const steps = [];
  const n = a.length;
  const push = (line, i, j, op, ai, bi, sortedFrom, explain) =>
    steps.push({ line, i, j, op, a: ai, b: bi, sortedFrom, values: a.slice(), explain });

  push(2, 0, 0, 'start', -1, -1, n, '정렬 시작');
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      push(5, i, j, 'compare', j, j + 1, n - i, `a[${j}] 와 a[${j + 1}] 비교`);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        push(6, i, j, 'swap', j, j + 1, n - i, `a[${j}] > a[${j + 1}] 이므로 교환`);
      }
    }
    push(3, i, 0, 'pass-end', -1, -1, n - 1 - i, `패스 완료 — 뒤쪽 ${i + 1}개 확정`);
  }
  push(10, 0, 0, 'done', -1, -1, 0, '정렬 완료');
  return steps;
}
