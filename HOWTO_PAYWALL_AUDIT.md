# How To Guide + Paywall Testimonials Audit
Date: 2026-07-26

## Phase 2: settings.tsx — How To Guide expansion

### Current state
- HOW_TO_STEPS: flat array of 6 items (lines 80-88)
- Modal renders them in a ScrollView with emoji + title + desc rows
- No section headers

### Plan
Replace HOW_TO_STEPS flat array with HOW_TO_SECTIONS array:
```ts
const HOW_TO_SECTIONS = [
  { title: "Scanning Problems", steps: [...] },
  { title: "Solving & Typing", steps: [...] },
  { title: "AI Tutor Chat", steps: [...] },
  { title: "Practice & Quizzes", steps: [...] },
  { title: "Classroom", steps: [...] },
  { title: "Referrals & Rewards", steps: [...] },
];
```
Each section has 3-5 detailed steps.

Update the modal rendering to iterate sections, show a section header, then the steps.

### Files touched
- /home/ubuntu/mathgenius-ai/app/settings.tsx (HOW_TO_STEPS array + modal rendering)

---

## Phase 3: paywall.tsx — Social proof testimonials

### Current state
- FEATURES array at line 63 (13 items)
- Feature list rendered at line 313 inside a ReAnimated.View with entering={FadeInDown.delay(420)}
- No testimonials exist

### Plan
Add TESTIMONIALS array above FEATURES:
```ts
const TESTIMONIALS = [
  { name: "Amara K.", grade: "Grade 11", text: "...", stars: 5 },
  { name: "Jaylen M.", grade: "University Year 1", text: "...", stars: 5 },
  { name: "Sofia R.", grade: "Grade 9", text: "...", stars: 5 },
];
```
Insert a testimonials card ReAnimated.View with delay(380) BEFORE the features card (delay 420).
Each testimonial: star row + quote text + name + grade.

### Files touched
- /home/ubuntu/mathgenius-ai/app/paywall.tsx (TESTIMONIALS array + JSX insertion)

---

## Checkpoint after each phase
- Phase 2 checkpoint before touching paywall.tsx
- Phase 3 checkpoint after paywall.tsx
