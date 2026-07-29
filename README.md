# algo-viz

C++ 알고리즘을 **라인별로 실행·되감기**하며 메모리·자료구조가 어떻게 변하는지 시각화하는
학습 웹사이트. 백엔드 없는 **정적 사이트**로 GitHub Pages에 배포된다.

> 핵심: 브라우저에서 C++을 인터프리트하지 않는다. 알고리즘마다 **실행 스텝 배열(trace)** 을
> 만들어 두고, 플레이어는 인덱스 하나만 오간다. 되감기 = `i-1` (undo 로직 없음).

## 트레이스 생성 — 제품 한 채널 + 검증 오라클

| | Model A | Model 2 |
|---|---|---|
| 방법 | `generator.js` (JS 재구현) | 계측 C++ (`algorithms/<id>/code/`) |
| 어디서 도나 | **브라우저 — 배포되는 유일한 방식** | CI/로컬의 네이티브 `g++` |
| 빌드 | 불필요 | `g++ -std=c++17` 한 줄 |
| 임의 입력 | 실시간 | 명령줄 인자로 |
| 역할 | 제품 | **정확성 게이트(오라클)** |

브라우저는 Model A 만 재생한다. Model 2 는 같은 알고리즘을 C++ 로 계측해 뽑아 둔
`reference-trace.json` 으로 남아, **두 트레이스가 바이트 단위로 같은지**를
`scripts/validate-trace.mjs` 가 게이트한다(LOCK). WASM 은 쓰지 않는다.

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

Model 2 동치(LOCK) 확인:

```bash
g++ -std=c++17 -O2 algorithms/bubble-sort/code/bubble_sort.cpp -o /tmp/bs
/tmp/bs "5 2 9 1 5 6"           # 출력이 reference-trace.json 과 같아야 한다
npm run validate                # generator.js ↔ reference-trace.json 동치를 게이트
```

## 구조

```
index.html              얇은 셸(GH Pages 진입점) — #app 마운트 + CSS, app/main.js 만 로드
app/                    라우터 · 뷰 · 공용 플레이어 · 렌더러(array/graph/tree/matrix/heap)
CLAUDE.md               Claude Code 프로젝트 메모리(아키텍처·계약·규약)
paradigms/              알고리즘 유형 문서(그리디·DP·분할정복…) — 알고리즘과 구별되는 층
  <id>/                 meta.json(match 규칙) · notes.md
algorithms/
  index.json            카탈로그(meta 레코드 배열, 자동 생성)
  <id>/                 meta.json · generator.js · walkthrough.md · notes.md
                        (+ 선택: code/<id>.cpp · reference-trace.json — Model 2 오라클)
schemas/                trace.schema.json · meta.schema.json (계약)
scripts/                validate-trace · validate-notes · validate-all · build-index (의존성 없는 Node)
docs/design.md          전체 설계 문서
.claude/                서브에이전트 · 스킬 · 훅 · 설정
.github/workflows/      CI(검증) + GitHub Pages 배포
```

## 배포 (GitHub Pages)

`main` 에 push 하면 `.github/workflows/deploy-pages.yml` 가 사이트를 배포한다.
저장소 **Settings → Pages → Source: GitHub Actions** 로 한 번 설정해 두면 된다.

카탈로그(`algorithms/index.json` · `paradigms/index.json`)는 **배포 시점에 항상 새로 생성**되므로
배포된 사이트가 뒤처지는 일은 없다. 커밋된 파일은 로컬에서 정적 서버로 열었을 때를 위한 것이라,
CI 가 `meta.json` 과 어긋나지 않는지 검사하고 어긋나면 무엇이 달라졌는지 알려 준다(`npm run index` 로 고친다).

라우팅은 **해시 라우팅**을 쓴다(`#/catalog`, `#/algo/:id`) — GH Pages 는 서버 리라이트가 없어
`/algo/...` 경로는 404 나기 때문이다.

## 해설 문서 — 두 층

알고리즘마다 문서를 **두 개** 둔다. 페이지 맨 아래에 나란히 쌓이고, 맨 위 버튼으로 오간다.

| 파일 | 표시 | 독자 | 섹션 뼈대 |
|---|---|---|---|
| `walkthrough.md` | **차근차근** | 처음 보는 사람 | 어떤 문제인가 · 손으로 해보기 · 아이디어 쌓기 · 코드로 옮기기 |
| `notes.md` | **깊이 보기** | 이미 아는 사람 | 한눈에 · 동작 원리 · 정확성 · 복잡도 |

**차근차근**은 증명하지 않는다. 기본 입력으로 작은 예시를 끝까지 손으로 따라가고,
단순한 방법에서 시작해 알고리즘을 한 단계씩 조립한다. 독자가 위 플레이어에서 그대로 재생하며
읽을 수 있도록 예시를 맞춰 둔다.

**깊이 보기**는 불변식과 귀납으로 증명하고 복잡도의 근거를 따진다.

탭으로 감추지 않고 **둘 다 항상 DOM 에 둔다** — Ctrl+F 검색, 스크린리더, 인쇄가 그대로 동작한다.
섹션 뼈대와 순서는 검증기가 강제하므로 모든 문서가 같은 골격을 유지한다.

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
