/**
 * Appearance & Personalisation Settings Screen
 *
 * Sections:
 * 1. Typography — font family, font size, line spacing, bold labels
 * 2. Accent Color — 8 preset swatches
 * 3. Widgets — size, individual visibility toggles, drag-to-reorder
 * 4. Chat — bubble style, message density
 * 5. Solution — step display style
 * 6. Accessibility — reduce motion, high contrast, large tap targets
 * 7. Reset to defaults
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import {
  useAppearance,
  ACCENT_COLORS,
  FONT_SIZE_LABELS,
  WIDGET_LABELS,
  WIDGET_EMOJIS,
  DEFAULT_WIDGET_ORDER,
  type FontFamily,
  type FontSizeScale,
  type LineSpacing,
  type WidgetSize,
  type WidgetId,
  type ChatBubbleStyle,
  type MessageDensity,
  type StepStyle,
} from "@/lib/appearance-context";
import { impactLight as triggerHaptic, impactMedium } from "@/lib/haptics";

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.muted }]}>{title}</Text>
  );
}

// ─── Row wrapper ──────────────────────────────────────────────────────────────
function Row({ children, last }: { children: React.ReactNode; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: last ? "transparent" : colors.border }]}>
      {children}
    </View>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────
function SegmentedControl<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => { triggerHaptic(); onChange(opt); }}
            style={[
              styles.segmentBtn,
              active && { backgroundColor: colors.primary },
              i === 0 && styles.segmentFirst,
              i === options.length - 1 && styles.segmentLast,
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: active ? "#FFFFFF" : colors.muted }]}>
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AppearanceSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useAppearance();

  const handleReset = useCallback(() => {
    Alert.alert(
      "Reset to Defaults",
      "This will restore all appearance settings to their original values. Your data and progress will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => { impactMedium(); resetSettings(); },
        },
      ],
    );
  }, [resetSettings]);

  const toggleWidget = useCallback((id: WidgetId) => {
    triggerHaptic();
    updateSetting("widgetVisibility", {
      ...settings.widgetVisibility,
      [id]: !settings.widgetVisibility[id],
    });
  }, [settings.widgetVisibility, updateSetting]);

  const moveWidget = useCallback((id: WidgetId, direction: "up" | "down") => {
    triggerHaptic();
    const order = [...settings.widgetOrder];
    const idx = order.indexOf(id);
    if (direction === "up" && idx > 0) {
      [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    } else if (direction === "down" && idx < order.length - 1) {
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
    }
    updateSetting("widgetOrder", order);
  }, [settings.widgetOrder, updateSetting]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Appearance</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Typography ─────────────────────────────────────────────── */}
        <SectionHeader title="TYPOGRAPHY" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Font Family */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Font Family</Text>
            <View style={styles.rowRight}>
              {(["system", "rounded", "serif", "mono"] as FontFamily[]).map((ff) => (
                <TouchableOpacity
                  key={ff}
                  onPress={() => { triggerHaptic(); updateSetting("fontFamily", ff); }}
                  style={[
                    styles.fontChip,
                    { borderColor: settings.fontFamily === ff ? colors.primary : colors.border },
                    settings.fontFamily === ff && { backgroundColor: `${colors.primary}15` },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.fontChipText,
                    { color: settings.fontFamily === ff ? colors.primary : colors.muted },
                    ff === "serif" && { fontFamily: "Georgia" },
                    ff === "mono" && { fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace" },
                  ]}>
                    {ff === "system" ? "System" : ff === "rounded" ? "Round" : ff === "serif" ? "Serif" : "Mono"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          {/* Font Size */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Font Size</Text>
          </Row>
          <Row>
            <SegmentedControl<FontSizeScale>
              options={["small", "medium", "large", "xlarge"]}
              labels={FONT_SIZE_LABELS}
              value={settings.fontSize}
              onChange={(v) => updateSetting("fontSize", v)}
            />
          </Row>

          {/* Line Spacing */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Line Spacing</Text>
          </Row>
          <Row>
            <SegmentedControl<LineSpacing>
              options={["compact", "normal", "relaxed"]}
              labels={{ compact: "Compact", normal: "Normal", relaxed: "Relaxed" }}
              value={settings.lineSpacing}
              onChange={(v) => updateSetting("lineSpacing", v)}
            />
          </Row>

          {/* Bold Labels */}
          <Row last>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Bold Labels</Text>
            <Text style={[styles.rowSub, { color: colors.muted }]}>Heavier section headings</Text>
            <Switch
              value={settings.boldLabels}
              onValueChange={(v) => { triggerHaptic(); updateSetting("boldLabels", v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </View>

        {/* ── 2. Accent Color ───────────────────────────────────────────── */}
        <SectionHeader title="ACCENT COLOR" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row last>
            <View style={styles.accentGrid}>
              {ACCENT_COLORS.map((ac) => {
                const active = settings.accentColorId === ac.id;
                return (
                  <TouchableOpacity
                    key={ac.id}
                    onPress={() => { triggerHaptic(); updateSetting("accentColorId", ac.id); }}
                    style={styles.accentItem}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.accentSwatch,
                      { backgroundColor: ac.light },
                      active && styles.accentSwatchActive,
                    ]}>
                      {active && <Text style={styles.accentCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.accentLabel, { color: active ? colors.primary : colors.muted }]}>
                      {ac.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Row>
        </View>

        {/* ── 3. Widgets ────────────────────────────────────────────────── */}
        <SectionHeader title="TODAY WIDGETS" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Widget Size */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Widget Size</Text>
          </Row>
          <Row>
            <SegmentedControl<WidgetSize>
              options={["compact", "normal", "large"]}
              labels={{ compact: "Compact", normal: "Normal", large: "Large" }}
              value={settings.widgetSize}
              onChange={(v) => updateSetting("widgetSize", v)}
            />
          </Row>

          {/* Widget Visibility */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Visible Widgets</Text>
          </Row>
          {settings.widgetOrder.map((id, idx) => (
            <Row key={id} last={idx === settings.widgetOrder.length - 1}>
              <Text style={styles.widgetEmoji}>{WIDGET_EMOJIS[id]}</Text>
              <View style={styles.widgetLabelBlock}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{WIDGET_LABELS[id]}</Text>
              </View>
              {/* Reorder arrows */}
              <View style={styles.reorderBtns}>
                <TouchableOpacity
                  onPress={() => moveWidget(id, "up")}
                  disabled={idx === 0}
                  style={[styles.reorderBtn, idx === 0 && styles.reorderBtnDisabled]}
                >
                  <Text style={[styles.reorderArrow, { color: idx === 0 ? colors.border : colors.muted }]}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveWidget(id, "down")}
                  disabled={idx === settings.widgetOrder.length - 1}
                  style={[styles.reorderBtn, idx === settings.widgetOrder.length - 1 && styles.reorderBtnDisabled]}
                >
                  <Text style={[styles.reorderArrow, { color: idx === settings.widgetOrder.length - 1 ? colors.border : colors.muted }]}>▼</Text>
                </TouchableOpacity>
              </View>
              <Switch
                value={settings.widgetVisibility[id] ?? true}
                onValueChange={() => toggleWidget(id)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </Row>
          ))}
        </View>

        {/* ── 4. Chat ───────────────────────────────────────────────────── */}
        <SectionHeader title="AI TUTOR CHAT" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Bubble Style */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Bubble Style</Text>
          </Row>
          <Row>
            <SegmentedControl<ChatBubbleStyle>
              options={["rounded", "flat", "minimal"]}
              labels={{ rounded: "Rounded", flat: "Flat", minimal: "Minimal" }}
              value={settings.chatBubbleStyle}
              onChange={(v) => updateSetting("chatBubbleStyle", v)}
            />
          </Row>

          {/* Message Density */}
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Message Density</Text>
          </Row>
          <Row last>
            <SegmentedControl<MessageDensity>
              options={["compact", "comfortable", "spacious"]}
              labels={{ compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" }}
              value={settings.messageDensity}
              onChange={(v) => updateSetting("messageDensity", v)}
            />
          </Row>
        </View>

        {/* ── 5. Solution ───────────────────────────────────────────────── */}
        <SectionHeader title="SOLUTION DISPLAY" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Step Style</Text>
          </Row>
          <Row last>
            <SegmentedControl<StepStyle>
              options={["cards", "list", "minimal"]}
              labels={{ cards: "Cards", list: "List", minimal: "Minimal" }}
              value={settings.stepStyle}
              onChange={(v) => updateSetting("stepStyle", v)}
            />
          </Row>
        </View>

        {/* ── 6. Accessibility ──────────────────────────────────────────── */}
        <SectionHeader title="ACCESSIBILITY" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Reduce Motion</Text>
              <Text style={[styles.rowSub, { color: colors.muted }]}>Disables all animations</Text>
            </View>
            <Switch
              value={settings.reduceMotion}
              onValueChange={(v) => { triggerHaptic(); updateSetting("reduceMotion", v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Row>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>High Contrast</Text>
              <Text style={[styles.rowSub, { color: colors.muted }]}>Stronger borders and text</Text>
            </View>
            <Switch
              value={settings.highContrast}
              onValueChange={(v) => { triggerHaptic(); updateSetting("highContrast", v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>
          <Row last>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Large Tap Targets</Text>
              <Text style={[styles.rowSub, { color: colors.muted }]}>Bigger buttons and icons</Text>
            </View>
            <Switch
              value={settings.largeTapTargets}
              onValueChange={(v) => { triggerHaptic(); updateSetting("largeTapTargets", v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </View>

        {/* ── 7. Reset ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.resetBtn, { borderColor: colors.error }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.resetText, { color: colors.error }]}>Reset to Defaults</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  rowLabel: { fontSize: 15, fontWeight: "500", flex: 1 },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowRight: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  rowTextBlock: { flex: 1 },
  // Segmented control
  segmented: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  segmentFirst: { borderTopLeftRadius: 9, borderBottomLeftRadius: 9 },
  segmentLast: { borderTopRightRadius: 9, borderBottomRightRadius: 9 },
  segmentText: { fontSize: 12, fontWeight: "600" },
  // Font chips
  fontChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fontChipText: { fontSize: 12, fontWeight: "600" },
  // Accent grid
  accentGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 4,
  },
  accentItem: { alignItems: "center", gap: 4, width: 56 },
  accentSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  accentSwatchActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  accentCheck: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  accentLabel: { fontSize: 11, fontWeight: "500" },
  // Widget rows
  widgetEmoji: { fontSize: 18, width: 28 },
  widgetLabelBlock: { flex: 1 },
  reorderBtns: { flexDirection: "column", gap: 2 },
  reorderBtn: { padding: 2 },
  reorderBtnDisabled: { opacity: 0.3 },
  reorderArrow: { fontSize: 10 },
  // Reset button
  resetBtn: {
    marginTop: 32,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  resetText: { fontSize: 15, fontWeight: "700" },
});
