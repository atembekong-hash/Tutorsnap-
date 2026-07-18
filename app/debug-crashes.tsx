import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { getCrashReports, clearCrashReports } from "@/components/error-boundary";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function DebugCrashesScreen() {
  const colors = useColors();
  const [crashes, setCrashes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const reports = await getCrashReports();
      setCrashes(reports);
    })();
  }, []);

  const handleClear = async () => {
    await clearCrashReports();
    setCrashes([]);
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Text style={[styles.title, { color: colors.foreground }]}>Crash Reports</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Total: {crashes.length}
        </Text>

        {crashes.length === 0 ? (
          <Text style={[styles.text, { color: colors.muted }]}>No crashes recorded</Text>
        ) : (
          crashes.map((crash, idx) => (
            <View
              key={crash.id}
              style={[
                styles.crashCard,
                { backgroundColor: colors.surface, borderColor: colors.error },
              ]}
            >
              <Text style={[styles.crashLabel, { color: colors.error }]}>
                #{crashes.length - idx} - {crash.label}
              </Text>
              <Text style={[styles.crashTime, { color: colors.muted }]}>
                {new Date(crash.timestamp).toLocaleString()}
              </Text>
              <Text style={[styles.crashMessage, { color: colors.foreground }]}>
                {crash.message}
              </Text>
              {crash.stack && (
                <Text style={[styles.crashStack, { color: colors.muted }]}>
                  {crash.stack.substring(0, 500)}
                </Text>
              )}
              {crash.componentStack && (
                <Text style={[styles.crashStack, { color: colors.muted }]}>
                  Component: {crash.componentStack.substring(0, 300)}
                </Text>
              )}
            </View>
          ))
        )}

        {crashes.length > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: colors.error }]}
            onPress={handleClear}
          >
            <Text style={styles.clearBtnText}>Clear All Crashes</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  text: {
    fontSize: 14,
    marginBottom: 16,
  },
  crashCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  crashLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  crashTime: {
    fontSize: 12,
    marginBottom: 8,
  },
  crashMessage: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
  },
  crashStack: {
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  clearBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
