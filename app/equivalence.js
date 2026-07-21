// app/equivalence.js — Model A ↔ Model 2 트레이스 동치 판정(LOCK 램프의 근거).
// scripts/validate-trace.mjs 의 equivalent() 와 같은 규칙을 브라우저용으로 옮긴 것.
// 비교 대상: line, op, a, b, values(순서·길이·원소 전부).

export function tracesEquivalent(t1, t2) {
  if (t1.length !== t2.length) return false;
  for (let k = 0; k < t1.length; k++) {
    const x = t1[k], y = t2[k];
    if (x.line !== y.line || x.op !== y.op) return false;
    if ((x.a ?? -1) !== (y.a ?? -1) || (x.b ?? -1) !== (y.b ?? -1)) return false;
    if (x.values.length !== y.values.length) return false;
    for (let m = 0; m < x.values.length; m++)
      if (x.values[m] !== y.values[m]) return false;
  }
  return true;
}
