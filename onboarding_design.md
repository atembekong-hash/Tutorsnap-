# TutorSnap Onboarding Redesign — Design Spec

## Design Philosophy
World-class education app onboarding. Think Duolingo meets Linear meets Notion.
Every screen must feel like a premium product: bold, confident, purposeful.

## Layout System (iPhone SE safe: 375x667)
- Full screen: SafeAreaView edges all four sides
- Top chrome: progress bar (pill style) + back/skip — 56px zone
- Hero zone: 220px — large illustration/emoji in styled container
- Content zone: ~180px — headline + subtitle + interactive element
- Bottom chrome: dots + CTA button + maybe-later — 120px zone
- Total: ~576px — fits 667px with 91px breathing room

## Color Palette per Slide
1. name:          Deep indigo #4F46E5 → #7C3AED (violet)
2. photo:         Teal #0891B2 → #06B6D4 (cyan)
3. welcome:       Royal blue #2563EB → #3B82F6 (blue)
4. solve:         Emerald #059669 → #10B981 (green)
5. practice:      Amber #D97706 → #F59E0B (orange)
6. subjects:      Purple #7C3AED → #A855F7 (purple)
7. grade:         Rose #E11D48 → #F43F5E (rose)
8. tutor-preview: Indigo #4338CA → #6366F1 (indigo)
9. trial:         Gold #B45309 → #F59E0B (amber/gold)

## Hero Container Design
- Large rounded square: 120x120px, borderRadius 28
- Background: white at 18% opacity (glassmorphism on gradient)
- Border: white at 25% opacity, 1.5px
- Emoji: 56px font size
- Subtle shadow: white glow 0 0 40px rgba(255,255,255,0.15)
- For photo slide with avatar: 120x120 circle with edit badge

## Typography
- Headline: 28px, fontWeight 800, color white, letterSpacing -0.5, lineHeight 34
- Subtitle: 15px, fontWeight 400, color rgba(255,255,255,0.78), lineHeight 22, textAlign center
- Max 2 lines for subtitle — rewrite all subtitles to be punchy

## Progress Bar
- Pill shape: height 4px, borderRadius 2, full width minus 48px margins
- Background: rgba(255,255,255,0.25)
- Fill: white solid (on colored gradient it pops perfectly)
- Animated with Animated.timing, duration 300ms

## Dot Indicators
- Active dot: white pill, width 24px, height 8px
- Inactive dot: white at 30% opacity, 8x8 circle
- Gap: 6px between dots

## CTA Button
- Full width minus 32px margins
- Height: 56px (large, thumb-friendly)
- Background: white
- Text: gradient color (primary slide color), fontWeight 800, fontSize 16
- Border radius: 16px
- Shadow: 0 8px 24px rgba(0,0,0,0.2)
- Press state: scale 0.97, duration 80ms

## Back Button
- Top left, 40x40 tap target
- White chevron icon (MaterialIcons chevron-left), size 28
- No background (transparent on gradient)

## Skip Button
- Top right, text "Skip"
- White at 70% opacity, fontSize 15, fontWeight 600

## Slide-Specific Designs

### 1. Name Slide (Deep Indigo gradient)
- Hero: 👋 in glass container
- Headline: "What's your name?"
- Subtitle: "Your AI Tutor will greet you personally."
- Input: white background, 16px text, rounded 14, centered
- Hi greeting appears below input when name typed

### 2. Photo Slide (Teal gradient)
- Hero: avatar circle (120px) or 🖼️ emoji
- Headline: "Add a Profile Photo"
- Subtitle: "Optional. Recognisable in Classroom."
- Two buttons: white filled (Choose Library) + white outlined (Take Photo)
- Skip for now link below

### 3. Welcome Slide (Royal Blue gradient)
- Hero: 🎓 in glass container
- Headline: "Welcome to TutorSnap"
- Subtitle: "AI tutoring for every subject, tailored to you."
- Skip setup link (muted, below subtitle)
- Feature pills row: 3 small chips (Snap, Chat, Practice)

### 4. Solve Slide (Emerald gradient)
- Hero: ✨ in glass container
- Headline: "Snap, Type, or Ask"
- Subtitle: "Point your camera at any problem and get instant step-by-step help."
- Feature preview: 3 mini cards (Camera, Type, Voice)

### 5. Practice Slide (Amber gradient)
- Hero: 🔥 in glass container
- Headline: "Build Your Streak"
- Subtitle: "Daily practice builds mastery. Earn XP and climb the leaderboard."
- Streak display: mock 7-day streak row (colored circles)

### 6. Subjects Slide (Purple gradient)
- Hero: 📚 in glass container
- Headline: "Pick Your Subjects"
- Subtitle: "We'll show you the most relevant content."
- 2x2 grid of subject cards (white glass style on gradient)

### 7. Grade Slide (Rose gradient)
- Hero: 🎯 in glass container
- Headline: "What's Your Level?"
- Subtitle: "Explanations tuned to your grade."
- 4-column compact grid, white glass cards

### 8. Tutor Preview Slide (Indigo gradient)
- Hero: 🤖 in glass container
- Headline: "Meet Your AI Tutor"
- Subtitle: "Personalised to your subjects, grade, and style."
- 5 preview rows (glass cards on gradient)

### 9. Trial Slide (Gold gradient)
- Hero: 👑 in glass container
- Headline: "Start Free, Upgrade Anytime"
- Subtitle: "14-day free trial. No charge today."
- 2 plan cards (glass style)
- CTA: "Start Free Trial" (gold text on white)
- Maybe Later below

## Interactive Elements on Gradient
All cards, inputs, rows use glassmorphism:
- backgroundColor: rgba(255,255,255,0.12) 
- borderColor: rgba(255,255,255,0.25)
- borderWidth: 1
- borderRadius: 12-16
- Text: white or rgba(255,255,255,0.8)

## Animation Strategy
- SlideWrapper: fade + scale (existing, keep)
- Progress bar: Animated.timing (existing, keep)
- CTA press: withTiming scale 0.97 (80ms)
- Gradient background: interpolate between slide colors on scroll
- No spring animations (per tech constraints)
