# MathGenius AI - Design Document

## Brand Identity
- **App Name:** MathGenius AI
- **Tagline:** Solve Any Math Problem Instantly
- **Color Palette:**
  - Primary: Deep Purple `#6C3CE1` (trust, intelligence)
  - Secondary: Electric Blue `#3B82F6` (technology)
  - Accent: Vibrant Orange `#F97316` (energy, action)
  - Background Light: `#FAFAFA`
  - Background Dark: `#0F0F1A`
  - Surface Light: `#FFFFFF`
  - Surface Dark: `#1A1A2E`
  - Success: `#10B981`
  - Error: `#EF4444`

## Screen List

1. **Home / Solve Screen** - Main math input & solve interface
2. **Camera Scan Screen** - Take photo of math problem
3. **Solution Screen** - Step-by-step solution display
4. **History Screen** - Past solved problems
5. **Practice Screen** - Generate practice problems by topic
6. **AI Chat Screen** - Chat with AI tutor
7. **Settings Screen** - Theme, preferences

## Primary Content & Functionality

### Home / Solve Screen
- Large text input area with math keyboard
- Quick subject chips (Algebra, Calculus, Geometry, etc.)
- Camera scan button (prominent FAB)
- Recent problems quick-access
- "Solve" button with loading animation
- Example problems for inspiration

### Camera Scan Screen
- Full-screen camera view
- Crop/frame overlay for problem selection
- Gallery picker option
- Capture button
- Preview & confirm step

### Solution Screen
- Problem display at top
- Step-by-step solution cards (expandable)
- Final answer highlighted
- "Explain More" button
- "Practice Similar" button
- Share solution button
- Copy answer button

### History Screen
- Chronological list of solved problems
- Subject filter chips
- Search bar
- Swipe to delete
- Tap to re-view solution

### Practice Screen
- Subject grid (Algebra, Calculus, Geometry, Statistics, etc.)
- Difficulty selector (Easy, Medium, Hard)
- Generate problem button
- Practice problem with hint system
- Score tracking

### AI Chat Screen
- Conversational interface
- Math-aware rendering
- Quick suggestion chips
- Image attachment for photos

### Settings Screen
- Dark/Light mode toggle
- Math notation preferences
- Clear history
- About section

## Key User Flows

1. **Quick Solve:** Home → Type problem → Tap Solve → View step-by-step solution
2. **Camera Solve:** Home → Tap Camera → Take photo → Confirm → View solution
3. **Practice:** Practice tab → Select subject → Choose difficulty → Solve problem → Check answer
4. **History Review:** History tab → Tap past problem → View solution again
5. **AI Tutor:** Chat tab → Ask question → Get explanation → Follow-up questions

## Layout Principles
- Bottom tab navigation (5 tabs)
- Cards with subtle shadows
- Smooth transitions between screens
- Haptic feedback on key actions
- Loading skeletons for AI responses
- Gradient headers
