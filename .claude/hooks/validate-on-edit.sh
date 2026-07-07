#!/usr/bin/env bash
# PostToolUse(Write|Edit|MultiEdit) 훅.
# 알고리즘 트레이스 산출물(generator.js / trace.json / meta.json)이 편집되면 자동 검증한다.
# 검증 실패 시 exit 2 → Claude 에게 피드백이 전달되어 스스로 고치게 한다.
#
# 훅 입력(JSON)은 stdin 으로 들어온다. node 로 file_path 만 뽑아낸다(jq 불필요).

input=$(cat)
f=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write((JSON.parse(d).tool_input||{}).file_path||"")}catch{}})' 2>/dev/null)

[ -z "$f" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0   # node 없으면 조용히 통과(환경 방어)

case "$f" in
  *algorithms/*generator.js|*algorithms/*trace.json|*algorithms/*meta.json)
    node "${CLAUDE_PROJECT_DIR:-.}/scripts/validate-trace.mjs" "$f" 1>&2 || exit 2
    ;;
esac
exit 0
