// algorithms/insertion-sort/generator.js — Model A 생성기.
// 스왑 기반 삽입 정렬: 원소를 왼쪽으로 인접 교환하며 제자리에 끼워 넣는다.
// 앞쪽 [0, sortedTo) 구간이 "지금까지 정렬됨"으로 초록 표시된다.

export const category = 'sorting';
export const defaultInput = [5, 2, 9, 1, 5, 6];

// 표시 코드 스타일 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void insertionSort(vector<int>& a) {',
  '    int n = a.size();',
  '    for (int i = 1; i < n; i++) {',
  '        int j = i;',
  '        while (j > 0 && a[j - 1] > a[j]) {',
  '            swap(a[j - 1], a[j]);',
  '            j--;',
  '        }',
  '    }',
  '}',
];

export function generate(input) {
  const a = input.slice();
  const n = a.length;
  const steps = [];
  const push = (line, op, ai, bi, sortedTo, explain) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: n, sortedTo, values: a.slice(), explain });

  push(2, 'start', -1, -1, Math.min(1, n), '정렬 시작 — a[0] 은 이미 정렬된 것으로 본다');
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      push(5, 'compare', j - 1, j, i, `a[${j - 1}] 와 a[${j}] 비교`);
      if (a[j - 1] > a[j]) {
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        push(6, 'swap', j - 1, j, i, `a[${j - 1}] > a[${j}] 이므로 교환(왼쪽으로 이동)`);
        j--;
      } else {
        break; // 제자리 찾음
      }
    }
  }
  push(10, 'done', -1, -1, n, '정렬 완료');
  return steps;
}
