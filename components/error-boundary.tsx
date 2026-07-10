import React, { Component, type ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  children: ReactNode;
  /** Optional fallback label shown in the error card title */
  label?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary — wraps a subtree and catches any render-time JS errors.
 * Shows a friendly "Something went wrong" card with a Retry button.
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
    // Log to console for debugging; replace with a crash reporter in production
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
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
