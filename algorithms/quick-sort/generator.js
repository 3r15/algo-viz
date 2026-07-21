// algorithms/quick-sort/generator.js — Model A 생성기.
// Lomuto 파티션 기반 퀵 정렬: 각 구간의 마지막 원소를 피벗으로 삼아
// 피벗보다 작은 값을 앞으로 모은 뒤 피벗을 제자리에 놓고 좌우를 재귀 정렬한다.

export const category = 'sorting';
export const defaultInput = [5, 2, 9, 1, 5, 6];

// 표시 코드 스타일 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void quickSort(vector<int>& a, int lo, int hi) {',
  '    if (lo >= hi) return;',
  '    int pivot = a[hi];',
  '    int i = lo;',
  '    for (int j = lo; j < hi; j++) {',
  '        if (a[j] < pivot) {',
  '            swap(a[i], a[j]);',
  '            i++;',
  '        }',
  '    }',
  '    swap(a[i], a[hi]);',
  '    quickSort(a, lo, i - 1);',
  '    quickSort(a, i + 1, hi);',
  '}',
];

export function generate(input) {
  const a = input.slice();
  const n = a.length;
  const steps = [];
  const push = (line, op, ai, bi, explain) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: n, values: a.slice(), explain });

  push(3, 'start', -1, -1, '퀵 정렬 시작 — 각 구간의 마지막 원소를 피벗으로');

  const qsort = (lo, hi) => {
    if (lo >= hi) return;
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      push(6, 'compare', j, hi, `a[${j}] 와 피벗 a[${hi}](=${pivot}) 비교`);
      if (a[j] < pivot) {
        [a[i], a[j]] = [a[j], a[i]];
        push(7, 'swap', i, j, `a[${j}] < 피벗 → a[${i}] 와 교환`);
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    push(11, 'swap', i, hi, `피벗을 제자리 a[${i}] 로 이동`);
    qsort(lo, i - 1);
    qsort(i + 1, hi);
  };
  qsort(0, n - 1);

  steps.push({ line: 14, op: 'done', a: -1, b: -1, sortedFrom: 0, values: a.slice(), explain: '정렬 완료' });
  return steps;
}
