# One-Tap Camera Redesign — Strategic Implementation Plan

## Core Changes Required

### 1. Remove Countdown, Implement Continuous Detection
**Current:** User waits for 0.5-1.5s countdown before capture
**New:** Continuous frame analysis, auto-capture when stable

**Implementation:**
- Add frame analysis hook that runs on every camera frame
- Detect focus quality, brightness, contrast, motion
- Trigger capture automatically when all metrics pass threshold
- Show visual feedback (focus ring, stability indicator)

### 2. Auto-Capture on Focus
**Current:** Manual shutter button required
**New:** Automatic capture when image is stable

**Metrics:**
- Focus score (0-100): based on edge detection, texture variance
- Brightness score (0-100): ensure not too dark or blown out
- Contrast score (0-100): ensure not washed out
- Motion score (0-100): ensure not blurry from movement
- Threshold: capture when all scores > 70 for 500ms

### 3. Immediate Auto-Solve
**Current:** User sees preview, must tap "Solve" button
**New:** Auto-submit to solver immediately after capture

**Implementation:**
- Capture image
- Immediately start encoding to base64
- Immediately submit to solveFromImage mutation
- Show solving overlay while processing

### 4. Streaming Response Display
**Current:** Wait for full response, then display
**New:** Show steps as they arrive

**Implementation:**
- Use streaming LLM response (if available)
- Parse and display first step immediately
- Append subsequent steps as they arrive
- Show "Generating step 2..." while waiting

### 5. Image Quality Validation
**Current:** Send any image, hope for best
**New:** Validate before sending, enhance if needed

**Implementation:**
- Analyze image for quality issues
- If quality low, offer to retake
- If acceptable, apply auto-enhancement (contrast, denoise)
- Send enhanced image to LLM

### 6. Intelligent Retry Logic
**Current:** If solve fails, show error
**New:** Automatically retry with different approach

**Implementation:**
- Detect confidence score from LLM response
- If confidence < 70%, automatically retry with:
  - Enhanced image preprocessing
  - Alternative OCR method
  - Simplified prompt
- Show "Retrying with enhanced image..." to user

### 7. Parallel Model Racing
**Current:** Single model (Gemini Flash)
**New:** Race 2-3 models, take fastest

**Implementation:**
- Send to Gemini Flash + GPT-4o-mini in parallel
- Return whichever completes first
- Fallback to Claude Haiku if both slow
- Cache result for identical images

### 8. Response Caching
**Current:** Same question asked twice = two API calls
**New:** Cache responses for identical images

**Implementation:**
- Hash image + subject + grade
- Check cache before sending
- Return cached response if hit
- Reduces cost and latency

---

## Phase-by-Phase Implementation

### Phase 1: One-Tap UX (Critical)
**Goal:** Remove countdown, implement auto-capture, auto-solve

**Changes:**
1. Remove countdown timer from camera view
2. Add frame analysis hook (focus, brightness, motion detection)
3. Auto-capture when metrics pass threshold
4. Auto-submit to solver immediately
5. Show solving overlay with progress

**Files to modify:**
- `app/(tabs)/scan.tsx` — Main camera screen
- `lib/camera-frame-analyzer.ts` — NEW: Frame quality detection
- `lib/image-quality.ts` — NEW: Image quality scoring

**Expected improvement:** <2 seconds from tap to first answer

### Phase 2: Image Processing (High Impact)
**Goal:** Enhance images before sending, validate quality

**Changes:**
1. Analyze image quality before sending
2. Apply auto-enhancement (contrast, denoise) if needed
3. Validate extracted question confidence
4. Retry with enhanced image if confidence low

**Files to modify:**
- `app/(tabs)/scan.tsx` — Add quality validation
- `lib/image-enhancement.ts` — NEW: Auto-enhancement
- `server/routers.ts` — Add confidence scoring

**Expected improvement:** 95%+ success rate on clear questions

### Phase 3: AI Pipeline (Speed)
**Goal:** Parallel models, streaming, caching

**Changes:**
1. Implement parallel model race (Gemini + GPT-4o-mini)
2. Add response streaming
3. Implement response caching
4. Add confidence scoring

**Files to modify:**
- `server/routers.ts` — Parallel race, caching
- `server/_core/llm.ts` — Streaming support
- `app/(tabs)/scan.tsx` — Display streaming response

**Expected improvement:** <1 second response time

### Phase 4: Error Handling (Reliability)
**Goal:** Smart retries, user feedback, recovery

**Changes:**
1. Detect truncation, retry automatically
2. Show processing stages to user
3. Suggest fixes if solve fails
4. Implement offline queue

**Files to modify:**
- `app/(tabs)/scan.tsx` — Error UI, retry UI
- `server/routers.ts` — Truncation detection
- `lib/offline-queue.ts` — NEW: Offline queue

**Expected improvement:** 99%+ reliability

---

## Implementation Order (By Impact)

### Must Do First (Unblocks One-Tap)
1. Remove countdown
2. Add frame analysis
3. Auto-capture when ready
4. Auto-submit to solver

### Do Second (Improves Speed)
1. Image quality validation
2. Parallel model race
3. Streaming responses

### Do Third (Improves Reliability)
1. Confidence scoring
2. Auto-retry logic
3. Error recovery

### Do Last (Polish)
1. Response caching
2. Offline queue
3. User feedback UI

---

## Technical Approach

### Frame Analysis Algorithm
```
For each camera frame:
  1. Convert to grayscale
  2. Compute edge density (focus score)
  3. Compute histogram (brightness score)
  4. Compute texture variance (contrast score)
  5. Compare to previous frame (motion score)
  6. If all scores > 70 for 500ms:
     - Trigger capture
     - Show success feedback
```

### Image Quality Scoring
```
Quality = (focus_score * 0.3) + (brightness_score * 0.3) + (contrast_score * 0.2) + (motion_score * 0.2)
If Quality > 75: Send as-is
If Quality 50-75: Apply enhancement, then send
If Quality < 50: Ask user to retake
```

### Parallel Model Race
```
Promise.race([
  invoke(gemini-3-flash-preview, params),
  invoke(gpt-4o-mini, params),
  invoke(claude-haiku, params) // Fallback after 2s
])
```

### Confidence Scoring
```
If response.confidence < 70%:
  - Apply image enhancement
  - Retry with simplified prompt
  - Show "Retrying..." message
Else:
  - Display response
```

---

## Success Criteria

- ✅ **One-tap:** Camera tap → auto-capture → auto-solve → answer (no manual steps)
- ✅ **Speed:** <2 seconds from tap to first answer
- ✅ **Reliability:** 95%+ success on clear questions
- ✅ **Quality:** Auto-enhancement improves recognition
- ✅ **Streaming:** See results immediately, not after full response
- ✅ **Recovery:** Auto-retry on uncertain responses
- ✅ **Offline:** Queue failed solves, retry when online

---

## Risk Mitigation

**Risk:** Frame analysis adds latency
**Mitigation:** Run on separate thread, non-blocking

**Risk:** Auto-capture captures wrong moment
**Mitigation:** Show preview before submitting, allow retake

**Risk:** Parallel models increase cost
**Mitigation:** Use cheaper models (Haiku, Flash), cache responses

**Risk:** Streaming breaks response parsing
**Mitigation:** Implement robust JSON streaming parser

**Risk:** Auto-retry creates infinite loops
**Mitigation:** Limit retries to 3, then show error

---

## Rollback Plan

If any phase causes issues:
1. Revert to checkpoint e36a6315 (last known good)
2. Identify specific issue
3. Fix in isolation
4. Re-test before merging

