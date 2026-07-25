import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";
import { captureError } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  /** Optional fallback label shown in the error card title */
  label?: string;
}

interface InternalProps extends Props {
  colors: ThemeColorPalette;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

interface CrashReport {
  id: string;
  label: string;
  message: string;
  stack: string;
  componentStack: string;
  platform: string;
  timestamp: number;
}

const CRASH_LOG_KEY = "tutorsnap_crash_log";
const MAX_CRASH_LOGS = 20;

/**
 * Persist a crash report to AsyncStorage so it can be reviewed later.
 * Keeps only the last MAX_CRASH_LOGS entries to avoid unbounded growth.
 */
async function persistCrashReport(report: CrashReport) {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    const existing: CrashReport[] = raw ? JSON.parse(raw) : [];
    const updated = [report, ...existing].slice(0, MAX_CRASH_LOGS);
    await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(updated));
  } catch {
    // Silently ignore storage errors — crash reporting must never throw
  }
}

/**
 * Read all stored crash reports. Useful for a debug/support screen.
 */
export async function getCrashReports(): Promise<CrashReport[]> {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear all stored crash reports.
 */
export async function clearCrashReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CRASH_LOG_KEY);
  } catch {
    // ignore
  }
}

/**
 * Internal class component — receives colors as props so it can use theme tokens
 * without needing hooks (class components can't use hooks directly).
 */
class ErrorBoundaryClass extends Component<InternalProps, State> {
  constructor(props: InternalProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const report: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: this.props.label ?? "Unknown",
      message: error?.message ?? "Unknown error",
      stack: error?.stack ?? "",
      componentStack: info.componentStack ?? "",
      platform: Platform.OS,
      timestamp: Date.now(),
    };

    // Log to console for immediate debugging
    console.error(
      `[ErrorBoundary:${report.label}] ${report.message}\n` +
      `Component stack: ${report.componentStack}`
    );

    // Report to Sentry for remote crash tracking
    captureError(error, {
      screen: `ErrorBoundary:${report.label}`,
      action: "componentDidCatch",
      extra: { componentStack: report.componentStack.slice(0, 500) },
    });

    // Persist to AsyncStorage for later review / support
    persistCrashReport(report);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    const { colors } = this.props;

    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Something went wrong</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {this.props.label
              ? `The ${this.props.label} section ran into a problem.`
              : "This section ran into a problem."}
          </Text>
          <Text style={[styles.hint, { color: colors.muted }]}>Tap below to try again.</Text>
          <TouchableOpacity
            accessibilityLabel="Retry"
            onPress={this.handleRetry}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorBoundary — wraps a subtree and catches any render-time JS errors.
 * Shows a friendly "Something went wrong" card with a Retry button.
 * Crash details are persisted to AsyncStorage for later review.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary label="Home">
 *   <HomeContent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({ children, label }: Props) {
  const colors = useColors();
  return (
    <ErrorBoundaryClass colors={colors} label={label}>
      {children}
    </ErrorBoundaryClass>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  retryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
});
