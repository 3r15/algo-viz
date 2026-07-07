#!/usr/bin/env bash
# SessionStart 훅. stdout 이 세션 컨텍스트(additionalContext)로 주입된다.
# 매 세션 시작 시 이 프로젝트의 깨지면 안 되는 규약을 상기시킨다.

branch=$(git branch --show-current 2>/dev/null || echo '?')
cat <<EOF
[algo-viz] git=$branch
핵심 불변식:
· 트레이스가 계약이다. Model A(generator.js)와 Model 2(C++→WASM)는 반드시 동일한 트레이스를 산출한다.
· 되감기는 스냅샷 인덱스 이동일 뿐 — undo 로직을 만들지 말 것.
· 코드 편집 후 generator.js / trace.json / meta.json 은 PostToolUse 훅이 자동 검증한다.
루틴:
· 알고리즘 추가 → add-algorithm 스킬. 트레이스 정합성 점검 → trace-validator 서브에이전트.
· 새 자료구조 시각화 → renderer-builder 서브에이전트.
EOF
exit 0
