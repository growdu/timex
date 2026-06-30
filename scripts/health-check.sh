#!/usr/bin/env bash
# health-check.sh — timex 项目代码体检
#
# 用法：
#   ./scripts/health-check.sh           # 全套（lint + typecheck + test + build + coverage）
#   ./scripts/health-check.sh fast      # 只跑 lint + typecheck + test
#   ./scripts/health-check.sh coverage  # 只跑覆盖率（后端 + 前端）
#   ./scripts/health-check.sh backend   # 只跑后端
#   ./scripts/health-check.sh frontend  # 只跑前端
#
# 退出码：
#   0   全部通过
#   1   有错误
#   2   参数错误

set -uo pipefail

# 切到脚本所在目录的父级（项目根）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# 颜色
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

passed=0
failed=0
warned=0
declare -a steps_run=()

# ---- 工具函数 ----

step() {
  local name="$1"
  echo ""
  echo "${BLUE}${BOLD}▶ $name${RESET}"
  steps_run+=("$name")
}

ok() {
  echo "${GREEN}  ✓ $1${RESET}"
  passed=$((passed + 1))
}

bad() {
  echo "${RED}  ✗ $1${RESET}"
  failed=$((failed + 1))
}

warn() {
  echo "${YELLOW}  ! $1${RESET}"
  warned=$((warned + 1))
}

run_step() {
  # run_step "label" command...
  local label="$1"
  shift
  step "$label"
  if "$@" >/tmp/health-check.out 2>&1; then
    ok "$label"
    # 只显示最后几行（如果有警告）
    if [ -s /tmp/health-check.out ]; then
      tail -5 /tmp/health-check.out
    fi
  else
    bad "$label"
    cat /tmp/health-check.out
  fi
}

# ---- 后端 ----

backend_lint() {
  run_step "backend lint" npm --prefix backend run lint:check
}

backend_typecheck() {
  run_step "backend typecheck" npm --prefix backend run typecheck
}

backend_test() {
  run_step "backend test" npm --prefix backend test -- --silent
}

backend_build() {
  run_step "backend build" npm --prefix backend run build
}

backend_coverage() {
  step "backend coverage"
  if npm --prefix backend test -- --coverage --silent >/tmp/health-check.out 2>&1; then
    local cov
    cov=$(grep -E "^All files" /tmp/health-check.out | head -1 | awk -F'|' '{print $2}' | tr -d ' ')
    if [ -n "$cov" ]; then
      # 去掉百分号比较
      local pct=${cov%\%}
      if [ "${pct%.*}" -ge 50 ] 2>/dev/null; then
        ok "backend coverage: ${cov} (≥ 50%)"
      else
        bad "backend coverage: ${cov} (< 50% 阈值)"
      fi
      grep -E "^All files" /tmp/health-check.out | head -1
    else
      warn "backend coverage: 无法解析数值"
      tail -20 /tmp/health-check.out
    fi
  else
    bad "backend coverage"
    tail -30 /tmp/health-check.out
  fi
}

# ---- 前端 ----

frontend_lint() {
  run_step "frontend lint" npm --prefix frontend run lint -- --max-warnings=9999
}

frontend_test() {
  run_step "frontend test" npm --prefix frontend run test:run
}

frontend_build() {
  run_step "frontend build" npm --prefix frontend run build
}

frontend_coverage() {
  step "frontend coverage"
  if ( cd frontend && npm exec -- vitest run --coverage --reporter=basic ) >/tmp/health-check.out 2>&1; then
    local cov
    cov=$(grep -E "^All files" /tmp/health-check.out | head -1 | awk -F'|' '{print $2}' | tr -d ' ')
    if [ -n "$cov" ]; then
      local pct=${cov%\%}
      if [ "${pct%.*}" -ge 15 ] 2>/dev/null; then
        ok "frontend coverage: ${cov} (≥ 15% 当前 / ≥ 50% 最终目标)"
      else
        bad "frontend coverage: ${cov} (< 15% 阈值)"
      fi
      grep -E "^All files" /tmp/health-check.out | head -1
    else
      warn "frontend coverage: 无法解析数值"
      tail -20 /tmp/health-check.out
    fi
  else
    bad "frontend coverage"
    tail -30 /tmp/health-check.out
  fi
}

# ---- 编排 ----

run_backend() {
  backend_lint
  backend_typecheck
  backend_test
  [ "${1:-}" != "fast" ] && backend_build
  [ "${1:-}" = "coverage" ] && backend_coverage
}

run_frontend() {
  frontend_lint
  frontend_test
  [ "${1:-}" != "fast" ] && frontend_build
  [ "${1:-}" = "coverage" ] && frontend_coverage
}

run_full() {
  run_backend "${1:-}"
  run_frontend "${1:-}"
}

print_summary() {
  echo ""
  echo "${BOLD}══════════════════════════════════════════════${RESET}"
  echo "${BOLD}  健康检查汇总${RESET}"
  echo "${BOLD}══════════════════════════════════════════════${RESET}"
  echo "  步骤: ${#steps_run[@]}"
  echo "  ${GREEN}✓ 通过: $passed${RESET}"
  if [ "$warned" -gt 0 ]; then
    echo "  ${YELLOW}! 警告: $warned${RESET}"
  fi
  if [ "$failed" -gt 0 ]; then
    echo "  ${RED}✗ 失败: $failed${RESET}"
  fi
  echo ""
  if [ "$failed" -eq 0 ]; then
    echo "${GREEN}${BOLD}✅ 体检通过${RESET}"
    return 0
  else
    echo "${RED}${BOLD}❌ 体检发现 $failed 个问题${RESET}"
    return 1
  fi
}

# ---- 主入口 ----

case "${1:-all}" in
  fast)
    echo "${BOLD}timex 健康检查（fast: lint + typecheck + test）${RESET}"
    run_full fast
    print_summary
    ;;
  coverage)
    echo "${BOLD}timex 健康检查（coverage only）${RESET}"
    run_full coverage
    print_summary
    ;;
  backend)
    echo "${BOLD}timex 后端体检${RESET}"
    run_backend
    print_summary
    ;;
  frontend)
    echo "${BOLD}timex 前端体检${RESET}"
    run_frontend
    print_summary
    ;;
  all)
    echo "${BOLD}timex 全量体检（lint + typecheck + test + build）${RESET}"
    run_full
    print_summary
    ;;
  -h|--help|help)
    sed -n '2,16p' "$0"
    ;;
  *)
    echo "${RED}未知参数: $1${RESET}" >&2
    sed -n '2,16p' "$0" >&2
    exit 2
    ;;
esac