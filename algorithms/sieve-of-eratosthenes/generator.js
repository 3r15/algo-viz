// algorithms/sieve-of-eratosthenes/generator.js — Model A 생성기(에라토스테네스의 체).
//
// 2 부터 시작해 아직 지워지지 않은 수 p 를 만나면 p 는 소수다.
//   그 뒤 p 의 배수를 모두 지운다. 지울 시작점은 p² 이면 충분하다 —
//   p 보다 작은 소인수를 가진 배수는 이미 그 소수 차례에 지워졌기 때문이다.
//   같은 이유로 p² > n 이 되면 더 지울 것이 없어 멈춘다.
//
// 입력은 상한 n 하나(정수).
//
// 시각화: matrix 슬롯을 **값이 아니라 상태**로 쓴다(DP 테이블과 반대 용법).
//   1..n 을 10칸씩 격자에 눕히고, 칸 색으로 판정 상태를 보인다.
//   셀 상태: 0 아직 판정 안 됨 · 1 지금 보는 p · 2 지워짐(합성수) · 3 소수 확정 · 4 방금 지움

export const category = 'math';
export const defaultInput = [60];
export const inputLabel = 'n (상한)';
export const inputHint = '2 부터 n 까지의 소수를 모두 찾는다. 배수를 지워 나가는 과정이 보인다.';

const MIN_LIMIT = 2, MAX_LIMIT = 100;
const COLUMNS = 10;                  // 10칸씩 눕히면 배수 패턴이 눈에 보인다

// Randomize 버튼용 — generate 는 순수 함수로 두고, 무작위는 이 함수에만 가둔다.
export function randomInput() {
  return [30 + 10 * Math.floor(Math.random() * 8)];      // 30 .. 100
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  '// isComposite[i] = i 가 합성수인가',
  'void sieve(int n) {',
  '    vector<bool> isComposite(n + 1, false);',
  '    for (int p = 2; p * p <= n; p++) {',
  '        if (isComposite[p]) continue;       // 이미 지워졌다 = 합성수',
  '        for (int m = p * p; m <= n; m += p) // p² 부터 시작하면 된다',
  '            isComposite[m] = true;          // p 의 배수를 지운다',
  '    }',
  '    // 지워지지 않고 남은 2 이상의 수가 소수',
  '}',
];

export function generate(input) {
  const requested = (Array.isArray(input) && input.length) ? Math.trunc(input[0]) : defaultInput[0];
  const n = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Number.isFinite(requested) ? requested : 60));

  const rows = Math.ceil(n / COLUMNS);
  const isComposite = new Array(n + 1).fill(false);

  // 격자는 1..n 을 담는다. 숫자 v → 셀 인덱스 v-1.
  const cellOf = value => value - 1;
  const gridValues = Array.from({ length: rows * COLUMNS }, (_, index) =>
    (index + 1 <= n ? index + 1 : null));
  const rowLabels = Array.from({ length: rows }, (_, row) => `${row * COLUMNS + 1}~`);
  const colLabels = Array.from({ length: COLUMNS }, (_, col) => String(col + 1));
  let caption = '';

  const steps = [];

  // 매 스텝의 상태는 isComposite 에서 새로 만든다 — 되감기가 스냅샷 재렌더로 끝나게.
  const buildStates = extra => {
    const states = new Array(rows * COLUMNS).fill(0);
    for (let value = 2; value <= n; value++)
      states[cellOf(value)] = isComposite[value] ? 2 : (extra.decided >= value ? 3 : 0);
    states[cellOf(1)] = 2;                       // 1 은 소수가 아니다(정의상)
    if (extra.prime) states[cellOf(extra.prime)] = 1;
    if (extra.justCrossed) states[cellOf(extra.justCrossed)] = 4;
    return states;
  };

  const pushStep = (line, op, explain, extra = {}) => steps.push({
    line, op,
    a: extra.a ?? -1, b: extra.b ?? -1,
    values: [],                                  // 배열 자료구조가 없다 — 격자가 전부다
    sortedFrom: 0,
    matrix: {
      rows, cols: COLUMNS,
      values: gridValues,
      states: buildStates(extra),
      rowLabels, colLabels, caption,
    },
    explain,
  });

  caption = `1 부터 ${n} 까지 — 1 은 소수가 아니므로 미리 지운다`;
  pushStep(3, 'start',
    `${n} 까지의 소수를 모두 찾는다. 처음엔 아무것도 판정되지 않은 상태로 두고, ` +
    `작은 수부터 "지워지지 않았으면 소수" 로 확정한 뒤 그 배수를 지운다`);

  let crossedCount = 0;
  let decided = 1;                               // 여기까지는 소수/합성수가 확정됐다

  // 지우는 단계: p² ≤ n 인 p 까지만 보면 된다
  for (let p = 2; p * p <= n; p++) {
    if (isComposite[p]) {
      caption = `p = ${p} — 이미 지워졌다(합성수)`;
      pushStep(5, 'compare',
        `${p} 는 앞서 지워졌으므로 합성수다 → 배수를 지울 필요가 없다 ` +
        `(그 배수들은 ${p} 의 소인수 차례에 이미 지워졌다)`,
        { prime: p, decided, a: p });
      continue;
    }

    decided = Math.max(decided, p);
    caption = `p = ${p} 은 소수 — ${p}² = ${p * p} 부터 배수를 지운다`;
    pushStep(4, 'mark',
      `${p} 는 지워지지 않았다 → 소수다. 이제 ${p} 의 배수를 지운다. ` +
      `시작점은 ${p}² = ${p * p} — 그보다 작은 ${p} 의 배수는 이미 지워졌다`,
      { prime: p, decided, a: p });

    for (let multiple = p * p; multiple <= n; multiple += p) {
      const alreadyCrossed = isComposite[multiple];
      isComposite[multiple] = true;
      if (!alreadyCrossed) crossedCount++;

      caption = `p = ${p} — ${multiple} 을 지운다`;
      pushStep(7, 'write',
        alreadyCrossed
          ? `${multiple} = ${p} × ${multiple / p} — 이미 지워져 있다(소인수가 둘 이상이다)`
          : `${multiple} = ${p} × ${multiple / p} → 합성수이므로 지운다`,
        { prime: p, decided, justCrossed: multiple, a: p, b: multiple });
    }
  }

  // 남은 수를 소수로 확정한다
  decided = n;
  const primes = [];
  for (let value = 2; value <= n; value++) if (!isComposite[value]) primes.push(value);

  const stopPoint = Math.floor(Math.sqrt(n));
  caption = `완성 — ${n} 이하의 소수 ${primes.length}개`;
  pushStep(9, 'done',
    `${stopPoint}² ≤ ${n} < ${stopPoint + 1}² 이므로 p = ${stopPoint} 까지만 보면 됐다. ` +
    `소수 ${primes.length}개: ${primes.join(', ')}` +
    (crossedCount ? ` (지운 수 ${crossedCount}개)` : ''),
    { decided });

  return steps;
}
