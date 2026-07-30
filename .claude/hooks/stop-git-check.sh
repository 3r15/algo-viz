#!/bin/bash
#
# Stop 훅 — 턴을 끝내기 전에 커밋/푸시가 누락되지 않았는지 확인한다.
#
# 이 파일이 저장소 안에 있는 이유
# ------------------------------
# 같은 훅이 런처 설정(~/.claude/launcher-settings.json)에도 등록돼 있고, 그 스크립트
# (~/.claude/stop-hook-git-check.sh)에는 커밋 범위를 잘못 잡는 버그가 있다.
# 그 버전은 "$upstream..HEAD" 를 검사하는데, squash 병합 뒤 로컬 브랜치를 최신 main 위로
# 다시 잡으면(흔한 작업 흐름) 그 범위에 **GitHub 이 만든 병합 커밋**이 들어간다.
# 그 커밋의 committer 는 noreply@github.com 이므로 "Unverified" 로 걸리고,
# 훅은 이미 푸시·배포된 커밋을 `--amend` 하라고 안내한다 — 오탐이면서 해로운 지시다.
#
# 런처 설정은 실행 환경이 관리해 에이전트가 등록을 해제할 수 없고, 컨테이너가 재생성되면
# 그 스크립트도 원본(버그 있는 버전)으로 되돌아간다. 그래서 **고친 버전을 저장소에 두고**,
# SessionStart 훅(sync-stop-hook.sh)이 매 세션 시작에 이 파일로 덮어써 오탐 재발을 막는다.
#
# 원본과 다른 점은 검사 범위 하나다. 검사 항목(미커밋 변경·추적 안 되는 파일·미푸시 커밋·
# 서명 없는 커밋)은 그대로 유지한다 — 훅을 무력화하는 것이 아니라 버그만 고친 것이다.

# Read the JSON input from stdin
input=$(cat)

# Check if stop hook is already active (recursion prevention)
stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active')
if [[ "$stop_hook_active" = "true" ]]; then
  exit 0
fi

# Check if we're in a git repository - bail if not
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

# Bail if there's no remote to push to. Every error path below asks the user
# to "push to the remote branch" — meaningless without a remote, and
# unsatisfiable if signing also requires a source. This case arises when CCR
# was launched against a local repo with no github remote (sources=[]) and
# the container's cwd has a leftover .git from a cached resume.
if [[ -z "$(git remote)" ]]; then
  exit 0
fi

# Check for uncommitted changes (both staged and unstaged)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# Check for untracked files that might be important
untracked_files=$(git ls-files --others --exclude-standard)
if [[ -n "$untracked_files" ]]; then
  echo "There are untracked files in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

current_branch=$(git branch --show-current)
if [[ -n "$current_branch" ]]; then
  if git rev-parse "origin/$current_branch" >/dev/null 2>&1; then
    upstream="origin/$current_branch"
  else
    upstream="origin/HEAD"
  fi

  # ── 이 블록이 원본과 다른 유일한 부분 ──────────────────────────────────────
  # 우리가 손볼 수 있는 커밋은 "로컬에만 있고 어느 원격 참조에서도 도달할 수 없는" 것뿐이다.
  # "HEAD --not --remotes" 가 정확히 그 집합을 준다. "$upstream..HEAD" 는 위 주석의
  # 오탐을 만든다(병합 커밋이 origin/main 에는 있는데 origin/<브랜치> 에는 없어서).
  if [[ -n "$(git rev-list -n1 --remotes 2>/dev/null)" ]]; then
    local_range=(HEAD --not --remotes)
  else
    local_range=("$upstream..HEAD")      # 원격 참조를 아직 하나도 못 가져온 초기 상태
  fi
  # ─────────────────────────────────────────────────────────────────────────

  # Check for local commits that GitHub will show as "Unverified": either no
  # signature at all (%G? == N), or signed with a committer email other than
  # noreply@anthropic.com (the identity CCR's signing key is registered to).
  # Only run when commit signing is configured. Note: %G? is N for unsigned
  # commits; signed-but-locally-unverifiable commits report B/U/E, so this is
  # a reliable presence check even though CCR doesn't configure local verification.
  if [[ "$(git config --type=bool commit.gpgsign 2>/dev/null)" == "true" ]]; then
    unverifiable=$(git log --format='%h %G? %ce' "${local_range[@]}" 2>/dev/null | awk '$2 == "N" || $3 != "noreply@anthropic.com"')
    if [[ -n "$unverifiable" ]]; then
      echo "There are commit(s) on branch '$current_branch' that GitHub will show as Unverified (missing signature, or committer email is not noreply@anthropic.com):" >&2
      echo "$unverifiable" >&2
      echo "Please run 'git config user.email noreply@anthropic.com && git config user.name Claude', then 'git commit --amend --no-edit --reset-author' for the tip commit, or 'git rebase --exec \"git commit --amend --no-edit --reset-author\" $upstream' for earlier commits, then push." >&2
      exit 2
    fi
  fi

  unpushed=$(git rev-list "${local_range[@]}" --count 2>/dev/null) || unpushed=0
  if [[ "$unpushed" -gt 0 ]]; then
    if [[ "$upstream" == "origin/$current_branch" ]]; then
      echo "There are $unpushed unpushed commit(s) on branch '$current_branch'. Please push these changes to the remote repository." >&2
    else
      echo "Branch '$current_branch' has $unpushed unpushed commit(s) and no remote branch. Please push these changes to the remote repository." >&2
    fi
    exit 2
  fi
fi

exit 0
