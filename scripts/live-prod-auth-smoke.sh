#!/usr/bin/env bash
set -euo pipefail

BASE_URL="https://api.tutorsnapai.tech"
TOKEN_FILE="/tmp/tutorsnap-session-token"
REPORT="/home/ubuntu/tutorsnap-release-2.3.0-build67/production-smoke-report.json"
mkdir -p "$(dirname "$REPORT")"
TOKEN="$(cat "$TOKEN_FILE")"
: "${TOKEN:?missing session token}"

RESULTS='[]'
CLASSROOM_ID=''
ASSIGNMENT_ID=''
COMMENT_ID=''

record() {
  local name="$1" outcome="$2" detail="$3"
  RESULTS="$(jq -c --arg n "$name" --arg o "$outcome" --arg d "$detail" '. + [{name:$n,outcome:$o,detail:$d}]' <<<"$RESULTS")"
  printf '%-34s %-22s %s\n' "$name" "$outcome" "$detail" >&2
}

call_query() {
  local procedure="$1" input_json="${2:-}"
  if [ -n "$input_json" ]; then
    curl -fsS --max-time 90 -G \
      -H "Authorization: Bearer $TOKEN" \
      --data-urlencode "input=$input_json" \
      "$BASE_URL/api/trpc/$procedure"
  else
    curl -fsS --max-time 90 -G \
      -H "Authorization: Bearer $TOKEN" \
      "$BASE_URL/api/trpc/$procedure"
  fi
}

call_mutation() {
  local procedure="$1" input_json="$2"
  curl -fsS --max-time 180 -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    --data "$input_json" \
    "$BASE_URL/api/trpc/$procedure"
}

run_query() {
  local name="$1" procedure="$2" input_json="${3:-}"
  local response
  if ! response="$(call_query "$procedure" "$input_json" 2>/tmp/smoke.err)"; then
    record "$name" "HTTP_OR_TRANSPORT_ERROR" "$(tr -d '\n' </tmp/smoke.err | cut -c1-220)"
    return 1
  fi
  if jq -e '.error' >/dev/null <<<"$response"; then
    local message code
    message="$(jq -r '.error.json.message // .error.message // "unknown error"' <<<"$response" | tr '\n' ' ' | cut -c1-220)"
    code="$(jq -r '.error.json.data.code // .error.data.code // "UNKNOWN"' <<<"$response")"
    record "$name" "$code" "$message"
    return 2
  fi
  record "$name" "PASS" "response received"
  printf '%s' "$response"
}

run_mutation() {
  local name="$1" procedure="$2" input_json="$3"
  local response
  if ! response="$(call_mutation "$procedure" "$input_json" 2>/tmp/smoke.err)"; then
    record "$name" "HTTP_OR_TRANSPORT_ERROR" "$(tr -d '\n' </tmp/smoke.err | cut -c1-220)"
    return 1
  fi
  if jq -e '.error' >/dev/null <<<"$response"; then
    local message code
    message="$(jq -r '.error.json.message // .error.message // "unknown error"' <<<"$response" | tr '\n' ' ' | cut -c1-220)"
    code="$(jq -r '.error.json.data.code // .error.data.code // "UNKNOWN"' <<<"$response")"
    record "$name" "$code" "$message"
    return 2
  fi
  record "$name" "PASS" "response received"
  printf '%s' "$response"
}

printf '%s\n' 'TutorSnap production authenticated smoke test'
printf '%s\n' 'Account: email-authenticated test account (session token is not printed)'
printf '%s\n' '--- Core protected contracts'
run_query 'subscription status' 'subscription.getStatus' >/tmp/subscription.json || true
run_query 'classroom feature flag' 'classroom.status' >/tmp/classroom-status.json || true
run_query 'classroom list' 'classroom.getMyClasses' '{"json":{"includeArchived":false}}' >/tmp/classes.json || true
run_query 'appearance settings' 'user.getAppearanceSettings' >/tmp/appearance.json || true
run_query 'AIRE calibration' 'aire.getSubjectCalibrations' >/tmp/calibration.json || true

printf '%s\n' '--- Solve, Practice, Scan protected contracts'
solve_input='{"json":{"problem":"What is 2 + 2?","subject":"mathematics","gradeLevel":"middle school"}}'
practice_input='{"json":{"subject":"mathematics","difficulty":"easy","gradeLevel":"middle school"}}'
scan_input='{"json":{"imageBase64":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=","mimeType":"image/png","subject":"mathematics","gradeLevel":"middle school"}}'
run_mutation 'Solve procedure' 'academic.solve' "$solve_input" >/tmp/solve.json || true
run_mutation 'Practice procedure' 'academic.generatePractice' "$practice_input" >/tmp/practice.json || true
run_mutation 'Scan procedure' 'academic.solveFromImage' "$scan_input" >/tmp/scan.json || true

printf '%s\n' '--- AI Tutor stream'
chat_response="$(curl -fsS --max-time 180 -X POST "$BASE_URL/api/chat/stream" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"What is 2 + 2? Answer briefly."}],"subject":"mathematics","gradeLevel":"middle school","tutorProfile":"standard"}' 2>/tmp/smoke.err || true)"
if [ -n "$chat_response" ] && grep -qE '4|four|SUBMISSION_READY' <<<"$chat_response"; then
  record 'AI Tutor stream' 'PASS' 'stream returned answer content'
else
  record 'AI Tutor stream' 'FAILED' "$(tr -d '\n' </tmp/smoke.err | cut -c1-220)"
fi

printf '%s\n' '--- Classroom teacher workflow (create, read, assignment, discussion, cleanup)'
create_input="$(jq -cn --arg name "TutorSnap Smoke Test $(date -u +%Y%m%dT%H%M%SZ)" '{json:{name:$name,subject:"mathematics",gradeLevel:"middle school"}}')"
if create_response="$(run_mutation 'Classroom create' 'classroom.create' "$create_input")"; then
  CLASSROOM_ID="$(jq -r '.result.data.json.id // empty' <<<"$create_response")"
fi
if [ -n "$CLASSROOM_ID" ]; then
  run_query 'Classroom get' 'classroom.get' "$(jq -cn --arg id "$CLASSROOM_ID" '{json:{classroomId:$id}}')" >/tmp/classroom.json || true
  run_query 'Classroom assignments initially' 'classroom.assignment.list' "$(jq -cn --arg id "$CLASSROOM_ID" '{json:{classroomId:$id,limit:25}}')" >/tmp/assignments-before.json || true
  assignment_input="$(jq -cn --arg id "$CLASSROOM_ID" '{json:{classroomId:$id,title:"Smoke-test assignment",instructions:"Solve 2 + 2 and explain your reasoning.",subject:"mathematics",dueAt:null}}')"
  if assignment_response="$(run_mutation 'Assignment create' 'classroom.assignment.create' "$assignment_input")"; then
    ASSIGNMENT_ID="$(jq -r '.result.data.json.id // empty' <<<"$assignment_response")"
  fi
  if [ -n "$ASSIGNMENT_ID" ]; then
    run_mutation 'Assignment publish' 'classroom.assignment.publish' "$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id}}')" >/tmp/assignment-published.json || true
    run_query 'Assignment get' 'classroom.assignment.get' "$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id}}')" >/tmp/assignment.json || true
    run_query 'Assignment list published' 'classroom.assignment.list' "$(jq -cn --arg id "$CLASSROOM_ID" '{json:{classroomId:$id,status:"published",limit:25}}')" >/tmp/assignments-after.json || true
    run_query 'Discussion list before' 'classroom.comment.list' "$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id,limit:25}}')" >/tmp/comments-before.json || true
    comment_input="$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id,body:"Smoke-test discussion comment."}}')"
    if comment_response="$(run_mutation 'Discussion comment add' 'classroom.comment.add' "$comment_input")"; then
      COMMENT_ID="$(jq -r '.result.data.json.id // empty' <<<"$comment_response")"
    fi
    if [ -n "$COMMENT_ID" ]; then
      run_query 'Discussion list after' 'classroom.comment.list' "$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id,limit:25}}')" >/tmp/comments-after.json || true
      run_mutation 'Discussion comment delete' 'classroom.comment.delete' "$(jq -cn --arg id "$COMMENT_ID" '{json:{commentId:$id}}')" >/tmp/comment-deleted.json || true
    fi
    run_mutation 'Assignment cleanup' 'classroom.assignment.delete' "$(jq -cn --arg id "$ASSIGNMENT_ID" '{json:{assignmentId:$id,confirmationTitle:"Smoke-test assignment"}}')" >/tmp/assignment-deleted.json || true
  fi
  run_mutation 'Classroom cleanup' 'classroom.delete' "$(jq -cn --arg id "$CLASSROOM_ID" --arg name "$(jq -r '.result.data.json.name' /tmp/classroom.json 2>/dev/null || echo '')" '{json:{classroomId:$id,confirmationName:$name}}')" >/tmp/classroom-deleted.json || true
else
  record 'Classroom teacher workflow' 'SKIPPED' 'classroom.create did not return a classroom id'
fi

jq -n --arg generatedAt "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg account "email-authenticated test account" --argjson results "$RESULTS" '{generatedAt:$generatedAt,account:$account,results:$results}' >"$REPORT"
printf '%s\n' '--- report'
cat "$REPORT"
