#!/usr/bin/env bash
set -euo pipefail

for name in RAILWAY_TOKEN RAILWAY_PROJECT_ID RAILWAY_ENVIRONMENT RAILWAY_SERVICE API_BASE_URL; do
  if [[ -z "${!name:-}" ]]; then
    echo "[Classroom Acceptance] ${name} is required" >&2
    exit 1
  fi
done

if [[ "${RAILWAY_ENVIRONMENT}" != "staging" ]]; then
  echo "[Classroom Acceptance] Refusing to run outside Railway staging" >&2
  exit 1
fi

if [[ "${API_BASE_URL}" != *"api-staging"* ]]; then
  echo "[Classroom Acceptance] Refusing a non-staging API target" >&2
  exit 1
fi

railway_variable_set() {
  pnpm dlx @railway/cli variable set "$@" \
    --project "${RAILWAY_PROJECT_ID}" \
    --environment "${RAILWAY_ENVIRONMENT}" \
    --service "${RAILWAY_SERVICE}" \
    --skip-deploys \
    --json >/dev/null
}

configure() {
  if [[ -z "${GITHUB_ENV:-}" ]]; then
    echo "[Classroom Acceptance] GITHUB_ENV is required during configuration" >&2
    exit 1
  fi

  local secret expires_at
  secret="$(openssl rand -hex 32)"
  expires_at="$(date -u -d '+15 minutes' '+%Y-%m-%dT%H:%M:%SZ')"

  echo "::add-mask::${secret}"
  printf 'CLASSROOM_ACCEPTANCE_SECRET=%s\n' "${secret}" >>"${GITHUB_ENV}"

  railway_variable_set \
    CLASSROOM_MVP_ENABLED=true \
    CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED=true \
    CLASSROOM_ACCEPTANCE_TARGET=staging \
    "CLASSROOM_ACCEPTANCE_API_BASE_URL=${API_BASE_URL}" \
    "CLASSROOM_ACCEPTANCE_EXPIRES_AT=${expires_at}" \
    "CLASSROOM_ACCEPTANCE_SECRET=${secret}"

  echo "[Classroom Acceptance] Configured a masked, expiring staging window"
}

ACCEPTANCE_RESPONSE_FILE=""

run_acceptance() {
  if [[ -z "${CLASSROOM_ACCEPTANCE_SECRET:-}" ]]; then
    echo "[Classroom Acceptance] Masked acceptance secret was not propagated" >&2
    exit 1
  fi

  local status
  ACCEPTANCE_RESPONSE_FILE="$(mktemp)"

  disable_future_runs() {
    railway_variable_set CLASSROOM_ACCEPTANCE_ENDPOINT_ENABLED=false || true
    rm -f "${ACCEPTANCE_RESPONSE_FILE:-}"
  }
  trap disable_future_runs EXIT

  status="$(
    curl --silent --show-error \
      --max-time 240 \
      --output "${ACCEPTANCE_RESPONSE_FILE}" \
      --write-out '%{http_code}' \
      --request POST \
      --header "Authorization: Bearer ${CLASSROOM_ACCEPTANCE_SECRET}" \
      "${API_BASE_URL}/api/internal/classroom-acceptance"
  )"

  cat "${ACCEPTANCE_RESPONSE_FILE}"
  printf '\n'

  if [[ "${status}" != "200" ]]; then
    echo "[Classroom Acceptance] Staging endpoint returned HTTP ${status}" >&2
    exit 1
  fi

  jq -e '
    .ok == true and
    .evidence.target == "staging" and
    .evidence.checks.concurrentAuthenticatedSessions == 3 and
    .evidence.checks.concurrentTeacherAndLearnerJoinFlow == true and
    .evidence.checks.concurrentSubmissions == 2 and
    .evidence.checks.relationshipAuthorization == true and
    .evidence.checks.crossStudentMutationDenied == true and
    .evidence.checks.teacherAggregateCompletionPercent == 100 and
    .evidence.checks.archiveReadOnlyAndRestore == true and
    .evidence.checks.teacherConfirmedDeletion == true
  ' "${ACCEPTANCE_RESPONSE_FILE}" >/dev/null

  echo "[Classroom Acceptance] Concurrent teacher and two-student staging flow passed"
}

case "${1:-}" in
  configure)
    configure
    ;;
  run)
    run_acceptance
    ;;
  *)
    echo "Usage: $0 configure|run" >&2
    exit 2
    ;;
esac
