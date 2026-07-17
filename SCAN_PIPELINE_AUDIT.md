# TutorSnap Scan Pipeline — Forensic Audit & Optimization Plan

## Current Pipeline Flow

```
User taps camera icon
    ↓
Camera screen loads (CameraView initializes)
    ↓
User waits for auto-capture countdown (1.5s or 0.5s)
    ↓
Shutter fires, image captured at quality 0.5
    ↓
Image converted to base64
    ↓
solveImage() called with base64 + mimeType
    ↓
tRPC mutation sends to server
    ↓
solveFromImage() receives image
    ↓
Image passed to LLM as vision input (gemini-3-flash-preview)
    ↓
LLM generates JSON response (800 tokens max)
    ↓
JSON parsed on client
    ↓
Solution displayed
```

## Bottleneck Analysis

### Stage 1: Camera Initialization
**Current:** Camera view loads, then waits for user to be ready
**Bottleneck:** 
- CameraView component initialization takes ~500ms
- Camera permissions check adds latency
- No prewarming of camera hardware

**Optimization:**
- Preload camera on app launch (background)
- Cache camera permissions state
- Initialize CameraView in a hidden layer on home screen

### Stage 2: Auto-Capture Timing
**Current:** 0.5-1.5 second countdown before capture
**Bottleneck:**
- User must wait for countdown to finish
- Countdown is visual-only, no intelligent detection
- Fixed timing doesn't account for image stability

**Optimization:**
- Remove countdown entirely
- Implement continuous frame analysis
- Detect when image is stable + in-focus + well-lit
- Auto-capture when all conditions met (typically <500ms)

### Stage 3: Image Capture & Encoding
**Current:** Capture at quality 0.5, convert to base64
**Bottleneck:**
- Base64 encoding adds ~200ms for large images
- No image quality validation before sending
- No image enhancement before sending

**Optimization:**
- Capture at quality 0.7 (better balance of quality vs size)
- Validate image before encoding (check focus, brightness, contrast)
- Apply lightweight preprocessing (auto-contrast, denoise)
- Encode to base64 in worker thread (non-blocking)

### Stage 4: Network Transmission
**Current:** Send full base64 string to server
**Bottleneck:**
- Large payload (500KB-1MB uncompressed)
- Network latency varies (2G/3G/4G/WiFi)
- No compression

**Optimization:**
- Compress image to JPEG 60% quality before base64
- Implement progressive upload (show progress)
- Use HTTP/2 multiplexing if available
- Add retry logic for failed uploads

### Stage 5: Server-Side Vision Processing
**Current:** Send to Gemini Flash with 800-token budget
**Bottleneck:**
- Vision model initialization takes ~300-500ms
- Single model (no fallback if slow)
- No caching of similar images
- Token budget may still be too tight for complex questions

**Optimization:**
- Parallel race: Gemini Flash + GPT-4o-mini (take fastest)
- Cache recent images + responses (same question asked twice)
- Implement streaming response (start rendering before complete)
- Use Claude Haiku for simple questions (faster, cheaper)
- Add confidence scoring to detect uncertain responses

### Stage 6: OCR & Question Extraction
**Current:** LLM extracts question from image directly
**Bottleneck:**
- LLM may misread handwriting or poor-quality text
- No fallback if extraction fails
- No confidence scoring on extracted text

**Optimization:**
- Implement local OCR first (Tesseract.js or similar) for text extraction
- Use LLM only for interpretation/solving, not extraction
- If LLM extraction uncertain, retry with enhanced image preprocessing
- Score confidence of extracted question

### Stage 7: Question Understanding
**Current:** LLM receives raw extracted question
**Bottleneck:**
- LLM may misunderstand ambiguous questions
- No validation that question was understood
- No retry if understanding is uncertain

**Optimization:**
- Preprocess question: clean formatting, standardize notation
- Add subject/grade hints to improve understanding
- Implement confidence scoring on understanding
- If confidence low, retry with clarification prompt

### Stage 8: AI Solution Generation
**Current:** Single attempt with Gemini Flash
**Bottleneck:**
- If first model is slow, user waits
- If response truncates, no automatic retry
- No streaming (user waits for full response)

**Optimization:**
- Parallel race between 2-3 models (take fastest)
- Stream response as it arrives (show first steps immediately)
- Detect truncation automatically and retry
- Cache responses for identical questions

### Stage 9: Response Parsing & Display
**Current:** Parse JSON, display solution
**Bottleneck:**
- JSON parse errors crash silently
- No validation of response structure
- No error recovery

**Optimization:**
- Robust JSON parsing with fallback to text
- Validate response structure before display
- Implement graceful degradation (show what we have)
- Add error recovery UI

### Stage 10: User Feedback & History
**Current:** Solution displayed, history saved
**Bottleneck:**
- No indication of processing stages
- No feedback on confidence/accuracy
- History saved synchronously (could block UI)

**Optimization:**
- Show processing stages (Capturing... → Recognizing... → Solving... → Done)
- Display confidence badges on solution
- Save history asynchronously
- Add one-tap retry if user not satisfied

---

## Root Cause: Why Scanning Feels Slow

1. **Countdown delay** — User waits 0.5-1.5s unnecessarily
2. **Large payload** — 500KB-1MB base64 string takes time to upload
3. **Single model** — If Gemini is slow, no fallback
4. **No streaming** — User waits for entire response before seeing anything
5. **No preprocessing** — Image sent raw, LLM struggles with poor quality
6. **No caching** — Identical questions processed twice
7. **No confidence scoring** — Uncertain responses not retried automatically
8. **No local OCR** — LLM does both extraction and solving (inefficient)

---

## Root Cause: Why Scanning Fails

1. **Poor image quality** — Blurry, dark, or low-contrast images not enhanced
2. **Handwriting misread** — LLM struggles with handwriting, no OCR fallback
3. **Question misunderstood** — Ambiguous questions not clarified
4. **Response truncation** — Token budget exceeded, JSON incomplete, parse fails
5. **Network timeout** — No timeout configured, request hangs
6. **Model failure** — Single model fails, no fallback
7. **Silent failures** — Errors not surfaced to user
8. **No retry logic** — Failed attempts not retried with different approach

---

## Optimization Strategy: Priority Order

### TIER 1: Unblock One-Tap (Must Have)
1. **Remove countdown** — Auto-capture when image stable
2. **Add continuous detection** — Analyze frames in real-time
3. **Add image quality validation** — Reject blurry/dark images
4. **Implement auto-retry** — Retry if confidence low

### TIER 2: Speed Up (Should Have)
1. **Image compression** — Reduce payload size
2. **Parallel model race** — Take fastest response
3. **Streaming responses** — Show results as they arrive
4. **Local OCR fallback** — Extract text locally first

### TIER 3: Improve Reliability (Nice to Have)
1. **Image preprocessing** — Enhance before sending
2. **Confidence scoring** — Detect uncertain responses
3. **Response caching** — Avoid reprocessing
4. **Smart error recovery** — Suggest fixes to user

---

## Implementation Roadmap

### Phase 1: Forensic Audit (DONE)
- [x] Map current pipeline
- [x] Identify bottlenecks
- [x] Prioritize optimizations

### Phase 2: One-Tap Camera UX
- [ ] Remove countdown
- [ ] Implement continuous frame analysis
- [ ] Add image quality detection
- [ ] Auto-capture when ready

### Phase 3: Image Processing
- [ ] Add image quality validation
- [ ] Implement lightweight preprocessing
- [ ] Add compression
- [ ] Validate before sending

### Phase 4: OCR & Detection
- [ ] Integrate local OCR (Tesseract.js)
- [ ] Add confidence scoring
- [ ] Implement retry logic
- [ ] Add fallback strategies

### Phase 5: AI Pipeline
- [ ] Implement parallel model race
- [ ] Add streaming responses
- [ ] Implement response caching
- [ ] Add confidence scoring

### Phase 6: Error Handling
- [ ] Smart retry logic
- [ ] User-friendly error messages
- [ ] Recovery suggestions
- [ ] Fallback strategies

### Phase 7: Testing & Validation
- [ ] End-to-end testing
- [ ] Performance profiling
- [ ] Reliability testing
- [ ] User feedback

---

## Success Metrics

- ✅ One-tap workflow (no countdown, no manual capture)
- ✅ <2 second end-to-end time (capture to first answer)
- ✅ 95%+ success rate on clear questions
- ✅ Automatic retry on uncertain responses
- ✅ Streaming responses (see results immediately)
- ✅ Smart error recovery (suggest fixes)
- ✅ Offline queue (no lost work)

