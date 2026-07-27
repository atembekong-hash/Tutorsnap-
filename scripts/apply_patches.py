#!/usr/bin/env python3
"""
apply_patches.py — applies all pending patches to paywall.tsx and onboarding.tsx
Run from project root: python3 scripts/apply_patches.py
"""
import re, sys

# ─── paywall.tsx ──────────────────────────────────────────────────────────────
with open("app/paywall.tsx", "r") as f:
    pw = f.read()

changed = []

# 1. Fix closing tag mismatch
if "    </View>\n  );\n}\n\n// ─── Styles" in pw:
    pw = pw.replace(
        "    </View>\n  );\n}\n\n// ─── Styles",
        "    </ReAnimated.View>\n  );\n}\n\n// ─── Styles"
    )
    changed.append("closing tag fixed")

# 2. useSharedValue import
if "useSharedValue" not in pw:
    pw = pw.replace(
        'import ReAnimated, { FadeInDown, ZoomIn } from "react-native-reanimated";',
        'import ReAnimated, { FadeInDown, ZoomIn, useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";'
    )
    changed.append("useSharedValue import")

# 3. Social proof constant
if "SOCIAL_PROOF_COUNT" not in pw:
    pw = pw.replace(
        "// ─── Main screen ──────────────────────────────────────────────────────────────",
        'const SOCIAL_PROOF_COUNT = "12,400+";\n\n// ─── Main screen ──────────────────────────────────────────────────────────────'
    )
    changed.append("social proof constant")

# 4. Animated scale state
if "monthlyScale" not in pw:
    pw = pw.replace(
        "  // Load offerings on mount",
        "  // Animated scale for plan card selection\n  const monthlyScale = useSharedValue(1);\n  const annualScale = useSharedValue(1.02);\n  const monthlyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: withTiming(monthlyScale.value, { duration: 180 }) }] }));\n  const annualAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: withTiming(annualScale.value, { duration: 180 }) }] }));\n\n  // Load offerings on mount"
    )
    changed.append("scale state")

# 5. handleSelectPlan with animation
if "monthlyScale.value" not in pw:
    pw = pw.replace(
        "  const handleSelectPlan = useCallback((productId: string) => {\n    H.impactLight();\n    setSelectedPlan(productId);\n  }, []);",
        "  const handleSelectPlan = useCallback((productId: string) => {\n    H.impactLight();\n    setSelectedPlan(productId);\n    monthlyScale.value = productId === PRODUCT_MONTHLY ? 1.02 : 1;\n    annualScale.value = productId === PRODUCT_ANNUAL ? 1.02 : 1;\n  }, [monthlyScale, annualScale]);"
    )
    changed.append("handleSelectPlan animation")

# 6. Wrap Monthly card
if "monthlyAnimStyle" not in pw:
    pw = pw.replace(
        "            {/* Monthly */}\n            <Pressable\n              style={({ pressed }) => [\n                s.planCard,\n                selectedPlan === PRODUCT_MONTHLY && s.planCardSelected,\n                pressed && { opacity: 0.85 },\n              ]}\n              onPress={() => handleSelectPlan(PRODUCT_MONTHLY)}\n              accessibilityLabel={`Monthly plan, ${monthlyPrice} billed monthly`}\n              accessibilityRole=\"radio\"\n              accessibilityState={{ selected: selectedPlan === PRODUCT_MONTHLY }}\n            >",
        "            {/* Monthly */}\n            <ReAnimated.View style={monthlyAnimStyle}>\n            <Pressable\n              style={({ pressed }) => [\n                s.planCard,\n                selectedPlan === PRODUCT_MONTHLY && s.planCardSelected,\n                pressed && { opacity: 0.85 },\n              ]}\n              onPress={() => handleSelectPlan(PRODUCT_MONTHLY)}\n              accessibilityLabel={`Monthly plan, ${monthlyPrice} billed monthly`}\n              accessibilityRole=\"radio\"\n              accessibilityState={{ selected: selectedPlan === PRODUCT_MONTHLY }}\n            >"
    )
    pw = pw.replace(
        "              <Text style={s.planNote}>Billed monthly</Text>\n            </Pressable>\n\n            {/* Annual — recommended */}",
        "              <Text style={s.planNote}>Billed monthly</Text>\n            </Pressable>\n            </ReAnimated.View>\n\n            {/* Annual — recommended */}"
    )
    changed.append("monthly card wrapped")

# 7. Wrap Annual card
if "annualAnimStyle" not in pw:
    pw = pw.replace(
        "            {/* Annual — recommended */}\n            <Pressable\n              style={({ pressed }) => [\n                s.planCard,\n                s.planCardAnnual,\n                selectedPlan === PRODUCT_ANNUAL && s.planCardSelected,\n                pressed && { opacity: 0.85 },\n              ]}\n              onPress={() => handleSelectPlan(PRODUCT_ANNUAL)}\n              accessibilityLabel={`Annual plan, ${annualPrice}, best value, save ${DISCOUNT_PCT}%`}\n              accessibilityRole=\"radio\"\n              accessibilityState={{ selected: selectedPlan === PRODUCT_ANNUAL }}\n            >",
        "            {/* Annual — recommended */}\n            <ReAnimated.View style={annualAnimStyle}>\n            <Pressable\n              style={({ pressed }) => [\n                s.planCard,\n                s.planCardAnnual,\n                selectedPlan === PRODUCT_ANNUAL && s.planCardSelected,\n                pressed && { opacity: 0.85 },\n              ]}\n              onPress={() => handleSelectPlan(PRODUCT_ANNUAL)}\n              accessibilityLabel={`Annual plan, ${annualPrice}, best value, save ${DISCOUNT_PCT}%`}\n              accessibilityRole=\"radio\"\n              accessibilityState={{ selected: selectedPlan === PRODUCT_ANNUAL }}\n            >"
    )
    pw = pw.replace(
        "              <Text style={[s.planNote, s.planNoteAnnual]}>\n                {annualMonthlyEquiv} · Save {DISCOUNT_PCT}%\n              </Text>\n            </Pressable>\n          </View>",
        "              <Text style={[s.planNote, s.planNoteAnnual]}>\n                {annualMonthlyEquiv} · Save {DISCOUNT_PCT}%\n              </Text>\n            </Pressable>\n            </ReAnimated.View>\n          </View>"
    )
    changed.append("annual card wrapped")

# 8. Social proof counter above early CTA
if "Join {SOCIAL_PROOF_COUNT}" not in pw:
    pw = pw.replace(
        "        {/* ── Early CTA — visible without scrolling ──────────────── */}",
        '        {/* ── Social proof counter ─────────────────────────────────── */}\n        <ReAnimated.View entering={FadeInDown.delay(280).duration(350)} style={{ alignItems: "center", marginBottom: 6, marginTop: 4 }}>\n          <Text style={{ color: "#9BA1A6", fontSize: 13, fontWeight: "500", letterSpacing: 0.2 }}>\n            Join {SOCIAL_PROOF_COUNT} students already on Premium\n          </Text>\n        </ReAnimated.View>\n        {/* ── Early CTA — visible without scrolling ──────────────── */}'
    )
    changed.append("social proof counter")

# 9. stickyVisible state
if "stickyVisible" not in pw:
    pw = pw.replace(
        "  const [trialVariant, setTrialVariant] = useState<TrialVariantConfig>(getDefaultTrialVariantConfig());",
        "  const [trialVariant, setTrialVariant] = useState<TrialVariantConfig>(getDefaultTrialVariantConfig());\n  const [stickyVisible, setStickyVisible] = useState(false);"
    )
    pw = pw.replace(
        "      <ScrollView\n        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}\n        showsVerticalScrollIndicator={false}\n      >",
        "      <ScrollView\n        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 100 }]}\n        showsVerticalScrollIndicator={false}\n        onScroll={(e) => setStickyVisible(e.nativeEvent.contentOffset.y > 220)}\n        scrollEventThrottle={16}\n      >"
    )
    pw = pw.replace(
        "      </ScrollView>\n    </ReAnimated.View>\n  );\n}\n\n// ─── Styles",
        '      </ScrollView>\n      {/* ── Sticky bottom CTA ──────────────────────────────────── */}\n      {stickyVisible && (\n        <ReAnimated.View\n          entering={FadeInDown.duration(200)}\n          style={[{\n            position: "absolute",\n            bottom: 0, left: 0, right: 0,\n            paddingHorizontal: 20,\n            paddingTop: 12,\n            paddingBottom: insets.bottom + 12,\n            backgroundColor: "rgba(21,23,24,0.97)",\n            borderTopWidth: 0.5,\n            borderTopColor: "#334155",\n          }]}\n        >\n          <TouchableOpacity\n            style={[s.ctaBtn, loading && s.ctaBtnDisabled]}\n            onPress={handleStartTrial}\n            disabled={loading || !offeringsLoaded}\n            activeOpacity={0.85}\n            accessibilityLabel="Start free trial"\n            accessibilityRole="button"\n          >\n            {loading ? <DotsLoader color="#fff" /> : <Text style={s.ctaBtnText}>Start Free Trial</Text>}\n          </TouchableOpacity>\n        </ReAnimated.View>\n      )}\n    </ReAnimated.View>\n  );\n}\n\n// ─── Styles'
    )
    changed.append("sticky CTA bar")

with open("app/paywall.tsx", "w") as f:
    f.write(pw)
print(f"paywall.tsx: {pw.count(chr(10))} lines | changes: {changed}")

# ─── onboarding.tsx ───────────────────────────────────────────────────────────
with open("app/onboarding.tsx", "r") as f:
    src = f.read()

ob_changed = []

# Fix photo slide always skipped in goNext
if '&& avatarUri' in src and 'id === "photo"' in src:
    src = re.sub(
        r'      // Skip the photo slide if the user already has a profile photo set\s*\n      let next = currentSlide \+ 1;\s*\n      if \(SLIDES\[next\]\?\.id === "photo" && avatarUri\) \{\s*\n        next = next \+ 1;\s*\n      \}',
        '      // Always skip the photo slide when navigating forward — it is optional.\n      let next = currentSlide + 1;\n      if (SLIDES[next]?.id === "photo") {\n        next = next + 1;\n      }',
        src
    )
    ob_changed.append("photo slide always skipped")

with open("app/onboarding.tsx", "w") as f:
    f.write(src)
print(f"onboarding.tsx: {src.count(chr(10))} lines | changes: {ob_changed}")

# Final checks
checks = {
    "paywall closing tag": "    </ReAnimated.View>\n  );\n}\n\n// ─── Styles" in pw,
    "paywall useSharedValue": "useSharedValue" in pw,
    "paywall social proof": "SOCIAL_PROOF_COUNT" in pw,
    "paywall scale anim": "monthlyAnimStyle" in pw and "annualAnimStyle" in pw,
    "paywall sticky CTA": "stickyVisible" in pw,
    "onboarding photo skip": '&& avatarUri' not in src.split('const goNext')[1].split('const goBack')[0],
}
all_ok = all(checks.values())
for k, v in checks.items():
    print(f"  {'OK' if v else 'MISSING'}: {k}")
print(f"\nAll checks: {'PASS' if all_ok else 'FAIL'}")
sys.exit(0 if all_ok else 1)
