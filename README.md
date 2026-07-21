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
npm run check                   # index.json 최신성 + 모든 트레이스 검증
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
algorithms/
  index.json            카탈로그(meta 레코드 배열, 자동 생성)
  <id>/                 meta.json · code/ · generator.js · reference-trace.json
schemas/                trace.schema.json · meta.schema.json (계약)
scripts/                validate-trace · validate-all · build-index (의존성 없는 Node)
docs/design.md          전체 설계 문서
.claude/                서브에이전트 · 스킬 · 훅 · 설정
.github/workflows/      CI(검증) + GitHub Pages 배포
```

## 배포 (GitHub Pages)

`main` 에 push 하면 `.github/workflows/deploy-pages.yml` 가 사이트를 배포한다.
저장소 **Settings → Pages → Source: GitHub Actions** 로 한 번 설정해 두면 된다.

라우팅은 **해시 라우팅**을 쓴다(`#/catalog`, `#/algo/:id`) — GH Pages 는 서버 리라이트가 없어
`/algo/...` 경로는 404 나기 때문이다.

## 기여

새 알고리즘 PR 은 `.claude/skills/add-algorithm/SKILL.md` 절차를 따른다. CI 가 트레이스 계약과
카탈로그 최신성을 자동 검사한다. 라이선스: MIT.
