# MathGenius AI — Rendering & UX/UI System Rebuild Spec

## Forensic Audit Findings

### Critical Defects Identified

**1. Dark Mode Code Blocks (FIXED in abed4196, lost in rollback)**
- `CodeCard` in `ai-response-renderer.tsx` hardcodes `backgroundColor: '#1E1E2E'` and `color: '#CDD6F4'` — fine for dark, but in light mode these are invisible/wrong.
- `fence` style in `buildMarkdownStyles` also hardcodes dark colors.
- Fix: Both must use `useColorScheme()` to switch palettes.

**2. Inline Math Rendering Gap**
- `renderInlineMath()` exists but is NOT wired into the Markdown render rules — the `text` node rule is missing from `buildRenderRules()`.
- Result: `$x^2$` inside a paragraph renders as literal `$x^2$` text.
- Fix: Add a `text` rule to `buildRenderRules` that calls `renderInlineMath`.

**3. System Prompt Forces ALL Heading Levels (H1–H6) in Every Response**
- The `CHAT_SYSTEM_PROMPT` mandates H1–H6, blockquotes, HRs, tables, and all list types in EVERY response.
- This creates extremely long, wall-of-text responses that are hard to read on mobile.
- Fix: Redesign the system prompt to produce structured JSON blocks OR keep Markdown but make the renderer handle all heading levels gracefully.

**4. No Top-Bar Mode Toggle (lost in rollback)**
- The rollback to `7bdeb64f` removed the Classic/Structured segmented toggle from the top bar.
- The `TutorSettings` type has no `responseMode` field.
- Fix: Re-add `responseMode: 'classic' | 'structured'` to settings and top-bar toggle.

**5. No Structured Block Parser/Renderer (lost in rollback)**
- `lib/structured-blocks.ts` and `components/structured-block-renderer.tsx` do not exist.
- Fix: Rebuild both from scratch with improved architecture.

**6. Typography Issues**
- Line height `fontSize * 1.7` is good but paragraph `marginBottom: fontSize * 0.85` can cause excessive spacing between short paragraphs.
- H1 `borderBottomWidth: 1` on headings looks heavy on mobile.
- No letter-spacing on body text (slightly tight at small sizes).

**7. Math Block Centering**
- `blockMathWrapper` uses `alignItems: 'center'` but `width: '100%'` — correct.
- However, `MathRenderer` in display mode may overflow on narrow screens.

**8. Scroll / Layout**
- `FlatList` bottom padding must account for the pinned composer height + safe area.
- Scroll FABs overlap is handled but needs verification after rebuild.

---

## UX/UI Design Recommendations (World-Class Standard)

### Philosophy
The AI Tutor should feel like a **premium educational app** — think Khan Academy meets Notion meets a beautifully typeset textbook. Every response should be effortless to read, scannable, and visually hierarchical.

### Dual-Mode System

#### Mode A: Classic (Flowing Prose)
- Clean, continuous reading experience like a well-typeset article
- Headings create visual hierarchy without heavy chrome
- Math renders inline and in display blocks
- Best for: conversational questions, quick answers, narrative explanations
- Top-bar label: `≡ Classic`

#### Mode B: Structured (Educational Blocks)
- Response is parsed into distinct semantic cards
- Each card has its own accent color, icon, label, and copy button
- Cards can be collapsed/expanded
- Best for: math problems, science concepts, step-by-step solutions
- Top-bar label: `⊞ Cards`

### Block Type System (8 types)

| Block | Icon | Accent | Purpose |
|-------|------|--------|---------|
| `direct-answer` | ✦ | Indigo #6366F1 | The core answer, always shown first, never collapsible |
| `definition` | 📖 | Blue #3B82F6 | Key term definition |
| `concept` | ◉ | Cyan #0891B2 | Core concept explanation |
| `formula` | ∑ | Purple #8B5CF6 | Mathematical formula or rule |
| `steps` | ① | Teal #0D9488 | Numbered step-by-step solution |
| `example` | ◆ | Amber #D97706 | Worked example |
| `insight` | ★ | Green #059669 | Key insight or tip |
| `warning` | ⚠ | Red #DC2626 | Common mistake or warning |

### Block Card Design
Each card:
- Rounded corners (14px radius)
- 4px left accent border in block color
- Header row: icon + label (uppercase, 10px, 700 weight) + title + copy button + collapse chevron
- Body: content with proper typography
- Action buttons (optional): `↓ Simpler` | `↑ More Detail` in accent color pill buttons
- Staggered entrance animation (60ms delay per card)
- Collapse animation (200ms)

### Top Bar Design
```
[←]  [AI Tutor]  [≡ Classic | ⊞ Cards]  [⋯]
```
- Segmented control: pill shape, 2 segments, 28px height
- Active segment: filled with primary color, white text
- Inactive: transparent, muted text
- Persisted to AsyncStorage

### Typography Scale (fontSize base = 15)
- Body: 15px, lineHeight 25.5 (1.7×), color: foreground
- H1: 21px, weight 800, letterSpacing -0.5
- H2: 18px, weight 700, letterSpacing -0.3, left accent bar 3px
- H3: 16.5px, weight 600, letterSpacing -0.2, left accent bar 2.5px
- H4: 15.3px, weight 600
- H5/H6: 14.25px/13.5px, weight 500, color: muted
- Code: 12.6px (0.84×), monospace
- Math inline: 14.55px (0.97×), italic serif

### Color System (light/dark)
All colors must use `useColorScheme()` — NO hardcoded hex for theme-sensitive values.
- Code block bg: dark=#1E1E2E, light=#F3F4F6
- Code text: dark=#CDD6F4, light=#1F2937
- Block card bg: colors.surface
- Block card border: colors.border
- Block accent: use accentDark in dark mode, accent in light mode

### Structured Block Parser Logic
Parse AI markdown into blocks using heading/keyword heuristics:
1. H1 → `direct-answer` (first H1 only) or `concept`
2. H5 (##### Formula) → `formula`
3. H6 (###### Pro Tip / Common Mistake) → `insight` or `warning`
4. Ordered list sections → `steps`
5. Blockquote → `insight` or `warning`
6. Sections with "Example" in heading → `example`
7. Sections with "Definition" in heading → `definition`
8. Everything else → `concept`

### Scrolling & Layout
- FlatList `contentContainerStyle.paddingBottom` = composerHeight + safeArea.bottom + 20
- Scroll FABs: ↑ at bottom:200 left, ↓ at bottom:152 right (clear of composer)
- No horizontal scroll on chat screen
- KeyboardAvoidingView behavior: 'padding' on iOS, 'height' on Android

---

## Implementation Plan

### Files to Create/Modify
1. `lib/structured-blocks.ts` — NEW: parser
2. `components/structured-block-renderer.tsx` — NEW: block card renderer
3. `components/ai-response-renderer.tsx` — FIX: dark mode, inline math rule, typography
4. `lib/ai-response-pipeline.ts` — MINOR: no changes needed
5. `components/tutor-settings-modal.tsx` — ADD: responseMode field
6. `app/(tabs)/chat.tsx` — ADD: top-bar toggle, wire both renderers
