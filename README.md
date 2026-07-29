# algo-viz

C++ 알고리즘을 **라인별로 실행·되감기**하며 메모리·자료구조가 어떻게 변하는지 시각화하는
학습 웹사이트. 백엔드 없는 **정적 사이트**로 GitHub Pages에 배포된다.

> 핵심: 브라우저에서 C++을 인터프리트하지 않는다. 알고리즘마다 **실행 스텝 배열(trace)** 을
> 만들어 두고, 플레이어는 인덱스 하나만 오간다. 되감기 = `i-1` (undo 로직 없음).

## 트레이스 생성 두 방식

| | Model A | Model 2 |
|---|---|---|
| 방법 | `generator.js` (JS 재구현) | 계측 C++ → WASM (Emscripten) |
| 빌드 | 불필요 | `build.sh` 필요 |
| 임의 입력 | 실시간 | WASM 빌드 후 실시간 |
| 표시=실행 | 아니오(논리 일치는 검증기로 보장) | 예 |

두 방식은 **바이트 단위로 동일한 트레이스**를 산출해야 한다. `index.html` 데모의 LOCK 램프와
`scripts/validate-trace.mjs` 가 이 동일성을 확인한다.

## 빠른 시작

```bash
nvm use                         # Node 22 (.nvmrc)
npm run serve                   # http://localhost:8000 에서 데모 확인
npm run check                   # index.json 최신성 + 트레이스 + 해설 문서 검증
```

알고리즘 추가:

```bash
# .claude/skills/add-algorithm 절차를 따르거나, Claude Code 에서:
#   "algorithm-author 로 quick-sort 추가해줘"
node scripts/build-index.mjs    # 카탈로그 재생성
npm run validate                # 검증
```

Model 2(WASM) 활성화:

```bash
npm run build:wasm              # algorithms/bubble-sort/bubble_sort.js + .wasm (emcc 필요)
# 그다음 meta.json 에 wasm 필드 추가 + 글루 스크립트 로드
```

## 구조

```
index.html              데모(GH Pages 진입점) — Model A vs Model 2 비교
CLAUDE.md               Claude Code 프로젝트 메모리(아키텍처·계약·규약)
paradigms/              알고리즘 유형 문서(그리디·DP·분할정복…) — 알고리즘과 구별되는 층
  <id>/                 meta.json(match 규칙) · notes.md
algorithms/
  index.json            카탈로그(meta 레코드 배열, 자동 생성)
  <id>/                 meta.json · code/ · generator.js · reference-trace.json · notes.md
schemas/                trace.schema.json · meta.schema.json (계약)
scripts/                validate-trace · validate-notes · validate-all · build-index (의존성 없는 Node)
docs/design.md          전체 설계 문서
.claude/                서브에이전트 · 스킬 · 훅 · 설정
.github/workflows/      CI(검증) + GitHub Pages 배포
```

## 배포 (GitHub Pages)

`main` 에 push 하면 `.github/workflows/deploy-pages.yml` 가 사이트를 배포한다.
저장소 **Settings → Pages → Source: GitHub Actions** 로 한 번 설정해 두면 된다.

라우팅은 **해시 라우팅**을 쓴다(`#/catalog`, `#/algo/:id`) — GH Pages 는 서버 리라이트가 없어
`/algo/...` 경로는 404 나기 때문이다.

## 해설 문서

알고리즘마다 `algorithms/<id>/notes.md` 에 **원리·정확성 증명·복잡도** 해설을 둔다.
알고리즘 페이지 맨 아래 "해설" 섹션으로 자동 렌더되며(등록 불필요), 우측에 목차가 붙는다.

섹션 뼈대는 고정이다 — `## 한눈에` · `## 동작 원리` · `## 정확성` · `## 복잡도` 가 필수이고,
`## 구현 노트` · `## 변형과 확장` · `## 함께 보기` 가 선택이다. 순서까지 검증기가 강제하므로
9개 문서가 같은 뼈대를 유지한다.

```bash
node scripts/validate-notes.mjs                        # 전체
node scripts/validate-notes.mjs algorithms/bfs/notes.md
```

수식 라이브러리는 싣지 않는다(빌드리스 원칙). `O(n log n)`, `2^k`, `⌊log₂ n⌋` 처럼
유니코드로 쓰고, 여러 줄 식·다이어그램은 코드 펜스에 넣는다.
작성 규약 전체는 `.claude/skills/algorithm-notes/SKILL.md`.

## 알고리즘 유형 문서

개별 알고리즘과 별개로, **문제를 푸는 방식**을 정리한 문서를 `paradigms/<id>/` 에 둔다.
그리디가 언제 성립하는지, DP 의 상태를 어떻게 잡는지처럼 알고리즘 하나에 매이지 않는 내용이다.

`#/paradigms` 에서 목록을, `#/paradigm/:id` 에서 본문을 본다. 각 유형 페이지의
**"이 유형의 알고리즘"** 목록은 `meta.match` 의 분류·태그로 카탈로그를 걸러 자동 생성되므로,
새 알고리즘을 추가하면 별도 등록 없이 바로 나타난다. 그 검색어들은 기존 태그 검색
(`#/catalog?q=<term>`)과 같은 어휘를 쓴다.

## 기여

새 알고리즘 PR 은 `.claude/skills/add-algorithm/SKILL.md` 절차를 따른다. CI 가 트레이스 계약,
해설 문서 구조, 카탈로그 최신성을 자동 검사한다. 라이선스: MIT.
