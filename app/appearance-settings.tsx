/**
 * Appearance & Personalisation Settings Screen
 *
 * Sections (top to bottom):
 * 0. Live Preview Panel — real-time preview of current settings
 * 1. Presets — 4 named preset themes (Focus, Vibrant, Minimal, Accessible)
 * 2. Typography — font family, font size, line spacing, bold labels
 * 3. Accent Color — 8 global preset swatches
 * 4. Per-Subject Colours — per-subject accent color overrides
 * 5. Widgets — size, individual visibility toggles, drag-to-reorder
 * 6. Chat — bubble style, message density
 * 7. Solution — step display style
 * 8. Accessibility — reduce motion, high contrast, large tap targets
 * 9. Reset to defaults
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  useColorScheme,
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
  PRESET_THEMES,
  SUBJECT_NAMES,
  BUBBLE_BORDER_RADIUS,
  MESSAGE_DENSITY_PADDING,
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
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

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
              i === 0 && styles.segmentFirst,
              i === options.length - 1 && styles.segmentLast,
              active && { backgroundColor: colors.primary },
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

// ─── Live Preview Panel ───────────────────────────────────────────────────────
function LivePreviewPanel() {
  const colors = useColors();
  const colorScheme = useColorScheme() ?? "light";
  const { settings, accentColor, getSubjectAccent } = useAppearance();

  const accent = accentColor(colorScheme);
  const bubbleRadius = BUBBLE_BORDER_RADIUS[settings.chatBubbleStyle];
  const bubblePadding = MESSAGE_DENSITY_PADDING[settings.messageDensity];
  const fontSizeScale = { small: 0.88, medium: 1.0, large: 1.14, xlarge: 1.28 }[settings.fontSize];
  const mathAccent = getSubjectAccent("Mathematics", colorScheme);
  const physicsAccent = getSubjectAccent("Physics", colorScheme);

  // Resolve the active preset display name
  const activePresetLabel = (() => {
    if (!settings.activePresetId) return null;
    if (settings.activePresetId === "custom") return "Custom";
    const found = PRESET_THEMES.find((p) => p.id === settings.activePresetId);
    return found ? found.label : null;
  })();

  return (
    <View style={[styles.previewPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.previewTitleRow}>
        <Text style={[styles.previewTitle, { color: colors.muted }]}>LIVE PREVIEW</Text>
        {activePresetLabel && (
          <View style={[styles.previewPresetBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
            <Text style={[styles.previewPresetBadgeText, { color: accent }]}>{activePresetLabel} mode</Text>
          </View>
        )}
      </View>

      {/* Chat bubble preview */}
      <View style={styles.previewChatRow}>
        {/* AI bubble */}
        <View style={[
          styles.previewBubble,
          styles.previewBubbleAI,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderRadius: bubbleRadius,
            paddingVertical: bubblePadding * 0.7,
            paddingHorizontal: bubblePadding,
          },
        ]}>
          <Text style={[
            styles.previewBubbleText,
            {
              color: colors.foreground,
              fontSize: Math.round(13 * fontSizeScale),
              fontWeight: settings.boldLabels ? "700" : "400",
              lineHeight: Math.round(13 * fontSizeScale * (settings.lineSpacing === "compact" ? 1.2 : settings.lineSpacing === "relaxed" ? 1.7 : 1.45)),
              fontFamily: settings.fontFamily === "serif" ? "Georgia" : settings.fontFamily === "mono" ? (Platform.OS === "ios" ? "Courier New" : "monospace") : undefined,
            },
          ]}>
            x² + 5x + 6 = 0
          </Text>
          <Text style={[
            styles.previewBubbleSubtext,
            {
              color: colors.muted,
              fontSize: Math.round(11 * fontSizeScale),
              lineHeight: Math.round(11 * fontSizeScale * 1.4),
            },
          ]}>
            Factor: (x+2)(x+3) = 0
          </Text>
        </View>

        {/* User bubble */}
        <View style={[
          styles.previewBubble,
          styles.previewBubbleUser,
          {
            backgroundColor: accent,
            borderRadius: bubbleRadius,
            paddingVertical: bubblePadding * 0.7,
            paddingHorizontal: bubblePadding,
          },
        ]}>
          <Text style={[
            styles.previewBubbleText,
            {
              color: "#FFFFFF",
              fontSize: Math.round(13 * fontSizeScale),
              fontWeight: settings.boldLabels ? "700" : "400",
            },
          ]}>
            Solve this
          </Text>
        </View>
      </View>

      {/* Subject accent pills */}
      <View style={styles.previewSubjectRow}>
        <View style={[styles.previewSubjectPill, { backgroundColor: `${mathAccent}20`, borderColor: `${mathAccent}50` }]}>
          <Text style={[styles.previewSubjectText, { color: mathAccent }]}>Maths</Text>
        </View>
        <View style={[styles.previewSubjectPill, { backgroundColor: `${physicsAccent}20`, borderColor: `${physicsAccent}50` }]}>
          <Text style={[styles.previewSubjectText, { color: physicsAccent }]}>Physics</Text>
        </View>
        <View style={[styles.previewSubjectPill, { backgroundColor: `${accent}20`, borderColor: `${accent}50` }]}>
          <Text style={[styles.previewSubjectText, { color: accent }]}>Global</Text>
        </View>
      </View>

      {/* Widget preview */}
      <View style={[
        styles.previewWidget,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderLeftColor: accent,
        },
      ]}>
        <Text style={[styles.previewWidgetEmoji]}>🔥</Text>
        <View style={styles.previewWidgetText}>
          <Text style={[
            styles.previewWidgetLabel,
            {
              color: colors.foreground,
              fontWeight: settings.boldLabels ? "700" : "600",
              fontSize: Math.round(12 * fontSizeScale),
            },
          ]}>
            7-day streak
          </Text>
          <Text style={[styles.previewWidgetSub, { color: colors.muted, fontSize: Math.round(10 * fontSizeScale) }]}>
            Keep it up!
          </Text>
        </View>
        <View style={[styles.previewWidgetDot, { backgroundColor: accent }]} />
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AppearanceSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const { settings, updateSetting, resetSettings, applyPreset, resetSubjectAccents, saveCustomPreset, renameCustomPreset, accentColor } = useAppearance();
  const [customPresetNameInput, setCustomPresetNameInput] = React.useState(settings.customPresetName);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

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

  const handleApplyPreset = useCallback((presetId: string) => {
    impactMedium();
    applyPreset(presetId);
  }, [applyPreset]);

  const handleSaveCustomPreset = useCallback(() => {
    impactMedium();
    const name = customPresetNameInput.trim() || "Custom";
    saveCustomPreset(name);
  }, [saveCustomPreset, customPresetNameInput]);

  const handleRenameCustomPreset = useCallback((name: string) => {
    setCustomPresetNameInput(name);
    renameCustomPreset(name);
  }, [renameCustomPreset]);

  const handleExportSettings = useCallback(async () => {
    impactMedium();
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { customPreset: _cp, ...exportable } = settings;
      const json = JSON.stringify(exportable, null, 2);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        const path = `${FileSystem.cacheDirectory}tutorsnap-appearance.json`;
        await FileSystem.writeAsStringAsync(path, json);
        await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Share Appearance Settings" });
      } else {
        await Clipboard.setStringAsync(json);
        Alert.alert("Copied!", "Appearance settings JSON copied to clipboard.");
      }
    } catch {
      Alert.alert("Export failed", "Could not export settings.");
    }
  }, [settings]);

  const handleImportSettings = useCallback(() => {
    setImportError(null);
    setImportSuccess(false);
    const text = importText.trim();
    if (!text) {
      setImportError("Paste your settings JSON first.");
      return;
    }
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed !== "object" || parsed === null) throw new Error("Not an object");
      const keys = Object.keys(parsed) as Array<keyof typeof settings>;
      keys.forEach((k) => {
        if (k in settings && k !== "customPreset") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateSetting(k, (parsed as any)[k]);
        }
      });
      impactMedium();
      setImportSuccess(true);
      setImportText("");
    } catch {
      setImportError("Invalid JSON. Make sure you pasted the full exported text.");
    }
  }, [importText, settings, updateSetting]);

  const setSubjectAccent = useCallback((subject: string, colorId: string) => {
    triggerHaptic();
    updateSetting("subjectAccentColors", {
      ...settings.subjectAccentColors,
      [subject]: colorId,
    });
  }, [settings.subjectAccentColors, updateSetting]);

  const globalAccent = accentColor(colorScheme);

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
        {/* ── 0. Live Preview Panel ─────────────────────────────────────── */}
        <LivePreviewPanel />

        {/* ── 1. Preset Themes ──────────────────────────────────────────── */}
        <SectionHeader title="QUICK PRESETS" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {PRESET_THEMES.map((preset) => {
            // A preset is "active" if it was the last one explicitly applied
            const isActive = settings.activePresetId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => handleApplyPreset(preset.id)}
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: isActive ? `${globalAccent}18` : colors.surface,
                    borderColor: isActive ? globalAccent : colors.border,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityLabel={`Apply ${preset.label} preset`}
                accessibilityRole="button"
              >
                {/* Colour swatch strip */}
                <View style={styles.presetSwatchRow}>
                  {preset.swatches.map((swatch, i) => (
                    <View
                      key={i}
                      style={[styles.presetSwatch, { backgroundColor: swatch, borderColor: `${swatch}60` }]}
                    />
                  ))}
                </View>
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={[styles.presetLabel, { color: isActive ? globalAccent : colors.foreground }]}>
                  {preset.label}
                </Text>
                <Text style={[styles.presetDesc, { color: colors.muted }]} numberOfLines={2}>
                  {preset.description}
                </Text>
                {isActive && (
                  <View style={[styles.presetActiveBadge, { backgroundColor: globalAccent }]}>
                    <Text style={styles.presetActiveBadgeText}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Custom preset card */}
          {(() => {
            const isCustomActive = settings.activePresetId === "custom";
            const hasCustom = settings.customPreset != null;
            return (
              <View style={[styles.presetCard, { backgroundColor: isCustomActive ? `${globalAccent}18` : colors.surface, borderColor: isCustomActive ? globalAccent : colors.border, borderStyle: hasCustom ? "solid" : "dashed" }]}>
                {/* Colour swatch strip for custom preset */}
                <View style={styles.presetSwatchRow}>
                  {hasCustom ? (
                    [globalAccent, colors.surface, colors.background].map((sw, i) => (
                      <View key={i} style={[styles.presetSwatch, { backgroundColor: sw, borderColor: `${sw}60` }]} />
                    ))
                  ) : (
                    [colors.muted, colors.surface, colors.background].map((sw, i) => (
                      <View key={i} style={[styles.presetSwatch, { backgroundColor: sw, borderColor: `${sw}60` }]} />
                    ))
                  )}
                </View>
                <Text style={styles.presetEmoji}>✏️</Text>
                {/* Editable name */}
                <TextInput
                  value={customPresetNameInput}
                  onChangeText={handleRenameCustomPreset}
                  style={[styles.customPresetNameInput, { color: isCustomActive ? globalAccent : colors.foreground, borderColor: `${globalAccent}40` }]}
                  placeholder="Name your preset"
                  placeholderTextColor={colors.muted}
                  maxLength={24}
                  returnKeyType="done"
                  accessibilityLabel="Custom preset name"
                />
                <Text style={[styles.presetDesc, { color: colors.muted }]} numberOfLines={2}>
                  {hasCustom ? "Your saved look. Tap Update to overwrite." : "Name it, then tap Save."}
                </Text>
                <View style={styles.customPresetBtns}>
                  {hasCustom && (
                    <TouchableOpacity
                      onPress={() => handleApplyPreset("custom")}
                      style={[styles.customPresetApplyBtn, { backgroundColor: globalAccent }]}
                      activeOpacity={0.8}
                      accessibilityLabel={`Apply ${customPresetNameInput} preset`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.customPresetApplyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleSaveCustomPreset}
                    style={[styles.customPresetSaveBtn, { borderColor: globalAccent }]}
                    activeOpacity={0.8}
                    accessibilityLabel={hasCustom ? `Update ${customPresetNameInput} preset` : "Save current settings as custom preset"}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.customPresetSaveBtnText, { color: globalAccent }]}>
                      {hasCustom ? "Update" : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {isCustomActive && (
                  <View style={[styles.presetActiveBadge, { backgroundColor: globalAccent }]}>
                    <Text style={styles.presetActiveBadgeText}>Active</Text>
                  </View>
                )}
              </View>
            );
          })()}
        </ScrollView>

        {/* ── 2. Typography ─────────────────────────────────────────────── */}
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

        {/* ── 3. Accent Color ───────────────────────────────────────────── */}
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

        {/* ── 4. Per-Subject Colours ────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: colors.muted }]}>PER-SUBJECT COLOURS</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              resetSubjectAccents();
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.resetSubjectBtn, { color: colors.muted }]}>Reset to defaults</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row>
            <Text style={[styles.rowSub, { color: colors.muted, flex: 1, lineHeight: 18 }]}>
              Override the accent colour for each subject. Tap a colour to apply it.
            </Text>
          </Row>
          {SUBJECT_NAMES.map((subject, idx) => {
            const currentId = settings.subjectAccentColors[subject] ?? settings.accentColorId;
            return (
              <Row key={subject} last={idx === SUBJECT_NAMES.length - 1}>
                <Text style={[styles.rowLabel, { color: colors.foreground, minWidth: 130 }]} numberOfLines={1}>
                  {subject}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subjectSwatchRow}
                >
                  {ACCENT_COLORS.map((ac) => {
                    const active = currentId === ac.id;
                    return (
                      <TouchableOpacity
                        key={ac.id}
                        onPress={() => setSubjectAccent(subject, ac.id)}
                        style={[
                          styles.subjectSwatch,
                          { backgroundColor: ac.light },
                          active && styles.subjectSwatchActive,
                        ]}
                        activeOpacity={0.8}
                      >
                        {active && <Text style={styles.subjectSwatchCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Row>
            );
          })}
        </View>

        {/* ── 5. Widgets ────────────────────────────────────────────────── */}
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

        {/* ── 6. Chat ───────────────────────────────────────────────────── */}
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

        {/* ── 7. Solution ───────────────────────────────────────────────── */}
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

        {/* ── 8. Accessibility ──────────────────────────────────────────── */}
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

        {/* ── 9. Export / Import ────────────────────────────────────────── */}
        <SectionHeader title="BACKUP & RESTORE" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row>
            <View style={styles.rowTextBlock}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export Settings</Text>
              <Text style={[styles.rowSub, { color: colors.muted }]}>Share or copy as JSON</Text>
            </View>
            <TouchableOpacity
              onPress={handleExportSettings}
              style={[styles.exportBtn, { backgroundColor: `${globalAccent}18`, borderColor: `${globalAccent}40` }]}
              activeOpacity={0.8}
              accessibilityLabel="Export appearance settings"
              accessibilityRole="button"
            >
              <Text style={[styles.exportBtnText, { color: globalAccent }]}>Export</Text>
            </TouchableOpacity>
          </Row>
          <Row last>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Import Settings</Text>
              <TextInput
                value={importText}
                onChangeText={(t) => { setImportText(t); setImportError(null); setImportSuccess(false); }}
                style={[styles.importInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: importError ? colors.error : importSuccess ? colors.success : colors.border }]}
                placeholder="Paste exported JSON here…"
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                returnKeyType="done"
                accessibilityLabel="Import appearance settings JSON"
              />
              {importError && <Text style={[styles.importFeedback, { color: colors.error }]}>{importError}</Text>}
              {importSuccess && <Text style={[styles.importFeedback, { color: colors.success }]}>Settings imported successfully!</Text>}
              <TouchableOpacity
                onPress={handleImportSettings}
                style={[styles.importBtn, { backgroundColor: globalAccent }]}
                activeOpacity={0.8}
                accessibilityLabel="Apply imported settings"
                accessibilityRole="button"
              >
                <Text style={styles.importBtnText}>Apply Import</Text>
              </TouchableOpacity>
            </View>
          </Row>
        </View>

        {/* ── 10. Reset ─────────────────────────────────────────────────── */}
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
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  resetSubjectBtn: {
    fontSize: 12,
    fontWeight: "600",
  },
  customPresetBtns: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  customPresetApplyBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  customPresetApplyBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  customPresetSaveBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 6,
    alignItems: "center",
  },
  customPresetSaveBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customPresetNameInput: {
    fontSize: 14,
    fontWeight: "700",
    borderBottomWidth: 1,
    paddingBottom: 2,
    marginBottom: 4,
  },
  presetSwatchRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  presetSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  exportBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  importInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  importFeedback: {
    fontSize: 12,
    fontWeight: "500",
  },
  importBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  importBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  previewPresetBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewPresetBadgeText: {
    fontSize: 11,
    fontWeight: "600",
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

  // ── Live Preview Panel ──────────────────────────────────────────────────────
  previewPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  previewChatRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  previewBubble: {
    maxWidth: "55%",
    gap: 2,
  },
  previewBubbleAI: {
    borderWidth: 1,
    flex: 1,
  },
  previewBubbleUser: {
    alignSelf: "flex-end",
  },
  previewBubbleText: {
    fontSize: 13,
  },
  previewBubbleSubtext: {
    fontSize: 11,
  },
  previewSubjectRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  previewSubjectPill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewSubjectText: {
    fontSize: 11,
    fontWeight: "600",
  },
  previewWidget: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  previewWidgetEmoji: { fontSize: 20 },
  previewWidgetText: { flex: 1 },
  previewWidgetLabel: { fontSize: 12, fontWeight: "600" },
  previewWidgetSub: { fontSize: 10, marginTop: 2 },
  previewWidgetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Preset cards ────────────────────────────────────────────────────────────
  presetsRow: {
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  presetCard: {
    width: 148,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
  },
  presetEmoji: { fontSize: 24, marginBottom: 2 },
  presetLabel: { fontSize: 15, fontWeight: "700" },
  presetDesc: { fontSize: 11, lineHeight: 15 },
  presetActiveBadge: {
    marginTop: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  presetActiveBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },

  // ── Per-subject colour swatches ─────────────────────────────────────────────
  subjectSwatchRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  subjectSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectSwatchActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  subjectSwatchCheck: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
