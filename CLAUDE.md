# CLAUDE.md — algo-viz

C++ 알고리즘을 **라인별 실행·되감기**하며 자료구조 변화를 시각화하는 학습 웹사이트.
정적 호스팅(GitHub Pages) 전용. 백엔드·실시간 컴파일 없음.

메인은 **카탈로그**(검색 + 파셋 필터)이고, 카드/검색으로 알고리즘 페이지(`#/algo/:id`)로 이동한다.

---

## 아키텍처 한 문장

> **코드는 표시만, 실행은 미리 만든 트레이스로, 시각화는 스냅샷+전이로, 분류는 JSON 인덱스로, 확장은 폴더 규약으로.**

브라우저에서 C++ 을 인터프리트하지 않는다. 알고리즘마다 **실행 스텝 배열(trace)** 을 만들어 두고,
플레이어는 `currentStep` 인덱스 하나만 오간다. 되감기 = `i-1`, 그래서 undo 로직이 없다.

### 트레이스 생성: Model A (제품) + Model 2 (CI 검증 오라클)
- **Model A** — `generator.js`(JS 재구현). 빌드 불필요, 임의 입력 실시간 재생성. **브라우저에 배포되는 유일한 방식.**
- **Model 2** — 계측 C++(`algorithms/<id>/code/`). **런타임에서 제거됨** — 이제 브라우저는 Model A 만 재생한다.
  대신 네이티브 g++ 컴파일로 `reference-trace.json` 을 뽑아 두고, **CI/훅이 Model A ↔ reference-trace 동치(LOCK)를 게이트**한다.

결정 근거: 정적 호스팅 + 다수 알고리즘 + 빠른 브라우징엔 Model A(제로 빌드·수 KB)가 적합.
Model 2 의 "표시=실행" 강점은 **런타임 WASM 없이도** reference-trace 동치 검증으로 확보된다.
그래서 `step.line`/`op`/`values` 계약과 LOCK 불변식은 그대로 살아 있고, Model 2 는 정확성 게이트로만 남는다.
(`build.sh` 의 WASM 빌드 경로는 현재 소비처가 없어 사실상 휴면 상태.)

---

## ⚠️ 절대 규칙 (트레이스 계약)

1. **트레이스 포맷을 깨지 마라.** 모든 스텝 = `line, op, values, sortedFrom, explain`.
   전체 계약은 `.claude/skills/trace-format/SKILL.md` 와 `schemas/trace.schema.json`.
2. **`step.line` 은 표시 소스 줄에 매핑된다.** `generator.js` 는 `code`(소스 줄 배열)를 export 하고,
   모든 line 은 `1..code.length` 범위여야 한다.
3. **`generate(input)` 는 순수 함수.** 같은 입력 → 같은 트레이스. 전역 상태·난수 금지.
4. **스냅샷마다 전체 상태를 남긴다.** 되감기는 스냅샷 재렌더일 뿐 — undo 를 구현하지 마라.
5. **렌더링은 요소를 재사용**해 CSS transition 으로 "이동"을 보인다(매 렌더 리빌드 금지).
   중복 값이 있으니 값이 아니라 **인덱스 슬롯** 기준으로 그린다.

편집하면 `generator.js`/`trace.json`/`meta.json` 은 **PostToolUse 훅이 자동 검증**한다. 실패하면
그 피드백을 반영해 고치고 넘어가라.

---

## 디렉터리

```
CLAUDE.md
index.html                 # 얇은 셸(GH Pages 진입점). #app 마운트 + CSS, app/main.js 만 로드
app/                       # 라우터 + 뷰 + 공용 플레이어 + 렌더러 (바닐라 ES 모듈)
  main.js                  # 라우터: 해시 → 뷰 디스패치(catalog | algo), teardown 관리
  views/
    catalog.js             # 메인: 검색 + 파셋 필터 + 카드 그리드 → #/algo/:id
    algorithm.js           # 단일 채널 Model A 플레이어(#/algo/:id)
    paradigm.js            # 유형 목록(#/paradigms) + 유형 문서(#/paradigm/:id)
  catalog-data.js          # index.json 로드 + 필터/검색(순수 함수, DOM 무관)
  store.js                 # 플레이어 상태 + 트랜스포트(DOM 무관). undo 없음
  algorithm-loader.js      # 폴더 규약으로 generator.js/meta.json 로드
  highlight.js             # 경량 C++ 신택스 하이라이터(표시 코드용)
  graph-editor.js          # 그래프 직접 그리기 입력 편집기(정점/간선/시작점, 인접 리스트·행렬)
  markdown.js              # 의존성 없는 초소형 마크다운 렌더러(notes.md 표시용)
  paradigm-data.js         # 유형(패러다임) 로드 + match 규칙으로 알고리즘 역참조
  renderers/
    registry.js            # registerRenderer('<type>', render). render(host, step, ctx)
    array.js               # array 렌더러(요소 재사용, 인덱스 슬롯 기준, sortedFrom/sortedTo)
    graph.js               # graph 렌더러(SVG, 정점 상태색 + 큐). ctx.graph 로 구조 수신
    tree.js                # tree 렌더러(SVG). step.tree = perfect(세그트리) | rooted(parent[])
    matrix.js              # matrix 렌더러(표). step.matrix = DP 테이블 · st[k][i] · up[k][v]
build.sh                   # (휴면) 계측 C++ → WASM. 진실 원천 algorithms/<id>/code/. 현재 소비처 없음
schemas/
  trace.schema.json        # 트레이스 계약
  meta.schema.json         # 카탈로그 레코드 계약
scripts/
  validate-trace.mjs       # 트레이스 검증기(훅·서브에이전트·CI 공용, 의존성 없음)
  validate-notes.mjs       # 해설 문서 구조 검증기(알고리즘/유형 두 스키마)
  build-paradigm-index.mjs # paradigms/index.json 생성(--check 로 CI 게이트)
paradigms/                 # 알고리즘 "유형" 문서 — 개별 알고리즘과 구별되는 층
  index.json               # 유형 카탈로그(자동 생성)
  <id>/meta.json notes.md  # meta.match = { categories, tags } 로 알고리즘을 자동 수집
algorithms/
  index.json               # 카탈로그(= meta 레코드 배열). 클라이언트에서 필터/검색
  <id>/
    meta.json  code/<id>.cpp  generator.js  reference-trace.json  notes.md
  bubble-sort/             # 시드 알고리즘(참고 구현)
.claude/
  settings.json            # 훅 + 권한
  hooks/                   # validate-on-edit.sh, session-context.sh
  agents/                  # algorithm-author, trace-validator, renderer-builder
  skills/                  # add-algorithm, trace-format, algorithm-notes
```

목표 구조는 `algorithms/<id>/`. `index.html` 은 이제 `app/main.js` 만 로드하는 얇은 셸이고,
알고리즘 자산(코드·트레이스)은 `#/algo/:id` 라우팅으로 `algorithms/<id>/` 에서 동적 로드한다.
Model 2 진실 원천도 폴더 규약을 따른다(`algorithms/<id>/code/<id>.cpp`) — 루트 평평한 데모 잔재는 정리 완료.

---

## 서브에이전트 (언제 위임할지)

- **algorithm-author** — 알고리즘 추가/생성기 작성. "알고리즘 추가", "make a generator".
- **trace-validator** — 트레이스 검증 + Model A↔2 동치(LOCK) 확인. "검증", "동치 확인".
- **renderer-builder** — 새 자료구조 렌더러(스택/큐/트리/그래프…). "렌더러 추가", "그래프 시각화".

메인 세션은 조율·설계에 집중하고, 위 작업은 해당 에이전트에 넘겨 컨텍스트를 아낀다.

---

## 코딩 컨벤션

- **바닐라 ES 모듈**(빌드리스가 기본). 프레임워크·번들러 도입은 사전 합의.
- **해시 라우팅 필수** — GH Pages 는 서버 리라이트가 없다. `#/catalog`, `#/algo/:id`.
  태그·분류 링크는 `#/catalog?q=<term>` (검색어 프리필). `/algo/quick-sort` 같은 경로는 404 난다.
  유형 문서는 `#/paradigms`(목록) · `#/paradigm/:id`(본문).
- **상대 경로** — 프로젝트 페이지는 `user.github.io/<repo>/` 하위. base 경로 주의.
- **브라우저 스토리지 금지**(localStorage/sessionStorage) — 상태는 메모리(플레이어 store)에.
- **렌더러 레지스트리** — `registerRenderer('<type>', render)`. 구조 `type`(array/stack/tree/graph…)로 위임.
- **표시 코드는 스페이스 4칸 들여쓰기** — `generator.js` 의 `code[]`. 신택스 색은 `app/highlight.js`.
- **변수명은 역할이 드러나게** — 한 글자 이름으로 역할을 가리지 마라. 두 축으로 갈린다.
  - **유지**: 알고리즘 관례명 `i j k l r n u v lo hi mid pivot` 과
    `st[k][i]` `up[k][v]` `t[i]` `adj` `dist` `depth` `parent`.
    notes.md 의 증명·교과서와 1:1로 읽혀야 하므로 길게 바꾸면 오히려 손해다.
    `generator.js` 의 표시 코드(`code[]`)도 그대로 둔다 — `step.line` 매핑과 직결.
  - **바꿈**: 그 밖의 모든 것. DOM 요소는 무엇인지(`codePanel`·`scrubber`), 콜백 인자는
    무엇을 받는지(`record`·`listener`·`event`), 헬퍼는 무엇을 하는지(`escapeHtml`·`markInvalid`)가
    이름에 있어야 한다. 매직넘버는 상수로(`MAX_INPUT_LENGTH`).
  - **가림(shadowing) 금지**: 바깥 변수와 같은 이름을 파라미터로 쓰지 마라
    (bfs 의 큐 `q` ↔ `pushStep(..., queueSnapshot, ...)`).
  - 리네임은 **순수 리팩터링**이어야 한다 — 트레이스 JSON·렌더 결과를 이전 버전과 대조해 확인.
- **알고리즘 페이지 레이아웃**: 상단 3정보(분류·시간·공간) → 툴바(입력+조작 패널, 코드 위) → 코드(최대 높이 제한, 활성 줄 자동 스크롤) → viz(고정 높이) → 태그 → 해설. 태그/분류 클릭 → 검색.
- **해설 문서**: `algorithms/<id>/notes.md` 가 있으면 페이지 맨 아래 "해설" 섹션으로 렌더된다.
  섹션 뼈대(한눈에/동작 원리/정확성/복잡도 + 선택 3개)는 고정이며 `scripts/validate-notes.mjs` 가 강제한다.
  작성 규약은 `.claude/skills/algorithm-notes/SKILL.md`. **수식 라이브러리를 싣지 말 것** — 유니코드 + 코드 펜스로 쓴다.
- **viz 슬롯**: `meta.dataStructures` 중 렌더러가 등록된 타입이 **모두** 세로로 쌓인다.
  각 렌더러는 자기 슬롯만 읽는다 — `array/graph`는 `step.values`, `tree`는 `step.tree`, `matrix`는 `step.matrix`.
  슬롯이 없는 스텝에서는 그 viz 가 자동으로 숨는다.
- **유형(패러다임) 문서**: `paradigms/<id>/` — 개별 알고리즘이 아니라 "푸는 방식"을 설명한다.
  섹션 뼈대가 알고리즘 문서와 **다르다**(한눈에/언제 쓸 수 있나/구현 골격 + 잘 맞는 문제/함정/더 보기).
  `meta.match = { categories, tags }` 로 알고리즘을 자동 수집하므로 알고리즘 meta 를 건드릴 필요가 없다 —
  새 알고리즘을 추가하면 유형 페이지에 저절로 나타난다. 분류가 안 걸리면 **알고리즘에 정확한 태그를 더하라**
  (유형 쪽에 id 를 하드코딩하지 마라 — 태그 검색과 어휘가 갈라진다).
- **placeholder 알고리즘**: `meta.json` 에 `"placeholder": true` 면 generator 없이 카탈로그·"준비 중" 페이지에만 노출.
- **그래프 알고리즘 입력**: `dataStructure==='graph'` 이면 배열 입력행 대신 `graph-editor.js` 편집기를 붙인다.
  generator 는 `defaultGraph`·`capabilities` 를 export 하고 `generate(graph)` 로 그래프를 받는다(인자 없으면 defaultGraph — 검증기 호환).
  간선은 `[u,v,w]`(가중치 기본 1). 렌더러엔 `ctx.graph`(현재 그린 그래프)를 넘긴다. BFS 는 `queue`, DFS 는 `stack` 필드로 보조 자료구조 표시.
- **옵션 게이팅**: 편집기의 방향/가중치 옵션은 `IMPLEMENTED[opt] && algo.capabilities[opt]` 일 때만 설정 가능.
  아니면 비활성 + 사유("준비 중"=편집기 미구현, "미지원"=알고리즘이 안 씀). **방향·가중치 모두 구현 완료.**
  가중치는 편집기의 `⚖ 가중치` 모드에서 간선 클릭으로 1..9 순환. 방향이면 화살촉을 그린다.
- **그래프 스텝 확장 필드**(graph 렌더러가 읽음, 전부 선택):
  `nodeLabels[v]` 정점 아래 짧은 텍스트(dist · g+h · 집합 대표) ·
  `edgeStates[e]` 간선 상태(0 기본 · 1 검사 중 · 2 갱신됨 · 3 확정) ·
  `pq`/`stack`/`queue` 보조 자료구조 한 줄.
- `prefers-reduced-motion` 존중, 키보드 포커스 가시화, 모바일 반응형.

---

## 명령

```bash
# 로컬 미리보기(정적)
python3 -m http.server 8000        # → http://localhost:8000

# 트레이스/메타/문서 검증
node scripts/validate-trace.mjs algorithms/<id>/generator.js
node scripts/validate-trace.mjs algorithms/<id>/meta.json
node scripts/validate-notes.mjs algorithms/<id>/notes.md
npm run check                      # index 최신성 + 트레이스 + 문서 한 번에

# Model 2 CI 오라클: 네이티브 컴파일로 reference-trace 재생성/대조(emcc 불필요)
g++ -std=c++17 -O2 algorithms/bubble-sort/code/bubble_sort.cpp -o /tmp/bs && /tmp/bs "5 2 9 1 5 6"
# → 출력이 algorithms/bubble-sort/reference-trace.json 과 일치해야 하고,
#   validate-trace 가 generator.js(Model A) ↔ reference-trace 동치를 게이트한다(LOCK).
```

---

## 현재 상태 & 다음 과제

- [x] 트레이스 포맷 확정 + 검증기 + 훅/에이전트/스킬 스캐폴딩
- [x] 시드 알고리즘(bubble-sort): Model A generator + Model 2 C++ + 동치(LOCK) 확인
- [x] 앱 셸 + 해시 라우팅 — 인라인 데모를 `app/` 모듈로 추출, `algorithms/<id>/` 동적 로드
- [x] 공용 플레이어(store + 트랜스포트 + 스크러버) 모듈 분리 → `app/store.js`
- [x] 렌더러 레지스트리 + array/graph 렌더러 → `app/renderers/`. 이후 stack/queue/tree/heap
- [x] **방식 결정: Model A(제품) 확정, Model 2 는 CI 검증 오라클로 강등** — 제품은 단일 채널
- [x] 카탈로그 뷰(`#/catalog`): 검색(title/tags/aliases) + 파셋(분류/자료구조/난이도) → 카드 → `#/algo/:id`
- [x] 알고리즘 6종: bubble/insertion/quick/merge sort(array) + BFS/DFS(graph, SVG 렌더러, visited 벡터)
- [x] 그래프 직접 그리기 입력 편집기(`graph-editor.js`) + 알고리즘별 옵션 게이팅(capabilities)
- [x] tree/matrix 렌더러 + 다중 viz 슬롯 → 세그먼트 트리 · 희소 배열 · 이진 상승 3종 추가(총 9종)
- [x] 알고리즘별 해설 문서(`notes.md`) + 마크다운 렌더러 + 섹션 규약 검증기
- [x] 가중치/방향 그래프 편집기 구현 + graph 렌더러 확장(가중치·화살표·거리 라벨·간선 상태)
- [x] 그래프 알고리즘 4종: 다익스트라 · A* · 크루스칼(MST) · 플로이드-워셜 (총 13종)
- [x] 그래프 알고리즘 3종 추가: 벨만-포드 · 위상 정렬(칸) · 타잔 SCC (총 16종)
- [x] 알고리즘 **유형**(패러다임) 문서 7종 — 그리디/분할정복/DP/재귀/그래프 탐색/전처리/증분법.
      `paradigms/<id>/` 폴더 규약, `meta.match` 로 알고리즘 자동 수집, 태그 검색과 어휘 공유
- [ ] 확충 계속: 프림 · 0-1 BFS · 2-SAT → DP 테이블(배낭·LCS) 등
- [ ] 세그먼트 트리 지연 전파(lazy) · 펜윅 트리 — tree/matrix 렌더러 재사용
- [ ] (선택) `build.sh` WASM 경로 정리 — 소비처 없으니 제거 또는 명시적 보존 결정
- [ ] (선택) GitHub Actions: `index.json` 생성 + Model 2 WASM 빌드 + 스키마 검증

## 함정 메모

- **line 매핑 드리프트**: 표시 소스가 바뀌면 `step.line` 이 어긋난다. 소스와 generator 를 함께 고쳐라.
- **동치 착시**: 기본 입력만 맞고 경계 입력에서 갈라질 수 있다. 여러 입력으로 대조(trace-validator).
- **애니메이션 끊김**: 렌더 때 DOM 을 리빌드하면 transition 이 안 먹는다. 요소 재사용.
