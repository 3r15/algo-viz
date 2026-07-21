#!/usr/bin/env bash
# Model 2 빌드: 계측 C++ → WASM (브라우저에서 CH·2 라이브 실행)
#
# 진실 원천은 폴더 규약을 따른다: algorithms/<id>/code/<id>.cpp
# 산출물(글루+wasm)도 해당 알고리즘 폴더에 둔다: algorithms/<id>/bubble_sort.{js,wasm}
#
# 사전 준비 (한 번만): Emscripten 설치
#   git clone https://github.com/emscripten-core/emsdk.git
#   cd emsdk && ./emsdk install latest && ./emsdk activate latest
#   source ./emsdk_env.sh
#
# 실행:
#   ./build.sh
# 결과물: algorithms/bubble-sort/bubble_sort.js (글루) + .wasm
#
# 그다음 meta.json 에 "wasm": { "export": "createBubbleSort", "run": "run_trace" } 를 추가하고
# 글루 스크립트를 로드하면(예: <script src="algorithms/bubble-sort/bubble_sort.js"></script>)
# app/main.js 가 createBubbleSort 를 자동 감지해 CH·2 를 실시간으로 전환한다.

set -e

SRC=algorithms/bubble-sort/code/bubble_sort.cpp
OUT=algorithms/bubble-sort/bubble_sort.js

emcc "$SRC" -O2 -o "$OUT" \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createBubbleSort \
  -s EXPORTED_FUNCTIONS='["_run_trace","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web

echo "빌드 완료: $OUT + .wasm"
echo "meta.json 에 wasm 필드를 추가하고 글루 스크립트를 로드하면 CH·2 가 라이브로 전환됩니다."
