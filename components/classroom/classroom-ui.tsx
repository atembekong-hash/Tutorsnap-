import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";

type IconName = ComponentProps<typeof IconSymbol>["name"];

export function ClassroomPage({
  title,
  subtitle,
  back = false,
  right,
  children,
  contentContainerStyle,
  scrollProps,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, "contentContainerStyle">;
}) {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          {back ? (
            <TouchableOpacity
              accessibilityLabel="Go back"
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => {
                H.selectionFeedback();
                router.back();
              }}
              style={[
                styles.headerButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name="arrow.left"
                size={21}
                color={colors.foreground}
              />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.brandMark,
                { backgroundColor: `${colors.primary}16` },
              ]}
            >
              <IconSymbol
                name="graduationcap.fill"
                size={22}
                color={colors.primary}
              />
            </View>
          )}

          <View style={styles.headerCopy}>
            <Text
              numberOfLines={1}
              style={[styles.headerTitle, { color: colors.foreground }]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={1}
                style={[styles.headerSubtitle, { color: colors.muted }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>{right}</View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          {...scrollProps}
          contentContainerStyle={[styles.content, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export function SurfaceCard({
  children,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      {detail ? (
        <Text style={[styles.sectionDetail, { color: colors.muted }]}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function ClassroomField({
  label,
  hint,
  error,
  multiline,
  style,
  ...inputProps
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            color: colors.foreground,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? (
        <Text style={[styles.fieldHelp, { color: colors.error }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.fieldHelp, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  destructive = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const background = destructive ? colors.error : colors.primary;
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.82}
      disabled={isDisabled}
      onPress={() => {
        H.impactLight();
        onPress();
      }}
      style={[
        styles.primaryButton,
        { backgroundColor: background, opacity: isDisabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          {icon ? <IconSymbol name={icon} size={19} color="#FFFFFF" /> : null}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.78}
      disabled={disabled}
      onPress={() => {
        H.selectionFeedback();
        onPress();
      }}
      style={[
        styles.secondaryButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {icon ? (
        <IconSymbol name={icon} size={18} color={colors.primary} />
      ) : null}
      <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.76}
      onPress={() => {
        H.selectionFeedback();
        onPress();
      }}
      style={[
        styles.headerButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <IconSymbol name={icon} size={20} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}) {
  const colors = useColors();
  const palette = {
    neutral: { foreground: colors.muted, background: `${colors.muted}18` },
    primary: { foreground: colors.primary, background: `${colors.primary}16` },
    success: { foreground: colors.success, background: `${colors.success}16` },
    warning: { foreground: colors.warning, background: `${colors.warning}18` },
    danger: { foreground: colors.error, background: `${colors.error}16` },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.background }]}>
      <Text style={[styles.pillText, { color: palette.foreground }]}>
        {label}
      </Text>
    </View>
  );
}

export function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const colors = useColors();
  return (
    <SurfaceCard style={{ borderColor: `${colors.error}55` }}>
      <View style={styles.errorRow}>
        <IconSymbol
          name="exclamationmark.circle.fill"
          size={21}
          color={colors.error}
        />
        <View style={styles.errorCopy}>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            Something needs attention
          </Text>
          <Text style={[styles.errorMessage, { color: colors.muted }]}>
            {message}
          </Text>
        </View>
      </View>
      {onRetry ? (
        <SecondaryButton
          label="Try again"
          icon="arrow.clockwise"
          onPress={onRetry}
        />
      ) : null}
    </SurfaceCard>
  );
}

export function LoadingBlock({
  label = "Loading classroom…",
}: {
  label?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.loadingLabel, { color: colors.muted }]}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyBlock({
  icon,
  title,
  detail,
  action,
}: {
  icon: IconName;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  const colors = useColors();
  return (
    <SurfaceCard style={styles.emptyCard}>
      <View
        style={[styles.emptyIcon, { backgroundColor: `${colors.primary}14` }]}
      >
        <IconSymbol name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.emptyDetail, { color: colors.muted }]}>
        {detail}
      </Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </SurfaceCard>
  );
}

export function StatTile({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const colors = useColors();
  const accent =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.error
          : colors.primary;
  return (
    <View
      style={[
        styles.statTile,
        { backgroundColor: `${accent}10`, borderColor: `${accent}30` },
      ]}
    >
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export function formatClassroomDate(
  value: Date | string | null | undefined,
  fallback = "No due date",
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getErrorMessage(
  error: unknown,
  fallback = "Please try again.",
): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 66,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { minWidth: 42, alignItems: "flex-end" },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 14,
  },
  card: { borderWidth: 1, borderRadius: 20, padding: 17 },
  sectionTitleRow: {
    marginTop: 5,
    marginBottom: -3,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.25 },
  sectionDetail: { fontSize: 12, fontWeight: "600" },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: "800" },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  fieldMultiline: { minHeight: 128, paddingTop: 14, textAlignVertical: "top" },
  fieldHelp: { fontSize: 12, lineHeight: 17, paddingHorizontal: 2 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "800" },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.2 },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 14,
  },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 14, fontWeight: "900", marginBottom: 3 },
  errorMessage: { fontSize: 13, lineHeight: 19 },
  loadingBlock: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 13,
  },
  loadingLabel: { fontSize: 14, fontWeight: "600" },
  emptyCard: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontWeight: "900", textAlign: "center" },
  emptyDetail: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  emptyAction: { width: "100%", marginTop: 20 },
  statTile: {
    flex: 1,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  statValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: "700", marginTop: 5 },
});
