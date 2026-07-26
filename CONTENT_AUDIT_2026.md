# TutorSnap AI — Content Expansion Audit
Date: 2026-07-26

## Mitigation Principle
- One file per phase, checkpoint after each
- Re-read file fresh at start of each phase
- No relying on compacted memory

## Files to Expand (Priority Order)

### Phase 2: faq.tsx (549 lines currently)
- Target: 50+ Q&A entries across 8 categories
- Categories: Getting Started, Solving Problems, AI Tutor, Premium/Pro, Classroom, Data & Privacy, Troubleshooting, Accessibility
- Current: ~20 entries, shallow answers
- Target: Deep answers with numbered steps, tips, links to settings

### Phase 3: legal.tsx (667 lines currently)
- Cookie Policy (inline modal): expand to full 800-word policy
- Community Guidelines (inline modal): expand to full 1000-word policy
- Privacy Policy: currently links out — add inline modal with full GDPR/CCPA compliant text
- Terms of Service: currently links out — add inline modal with full ToS
- Data Deletion: expand confirmation flow

### Phase 4: refer.tsx (823 lines), premium-welcome.tsx (289 lines), paywall.tsx (636 lines)
- refer.tsx: expand referral copy, add benefit list, social proof stats
- premium-welcome.tsx: expand welcome message, feature highlights, onboarding tips
- paywall.tsx: expand feature comparison table, testimonials, FAQ section

### Phase 5: feedback.tsx (308 lines), report-bug.tsx (338 lines), notification-center.tsx (387 lines)
- feedback.tsx: expand category list, add examples for each type, add "what happens next" section
- report-bug.tsx: expand bug category list, add diagnostic info section, add "known issues" list
- notification-center.tsx: expand notification descriptions, add scheduling tips

### Phase 6: rewards.tsx (496 lines), redeem-code.tsx (258 lines), profile.tsx (325 lines), profile-setup.tsx (167 lines)
- rewards.tsx: expand badge descriptions, add unlock criteria details, add streak tips
- redeem-code.tsx: expand where-to-find-code section, add FAQ
- profile.tsx: expand stats section, add achievement showcase
- profile-setup.tsx: expand subject/grade selection with descriptions

## Completed
- [x] constants/app.ts — centralized brand config
- [x] settings.tsx — About modal, version footer
- [x] legal.tsx — contact card, copyright
- [x] server/index.ts — iOS store URL
- [x] chat.tsx — stutorsnapai typo fix
