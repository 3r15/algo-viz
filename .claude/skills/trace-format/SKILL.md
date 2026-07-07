---
name: trace-format
description: The trace contract every algorithm must satisfy. Read this before writing or validating any generator.js, trace.json, or renderer. Defines the step schema, the op vocabulary, the generator.js export contract, and the invariants the validator enforces.
---

# 트레이스 계약

트레이스는 이 프로젝트의 **단일 계약**이다. 생성 방식(Model A: JS / Model 2: C++→WASM)과
무관하게, 두 방식은 **바이트 단위로 동일한 트레이스**를 산출해야 한다. 트레이스만 있으면
플레이어·시각화·되감기는 생성 방식과 완전히 독립적으로 동작한다.

## 스텝 스키마

각 스텝은 다음 필드를 갖는다(전체 스키마: `schemas/trace.schema.json`).

| 필드 | 필수 | 의미 |
|---|---|---|
| `line` | ✓ | 표시 소스에서 실행 중인 줄(1-based). 코드 하이라이트 대상. `1..code.length` 범위 |
| `op` | ✓ | 연산 종류(아래 vocabulary) |
| `values` | ✓ | **이 스텝 직후** 자료구조 스냅샷. 되감기의 근거(스냅샷만 다시 그림) |
| `sortedFrom` | ✓ | 이 인덱스부터 확정/정렬됨(초록 표시). 확정 없으면 `values.length` |
| `explain` | ✓ | 현재 줄에 동기화된 한 줄 설명 |
| `i`,`j` | | 반복 변수(선택) |
| `a`,`b` | | 연산에 관여한 인덱스(없으면 `-1`) — 애니메이션 힌트 |
| `scope`,`locals` | | 호출 문맥/지역 변수(선택) |

## op vocabulary

표준 op: `start`, `compare`, `swap`, `pass-end`, `done`,
그리고 구조 연산 `push`, `pop`, `enqueue`, `dequeue`, `visit`, `read`, `write`, `mark`, `set`.

- 새로운 op 을 쓰려면 그에 맞는 렌더러 처리가 있어야 한다(`renderer-builder`).
- 검증기는 표준 밖 op 을 **경고**로만 남긴다(막지는 않음).

## 두 종류의 정보

- `values`(+구조 스냅샷) = **상태**. 되감기·점프 시 그대로 렌더 → 견고함.
- `op`/`a`/`b` = **전이**. 이전 스텝 → 현재 스텝의 애니메이션(compare/swap 이동)을 그리는 힌트.

## generator.js export 계약 (Model A)

```js
export const category = 'sorting';          // meta.categories 와 일치
export const defaultInput = [5, 2, 9, 1, 5, 6];
export const code = [ /* 표시 소스 줄 배열 — step.line 이 여기를 가리킴 */ ];
export function generate(input) { /* 순수 함수 */ return steps; }  // Step[]
```

- `generate` 는 **순수 함수**: 같은 입력 → 같은 트레이스. 전역 상태/난수 금지.
- `step.line` 은 반드시 `1..code.length`.

## 불변식(검증기가 강제)

1. 트레이스는 비어 있지 않다.
2. 모든 스텝에 필수 필드가 있고, `line` 은 소스 범위 안.
3. `sortedFrom ∈ [0, values.length]`.
4. **정렬 계열**: `values` 길이 불변 + 마지막 스냅샷은 오름차순 정렬.
5. Model A 와 Model 2(참조 트레이스)가 있으면 `line/op/a/b/values` 전부 일치(LOCK).

검증: `node scripts/validate-trace.mjs <generator.js | trace.json | meta.json>`

## 되감기에 대하여

되감기 로직을 만들지 마라. 스텝마다 **전체 스냅샷**을 남기면, 되감기는 "N번째 스냅샷 다시 그리기"
일 뿐이다. (트레이스가 아주 길어지면 그때 델타 압축을 도입한다 — 처음부터 하지 말 것.)
