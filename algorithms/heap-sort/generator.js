// algorithms/heap-sort/generator.js — Model A 생성기(힙 정렬).
//
// 배열 하나를 완전 이진 트리로 읽는다 — 부모 i 의 자식은 2i+1, 2i+2.
//   ① 배열 전체를 최대 힙으로 만든다(아래에서 위로 siftDown).
//   ② 루트(최댓값)를 맨 뒤와 바꾸고 힙 크기를 하나 줄인 뒤, 루트만 다시 내린다.
// 뒤에서부터 정렬 구역이 자라므로 추가 배열이 필요 없다(제자리 정렬).
//
// 시각화: array 슬롯(막대, sortedFrom 뒤가 정렬 구역) + heap 슬롯(배열 줄 + 트리).
//   heap 셀 상태: 0 기본 · 1 비교 중 · 2 교환 · 3 정렬 완료 · 4 루트(최댓값)

export const category = 'sorting';
export const defaultInput = [4, 10, 3, 5, 1, 8, 7];
export const inputLabel = 'a[]';
export const inputHint = '이 배열을 최대 힙으로 만든 뒤, 루트를 하나씩 뒤로 빼내 정렬한다.';

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// 배열 = 완전 이진 트리. 부모 i 의 자식은 2i+1, 2i+2',
  'void siftDown(vector<int>& a, int i, int size) {',
  '    while (2*i + 1 < size) {                    // 자식이 있는 동안',
  '        int child = 2*i + 1;',
  '        if (child + 1 < size && a[child+1] > a[child])',
  '            child++;                            // 더 큰 자식 쪽으로',
  '        if (a[i] >= a[child]) break;            // 부모가 이미 더 크다',
  '        swap(a[i], a[child]);',
  '        i = child;                              // 한 층 내려간다',
  '    }',
  '}',
  '',
  'void heapSort(vector<int>& a) {',
  '    int n = a.size();',
  '    for (int i = n/2 - 1; i >= 0; i--)          // ① 힙 만들기(아래에서 위로)',
  '        siftDown(a, i, n);',
  '    for (int size = n; size > 1; size--) {      // ② 최댓값을 하나씩 빼낸다',
  '        swap(a[0], a[size-1]);                  //    루트를 정렬 구역 앞으로',
  '        siftDown(a, 0, size - 1);               //    새 루트만 내리면 된다',
  '    }',
  '}',
];

export function generate(input) {
  const a = (Array.isArray(input) && input.length) ? input.slice() : defaultInput.slice();
  const n = a.length;

  const steps = [];
  let heapSize = n;
  let caption = '';

  // 힙 밖(정렬 완료)은 3, 힙 안은 0. 강조는 이 위에 덧칠한다.
  const baseStates = () => Array.from({ length: n }, (_, index) => (index >= heapSize ? 3 : 0));

  const pushStep = (line, op, explain, extra = {}) => {
    const states = extra.states ?? baseStates();
    steps.push({
      line, op,
      a: extra.a ?? -1, b: extra.b ?? -1,
      values: a.slice(),
      sortedFrom: heapSize,              // 힙 뒤쪽이 곧 정렬 구역이다
      heap: {
        values: a.slice(),
        size: heapSize,
        states,
        caption,
      },
      explain,
    });
  };

  if (n <= 1) {
    heapSize = 0;
    caption = '원소가 하나뿐이라 이미 정렬돼 있다';
    pushStep(14, 'done', n ? '원소가 하나뿐이다 — 이미 정렬 상태' : '빈 배열');
    return steps;
  }

  const highlight = (indices, state) => {
    const states = baseStates();
    for (const index of indices) if (index >= 0 && index < n) states[index] = state;
    return states;
  };

  // 부모 index 를 자기 자리에서 아래로 내린다. 자식 중 큰 쪽과만 비교하면 된다.
  function siftDown(startIndex, phaseLabel) {
    let i = startIndex;
    while (2 * i + 1 < heapSize) {
      let child = 2 * i + 1;
      const rightChild = child + 1;

      if (rightChild < heapSize) {
        const bigger = a[rightChild] > a[child] ? rightChild : child;
        caption = `${phaseLabel} — 자식 둘 중 큰 쪽을 고른다`;
        pushStep(5, 'compare',
          `자식 ${child}(${a[child]}) 과 ${rightChild}(${a[rightChild]}) 중 ` +
          `큰 쪽은 ${bigger}(${a[bigger]}) 이다`,
          { a: child, b: rightChild, states: highlight([child, rightChild], 1) });
        child = bigger;
      }

      if (a[i] >= a[child]) {
        caption = `${phaseLabel} — 부모가 이미 더 크다`;
        pushStep(7, 'compare',
          `부모 ${i}(${a[i]}) 가 자식 ${child}(${a[child]}) 보다 작지 않다 → 여기서 멈춘다`,
          { a: i, b: child, states: highlight([i, child], 1) });
        return;
      }

      caption = `${phaseLabel} — 부모와 자식을 바꾼다`;
      const parentValue = a[i], childValue = a[child];
      [a[i], a[child]] = [a[child], a[i]];
      pushStep(8, 'swap',
        `부모 ${i}(${parentValue}) 가 자식 ${child}(${childValue}) 보다 작다 → 교환하고 한 층 내려간다`,
        { a: i, b: child, states: highlight([i, child], 2) });

      i = child;
    }

    caption = `${phaseLabel} — 더 내려갈 자식이 없다`;
    pushStep(3, 'compare', `${i} 번 자리에 자식이 없다 → 내리기 끝`,
      { a: i, states: highlight([i], 1) });
  }

  caption = '아직 힙이 아니다 — 아래 절반부터 정리한다';
  pushStep(14, 'start',
    `원소 ${n}개. 배열을 그대로 완전 이진 트리로 읽는다 — 부모 ${'i'} 의 자식은 2i+1, 2i+2`);

  // ① 힙 만들기 — 잎은 이미 크기 1짜리 힙이므로 마지막 부모부터 거꾸로 훑는다
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    caption = `① 힙 만들기 — ${i} 번 자리를 아래로 내린다`;
    pushStep(16, 'set',
      `${i} 번 자리(${a[i]})를 아래로 내린다. 이 아래는 이미 힙이므로 여기만 고치면 된다`,
      { a: i, states: highlight([i], 4) });
    siftDown(i, `① 힙 만들기 (i=${i})`);
  }

  caption = '최대 힙 완성 — 루트가 전체 최댓값이다';
  pushStep(17, 'mark',
    `힙 완성. 어떤 부모도 자식보다 작지 않다 → 루트 a[0] = ${a[0]} 가 전체 최댓값이다`,
    { a: 0, states: highlight([0], 4) });

  // ② 루트(최댓값)를 정렬 구역 앞으로 보내고, 힙을 하나 줄인 뒤 루트만 다시 내린다
  for (let size = n; size > 1; size--) {
    const lastIndex = size - 1;
    const rootValue = a[0], lastValue = a[lastIndex];
    [a[0], a[lastIndex]] = [a[lastIndex], a[0]];
    heapSize = lastIndex;                // 뺀 자리는 이제 힙 밖(정렬 완료)

    caption = `② 최댓값 ${rootValue} 를 ${lastIndex} 번 자리에 고정`;
    pushStep(18, 'swap',
      `루트 ${rootValue} 와 마지막 ${lastValue} 를 바꾼다 → ` +
      `${rootValue} 는 ${lastIndex} 번 자리에 확정, 힙 크기는 ${heapSize}`,
      { a: 0, b: lastIndex, states: highlight([0], 2) });

    if (heapSize > 1) siftDown(0, `② 새 루트 내리기 (크기 ${heapSize})`);
  }

  heapSize = 0;
  caption = '완성 — 전부 정렬됐다';
  pushStep(21, 'done', `힙이 비었다. 배열 전체가 오름차순으로 정렬됐다: [${a.join(', ')}]`);

  return steps;
}
