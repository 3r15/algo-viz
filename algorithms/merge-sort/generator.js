// algorithms/merge-sort/generator.js — Model A 생성기.
// 병합 정렬: 반씩 나눠 각각 정렬한 뒤(재귀), 두 정렬된 구간을 임시 버퍼에서
// 비교하며 병합해 원본 배열에 다시 기록한다. compare 는 두 런을 비교하는 단계,
// write 는 병합 결과를 배열에 되쓰는 단계다.

export const category = 'sorting';
export const defaultInput = [5, 2, 9, 1, 5, 6];

// 표시 코드 스타일 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'void mergeSort(vector<int>& a, int lo, int hi) {',
  '    if (lo >= hi) return;',
  '    int mid = (lo + hi) / 2;',
  '    mergeSort(a, lo, mid);',
  '    mergeSort(a, mid + 1, hi);',
  '    merge(a, lo, mid, hi);',
  '}',
  'void merge(vector<int>& a, int lo, int mid, int hi) {',
  '    vector<int> tmp;',
  '    int i = lo, j = mid + 1;',
  '    while (i <= mid && j <= hi)',
  '        tmp.push_back(a[i] <= a[j] ? a[i++] : a[j++]);',
  '    while (i <= mid) tmp.push_back(a[i++]);',
  '    while (j <= hi) tmp.push_back(a[j++]);',
  '    for (int k = 0; k < tmp.size(); k++)',
  '        a[lo + k] = tmp[k];',
  '}',
];

export function generate(input) {
  const a = input.slice();
  const n = a.length;
  const steps = [];
  const push = (line, op, ai, bi, explain) =>
    steps.push({ line, op, a: ai, b: bi, sortedFrom: n, values: a.slice(), explain });

  push(3, 'start', -1, -1, '병합 정렬 시작 — 구간을 절반씩 나눈다');

  const merge = (lo, mid, hi) => {
    const tmp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      push(12, 'compare', i, j, `왼쪽 a[${i}]=${a[i]} 와 오른쪽 a[${j}]=${a[j]} 비교`);
      if (a[i] <= a[j]) { tmp.push(a[i]); i++; } else { tmp.push(a[j]); j++; }
    }
    while (i <= mid) { tmp.push(a[i]); i++; }
    while (j <= hi) { tmp.push(a[j]); j++; }
    for (let k = 0; k < tmp.length; k++) {
      a[lo + k] = tmp[k];
      push(16, 'write', lo + k, -1, `병합 결과 ${tmp[k]} 을 a[${lo + k}] 에 기록`);
    }
  };
  const msort = (lo, hi) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    msort(lo, mid);
    msort(mid + 1, hi);
    merge(lo, mid, hi);
  };
  msort(0, n - 1);

  steps.push({ line: 7, op: 'done', a: -1, b: -1, sortedFrom: 0, values: a.slice(), explain: '정렬 완료' });
  return steps;
}
