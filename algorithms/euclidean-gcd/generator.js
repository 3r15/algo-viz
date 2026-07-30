// algorithms/euclidean-gcd/generator.js — Model A 생성기(유클리드 호제법).
//
// gcd(a, b) = gcd(b, a mod b),  gcd(a, 0) = a.
//   큰 수를 작은 수로 나눈 **나머지**로 갈아치우면, 두 수가 급격히 작아지면서 최대공약수만 남는다.
//   "공약수는 나머지에도 그대로 남는다" 는 것이 전부다(증명은 notes.md).
//
// 입력은 두 정수. 순서는 상관없다(첫 반복이 알아서 큰 쪽을 앞으로 보낸다).
//
// 시각화(두 슬롯):
//   array 슬롯 — (a, b) 두 막대가 줄어드는 모습
//   matrix 슬롯 — 반복마다 한 행: a · b · a mod b. 표 크기를 미리 잡아 두고 채운다
//     셀 상태: 0 아직 · 1 채워짐 · 2 읽는 중 · 3 방금 씀 · 4 결과

export const category = 'math';
export const defaultInput = [966, 630];
export const inputLabel = 'a b';
export const inputHint = '두 정수의 최대공약수를 구한다. 나머지로 갈아치우면 몇 번 만에 끝난다.';

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  // 공약수를 심어 두어야 결과가 1이 아니고 표가 재미있어진다
  const common = 2 + Math.floor(Math.random() * 20);
  const scale = () => 2 + Math.floor(Math.random() * 30);
  return [common * scale(), common * scale()];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// gcd(a, b) = gcd(b, a mod b),  gcd(a, 0) = a',
  'int gcd(int a, int b) {',
  '    while (b != 0) {',
  '        int r = a % b;          // a 를 b 로 나눈 나머지',
  '        a = b;                  // b 가 새 a 가 되고',
  '        b = r;                  // 나머지가 새 b 가 된다',
  '    }',
  '    return a;                   // b 가 0 이면 a 가 gcd',
  '}',
];

const MAX_VALUE = 999;             // 입력란 상한과 맞춘다

export function generate(input) {
  const numbers = (Array.isArray(input) && input.length >= 2) ? input : defaultInput;
  let a = Math.min(MAX_VALUE, Math.abs(Math.trunc(numbers[0])) || 0);
  let b = Math.min(MAX_VALUE, Math.abs(Math.trunc(numbers[1])) || 0);

  const originalA = a, originalB = b;      // 마지막 설명에서 순진한 방법과 비교할 때 쓴다

  if (a === 0 && b === 0) {
    return [{ line: 8, op: 'done', a: -1, b: -1, sortedFrom: 0, values: [0, 0],
      explain: '두 수가 모두 0 이면 최대공약수가 정의되지 않는다' }];
  }

  // 표 행 수를 미리 알아야 matrix 를 한 번만 만들 수 있다(요소 재사용 → transition 유지).
  // 반복 횟수를 먼저 세어 둔다 — 순수 계산이라 부작용이 없다.
  const iterations = (() => {
    let x = a, y = b, count = 0;
    while (y !== 0) { const r = x % y; x = y; y = r; count++; }
    return Math.max(1, count);
  })();

  const COL_A = 0, COL_B = 1, COL_R = 2;
  const cellValue = Array.from({ length: iterations }, () => new Array(3).fill(null));
  const cellState = Array.from({ length: iterations }, () => new Array(3).fill(0));
  const rowLabels = Array.from({ length: iterations }, (_, row) => `${row + 1}회`);
  const colLabels = ['a', 'b', 'a mod b'];
  let caption = 'a 를 b 로 나눈 나머지로 갈아치운다';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [a, b],
    sortedFrom: extra.sortedFrom ?? 2,     // 확정 표시는 마지막에만 쓴다
    matrix: {
      rows: iterations, cols: 3,
      values: cellValue.flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  caption = `gcd(${a}, ${b}) 를 구한다`;
  pushStep(2, 'start',
    `두 수 ${a} 와 ${b} 의 최대공약수를 구한다. ` +
    `b 가 0 이 될 때까지 (a, b) 를 (b, a mod b) 로 바꾼다`);

  let row = 0;
  while (b !== 0) {
    const remainder = a % b;

    cellValue[row][COL_A] = a;
    cellValue[row][COL_B] = b;
    cellState[row][COL_A] = 2;
    cellState[row][COL_B] = 2;
    caption = `${row + 1}회 — ${a} 를 ${b} 로 나눈다`;
    pushStep(4, 'read',
      `${a} = ${b} × ${Math.floor(a / b)} + ${remainder} → 나머지는 ${remainder}`,
      { a: 0, b: 1 });

    cellValue[row][COL_R] = remainder;
    cellState[row][COL_A] = 1; cellState[row][COL_B] = 1;
    cellState[row][COL_R] = 3;

    const previousA = a;
    a = b;
    b = remainder;

    caption = `${row + 1}회 — (a, b) ← (${a}, ${b})`;
    pushStep(6, 'write',
      `gcd(${previousA}, ${a}) = gcd(${a}, ${b}) — 두 수가 작아졌지만 최대공약수는 그대로다`,
      { a: 0, b: 1 });

    row++;
  }

  for (let r = 0; r < iterations; r++)
    for (let c = 0; c < 3; c++) if (cellState[r][c]) cellState[r][c] = 1;
  if (iterations > 0) cellState[iterations - 1][COL_R] = 4;

  caption = `완성 — 최대공약수는 ${a}`;
  const naiveTrials = Math.max(1, Math.min(originalA, originalB));
  pushStep(8, 'done',
    `b 가 0 이 되었다 → gcd = ${a}. 나눗셈 ${iterations}번으로 끝났다 ` +
    `(1부터 ${naiveTrials} 까지 모두 나눠 보는 방법이라면 ${naiveTrials}번이었다)`,
    { a: 0, sortedFrom: 0 });

  return steps;
}
