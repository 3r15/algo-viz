---
name: add-algorithm
description: Step-by-step procedure and copy-paste templates for adding a new algorithm to the visualizer. Use whenever creating an algorithms/<id>/ folder with meta.json, displayed source, and a Model A generator.js. Pairs with the trace-format skill (the contract) and the algorithm-author subagent.
---

# 알고리즘 추가 절차

새 알고리즘 하나 = `algorithms/<id>/` 폴더 하나. 아래 순서를 그대로 따른다.
계약 세부는 `trace-format` 스킬 참조.

## 1. 폴더 구조

```
algorithms/<id>/
  meta.json              # 카탈로그 레코드 (schemas/meta.schema.json 준수)
  code/<id>.cpp          # 표시용 소스(언어별). 최소 1개
  generator.js           # Model A 생성기 (필수)
  reference-trace.json   # Model 2 참조 트레이스(선택, 있으면 동치 대조)
  notes.md               # 이론/설명(선택)
```

`<id>` 는 kebab-case, 폴더명 == `meta.id`.

## 2. generator.js 템플릿

```js
// algorithms/<id>/generator.js
export const category = 'sorting';                 // meta.categories 와 일치
export const defaultInput = [5, 2, 9, 1, 5, 6];

// 코드 패널에 표시되는 소스. step.line 은 이 배열의 1-based 줄을 가리킨다.
export const code = [
  'line 1 ...',
  'line 2 ...',
  // ...
];

export function generate(input) {
  const a = input.slice();
  const steps = [];
  const push = (line, op, extra) =>
    steps.push({ line, op, values: a.slice(), sortedFrom: a.length, i: 0, j: 0, a: -1, b: -1, explain: '', ...extra });

  push(1, 'start', { explain: '시작' });
  // ... 알고리즘 로직. 의미 있는 지점마다 push(line, op, {...})
  push(code.length, 'done', { sortedFrom: 0, explain: '완료' });
  return steps;
}
```

핵심: `push` 호출 위치가 곧 시각화 스텝이다. **각 push 의 `line` 이 표시 소스와 맞는지** 늘 확인.

## 3. meta.json 템플릿

```json
{
  "id": "<id>",
  "title": "<표시 이름>",
  "categories": ["sorting"],
  "dataStructures": ["array"],
  "complexity": { "time": { "best": "", "avg": "", "worst": "" }, "space": "" },
  "difficulty": "beginner",
  "tags": [],
  "languages": ["cpp"],
  "generation": ["model-a"],
  "path": "algorithms/<id>/"
}
```

## 4. 검증 (통과할 때까지 반복)

```bash
node scripts/validate-trace.mjs algorithms/<id>/generator.js
node scripts/validate-trace.mjs algorithms/<id>/meta.json
```

- 코드 편집 시 PostToolUse 훅이 같은 검증을 자동 실행한다(실패하면 피드백).
- 정렬 계열이면 최종 스냅샷 정렬·길이 불변식까지 자동 확인된다.

## 5. 카탈로그 등록

`algorithms/index.json` 에 `meta.json` 레코드를 추가(파일이 있으면).
없으면 이 알고리즘이 첫 케이스이니 배열로 새로 만든다.

## 6. Model 2 (선택)

C++ 정확도가 필요하면 `code/<id>.cpp` 를 계측해 작성하고, **표시 알고리즘 줄이 generator.js 의
`code` 와 정확히 같도록** 맞춘다. 그 뒤 동치 확인은 `trace-validator` 서브에이전트에 맡긴다
(네이티브 g++ 대조 또는 emcc WASM 빌드). 저자는 WASM 을 직접 빌드하지 않는다.

## 경계 입력 체크리스트(정렬 계열)

빈 배열 `[]`, 단일 원소 `[7]`, 이미 정렬 `[1,2,3]`, 역정렬 `[3,2,1]`, 전부 동일 `[5,5,5]`,
중복 포함 `[5,2,9,1,5,6]` — 이 입력들에서도 generator 가 깨지지 않고, Model 2 와 일치해야 한다.
