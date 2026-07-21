# 트레이스 생성 방식 비교 — 그림자 생성기(Model 1) vs C++→WASM(Model 2)

같은 알고리즘(**버블 정렬**)을 두 가지 방식으로 계측해 **트레이스**를 만들고,
**하나의 공유 트랜스포트**로 나란히 재생·되감기하며 비교하는 데모입니다.

핵심 메시지: **트레이스를 어떻게 만들든(JS든 C++이든), 일단 트레이스 배열만 생기면
플레이어·시각화·되감기는 완전히 동일하다.** 두 방식의 차이는 "생성 단계"에만 있습니다.

---

## 파일

| 파일 | 역할 |
|---|---|
| `index.html` + `app/` | 비교 페이지(얇은 셸 + 공용 플레이어 모듈). 그대로 GitHub Pages에 올리면 동작 |
| `algorithms/bubble-sort/code/bubble_sort.cpp` | **Model 2의 진실 원천.** 실제 계측된 C++ (네이티브 + Emscripten 겸용) |
| `build.sh` | 위 C++ → WASM 컴파일 스크립트(산출물은 `algorithms/bubble-sort/` 아래) |
| `algorithms/bubble-sort/reference-trace.json` | 그 C++을 g++로 네이티브 컴파일·실행해 뽑은 기본 입력 트레이스 |

---

## 지금 바로 되는 것 (WASM 빌드 없이)

`index.html`만 열어도:

- **CH·A (JS 그림자 생성기)** — 완전 실시간. 입력을 바꾸면 즉시 재생성.
- **CH·2 (C++→WASM)** — **기본 입력** `5 2 9 1 5 6` 에서는 실제 C++로 뽑은
  참조 트레이스를 재생. (임의 입력은 아래 빌드 후 가능)
- 두 트레이스가 스텝 단위로 일치하면 **LOCK ✓** 램프가 켜짐 —
  즉 JS 재구현이 실제 C++과 동일함을 증명.

> "CH·A는 그냥 되는데 CH·2는 빌드해야 켜진다" — 이 체감 자체가 두 방식의
> 가장 중요한 차이입니다.

---

## CH·2를 임의 입력까지 실시간으로 (WASM 빌드)

```bash
# 1) Emscripten 설치 (한 번만)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh
cd -

# 2) 빌드
./build.sh          # → algorithms/bubble-sort/bubble_sort.js + .wasm

# 3) meta.json 에 wasm 필드 추가 + 글루 스크립트 로드:
#    "wasm": { "export": "createBubbleSort", "run": "run_trace" }
#    <script src="algorithms/bubble-sort/bubble_sort.js"></script>
```

이제 `app/main.js` 가 `createBubbleSort`를 자동 감지해 CH·2를 **LIVE**로 전환하고,
아무 입력이나 브라우저에서 실제 C++ 로직으로 실행합니다.

GitHub Actions에 이 빌드를 넣으면 커밋 때마다 `.wasm`이 자동 생성됩니다.

---

## 트레이스 포맷 (두 방식이 공유하는 계약)

```jsonc
{
  "line": 5,              // 표시 C++ 소스의 줄 번호 (하이라이트 대상)
  "i": 0, "j": 2,         // 지역 변수
  "op": "compare",        // start | compare | swap | pass-end | done
  "a": 2, "b": 3,         // 연산에 관여한 인덱스
  "sortedFrom": 6,        // 이 인덱스부터는 정렬 확정 (초록 표시)
  "values": [2,5,1,9,5,6],// 이 스텝 직후 배열 스냅샷 (되감기용)
  "explain": "a[2] 와 a[3] 비교"
}
```

- `values` = 상태(스냅샷) → 되감기가 그냥 "N번째 스냅샷 다시 그리기".
- `op`/`a`/`b` = 전이 → compare/swap 애니메이션의 근거.
- `line` = 코드 하이라이트와 시각화를 동기화하는 열쇠.

Model A(JS)와 Model 2(C++)는 이 포맷을 **동일하게** 산출하므로,
플레이어는 어느 쪽 트레이스가 들어와도 구분 없이 재생합니다.

---

## 어느 방식을 쓸까

- **빠른 MVP · 순수 정적 · 임의 입력 필수** → Model A (JS 그림자 생성기)
- **표시 코드 = 실행 코드 보장 · C++ 의미론 정확도 필요** → Model 2 (C++→WASM)
- **실전 권장** → Model A로 폭넓게 깔고, 정확도가 중요한 핵심 알고리즘만 Model 2로 승격.
  둘의 출력(트레이스)이 같은 포맷이라 UI는 한 번만 만들면 됩니다.
