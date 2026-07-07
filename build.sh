#!/usr/bin/env bash
# Model 2 빌드: bubble_sort.cpp → WASM (브라우저에서 CH·2 라이브 실행)
#
# 사전 준비 (한 번만): Emscripten 설치
#   git clone https://github.com/emscripten-core/emsdk.git
#   cd emsdk && ./emsdk install latest && ./emsdk activate latest
#   source ./emsdk_env.sh
#
# 실행:
#   ./build.sh
# 결과물: bubble_sort.js (글루) + bubble_sort.wasm
#
# 그다음 index.html 하단의 아래 줄 주석을 해제하세요:
#   <script src="bubble_sort.js"></script>
# 페이지가 createBubbleSort 를 자동 감지해 CH·2 를 실시간으로 전환합니다.

set -e

emcc bubble_sort.cpp -O2 -o bubble_sort.js \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createBubbleSort \
  -s EXPORTED_FUNCTIONS='["_run_trace","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web

echo "빌드 완료: bubble_sort.js + bubble_sort.wasm"
echo "index.html 의 <script src=\"bubble_sort.js\"></script> 주석을 해제하세요."
