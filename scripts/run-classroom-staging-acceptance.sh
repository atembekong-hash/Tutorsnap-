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

command -v jq >/dev/null 2>&1 || {
  echo "[Classroom Acceptance] jq is required" >&2
  exit 1
}

umask 077
work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT
services_file="${work_dir}/services.json"
variables_file="${work_dir}/variables.json"

pnpm dlx @railway/cli service list \
  --project "${RAILWAY_PROJECT_ID}" \
  --environment "${RAILWAY_ENVIRONMENT}" \
  --json >"${services_file}"

mapfile -t services < <(
  jq -r '
    def service_array:
      if type == "array" then .
      elif (.services? | type) == "array" then .services
      elif (.project?.services?.edges? | type) == "array" then [.project.services.edges[].node]
      else []
      end;
    service_array[]
    | [(.id // .serviceId // ""), (.name // .serviceName // "")]
    | @tsv
  ' "${services_file}"
)

if [[ "${#services[@]}" -eq 0 ]]; then
  echo "[Classroom Acceptance] Railway returned no staging services" >&2
  exit 1
fi

public_database_url=""
selected_database_service=""
selected_database_key=""

for service in "${services[@]}"; do
  IFS=$'\t' read -r service_id service_name <<<"${service}"
  selector="${service_id:-${service_name}}"
  if [[ -z "${selector}" || "${service_name,,}" == "${RAILWAY_SERVICE,,}" ]]; then
    continue
  fi

  if ! pnpm dlx @railway/cli variable list \
    --project "${RAILWAY_PROJECT_ID}" \
    --environment "${RAILWAY_ENVIRONMENT}" \
    --service "${selector}" \
    --json >"${variables_file}" 2>/dev/null; then
    continue
  fi

  for key in MYSQL_PUBLIC_URL DATABASE_PUBLIC_URL MYSQL_URL DATABASE_URL; do
    candidate="$(jq -r --arg key "${key}" '.[$key] // empty' "${variables_file}")"
    if [[ "${candidate}" == mysql://* && "${candidate}" != *".railway.internal"* ]]; then
      public_database_url="${candidate}"
      selected_database_service="${service_name:-${selector}}"
      selected_database_key="${key}"
      break 2
    fi
  done
done

if [[ -z "${public_database_url}" ]]; then
  echo "[Classroom Acceptance] No public MySQL URL was available in Railway staging" >&2
  exit 1
fi

# GitHub Actions interprets this directive and masks the full connection string.
# The URL is never printed by this script or written outside the temporary directory.
echo "::add-mask::${public_database_url}"
echo "[Classroom Acceptance] Using masked ${selected_database_key} from service ${selected_database_service}"

export CLASSROOM_ACCEPTANCE_TARGET="staging"
export CLASSROOM_ACCEPTANCE_API_BASE_URL="${API_BASE_URL}"
export CLASSROOM_ACCEPTANCE_DATABASE_URL="${public_database_url}"

pnpm dlx @railway/cli run \
  --project "${RAILWAY_PROJECT_ID}" \
  --environment "${RAILWAY_ENVIRONMENT}" \
  --service "${RAILWAY_SERVICE}" \
  --no-local \
  node dist/classroom-acceptance.js
