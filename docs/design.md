# 알고리즘 학습 웹페이지 설계

정적 호스팅(GitHub Pages) 위에서 "라인별 실행 + 되감기 + 자료구조 시각화"를 구현하기 위한 아키텍처 설계 문서.

---

## 1. 핵심 설계 결정: 트레이스 기반 실행

브라우저에서 C++을 실제로 실행하지 않는다. 대신 각 알고리즘은 **미리 계산된 실행 스텝의 배열(trace)** 을 갖는다.

- **코드 패널**은 소스를 단순히 *표시*만 한다 (실행하지 않음).
- **플레이어**는 `currentStep` 인덱스 하나만 관리한다.
- 앞으로 가기 = `i+1`, 되돌아가기 = `i-1`, 처음/끝으로 = 인덱스 이동.
- 각 스텝은 그 시점의 **자료구조 전체 스냅샷**을 담으므로, 되감기에 "undo 로직"이 전혀 필요 없다. N번째 스냅샷을 그대로 다시 그리면 끝.

이 방식의 장점:
- 되감기·점프·스크러버(timeline)가 전부 공짜로 따라온다.
- 코드 라인 하이라이트와 시각화가 **같은 인덱스**를 참조하므로 동기화가 구조적으로 보장된다.
- 백엔드·컴파일러가 필요 없어 GitHub Pages에 그대로 올라간다.
- 트레이스는 **언어 중립적**이라, C++이든 Python이든 같은 시각화를 재사용한다.

> 만약 "실제 C++을 WASM으로 브라우저에서 컴파일·실행"이 꼭 필요하다면 방향이 완전히 달라집니다(Emscripten/clang-wasm + 계측). 학습 도구 목적이라면 트레이스 방식이 압도적으로 실용적입니다.

---

## 2. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                     Catalog View                         │
│   index.json → 필터(카테고리/자료구조/복잡도) + 카드 목록    │
└───────────────────────────┬─────────────────────────────┘
                            │  #/algo/:id
┌───────────────────────────▼─────────────────────────────┐
│                  Algorithm View                          │
│  ┌────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ Code Panel │   │ Visualization │   │  Narration     │  │
│  │ (라인 하이라잇)│  │  (renderer)   │   │  (스텝 설명)     │  │
│  └─────┬──────┘   └──────┬───────┘   └───────┬────────┘  │
│        └──────────┬──────┴───────────────────┘           │
│                   │  currentStep 구독                     │
│        ┌──────────▼──────────┐                           │
│        │   Player (상태 저장소) │  ◀ Controls              │
│        │  currentStep/playing │   (재생/스텝/속도/스크러버)  │
│        └──────────┬──────────┘                           │
│        ┌──────────▼──────────┐                           │
│        │   Trace Engine       │  ◀ generator.js 또는       │
│        │   → steps[]          │     trace.json 로드        │
│        └─────────────────────┘                           │
└──────────────────────────────────────────────────────────┘
```

단일 진실 원천(single source of truth)은 `currentStep` 하나. 코드 패널과 시각화 패널은 이걸 구독만 한다.

---

## 3. 트레이스 포맷 (전체의 계약)

트레이스가 "어떻게 만들어졌는가(생성 방식)"와 "어떻게 보여지는가(렌더러)"를 분리하는 **계약(contract)** 이다. 여기만 안정적으로 지키면 나머지는 독립적으로 발전시킬 수 있다.

```jsonc
{
  "meta": { "id": "quick-sort", "entryLine": 1 },
  "steps": [
    {
      "line": 12,                          // 표시 소스의 1-based 라인
      "lineByLang": { "cpp": 12, "py": 9 },// (선택) 언어별 라인 매핑
      "scope": "partition",                // (선택) 현재 함수/호출 문맥
      "locals": { "i": 3, "j": 5, "pivot": 7 },

      // 이 시점의 자료구조 "전체 스냅샷"
      "structures": {
        "arr": {
          "type": "array",
          "values": [5, 2, 8, 1, 9, 3, 7],
          "keys":  ["a0","a1","a2","a3","a4","a5","a6"], // ★ 요소 식별자(4장 참고)
          "annotations": { "sortedRange": [0, 2] }
        },
        "callStack": { "type": "stack", "values": ["quickSort(0,6)","partition(0,6)"] }
      },

      // 이전 스텝 → 현재 스텝 "전이 애니메이션" 이벤트
      "ops": [
        { "kind": "compare", "target": "arr", "indices": [3, 5] },
        { "kind": "swap",    "target": "arr", "indices": [3, 5] },
        { "kind": "highlight","target": "arr", "range": [0, 2], "role": "sorted" }
      ],

      "explain": "arr[j] < pivot 이므로 경계와 교환한다"  // 라인에 동기화된 설명
    }
    // ... 다음 스텝들
  ]
}
```

핵심 구분:
- `structures` = **상태(무엇인가)**. 되감기·점프 시 그대로 렌더 → 견고함.
- `ops` = **전이(무엇이 움직였는가)**. 이전 스텝에서 현재 스텝으로의 애니메이션 힌트. "데이터가 어떻게 이동하는지"를 부드럽게 보여주는 근거.

### 스냅샷 vs 델타 트레이드오프
매 스텝 전체 스냅샷을 저장하면 단순·견고하지만 메모리를 더 쓴다. 학습용 데이터 크기(n ≤ 수백)에서는 **전체 스냅샷**이 정답. 트레이스가 아주 길어지면 나중에 델타(변경분만 저장) 압축을 얹으면 된다. 처음부터 델타로 만들지 말 것 — 되감기 로직이 복잡해진다.

---

## 4. 트레이스 생성 — 두 가지 방식 (둘 다 지원)

트레이스 포맷만 지키면 생성 방법은 자유. 두 계층을 제공한다.

### Model A — 브라우저 내 JS 계측 생성기 (GH Pages 기본 권장)
저자가 알고리즘을 JS로 재구현하되, 요소마다 레코더 API를 호출한다. 빌드 단계가 없고 순수 정적.

```js
// algorithms/quick-sort/generator.js
export function generate(input, rec) {
  const arr = [...input];
  rec.struct('arr', { type: 'array', values: arr });

  function partition(lo, hi) {
    const pivot = arr[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      rec.line(12).compare('arr', [j, hi]).snap();      // 스텝 기록
      if (arr[j] < pivot) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        rec.line(14).swap('arr', [i, j]).snap();
        i++;
      }
    }
    [arr[i], arr[hi]] = [arr[hi], arr[i]];
    rec.line(17).swap('arr', [i, hi]).snap();
    return i;
  }
  // ... quickSort 재귀
  return rec.done();  // → { meta, steps }
}
```

- 장점: 빌드 불필요, 그리고 **사용자가 입력을 바꾸면 즉시 새 트레이스 재생성** 가능.
- 단점: 표시되는 C++ 코드와 JS 구현이 "논리적으로 같음"을 저자가 보장해야 함.

### Model B — 오프라인 계측 C++ (진실 원천 = 실제 C++)
실제 C++에 로깅 매크로/훅을 넣어 오프라인(로컬 또는 GitHub Actions)에서 실행 → `trace.json` 산출 → 커밋. 사이트는 JSON만 로드.

```cpp
// 계측 예: TRACE 매크로가 stdout에 스텝 JSON을 흘림
for (int j = lo; j < hi; j++) {
    TRACE_LINE(12); TRACE_COMPARE(arr, j, hi);
    if (arr[j] < pivot) { swap(arr[i], arr[j]); TRACE_SWAP(arr, i, j); i++; }
}
```

- 장점: C++이 진실 원천. 라인 매핑이 정확. 다른 언어도 동일 패턴으로 확장.
- 단점: 빌드 파이프라인 필요(→ GitHub Actions로 자동화). 입력이 고정(미리 몇 개 입력을 계산해두면 완화).

**권장**: MVP는 Model A로 빠르게, 이후 엄밀함이 필요한 알고리즘은 Model B로 승격.

---

## 5. 시각화 레이어

### 렌더러 레지스트리
자료구조 `type` → 렌더러 매핑. 새 자료구조는 렌더러만 추가하면 된다.

| type | 렌더러 | 비고 |
|---|---|---|
| `array` / `matrix` | 막대/셀 | 정렬, DP 테이블 |
| `stack` / `queue` | 세로/가로 스택 | 콜스택, BFS 큐 |
| `linked-list` | 노드+포인터 | |
| `tree` / `heap` | 계층 레이아웃 | d3.tree |
| `graph` | 노드+엣지 | d3-force 또는 고정 좌표 |
| `hash-table` | 버킷 배열 | |

- **SVG + D3** 기본 (배열/트리/그래프 애니메이션이 CSS transition으로 자연스럽고 접근성이 좋음).
- 큰 그리드는 **Canvas**로 폴백.

### ★ 부드러운 "이동"의 핵심: 요소 식별자(key)
"데이터가 어떻게 움직이는지"를 제대로 보여주려면, swap 시 화면을 다시 그리는 게 아니라 **같은 요소가 자리를 옮기는** 것으로 애니메이션돼야 한다. 이를 위해 각 요소에 스텝 간 **안정적인 key**를 부여한다(트레이스의 `structures[...].keys`). 렌더러는 key로 DOM/SVG 노드를 매칭(D3 data join의 key function)해서 위치 transition만 준다. key가 없으면 값이 순간이동하는 것처럼 보인다.

### 동기화
`currentStep`이 바뀌면:
1. 코드 패널이 `steps[i].line`(+언어별 매핑) 하이라이트.
2. 렌더러가 `steps[i].structures`를 그리되, `steps[i].ops`를 이전 스텝 기준 전이 애니메이션으로 재생.
3. 나레이션 패널이 `steps[i].explain` 표시.

---

## 6. 데이터 / 분류 모델 (정적 "DB")

백엔드가 없으므로 "DB"는 **JSON 파일 + 인덱스**로 구현한다.

### 카탈로그 인덱스 — `algorithms/index.json`
브라우징·필터용 메타데이터 레코드 배열. 필터/검색은 클라이언트에서 이 JSON을 대상으로 수행(수백 개까지 충분히 빠름).

```jsonc
{
  "id": "quick-sort",
  "title": "퀵 정렬",
  "categories": ["sorting"],                 // sorting/graph/dp/search/greedy/...
  "dataStructures": ["array"],
  "complexity": {
    "time": { "best": "O(n log n)", "avg": "O(n log n)", "worst": "O(n^2)" },
    "space": "O(log n)"
  },
  "difficulty": "intermediate",
  "tags": ["divide-and-conquer", "in-place"],
  "languages": ["cpp", "py"],
  "path": "algorithms/quick-sort/"
}
```

### 알고리즘 폴더 구조
```
algorithms/
  index.json                 # 카탈로그 (수동 유지 또는 빌드 스크립트로 생성)
  _schema/
    meta.schema.json         # meta.json JSON Schema
    trace.schema.json        # trace.json JSON Schema
  quick-sort/
    meta.json                # 위 레코드 (개별 보관)
    code/
      quick-sort.cpp         # 표시용 소스
      quick-sort.py
    generator.js             # Model A: 트레이스 생성기
    trace.json               # Model B: 미리 만든 트레이스 (선택)
    notes.md                 # 이론/설명
  bfs/
    ...
```

카테고리별 조회는 `index.json`을 필터링해서 구현(예: `categories.includes('dp')`, 복잡도 범위, 태그, 언어 등 다중 필터). 규모가 수천 개로 커지면 lunr/fuse로 검색 인덱스를 프리빌드.

---

## 7. 확장성 — "알고리즘 추가" 규약

알고리즘 추가 = **폴더 하나 떨구기**. 확장 표면(surface)을 이 계약으로 고정한다.

1. `algorithms/<id>/` 폴더 생성
2. `meta.json` 작성 (스키마 준수 → CI에서 검증)
3. `code/` 에 표시용 소스 배치 (언어별 파일)
4. 트레이스 제공:
   - 간단한 경우 → `generator.js` (Model A, 레코더 API 사용)
   - 엄밀한 경우 → 실제 C++ + `trace.json` (Model B)
5. `index.json`에 등록 (또는 빌드 스크립트가 폴더 스캔으로 자동 등록)

문서화할 것: **레코더 API 레퍼런스**, **트레이스 스키마**, **meta 스키마**. JSON Schema를 두면 기여 PR을 GitHub Actions에서 자동 검증할 수 있다.

새 자료구조가 필요하면 → 렌더러 레지스트리에 렌더러 1개 추가. 새 언어가 필요하면 → `code/*.<ext>` 추가 + 신택스 하이라이터에 언어 등록 + (Model A면) `lineByLang` 매핑.

---

## 8. 컴포넌트 / 모듈 구성

| 모듈 | 역할 |
|---|---|
| **Router** | 해시 라우팅(`#/catalog`, `#/algo/:id`). GH Pages엔 서버 리라이트가 없으므로 **해시 라우팅 필수** (또는 404.html 리다이렉트 트릭). |
| **Catalog** | `index.json` 로드 → 필터 사이드바 + 카드 그리드 |
| **DataLayer** | index/meta/code/trace fetch 캐싱 |
| **TraceEngine** | `generator.js` 실행 또는 `trace.json` 로드 → `steps[]` |
| **Player(store)** | `currentStep`, `playing`, `speed` 관리, 변경 이벤트 발행 |
| **CodePanel** | Prism/highlight.js 로 하이라이트 + 라인 강조 + 언어 탭 |
| **VizCanvas** | 렌더러 레지스트리로 위임 (SVG/Canvas) |
| **Controls** | 재생/일시정지, 스텝 ±1, 처음/끝, 속도 슬라이더, 타임라인 스크러버 |
| **Narration** | `explain` + `locals` 표시 |
| **InputPanel** | (Model A 한정) 입력 배열/그래프 편집 → 트레이스 재생성 |

---

## 9. 기술 스택 & GitHub Pages 주의점

- **기본**: Vanilla JS (ES Modules) — 빌드 없이 그대로 배포 가능. 원하면 나중에 Vite로 업그레이드(여전히 정적 산출물).
- **코드 하이라이트**: Prism.js 또는 highlight.js (라인 하이라이트 지원 확인).
- **레이아웃/시각화**: D3.js (트리/그래프 레이아웃 + SVG data join key).
- **자동화(선택)**: GitHub Actions로 (a) `index.json` 생성, (b) Model B의 C++ 컴파일·실행→`trace.json` 산출, (c) 스키마 검증.
- **라우팅 함정**: GH Pages는 SPA 서버 라우팅이 없다 → **반드시 해시 라우팅** 사용. `/algo/quick-sort` 같은 경로는 404난다.
- **경로 함정**: 리포지토리 프로젝트 페이지는 `https://user.github.io/repo/` 하위라 **상대 경로** 또는 base 설정 주의.

---

## 10. 개발 단계 (MVP → 확장)

**Phase 1 — MVP**
트레이스 포맷 + 플레이어 + 배열 렌더러 + 카탈로그 필터. 정렬 2~3종(버블/퀵/병합)을 Model A로. 되감기·스크러버·라인 동기화 검증.

**Phase 2 — 자료구조 확장**
스택/큐/연결리스트/트리/그래프 렌더러. BFS/DFS, 이진탐색트리. 카테고리 필터 다양화.

**Phase 3 — 엄밀성 & 인터랙션**
Model B 파이프라인(실제 C++ + CI), 다국어 라인 매핑, 사용자 입력 기반 재생성, DP 테이블 렌더러. 기여 가이드 + 스키마 검증.

---

## 11. 주의할 함정 (미리 방어)

- **라인 매핑 드리프트**: 트레이스가 raw 라인 번호를 참조하면 코드가 조금만 바뀌어도 어긋난다. → 소스에 앵커 주석(`// @step:compare`)을 두고 생성기가 그 앵커를 참조하게 하거나, Model B에서 라인을 자동 추출.
- **요소 key 누락**: swap 애니메이션이 "이동"이 아니라 "순간이동"으로 보인다(4·5장). 처음부터 key 부여.
- **긴 트레이스 메모리**: n이 크면 스냅샷이 무겁다. 학습용은 n을 제한하고, 필요 시 델타 압축.
- **Model A 정합성**: 표시 C++과 JS 구현이 논리적으로 달라질 수 있다. 앵커 주석 + 리뷰로 관리, 중요 알고리즘은 Model B로 승격.
- **접근성/성능**: 큰 그래프는 SVG 대신 Canvas, 애니메이션엔 `prefers-reduced-motion` 존중.

---

### 한 줄 요약
**"코드는 표시만, 실행은 미리 만든 트레이스로, 시각화는 스냅샷+전이로, 분류는 JSON 인덱스로, 확장은 폴더 규약으로."** — 이 다섯 문장이 전체 설계다.
