import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  children: ReactNode;
  /** Optional fallback label shown in the error card title */
  label?: string;
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
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
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

    // Persist to AsyncStorage for later review / support
    persistCrashReport(report);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.props.label
              ? `The ${this.props.label} section ran into a problem.`
              : "This section ran into a problem."}
          </Text>
          <Text style={styles.hint}>Tap below to try again.</Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            style={styles.retryBtn}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "transparent",
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
    color: "#11181C",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#687076",
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    color: "#9BA1A6",
    textAlign: "center",
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: "#6C5CE7",
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
