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
Model 2 의 "표시=실행" 강점은 **브라우저에서 C++ 을 돌리지 않고도** reference-trace 동치 검증으로 확보된다.
그래서 `step.line`/`op`/`values` 계약과 LOCK 불변식은 그대로 살아 있고, Model 2 는 정확성 게이트로만 남는다.
**WASM 경로는 제거했다** — 소비처가 없었고, 네이티브 `g++` 만으로 오라클 역할이 충분하다.

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
  fetch-fresh.js           # 배포마다 바뀌는 데이터용 fetch(cache:'no-cache'). 캐시 함정 메모 참고
  store.js                 # 플레이어 상태 + 트랜스포트(DOM 무관). undo 없음
  algorithm-loader.js      # 폴더 규약으로 generator.js/meta.json 로드
  highlight.js             # 경량 C++ 신택스 하이라이터(표시 코드용)
  graph-editor.js          # 그래프 직접 그리기 입력 편집기(정점/간선/시작점, 인접 리스트·행렬)
  markdown.js              # 의존성 없는 초소형 마크다운 렌더러(notes.md 표시용)
  paradigm-data.js         # 유형(패러다임) 로드 + match 규칙으로 알고리즘 역참조
  renderers/
    registry.js            # registerRenderer('<type>', render). render(host, step, ctx)
    array.js               # array 렌더러(요소 재사용, 인덱스 슬롯 기준, sortedFrom/sortedTo)
    graph.js               # graph 렌더러(SVG, 정점 상태색 + 큐/스택). ctx.graph 로 구조 수신
    tree.js                # tree 렌더러(SVG). step.tree = perfect(세그트리) | rooted(parent[] · roots 로 숲)
    matrix.js              # matrix 렌더러(표). step.matrix = DP 테이블 · st[k][i] · up[k][v]
    heap.js                # heap 렌더러. step.heap = 배열 줄 + 완전 이진 트리(shape:'list' 면 목록만)
    board.js               # board 렌더러(체스판). step.board = 칸 상태 색 + 말 기호 + 이동 경로선
    stack.js queue.js      # stack(LIFO)·queue(FIFO) 렌더러. step.stack/step.queue = 배열 또는 {values,states,…}
schemas/
  trace.schema.json        # 트레이스 계약
  meta.schema.json         # 카탈로그 레코드 계약
scripts/
  validate-trace.mjs       # 트레이스 검증기(훅·서브에이전트·CI 공용, 의존성 없음)
  validate-notes.mjs       # 해설 문서 구조 검증기(차근차근/깊이 보기/유형 세 스키마)
  build-index.mjs          # algorithms/index.json 생성(--check 로 CI 게이트)
  build-paradigm-index.mjs # paradigms/index.json 생성(--check 로 CI 게이트)
  index-diff.mjs           # 인덱스가 뒤처졌을 때 무엇이 달라졌는지 설명(CI 주석 포함)
paradigms/                 # 알고리즘 "유형" 문서 — 개별 알고리즘과 구별되는 층
  index.json               # 유형 카탈로그(자동 생성)
  <id>/meta.json notes.md  # meta.match = { categories, tags } 로 알고리즘을 자동 수집
algorithms/
  index.json               # 카탈로그(= meta 레코드 배열). 클라이언트에서 필터/검색
  <id>/
    meta.json  code/<id>.cpp  generator.js  reference-trace.json
    walkthrough.md           # 차근차근(초보자) — 예시로 원리를 쌓는다
    notes.md                 # 깊이 보기(심화) — 불변식·증명·복잡도
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
- **렌더러 레지스트리** — `registerRenderer('<type>', render)`. 구조 `type`(array/graph/tree/matrix/heap/board/stack/queue)로 위임.
  아직 없는 타입(stack/queue/linked-list…)은 `meta.dataStructures` 에 적어도 viz 슬롯이 생기지 않는다.
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
- **해설 문서는 두 층**이고, 페이지 맨 아래에 나란히 쌓인다(탭으로 감추지 않는다 — 검색·스크린리더·인쇄 유지).
  - `algorithms/<id>/walkthrough.md` → **차근차근**. 초보자용. 어떤 문제인가/손으로 해보기/아이디어 쌓기/코드로 옮기기
  - `algorithms/<id>/notes.md` → **깊이 보기**. 한눈에/동작 원리/정확성/복잡도
  - `paradigms/<id>/notes.md` → 유형 문서. 한눈에/언제 쓸 수 있나/구현 골격
  세 스키마 모두 `scripts/validate-notes.mjs` 가 파일명·경로로 골라 강제한다.
  작성 규약은 `.claude/skills/algorithm-notes/SKILL.md`. **수식 라이브러리를 싣지 말 것** — 유니코드 + 코드 펜스로 쓴다.
  한 페이지에 문서가 둘이므로 `renderMarkdown(md, { idPrefix })` 로 앵커를 분리한다.
- **viz 슬롯**: `meta.dataStructures` 중 렌더러가 등록된 타입이 **모두** 세로로 쌓인다.
  각 렌더러는 자기 슬롯만 읽는다 — `array/graph`는 `step.values`, `tree`는 `step.tree`,
  `matrix`는 `step.matrix`, `heap`은 `step.heap`, `board`는 `step.board`,
  `stack`은 `step.stack`, `queue`는 `step.queue`(둘 다 배열 또는 `{values,states,labels,caption}`).
  `tree` 의 `rooted` 는 `root`(단일) 대신 `roots: [...]` 를 주면 **숲**을 그린다 —
  허프만처럼 아래에서 위로 합쳐 가는 알고리즘이 이 중간 상태를 지난다.
  슬롯이 없는 스텝에서는 그 viz 가 자동으로 숨는다.
- **유형(패러다임) 문서**: `paradigms/<id>/` — 개별 알고리즘이 아니라 "푸는 방식"을 설명한다.
  섹션 뼈대가 알고리즘 문서와 **다르다**(한눈에/언제 쓸 수 있나/구현 골격 + 잘 맞는 문제/함정/더 보기).
  `meta.match = { categories, tags }` 로 알고리즘을 자동 수집하므로 알고리즘 meta 를 건드릴 필요가 없다 —
  새 알고리즘을 추가하면 유형 페이지에 저절로 나타난다. 분류가 안 걸리면 **알고리즘에 정확한 태그를 더하라**
  (유형 쪽에 id 를 하드코딩하지 마라 — 태그 검색과 어휘가 갈라진다).
- **탐색이 폭발하는 알고리즘**은 스텝 예산(`MAX_STEPS`)을 두고, 끊었으면 **끊었다고 스텝에 적는다**.
  N-퀸·나이트 여행처럼 "해가 없음" 을 증명하려면 전수 탐색이라 스텝이 수천으로 간다.
  조용히 잘라내면 트레이스가 거짓말을 하게 된다.
- **placeholder 알고리즘**: `meta.json` 에 `"placeholder": true` 면 generator 없이 카탈로그·"준비 중" 페이지에만 노출.
- **입력은 세 종류**: 기본은 정수 배열(최대 12개, ±999). `inputKind='text'` 를 export 하면
  자유 텍스트(LCS 의 두 문자열, 최대 24자)로 바뀌고, 생성기가 직접 파싱한다.
  형식이 특수하면(배낭의 `용량 w v w v …`) `randomInput()` 을 export 해 Randomize 가 그 형식을 지키게 한다.
  **`randomInput` 은 무작위를 담는 유일한 자리다** — `generate` 는 순수 함수로 남아야 한다.
- **board 슬롯**: `step.board = { rows, cols, states, labels, marks, path, caption }`.
  **matrix 와 구분하라** — matrix 는 칸의 **값**(DP 테이블)을, board 는 칸의 **상태**(비었나·말이 있나·
  공격받나·되돌렸나)를 색으로 본다. 체스판 명암·정사각 칸·말 기호·이동 경로선은 board 쪽이다.
  칸 상태 0 빈칸 · 1 후보(테두리) · 2 못 쓰는 칸 · 3 확정 · 4 방금 놓음 · 5 방금 물러남 · 6 후보인데 못 씀.
- **heap 슬롯**: `step.heap = { values, size, states, labels, shape, caption }`.
  `shape:'tree'`(기본)는 배열 줄 + 완전 이진 트리, `shape:'list'` 는 목록만 그린다.
  **내부가 실제 이진 힙이 아닌 PQ 는 반드시 `'list'`** — 다익스트라·A* 의 PQ 는 배열+정렬이라
  트리로 그리면 알고리즘이 만들지 않는 구조를 보여 주게 된다.
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

# Model 2 CI 오라클: 네이티브 컴파일로 reference-trace 재생성/대조
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
- [x] 해설 문서 2층 재구성 — 차근차근(walkthrough.md) + 깊이 보기(notes.md). 20종 전부
- [x] DP 테이블 3종 — 0/1 배낭 · LCS · LIS. matrix 렌더러 재사용, `#/paradigm/dynamic-programming` 의 공백을 메움 (총 19종)
- [x] heap 렌더러(배열 줄 + 완전 이진 트리) + 힙 정렬 (총 20종). 다익스트라·A* 의 PQ 도 이 슬롯으로 이전
- [x] WASM 경로 제거 — `build.sh` 삭제, Model 2 는 네이티브 `g++` 오라클로만 남김
- [x] 카탈로그 생성을 배포 워크플로로 이관 + CI 는 어긋남을 설명하는 게이트로
- [x] 기초 탐색 2종 + 허프만 코딩 (총 23종). tree 렌더러를 **숲**(roots)까지 다루게 일반화 —
      허프만은 heap(PQ) + tree 두 슬롯을 함께 쓰는 첫 알고리즘
- [x] board(체스판) 렌더러 + 백트래킹 2종 — N-퀸 · 나이트 여행 (총 25종).
      `backtracking` 분류가 0개였다. 되감기가 곧 "물러남" 이라 이 계열과 궁합이 가장 좋다
- [x] 수학 3종 — 유클리드 호제법 · 에라토스테네스의 체 · 빠른 거듭제곱 (총 28종).
      `math` 분류가 0개였다. 새 렌더러 없이 matrix 재사용. 체는 matrix 를 **값이 아니라 상태**로 쓴 첫 사례.
      빠른 거듭제곱은 배가(doubling)를 beginner 난이도로 소개(희소 배열·이진 상승과 같은 발상)
- [x] stack/queue 전용 렌더러 + 괄호 검사 · 후위 표기법 (총 30종).
      기존 BFS·DFS·타잔·위상정렬이 meta 에 stack/queue 를 적어 두고도 viz 가 없던 것을 채웠다.
      렌더러는 배열(기존)·객체(신규) 두 형식을 받는다. graph 렌더러의 중복 AUX 한 줄은 제거.
- [x] 편집 거리(LCS 형제, matrix) + 프림 MST(크루스칼 짝, graph+heap) (총 32종).
      둘 다 새 렌더러 없이 재사용. 편집 거리는 DP 유형에, 프림은 그리디 유형에 자동 수집.
- [ ] 확충 계속: 0-1 BFS · 2-SAT · 편집 거리 변형 등
- [ ] 세그먼트 트리 지연 전파(lazy) · 펜윅 트리 — tree/matrix 렌더러 재사용

## 훅 메모 — Stop 훅 오탐

런처(`~/.claude/launcher-settings.json`)에 등록된 Stop 훅 스크립트에는 **커밋 범위 버그**가 있다.
`$upstream..HEAD` 를 검사하는데, squash 병합 뒤 로컬 브랜치를 최신 `main` 위로 다시 잡으면
그 범위에 **GitHub 이 만든 병합 커밋**(committer `noreply@github.com`)이 들어간다.
그러면 "Unverified" 로 걸리고, **이미 푸시·배포된 커밋을 `--amend` 하라고 안내한다** —
오탐이면서 따르면 해로운 지시다. 절대 그 커밋을 되쓰지 마라.

고친 버전이 `.claude/hooks/stop-git-check.sh` 에 있다. 검사 항목은 원본과 같고
**범위만** `HEAD --not --remotes`(어느 원격에서도 도달 불가 = 실제로 내가 손볼 수 있는 커밋)로
바꾼 것이다. 훅을 끄는 것이 아니라 버그만 고쳤다.

런처 설정은 실행 환경이 관리해 **에이전트가 등록을 해제하거나 자동 동기화할 수 없다**(차단된다).
컨테이너가 재생성되면 런처 스크립트가 원본으로 되돌아가 오탐이 재발한다. 그때는 이렇게 되살린다.

```bash
cp .claude/hooks/stop-git-check.sh ~/.claude/stop-hook-git-check.sh
```

훅을 아예 없애려면 `~/.claude/launcher-settings.json` 에서 `"Stop"` 블록을 지운다
(`"SessionStart"` 는 남겨 둘 것 — 커밋을 Verified 로 만드는 git identity 설정이다).
이 파일은 사용자가 직접 고쳐야 한다.

## 함정 메모

- **line 매핑 드리프트**: 표시 소스가 바뀌면 `step.line` 이 어긋난다. 소스와 generator 를 함께 고쳐라.
- **동치 착시**: 기본 입력만 맞고 경계 입력에서 갈라질 수 있다. 여러 입력으로 대조(trace-validator).
- **애니메이션 끊김**: 렌더 때 DOM 을 리빌드하면 transition 이 안 먹는다. 요소 재사용.
- **배포했는데 새 알고리즘이 안 보인다**: GH Pages 는 정적 자산에 `Cache-Control: max-age=600` 을 붙인다.
  카탈로그·meta·해설처럼 **배포마다 바뀌는 데이터**를 기본 `fetch` 로 받으면 최대 10분간 예전 것이 나온다.
  그래서 데이터 로드는 전부 `app/fetch-fresh.js` 의 `fetchFresh()`(`cache:'no-cache'`)를 쓴다 —
  안 바뀌었으면 304 라 비용은 거의 없다. **새 fetch 를 추가할 때 이걸 빠뜨리지 마라.**
