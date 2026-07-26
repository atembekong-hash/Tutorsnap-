/**
 * app/ab-test-dashboard.tsx
 * Hidden developer screen — A/B test results dashboard.
 *
 * Access: long-press the version footer in Settings.
 * Shows a breakdown of all stored A/B analytics events grouped by
 * variant and event type, plus a raw event log.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import {
  clearAbTestAnalyticsEvents,
  getAbTestAnalyticsEvents,
  type AbTestAnalyticsEvent,
  type AbTestEvent,
  type TrialVariant,
} from "@/lib/ab-test";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VariantRow {
  variant: TrialVariant;
  paywall_view: number;
  trial_started: number;
  purchase_completed: number;
  restore_completed: number;
  total: number;
  conversionRate: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_EVENTS: AbTestEvent[] = [
  "paywall_view",
  "trial_started",
  "purchase_completed",
  "restore_completed",
];

function buildSummary(events: AbTestAnalyticsEvent[]): VariantRow[] {
  const variants: TrialVariant[] = ["14day", "7day_50off"];
  return variants.map((variant) => {
    const variantEvents = events.filter((e) => e.variant === variant);
    const counts = Object.fromEntries(
      ALL_EVENTS.map((ev) => [ev, variantEvents.filter((e) => e.event === ev).length]),
    ) as Record<AbTestEvent, number>;
    const views = counts.paywall_view;
    const conversions = counts.trial_started + counts.purchase_completed;
    const rate = views > 0 ? `${((conversions / views) * 100).toFixed(1)}%` : "—";
    return {
      variant,
      paywall_view: counts.paywall_view,
      trial_started: counts.trial_started,
      purchase_completed: counts.purchase_completed,
      restore_completed: counts.restore_completed,
      total: variantEvents.length,
      conversionRate: rate,
    };
  });
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AbTestDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AbTestAnalyticsEvent[]>([]);
  const [summary, setSummary] = useState<VariantRow[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getAbTestAnalyticsEvents();
    // Newest first in the raw log
    const sorted = [...data].sort((a, b) => b.timestamp - a.timestamp);
    setEvents(sorted);
    setSummary(buildSummary(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClear = useCallback(() => {
    Alert.alert(
      "Clear All Events",
      "This will permanently delete all stored A/B analytics events. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAbTestAnalyticsEvents();
            await loadData();
          },
        },
      ],
    );
  }, [loadData]);

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>A/B Dashboard</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>A/B Dashboard</Text>
        <TouchableOpacity onPress={handleClear} style={s.clearBtn} hitSlop={12}>
          <Text style={s.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary section */}
        <Text style={s.sectionTitle}>Variant Summary</Text>
        <Text style={s.totalLabel}>Total events: {events.length}</Text>

        {/* Summary table */}
        <View style={s.tableCard}>
          {/* Table header */}
          <View style={[s.tableRow, s.tableHeaderRow]}>
            <Text style={[s.tableCell, s.tableCellVariant, s.tableHeaderText]}>Variant</Text>
            <Text style={[s.tableCell, s.tableCellNum, s.tableHeaderText]}>Views</Text>
            <Text style={[s.tableCell, s.tableCellNum, s.tableHeaderText]}>Trials</Text>
            <Text style={[s.tableCell, s.tableCellNum, s.tableHeaderText]}>Buys</Text>
            <Text style={[s.tableCell, s.tableCellNum, s.tableHeaderText]}>Conv.</Text>
          </View>
          {summary.map((row, idx) => (
            <View
              key={row.variant}
              style={[s.tableRow, idx < summary.length - 1 && s.tableRowBorder]}
            >
              <Text style={[s.tableCell, s.tableCellVariant, s.variantLabel]} numberOfLines={1}>
                {row.variant}
              </Text>
              <Text style={[s.tableCell, s.tableCellNum, s.numText]}>{row.paywall_view}</Text>
              <Text style={[s.tableCell, s.tableCellNum, s.numText]}>{row.trial_started}</Text>
              <Text style={[s.tableCell, s.tableCellNum, s.numText]}>{row.purchase_completed}</Text>
              <Text style={[s.tableCell, s.tableCellNum, s.convText]}>{row.conversionRate}</Text>
            </View>
          ))}
        </View>

        {/* Per-variant detail cards */}
        {summary.map((row) => (
          <View key={row.variant} style={s.detailCard}>
            <Text style={s.detailVariantName}>{row.variant}</Text>
            <View style={s.detailGrid}>
              <View style={s.detailItem}>
                <Text style={s.detailValue}>{row.paywall_view}</Text>
                <Text style={s.detailLabel}>Paywall Views</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailValue}>{row.trial_started}</Text>
                <Text style={s.detailLabel}>Trials Started</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailValue}>{row.purchase_completed}</Text>
                <Text style={s.detailLabel}>Purchases</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailValue}>{row.restore_completed}</Text>
                <Text style={s.detailLabel}>Restores</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={[s.detailValue, { color: colors.primary }]}>{row.conversionRate}</Text>
                <Text style={s.detailLabel}>Conversion</Text>
              </View>
              <View style={s.detailItem}>
                <Text style={s.detailValue}>{row.total}</Text>
                <Text style={s.detailLabel}>Total Events</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Raw event log */}
        <Text style={s.sectionTitle}>Recent Events</Text>
        {events.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No events recorded yet.</Text>
            <Text style={s.emptySubtext}>
              Events are logged when users view the paywall, start a trial, or complete a purchase.
            </Text>
          </View>
        ) : (
          events.slice(0, 100).map((ev, idx) => (
            <View key={`${ev.timestamp}-${idx}`} style={s.eventRow}>
              <View style={s.eventLeft}>
                <Text style={s.eventName}>{ev.event}</Text>
                <Text style={s.eventVariant}>{ev.variant}</Text>
              </View>
              <Text style={s.eventTime}>{formatTs(ev.timestamp)}</Text>
            </View>
          ))
        )}
        {events.length > 100 && (
          <Text style={s.truncatedNote}>Showing 100 of {events.length} events</Text>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      minWidth: 60,
    },
    backText: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: "500",
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.foreground,
    },
    clearBtn: {
      minWidth: 60,
      alignItems: "flex-end",
    },
    clearText: {
      fontSize: 15,
      color: colors.error,
      fontWeight: "500",
    },
    scroll: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 20,
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 8,
    },
    tableCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    tableHeaderRow: {
      backgroundColor: `${colors.primary}15`,
    },
    tableRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tableHeaderText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
    },
    tableCell: {
      fontSize: 13,
    },
    tableCellVariant: {
      flex: 2,
    },
    tableCellNum: {
      flex: 1,
      textAlign: "center",
    },
    variantLabel: {
      color: colors.foreground,
      fontWeight: "600",
      fontSize: 12,
    },
    numText: {
      color: colors.foreground,
      fontWeight: "500",
    },
    convText: {
      color: colors.primary,
      fontWeight: "700",
    },
    detailCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    detailVariantName: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 12,
    },
    detailGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    detailItem: {
      width: "30%",
      alignItems: "center",
    },
    detailValue: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.foreground,
    },
    detailLabel: {
      fontSize: 11,
      color: colors.muted,
      textAlign: "center",
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      marginBottom: 6,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 18,
    },
    eventRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    eventLeft: {
      flex: 1,
      gap: 2,
    },
    eventName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.foreground,
    },
    eventVariant: {
      fontSize: 11,
      color: colors.muted,
    },
    eventTime: {
      fontSize: 11,
      color: colors.muted,
    },
    truncatedNote: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      marginTop: 12,
    },
  });
}
