/**
 * TutorSettingsModal
 *
 * Full-screen settings sheet for the AI Tutor, opened from the gear button
 * in the chat top bar. All settings are persisted to AsyncStorage under the
 * @tutorsnap/tutorSettings key and exposed via the useTutorSettings hook.
 *
 * Sections:
 *  1. Learning Profile
 *  2. Response Style
 *  3. Chat Behaviour
 *  4. Session & History
 *  5. Appearance
 *  6. Accessibility
 *  7. Notifications & Reminders
 *  8. Advanced
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Storage key ─────────────────────────────────────────────────────────────
export const TUTOR_SETTINGS_KEY = "@tutorsnap/tutorSettings";

// ─── Types ────────────────────────────────────────────────────────────────────
export type LearningStyle = "visual" | "step-by-step" | "conceptual" | "example-heavy";
export type ResponseLength = "short" | "balanced" | "detailed";
export type Tone = "friendly" | "neutral" | "academic" | "encouraging";
export type BubbleStyle = "rounded" | "sharp" | "minimal";
export type ChatFontSize = "small" | "medium" | "large";
export type CodeTheme = "light" | "dark";
export type MessageDensity = "compact" | "comfortable" | "spacious";
export type AutoResumeDelay = 2 | 3 | 5 | 0; // 0 = off
export type AvatarStyle = "default" | "robot" | "owl" | "star";

export interface TutorSettings {
  // 1. Learning Profile
  nickname: string;
  gradeLevel: string;
  defaultSubject: string;
  learningStyle: LearningStyle;
  language: string;

  // 2. Response Style
  responseLength: ResponseLength;
  tone: Tone;
  useEmojis: boolean;
  showWorking: boolean;
  followUpChips: boolean;

  // 3. Chat Behaviour
  typingAnimation: boolean;
  typingSpeed: "slow" | "normal" | "fast" | "very_fast";
  stemTypingSpeed: "same" | "slow" | "normal" | "fast" | "very_fast"; // override for Math/Science
  autoScroll: boolean;
  autoResumeDelay: AutoResumeDelay;
  sendOnEnter: boolean;
  voiceInput: boolean;

  // 4. Session & History
  saveHistory: boolean;
  autoTitle: boolean;
  maxSessions: 10 | 25 | 50 | 999;
  exportFormat: "text" | "pdf";

  // 5. Appearance
  avatarStyle: AvatarStyle;
  bubbleStyle: BubbleStyle;
  chatFontSize: ChatFontSize;
  codeTheme: CodeTheme;
  messageDensity: MessageDensity;
  swipeToShowTabBar: boolean;
  animateAIResponses: boolean;
  moodRingOrb: boolean;

  // 6. Accessibility
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderHints: boolean;

  // 6b. Header Indicators (off by default)
  showOnlineStatus: boolean;
  showSpeedIndicator: boolean;
  showAccentBar: boolean;

  // 7. Notifications & Reminders
  studyReminders: boolean;
  studyReminderTime: string; // "HH:MM"
  sessionSummary: boolean;

  // 8. Advanced
  debugMode: boolean;
}

export const DEFAULT_TUTOR_SETTINGS: TutorSettings = {
  nickname: "",
  gradeLevel: "",
  defaultSubject: "",
  learningStyle: "step-by-step",
  language: "English",

  responseLength: "balanced",
  tone: "friendly",
  useEmojis: true,
  showWorking: true,
  followUpChips: true,

  typingAnimation: true,
  typingSpeed: "slow",
  stemTypingSpeed: "same",
  autoScroll: true,
  autoResumeDelay: 3,
  sendOnEnter: false,
  voiceInput: true,

  saveHistory: true,
  autoTitle: true,
  maxSessions: 50,
  exportFormat: "text",

  avatarStyle: "default",
  bubbleStyle: "rounded",
  chatFontSize: "medium",
  codeTheme: "dark",
  messageDensity: "comfortable",
  swipeToShowTabBar: true,
  animateAIResponses: false,
  moodRingOrb: false,

  highContrast: false,
  reduceMotion: false,
  screenReaderHints: false,

  showOnlineStatus: false,
  showSpeedIndicator: false,
  showAccentBar: false,

  studyReminders: false,
  studyReminderTime: "18:00",
  sessionSummary: false,

  debugMode: false,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTutorSettings() {
  const [settings, setSettings] = useState<TutorSettings>(DEFAULT_TUTOR_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TUTOR_SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_TUTOR_SETTINGS, ...JSON.parse(raw) });
        } catch {
          // ignore parse error
        }
      }
      setLoaded(true);
    });
  }, []);

  const update = useCallback(async (patch: Partial<TutorSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(TUTOR_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    setSettings(DEFAULT_TUTOR_SETTINGS);
    await AsyncStorage.setItem(TUTOR_SETTINGS_KEY, JSON.stringify(DEFAULT_TUTOR_SETTINGS));
  }, []);

  return { settings, update, reset, loaded };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "600",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        color: colors.muted,
        marginTop: 28,
        marginBottom: 6,
        marginHorizontal: 20,
      }}
    >
      {title}
    </Text>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        marginHorizontal: 16,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );
}

interface RowProps {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  last?: boolean;
  destructive?: boolean;
}

function SettingsRow({ icon, iconColor, iconBg, label, sub, onPress, right, last, destructive }: RowProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;
  const bg = iconBg ?? `${ic}18`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <IconSymbol size={15} name={icon as any} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "500", color: destructive ? colors.error : colors.foreground }}>
          {label}
        </Text>
        {sub ? (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 1 }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <IconSymbol size={13} name="chevron.right" color={colors.muted} /> : null)}
    </TouchableOpacity>
  );
}

function ToggleRow(props: Omit<RowProps, "right"> & { value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  return (
    <SettingsRow
      {...props}
      right={
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
          ios_backgroundColor={colors.border}
        />
      }
    />
  );
}

type SegmentOption<T extends string> = { label: string; value: T };

function SegmentRow<T extends string>({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  options,
  onChange,
  last,
}: {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  last?: boolean;
}) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;
  const bg = iconBg ?? `${ic}18`;

  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: bg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <IconSymbol size={15} name={icon as any} color={ic} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 42 }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: value === opt.value ? colors.primary : colors.background,
              borderWidth: 1,
              borderColor: value === opt.value ? colors.primary : colors.border,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: value === opt.value ? "#fff" : colors.muted,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TextInputRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  placeholder,
  onChange,
  last,
}: {
  icon: string;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  last?: boolean;
}) {
  const colors = useColors();
  const ic = iconColor ?? colors.primary;
  const bg = iconBg ?? `${ic}18`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 0.5,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <IconSymbol size={15} name={icon as any} color={ic} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground, width: 100 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted}
        style={{
          flex: 1,
          fontSize: 14,
          color: colors.foreground,
          textAlign: "right",
          paddingVertical: 0,
        }}
        returnKeyType="done"
      />
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface TutorSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: TutorSettings;
  onUpdate: (patch: Partial<TutorSettings>) => void;
  onReset: () => void;
  onClearHistory: () => void;
  onExportChat: () => void;
  systemPromptPreview?: string;
  modelName?: string;
  lastResponseMs?: number;
  tokenCount?: number;
}

export function TutorSettingsModal({
  visible,
  onClose,
  settings,
  onUpdate,
  onReset,
  onClearHistory,
  onExportChat,
  systemPromptPreview,
  modelName,
  lastResponseMs,
  tokenCount,
}: TutorSettingsModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // ── Typing speed live preview ────────────────────────────────────────────
  const PREVIEW_TEXT = "The quadratic formula solves ax² + bx + c = 0 instantly.";
  const [previewText, setPreviewText] = useState("");
  const [previewRunning, setPreviewRunning] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewIndexRef = useRef(0);

  const runPreview = useCallback((speed: "slow" | "normal" | "fast" | "very_fast") => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewIndexRef.current = 0;
    setPreviewText("");
    setPreviewRunning(true);
    const delay = speed === "slow" ? 80 : speed === "very_fast" ? 4 : speed === "fast" ? 18 : 38;
    const tick = () => {
      const idx = previewIndexRef.current;
      if (idx >= PREVIEW_TEXT.length) {
        setPreviewRunning(false);
        return;
      }
      setPreviewText(PREVIEW_TEXT.slice(0, idx + 1));
      previewIndexRef.current = idx + 1;
      previewTimerRef.current = setTimeout(tick, delay);
    };
    previewTimerRef.current = setTimeout(tick, delay);
  }, []);

  // Auto-run preview when typing speed changes or modal opens
  useEffect(() => {
    if (visible && settings.typingAnimation) {
      runPreview(settings.typingSpeed);
    }
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, settings.typingSpeed, settings.typingAnimation]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleReset = () => {
    Alert.alert(
      "Reset Tutor Settings",
      "All AI Tutor settings will be restored to their defaults. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            onReset();
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Chat History",
      "All saved chat sessions will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onClearHistory },
      ]
    );
  };

  const LEARNING_STYLE_OPTIONS: SegmentOption<LearningStyle>[] = [
    { label: "Visual", value: "visual" },
    { label: "Steps", value: "step-by-step" },
    { label: "Concepts", value: "conceptual" },
    { label: "Examples", value: "example-heavy" },
  ];

  const RESPONSE_LENGTH_OPTIONS: SegmentOption<ResponseLength>[] = [
    { label: "Short", value: "short" },
    { label: "Balanced", value: "balanced" },
    { label: "Detailed", value: "detailed" },
  ];

  const TONE_OPTIONS: SegmentOption<Tone>[] = [
    { label: "Friendly", value: "friendly" },
    { label: "Neutral", value: "neutral" },
    { label: "Academic", value: "academic" },
    { label: "Encouraging", value: "encouraging" },
  ];

  const TYPING_SPEED_OPTIONS: SegmentOption<"slow" | "normal" | "fast" | "very_fast">[] = [
    { label: "Slow", value: "slow" },
    { label: "Normal", value: "normal" },
    { label: "Fast", value: "fast" },
    { label: "Instant", value: "very_fast" },
  ];

  const STEM_SPEED_OPTIONS: SegmentOption<"same" | "slow" | "normal" | "fast" | "very_fast">[] = [
    { label: "Same", value: "same" },
    { label: "Slow", value: "slow" },
    { label: "Normal", value: "normal" },
    { label: "Fast", value: "fast" },
    { label: "Instant", value: "very_fast" },
  ];

  const AUTO_RESUME_OPTIONS: SegmentOption<string>[] = [
    { label: "2s", value: "2" },
    { label: "3s", value: "3" },
    { label: "5s", value: "5" },
    { label: "Off", value: "0" },
  ];

  const MAX_SESSIONS_OPTIONS: SegmentOption<string>[] = [
    { label: "10", value: "10" },
    { label: "25", value: "25" },
    { label: "50", value: "50" },
    { label: "∞", value: "999" },
  ];

  const BUBBLE_STYLE_OPTIONS: SegmentOption<BubbleStyle>[] = [
    { label: "Rounded", value: "rounded" },
    { label: "Sharp", value: "sharp" },
    { label: "Minimal", value: "minimal" },
  ];

  const FONT_SIZE_OPTIONS: SegmentOption<ChatFontSize>[] = [
    { label: "S", value: "small" },
    { label: "M", value: "medium" },
    { label: "L", value: "large" },
  ];

  const CODE_THEME_OPTIONS: SegmentOption<CodeTheme>[] = [
    { label: "Light", value: "light" },
    { label: "Dark", value: "dark" },
  ];

  const DENSITY_OPTIONS: SegmentOption<MessageDensity>[] = [
    { label: "Compact", value: "compact" },
    { label: "Comfortable", value: "comfortable" },
    { label: "Spacious", value: "spacious" },
  ];

  const AVATAR_OPTIONS: SegmentOption<AvatarStyle>[] = [
    { label: "Default", value: "default" },
    { label: "Robot", value: "robot" },
    { label: "Owl", value: "owl" },
    { label: "Star", value: "star" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: insets.top + 16,
            paddingBottom: 14,
            paddingHorizontal: 20,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
            Tutor Settings
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.muted, fontWeight: "600" }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Learning Profile ─────────────────────────────── */}
          <SectionHeader title="Learning Profile" />
          <SettingsCard>
            <TextInputRow
              icon="person.fill"
              label="Nickname"
              value={settings.nickname}
              placeholder="What should I call you?"
              onChange={(v) => onUpdate({ nickname: v })}
            />
            <TextInputRow
              icon="graduationcap.fill"
              label="Grade"
              value={settings.gradeLevel}
              placeholder="e.g. Grade 9"
              onChange={(v) => onUpdate({ gradeLevel: v })}
            />
            <TextInputRow
              icon="book.closed.fill"
              label="Subject"
              value={settings.defaultSubject}
              placeholder="e.g. Algebra"
              onChange={(v) => onUpdate({ defaultSubject: v })}
            />
            <TextInputRow
              icon="textformat"
              label="Language"
              value={settings.language}
              placeholder="English"
              onChange={(v) => onUpdate({ language: v })}
            />
            <SegmentRow
              icon="book.fill"
              label="Learning Style"
              value={settings.learningStyle}
              options={LEARNING_STYLE_OPTIONS}
              onChange={(v) => onUpdate({ learningStyle: v })}
              last
            />
          </SettingsCard>

          {/* ── 2. Response Style ────────────────────────────────── */}
          <SectionHeader title="Response Style" />
          <SettingsCard>
            <SegmentRow
              icon="text.alignleft"
              label="Length"
              value={settings.responseLength}
              options={RESPONSE_LENGTH_OPTIONS}
              onChange={(v) => onUpdate({ responseLength: v })}
            />
            <SegmentRow
              icon="face.smiling"
              label="Tone"
              value={settings.tone}
              options={TONE_OPTIONS}
              onChange={(v) => onUpdate({ tone: v })}
            />
            <ToggleRow
              icon="face.smiling.inverse"
              label="Use Emojis"
              sub="Include emojis in AI responses"
              value={settings.useEmojis}
              onChange={(v) => onUpdate({ useEmojis: v })}
            />
            <ToggleRow
              icon="list.number"
              label="Show Working"
              sub="Always show step-by-step working"
              value={settings.showWorking}
              onChange={(v) => onUpdate({ showWorking: v })}
            />
            <ToggleRow
              icon="sparkles"
              label="Follow-up Chips"
              sub="Show suggested follow-up questions"
              value={settings.followUpChips}
              onChange={(v) => onUpdate({ followUpChips: v })}
              last
            />
          </SettingsCard>

          {/* ── 3. Chat Behaviour ────────────────────────────────── */}
          <SectionHeader title="Chat Behaviour" />
          <SettingsCard>
            <ToggleRow
              icon="character.cursor.ibeam"
              label="Typing Animation"
              sub="Letter-by-letter typewriter effect"
              value={settings.typingAnimation}
              onChange={(v) => onUpdate({ typingAnimation: v })}
            />
            <SegmentRow
              icon="speedometer"
              label="Typing Speed"
              value={settings.typingSpeed}
              options={TYPING_SPEED_OPTIONS}
              onChange={(v) => {
                onUpdate({ typingSpeed: v });
                if (settings.typingAnimation) runPreview(v);
              }}
            />
            {/* Live typing speed preview — always visible */}
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: colors.background,
                borderRadius: 10,
                borderWidth: 0.5,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "500", minWidth: 42 }}>
                Preview
              </Text>
              {settings.typingAnimation ? (
                <>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: colors.foreground,
                      lineHeight: 18,
                      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    }}
                    numberOfLines={2}
                  >
                    {previewText}
                    {previewRunning ? (
                      <Text style={{ color: colors.primary }}>|</Text>
                    ) : null}
                  </Text>
                  <TouchableOpacity
                    onPress={() => runPreview(settings.typingSpeed)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Replay typing speed preview"
                  >
                    <Text style={{ fontSize: 14, color: colors.primary }}>↺</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={{ flex: 1, fontSize: 13, color: colors.muted, fontStyle: "italic" }}>
                  Responses appear instantly (animation off)
                </Text>
              )}
            </View>
            <ToggleRow
              icon="arrow.down.to.line"
              label="Auto-scroll"
              sub="Scroll to new messages automatically"
              value={settings.autoScroll}
              onChange={(v) => onUpdate({ autoScroll: v })}
            />
            <SegmentRow
              icon="clock.arrow.circlepath"
              label="Auto-resume Delay"
              value={String(settings.autoResumeDelay)}
              options={AUTO_RESUME_OPTIONS}
              onChange={(v) => onUpdate({ autoResumeDelay: Number(v) as AutoResumeDelay })}
            />
            {Platform.OS === "web" && (
              <ToggleRow
                icon="return"
                label="Send on Enter"
                sub="Press Enter to send (web only)"
                value={settings.sendOnEnter}
                onChange={(v) => onUpdate({ sendOnEnter: v })}
              />
            )}
            <SegmentRow
              icon="function"
              label="STEM Speed Override"
              value={settings.stemTypingSpeed}
              options={STEM_SPEED_OPTIONS}
              onChange={(v) => onUpdate({ stemTypingSpeed: v })}
            />
            <ToggleRow
              icon="mic.fill"
              label="Voice Input"
              sub="Show microphone button in chat bar"
              value={settings.voiceInput}
              onChange={(v) => onUpdate({ voiceInput: v })}
            />
            <ToggleRow
              icon="wifi"
              label="Show Online Status"
              sub="Display Online / Offline in the header"
              value={settings.showOnlineStatus}
              onChange={(v) => onUpdate({ showOnlineStatus: v })}
            />
            <ToggleRow
              icon="speedometer"
              label="Show Speed Indicator"
              sub="Display Fast / Slow connection in the header"
              value={settings.showSpeedIndicator}
              onChange={(v) => onUpdate({ showSpeedIndicator: v })}
              last
            />
          </SettingsCard>

          {/* ── 4. Session & History ─────────────────────────────── */}
          <SectionHeader title="Session & History" />
          <SettingsCard>
            <ToggleRow
              icon="tray.full.fill"
              label="Save Chat History"
              sub="Store sessions for later access"
              value={settings.saveHistory}
              onChange={(v) => onUpdate({ saveHistory: v })}
            />
            <ToggleRow
              icon="pencil"
              label="Auto-title Chats"
              sub="Name sessions from first question"
              value={settings.autoTitle}
              onChange={(v) => onUpdate({ autoTitle: v })}
            />
            <SegmentRow
              icon="archivebox.fill"
              label="Max Sessions"
              value={String(settings.maxSessions)}
              options={MAX_SESSIONS_OPTIONS}
              onChange={(v) => onUpdate({ maxSessions: Number(v) as TutorSettings["maxSessions"] })}
            />
            <SegmentRow
              icon="square.and.arrow.down.fill"
              label="Export Format"
              value={settings.exportFormat}
              options={[
                { label: "Text", value: "text" },
                { label: "PDF", value: "pdf" },
              ] as SegmentOption<"text" | "pdf">[]}
              onChange={(v) => onUpdate({ exportFormat: v })}
            />
            <SettingsRow
              icon="square.and.arrow.up"
              label="Export Chat"
              sub="Share the current conversation"
              onPress={onExportChat}
            />
            <SettingsRow
              icon="trash.fill"
              iconColor={colors.error}
              label="Clear All History"
              sub="Permanently delete all sessions"
              onPress={handleClearHistory}
              destructive
              last
            />
          </SettingsCard>

          {/* ── 5. Appearance ────────────────────────────────────── */}
          <SectionHeader title="Appearance" />
          <SettingsCard>
            <SegmentRow
              icon="person.crop.circle"
              label="Avatar Style"
              value={settings.avatarStyle}
              options={AVATAR_OPTIONS}
              onChange={(v) => onUpdate({ avatarStyle: v })}
            />
            <SegmentRow
              icon="bubble.left.fill"
              label="Bubble Style"
              value={settings.bubbleStyle}
              options={BUBBLE_STYLE_OPTIONS}
              onChange={(v) => onUpdate({ bubbleStyle: v })}
            />
            {/* Font Size — visual 3-step selector */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
              <IconSymbol name="textformat.size" size={18} color={colors.muted} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.foreground, flex: 1 }}>Font Size</Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["small", "medium", "large"] as ChatFontSize[]).map((size) => {
                  const isActive = settings.chatFontSize === size;
                  const labelFontSize = size === "small" ? 12 : size === "medium" ? 16 : 21;
                  return (
                    <TouchableOpacity
                      key={size}
                      onPress={() => onUpdate({ chatFontSize: size })}
                      style={{
                        width: 44,
                        height: 36,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isActive ? colors.primary : `${colors.muted}18`,
                        borderWidth: isActive ? 0 : 1,
                        borderColor: `${colors.muted}30`,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: labelFontSize, fontWeight: "600", color: isActive ? "#fff" : colors.muted, lineHeight: labelFontSize + 4 }}>A</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <SegmentRow
              icon="chevron.left.forwardslash.chevron.right"
              label="Code Theme"
              value={settings.codeTheme}
              options={CODE_THEME_OPTIONS}
              onChange={(v) => onUpdate({ codeTheme: v })}
            />
            <SegmentRow
              icon="rectangle.grid.1x2"
              label="Message Density"
              value={settings.messageDensity}
              options={DENSITY_OPTIONS}
              onChange={(v) => onUpdate({ messageDensity: v })}
            />
            <ToggleRow
              icon="hand.draw.fill"
              label="Swipe to Show Tab Bar"
              sub="Swipe down in chat to reveal navigation"
              value={settings.swipeToShowTabBar}
              onChange={(v) => onUpdate({ swipeToShowTabBar: v })}
            />
            <ToggleRow
              icon="text.word.spacing"
              label="Animate AI Responses"
              sub="Words fade in one by one as AI responds"
              value={settings.animateAIResponses}
              onChange={(v) => onUpdate({ animateAIResponses: v })}
            />
            <ToggleRow
              icon="circle.hexagongrid.fill"
              label="Mood Ring Orb"
              sub="Orb shifts color when AI is thinking"
              value={settings.moodRingOrb}
              onChange={(v) => onUpdate({ moodRingOrb: v })}
            />
            <ToggleRow
              icon="sidebar.left"
              label="Accent Bar on Responses"
              sub="Show a coloured left border on AI bubbles"
              value={settings.showAccentBar}
              onChange={(v) => onUpdate({ showAccentBar: v })}
              last
            />
          </SettingsCard>

          {/* ── 6. Accessibility ─────────────────────────────────── */}
          <SectionHeader title="Accessibility" />
          <SettingsCard>
            <ToggleRow
              icon="circle.lefthalf.filled"
              label="High Contrast"
              sub="Increase contrast in chat bubbles"
              value={settings.highContrast}
              onChange={(v) => onUpdate({ highContrast: v })}
            />
            <ToggleRow
              icon="waveform.path"
              label="Reduce Motion"
              sub="Disable all chat animations"
              value={settings.reduceMotion}
              onChange={(v) => onUpdate({ reduceMotion: v })}
            />
            <ToggleRow
              icon="accessibility"
              label="Screen Reader Hints"
              sub="Extra labels for VoiceOver / TalkBack"
              value={settings.screenReaderHints}
              onChange={(v) => onUpdate({ screenReaderHints: v })}
              last
            />
          </SettingsCard>

          {/* ── 7. Notifications & Reminders ─────────────────────── */}
          <SectionHeader title="Notifications & Reminders" />
          <SettingsCard>
            <ToggleRow
              icon="bell.fill"
              label="Daily Study Reminder"
              sub={`Remind me to study at ${settings.studyReminderTime}`}
              value={settings.studyReminders}
              onChange={(v) => onUpdate({ studyReminders: v })}
            />
            <TextInputRow
              icon="clock.fill"
              label="Reminder Time"
              value={settings.studyReminderTime}
              placeholder="18:00"
              onChange={(v) => onUpdate({ studyReminderTime: v })}
            />
            <ToggleRow
              icon="doc.text.fill"
              label="Session Summary"
              sub="Notify me with a summary after each chat"
              value={settings.sessionSummary}
              onChange={(v) => onUpdate({ sessionSummary: v })}
              last
            />
          </SettingsCard>

          {/* ── 8. Advanced ──────────────────────────────────────── */}
          <SectionHeader title="Advanced" />
          <SettingsCard>
            <SettingsRow
              icon="text.quote"
              label="System Prompt"
              sub="View the active AI instruction set"
              onPress={() => setShowSystemPrompt(true)}
            />
            <SettingsRow
              icon="cpu"
              label="Model"
              sub={modelName ?? "TutorSnap AI"}
            />
            {settings.debugMode && lastResponseMs !== undefined && (
              <SettingsRow
                icon="timer"
                label="Last Response"
                sub={`${lastResponseMs}ms · ${tokenCount ?? "-"} tokens`}
              />
            )}
            <ToggleRow
              icon="ant"
              label="Debug Mode"
              sub="Show response latency and token count"
              value={settings.debugMode}
              onChange={(v) => onUpdate({ debugMode: v })}
            />
            <SettingsRow
              icon="arrow.counterclockwise"
              iconColor={colors.error}
              label="Reset All Settings"
              sub="Restore defaults for all tutor settings"
              onPress={handleReset}
              destructive
              last
            />
          </SettingsCard>

          {/* Spacer */}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* System Prompt Preview overlay */}
        {showSystemPrompt && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              paddingTop: insets.top + 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingBottom: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <TouchableOpacity onPress={() => setShowSystemPrompt(false)} style={{ marginRight: 12 }}>
                <IconSymbol size={18} name="chevron.left" color={colors.primary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>System Prompt</Text>
            </View>
            <ScrollView style={{ flex: 1, padding: 20 }}>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
                {systemPromptPreview ?? "No system prompt available."}
              </Text>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}
