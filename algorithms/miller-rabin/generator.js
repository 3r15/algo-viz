// algorithms/miller-rabin/generator.js — Model A 생성기(밀러-라빈 소수 판정).
//
// n 이 소수인지 빠르게 판정한다. 페르마 판정(a^(n-1)≡1)을 강화한 것으로,
//   n-1 = d·2^s 로 쓰고, 각 "증인" a 에 대해 수열
//     a^d, a^(2d), a^(4d), …, a^(2^(s-1)·d)  (mod n)
//   을 본다. 소수라면 이 수열이 1 로 시작하거나 어딘가에서 n-1 을 지나야 한다.
//   그렇지 않은 a 가 하나라도 있으면 n 은 **합성수**이고 그 a 가 증인이다.
//   (여기선 작은 고정 증인들을 쓴다 — n < 3.2·10^18 까지 결정적. 무작위 증인이 본래 형태.)
//
// 입력은 판정할 정수 하나(배열의 첫 값). 시각화: matrix 슬롯 — 증인마다 제곱 수열 한 행.

export const category = 'math';
export const defaultInput = [561];      // 카마이클 수 — 페르마는 속지만 밀러-라빈은 잡는다
export const inputLabel = 'n';
export const inputHint = '소수인지 판정할 정수 n 하나(2..999). 예: 561(합성) · 97(소수) · 341(합성).';

const WITNESSES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

export function randomInput() {
  const samples = [561, 97, 341, 569, 91, 233, 187, 7, 15, 561];
  return [samples[Math.floor(Math.random() * samples.length)]];
}

// 표시 코드 규약: 들여쓰기는 스페이스 4칸.
export const code = [
  'long long modpow(long long a, long long e, long long m) {',
  '    long long r = 1; a %= m;',
  '    for (; e; e >>= 1) { if (e & 1) r = r*a%m; a = a*a%m; }',
  '    return r;',
  '}',
  'bool isPrime(long long n) {',
  '    if (n < 2) return false;',
  '    if (n % 2 == 0) return n == 2;',
  '    long long d = n - 1; int s = 0;',
  '    while (d % 2 == 0) { d /= 2; s++; }        // n-1 = d·2^s',
  '    for (long long a : {2,3,5,7,11,13,17,19,23,29,31,37}) {',
  '        if (a % n == 0) continue;',
  '        long long x = modpow(a, d, n);         // a^d mod n',
  '        if (x == 1 || x == n-1) continue;      // 이 증인 통과',
  '        bool witness = true;',
  '        for (int r = 1; r < s; r++) {',
  '            x = x*x % n;                       // 계속 제곱',
  '            if (x == n-1) { witness = false; break; }',
  '        }',
  '        if (witness) return false;             // a 가 합성 증인',
  '    }',
  '    return true;                               // 아마도 소수',
  '}',
];

const modpow = (a, e, m) => {
  let r = 1n; a %= m;
  while (e > 0n) { if (e & 1n) r = r * a % m; a = a * a % m; e >>= 1n; }
  return r;
};

export function generate(input) {
  const nRaw = (Array.isArray(input) && input.length) ? Math.trunc(Number(input[0]) || 0) : defaultInput[0];
  const n = Math.max(0, Math.min(999, nRaw));

  const rows = [];        // { a, seq:[], verdict:'pass'|'fail'|'' }
  let caption = `n = ${n} 이 소수인가?`;

  // matrix: 행 = 시도한 증인, 열 = 최대 제곱 횟수(s). 셀 상태 0 기본 · 2 지금 계산 · 3 통과(n-1/1) · 4 합성 증거
  const buildMatrix = (sCols, active) => {
    const cols = Math.max(1, sCols);
    const rowCount = Math.max(1, rows.length);   // 증인 행이 없어도 빈 한 행은 유지
    const values = new Array(rowCount * cols).fill(null);
    const states = new Array(rowCount * cols).fill(0);
    rows.forEach((row, ri) => {
      row.seq.forEach((v, ci) => {
        if (ci >= cols) return;
        values[ri * cols + ci] = v;
        states[ri * cols + ci] = 1;
        if (row.verdict === 'pass' && ci === row.seq.length - 1) states[ri * cols + ci] = 3;
        if (row.verdict === 'fail' && ci === row.seq.length - 1) states[ri * cols + ci] = 4;
      });
    });
    if (active) states[active.r * cols + active.c] = active.s;
    return {
      rows: rowCount, cols,
      values, states,
      rowLabels: rows.length ? rows.map(r => `a=${r.a}`) : [''],
      colLabels: Array.from({ length: cols }, (_, c) => c === 0 ? 'a^d' : `↑²·${c}`),
      caption,
    };
  };

  const steps = [];
  const pushStep = (line, op, explain, sCols, active) => steps.push({
    line, op, a: -1, b: -1, values: [], sortedFrom: 0,
    matrix: buildMatrix(sCols, active), explain,
  });

  // ── 자잘한 예외 ──
  if (n < 2) {
    caption = `${n} 은 소수가 아니다`;
    pushStep(7, 'done', `${n} < 2 → 소수가 아니다`, 1);
    return steps;
  }
  if (n === 2 || n === 3) {
    caption = `${n} 은 소수`;
    pushStep(8, 'done', `${n} 은 작은 소수다`, 1);
    return steps;
  }
  if (n % 2 === 0) {
    caption = `${n} 은 짝수 → 합성수`;
    pushStep(8, 'done', `${n} 은 짝수라 2로 나뉜다 → 합성수`, 1);
    return steps;
  }

  // ── n-1 = d·2^s ──
  let d = n - 1, s = 0;
  while (d % 2 === 0) { d = Math.floor(d / 2); s++; }
  caption = `n−1 = ${n - 1} = ${d}·2^${s}`;
  pushStep(10, 'start',
    `밀러-라빈으로 ${n} 을 판정한다. n−1 = ${n - 1} = ${d}·2^${s} 로 분해했다. ` +
    `각 증인 a 의 제곱 수열 a^${d}, a^${2 * d}, … 을 본다`, s);

  const bn = BigInt(n), bd = BigInt(d);

  for (const a of WITNESSES) {
    if (a % n === 0) continue;
    if (a >= n) break;

    const row = { a, seq: [], verdict: '' };
    rows.push(row);
    const ri = rows.length - 1;

    let x = Number(modpow(BigInt(a), bd, bn));
    row.seq.push(x);
    if (x === 1 || x === n - 1) {
      row.verdict = 'pass';
      caption = `증인 a=${a}: a^${d} mod ${n} = ${x} = ${x === 1 ? '1' : 'n−1'} → 통과`;
      pushStep(14, 'compare',
        `a=${a}: a^${d} mod ${n} = ${x} 가 ${x === 1 ? '1' : 'n−1'} 이다 → 이 증인 통과`,
        s, { r: ri, c: 0, s: 3 });
      continue;
    }
    caption = `증인 a=${a}: a^${d} mod ${n} = ${x} (1 도 n−1 도 아님) → 제곱해 본다`;
    pushStep(13, 'read',
      `a=${a}: a^${d} mod ${n} = ${x}. 1 도 n−1 도 아니다 → s−1=${s - 1}번까지 제곱하며 n−1 을 찾는다`,
      s, { r: ri, c: 0, s: 2 });

    let passed = false;
    for (let r = 1; r < s; r++) {
      x = Number((BigInt(x) * BigInt(x)) % bn);
      row.seq.push(x);
      if (x === n - 1) {
        row.verdict = 'pass';
        caption = `증인 a=${a}: 제곱하다 ${x} = n−1 을 만났다 → 통과`;
        pushStep(18, 'compare',
          `a=${a}: 제곱 ${r}회째 x = ${x} = n−1 → 이 증인 통과`,
          s, { r: ri, c: r, s: 3 });
        passed = true;
        break;
      }
      caption = `증인 a=${a}: 제곱 ${r}회 → ${x} (아직 n−1 아님)`;
      pushStep(17, 'write',
        `a=${a}: 제곱 ${r}회째 x = ${x}. 아직 n−1 이 아니다`,
        s, { r: ri, c: r, s: 2 });
    }

    if (!passed) {
      row.verdict = 'fail';
      caption = `증인 a=${a} 가 합성 증거 — ${n} 은 합성수`;
      pushStep(20, 'done',
        `a=${a}: 수열이 n−1 을 한 번도 지나지 않았다(끝값 ${x}). ` +
        `a=${a} 는 ${n} 이 합성수라는 **증인**이다. 판정: 합성수`,
        s, { r: ri, c: row.seq.length - 1, s: 4 });
      return steps;
    }
  }

  caption = `${n} — 모든 증인 통과 → 소수(probable prime)`;
  pushStep(22, 'done',
    `${WITNESSES.filter(a => a < n).length}개 증인이 모두 통과했다 → ${n} 은 소수다 ` +
    `(작은 고정 증인 집합이라 이 범위에선 결정적)`,
    s);

  return steps;
}
