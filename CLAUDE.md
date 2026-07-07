# CLAUDE.md — algo-viz

C++ 알고리즘을 **라인별 실행·되감기**하며 자료구조 변화를 시각화하는 학습 웹사이트.
정적 호스팅(GitHub Pages) 전용. 백엔드·실시간 컴파일 없음.

---

## 아키텍처 한 문장

> **코드는 표시만, 실행은 미리 만든 트레이스로, 시각화는 스냅샷+전이로, 분류는 JSON 인덱스로, 확장은 폴더 규약으로.**

브라우저에서 C++ 을 인터프리트하지 않는다. 알고리즘마다 **실행 스텝 배열(trace)** 을 만들어 두고,
플레이어는 `currentStep` 인덱스 하나만 오간다. 되감기 = `i-1`, 그래서 undo 로직이 없다.

### 트레이스 생성 두 방식 (같은 포맷을 산출)
- **Model A** — `generator.js`(JS 재구현). 빌드 불필요, 임의 입력 실시간 재생성. 기본값.
- **Model 2** — 계측 C++ 을 Emscripten 으로 WASM 컴파일. 표시 코드 = 실행 코드. `build.sh` 필요.

두 방식은 **바이트 단위로 동일한 트레이스**를 내야 한다. 그 동일성이 이 프로젝트의 핵심 불변식이다.
데모(`index.html`)의 LOCK 램프가 이 동일성을 실시간으로 보여준다.

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
index.html                 # 현재: Model A vs Model 2 비교 데모(GH Pages 진입점)
bubble_sort.cpp            # Model 2 진실 원천(계측 C++)
build.sh                   # C++ → WASM (Emscripten)
schemas/
  trace.schema.json        # 트레이스 계약
  meta.schema.json         # 카탈로그 레코드 계약
scripts/
  validate-trace.mjs       # 검증기(훅·서브에이전트·CI 공용, 의존성 없음)
algorithms/
  index.json               # 카탈로그(= meta 레코드 배열). 클라이언트에서 필터/검색
  <id>/
    meta.json  code/<id>.cpp  generator.js  reference-trace.json  notes.md
  bubble-sort/             # 시드 알고리즘(참고 구현)
.claude/
  settings.json            # 훅 + 권한
  hooks/                   # validate-on-edit.sh, session-context.sh
  agents/                  # algorithm-author, trace-validator, renderer-builder
  skills/                  # add-algorithm, trace-format
```

목표 구조는 `algorithms/<id>/`. 현재 루트의 평평한 데모(`index.html`, `bubble_sort.cpp`)는
`algorithms/bubble-sort/` 로 이관·정리하는 것이 첫 리팩터링 과제다.

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
  `/algo/quick-sort` 같은 경로는 404 난다.
- **상대 경로** — 프로젝트 페이지는 `user.github.io/<repo>/` 하위. base 경로 주의.
- **브라우저 스토리지 금지**(localStorage/sessionStorage) — 상태는 메모리(플레이어 store)에.
- **렌더러 레지스트리** — `registerRenderer('<type>', render)`. 구조 `type`(array/stack/tree/graph…)로 위임.
- `prefers-reduced-motion` 존중, 키보드 포커스 가시화, 모바일 반응형.

---

## 명령

```bash
# 로컬 미리보기(정적)
python3 -m http.server 8000        # → http://localhost:8000

# 트레이스/메타 검증
node scripts/validate-trace.mjs algorithms/<id>/generator.js
node scripts/validate-trace.mjs algorithms/<id>/meta.json

# Model 2 WASM 빌드(emcc 필요) — 이후 index.html 의 <script src="bubble_sort.js"> 주석 해제
./build.sh

# Model 2 동치 대조(emcc 없이 네이티브로)
g++ -std=c++17 -O2 bubble_sort.cpp -o /tmp/bs && /tmp/bs "5 2 9 1 5 6"
```

---

## 현재 상태 & 다음 과제

- [x] 트레이스 포맷 확정 + 검증기 + 훅/에이전트/스킬 스캐폴딩
- [x] 시드 알고리즘(bubble-sort): Model A generator + Model 2 C++ + 동치(LOCK) 확인
- [x] Model A vs Model 2 비교 데모(`index.html`)
- [ ] 평평한 데모를 `algorithms/bubble-sort/` 로 이관·정리
- [ ] 공용 플레이어(store + 트랜스포트 + 스크러버) 모듈 분리
- [ ] 렌더러 레지스트리 + array 렌더러 분리, 이후 stack/queue/tree/graph
- [ ] 카탈로그 뷰(`index.json` 필터: 카테고리/자료구조/복잡도/난이도/태그)
- [ ] 알고리즘 확충: quick/merge/insertion sort → BFS/DFS → DP 테이블
- [ ] (선택) GitHub Actions: `index.json` 생성 + Model 2 WASM 빌드 + 스키마 검증

## 함정 메모

- **line 매핑 드리프트**: 표시 소스가 바뀌면 `step.line` 이 어긋난다. 소스와 generator 를 함께 고쳐라.
- **동치 착시**: 기본 입력만 맞고 경계 입력에서 갈라질 수 있다. 여러 입력으로 대조(trace-validator).
- **애니메이션 끊김**: 렌더 때 DOM 을 리빌드하면 transition 이 안 먹는다. 요소 재사용.
