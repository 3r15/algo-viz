// algorithms/fast-power/generator.js — Model A 생성기(빠른 거듭제곱, a^n mod m).
//
// a^n 을 n 번 곱하지 않는다. 지수를 2진수로 쪼개고, base 를 제곱해 올리며 필요한 것만 곱한다.
//   a^13 = a^(8+4+1) = a^8 · a^4 · a^1        (13 = 1101₂)
//   a^1 → a^2 → a^4 → a^8 은 매번 제곱 한 번이므로 ⌊log₂ n⌋ + 1 번이면 다 만든다.
//
// [희소 배열](sparse-table)·[이진 상승](binary-lifting)의 **배가(doubling)** 와 같은 발상이다 —
// 대상이 구간·조상이 아니라 지수라는 점만 다르다.
//
// 입력은 [a, n, m]: 밑 · 지수 · 나눌 수(m 을 생략하면 나머지 없이 계산한다).
//
// 시각화: matrix 슬롯. 비트마다 한 행 — 지수의 비트 · 그때의 base(a^(2^k)) · 누적 result.
//   셀 상태: 0 아직 · 1 채워짐 · 2 읽는 중 · 3 방금 씀 · 4 결과

export const category = 'math';
export const defaultInput = [3, 13, 997];
export const inputLabel = 'a n m';
export const inputHint = 'a^n mod m 을 구한다(세 수 모두 999 이하). 지수를 2진수로 쪼개면 곱셈이 n 번에서 log n 번으로 줄어든다.';

// 입력란이 ±999 만 받으므로(app/views/algorithm.js 의 MAX_INPUT_ABS) 상한을 그와 맞춘다.
// 이걸 넘겨 두면 "Default" 로 되돌린 값을 다시 실행할 수 없게 된다.
const MAX_BASE = 999, MAX_EXPONENT = 999, MAX_MODULUS = 999;

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  return [
    2 + Math.floor(Math.random() * 9),          // 밑
    5 + Math.floor(Math.random() * 60),         // 지수 — 비트가 여러 개 되도록
    [97, 101, 251, 499, 997][Math.floor(Math.random() * 5)],   // 나눌 수(999 이하)
  ];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// a^n mod m — 지수를 2진수로 쪼개 제곱해 올린다',
  'long long power(long long a, long long n, long long m) {',
  '    long long result = 1;',
  '    a %= m;',
  '    while (n > 0) {',
  '        if (n & 1) result = result * a % m;   // 이 비트가 1이면 곱한다',
  '        a = a * a % m;                        // base 를 제곱해 올린다',
  '        n >>= 1;                              // 다음 비트로',
  '    }',
  '    return result;',
  '}',
];

export function generate(input) {
  const numbers = (Array.isArray(input) && input.length >= 2) ? input : defaultInput;
  const base = Math.max(0, Math.min(MAX_BASE, Math.trunc(numbers[0]) || 0));
  const exponent = Math.max(0, Math.min(MAX_EXPONENT, Math.trunc(numbers[1]) || 0));
  const rawModulus = numbers.length >= 3 ? Math.trunc(numbers[2]) : 0;
  // m ≤ 1 은 나머지가 항상 0 이라 볼 것이 없다 → 나머지 없이 계산한다
  const modulus = (Number.isFinite(rawModulus) && rawModulus > 1)
    ? Math.min(MAX_MODULUS, rawModulus) : 0;
  const reduce = value => (modulus ? value % modulus : value);
  const label = modulus ? `${base}^${exponent} mod ${modulus}` : `${base}^${exponent}`;

  const bitCount = exponent === 0 ? 1 : Math.floor(Math.log2(exponent)) + 1;
  const COL_BIT = 0, COL_BASE = 1, COL_RESULT = 2;
  const cellValue = Array.from({ length: bitCount }, () => new Array(3).fill(null));
  const cellState = Array.from({ length: bitCount }, () => new Array(3).fill(0));
  const rowLabels = Array.from({ length: bitCount }, (_, k) => `2^${k} = ${1 << k}`);
  const colLabels = ['n 의 비트', `a^(2^k)`, 'result'];
  let caption = '';

  const steps = [];
  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                        // 배열 자료구조가 없다 — 표가 전부다
    sortedFrom: 0,
    matrix: {
      rows: bitCount, cols: 3,
      values: cellValue.flat(),
      states: cellState.flat(),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  if (exponent === 0) {
    cellValue[0][COL_BIT] = 0; cellValue[0][COL_BASE] = reduce(base); cellValue[0][COL_RESULT] = reduce(1);
    cellState[0] = [1, 1, 4];
    caption = `${label} = 1`;
    pushStep(10, 'done', `지수가 0 이므로 답은 1 이다 (0^0 도 관례적으로 1 로 둔다)`);
    return steps;
  }

  const bits = Array.from({ length: bitCount }, (_, k) => (exponent >> k) & 1);
  const binary = bits.slice().reverse().join('');
  const oneBits = bits.filter(bit => bit === 1).length;

  let current = reduce(base);
  let result = reduce(1);
  let multiplications = 0;

  caption = `${label} — 지수 ${exponent} = ${binary}₂`;
  pushStep(3, 'start',
    `${label} 를 구한다. 지수 ${exponent} 을 2진수로 쓰면 ${binary} — ` +
    `1인 비트가 ${oneBits}개다. 그 자리의 a^(2^k) 만 곱하면 된다`);

  for (let k = 0; k < bitCount; k++) {
    cellValue[k][COL_BIT] = bits[k];
    cellValue[k][COL_BASE] = current;
    cellState[k][COL_BIT] = 2;
    cellState[k][COL_BASE] = 2;

    if (bits[k] === 1) {
      const before = result;
      result = reduce(result * current);
      multiplications++;
      cellValue[k][COL_RESULT] = result;
      cellState[k][COL_RESULT] = 3;
      caption = `2^${k} 자리 비트가 1 — a^${1 << k} 를 곱한다`;
      pushStep(6, 'write',
        `${exponent} 의 2^${k} 자리 비트가 1 이다 → result ${before} × ${current} = ${result}` +
        (modulus ? ` (mod ${modulus})` : ''),
        { a: k });
    } else {
      cellValue[k][COL_RESULT] = result;
      cellState[k][COL_RESULT] = 1;
      caption = `2^${k} 자리 비트가 0 — 건너뛴다`;
      pushStep(6, 'compare',
        `${exponent} 의 2^${k} 자리 비트가 0 이다 → a^${1 << k} 는 쓰지 않는다. result 는 ${result} 그대로`,
        { a: k });
    }

    // 다음 비트를 위해 base 를 제곱해 올린다(마지막 비트 뒤에는 쓸 일이 없다)
    if (k + 1 < bitCount) {
      const squared = reduce(current * current);
      cellState[k][COL_BIT] = 1; cellState[k][COL_BASE] = 1;
      cellValue[k + 1][COL_BASE] = squared;
      cellState[k + 1][COL_BASE] = 3;
      caption = `제곱해 올린다 — a^${1 << k} → a^${1 << (k + 1)}`;
      pushStep(7, 'set',
        `다음 자리를 위해 base 를 제곱한다: ${current}² = ${squared}` +
        (modulus ? ` (mod ${modulus})` : '') + ` — 이것이 a^${1 << (k + 1)} 이다`,
        { a: k + 1 });
      current = squared;
      multiplications++;
    }
  }

  for (let row = 0; row < bitCount; row++)
    for (let col = 0; col < 3; col++) if (cellState[row][col]) cellState[row][col] = 1;
  cellState[bitCount - 1][COL_RESULT] = 4;

  caption = `완성 — ${label} = ${result}`;
  pushStep(10, 'done',
    `${label} = ${result}. 곱셈 ${multiplications}번으로 끝났다 — ` +
    `${base} 를 ${exponent} 번 곱하는 방법이라면 ${exponent - 1}번이었다`);

  return steps;
}
