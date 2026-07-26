"use client";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";
import { getSubjectLabel, getSubjectColor, getSubjectEmoji } from "@/lib/subjects";
import * as H from "@/lib/haptics";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";

const AIRE_KEY = "@tutorsnap/aire_feedback";

interface FeedbackEntry {
  ts: number;
  problem: string;
  subject: string;
  steps: number;
  rating: "short" | "right" | "long";
}

interface SubjectStats {
  subject: string;
  short: number;
  right: number;
  long: number;
  total: number;
}

const RATING_COLORS = {
  short: "#F59E0B", // warning/amber -- too short
  right: "#22C55E", // success/green -- just right
  long: "#EF4444",  // error/red -- too long
};

const RATING_LABELS = {
  short: "Too Short",
  right: "Just Right",
  long: "Too Long",
};

const RATING_ICONS: Record<string, any> = {
  short: "minus.circle",
  right: "checkmark.circle.fill",
  long: "plus.circle",
};

/** Map a multiplier string to a human-readable calibration status */
function calibrationStatus(multiplier: string): {
  label: string;
  color: string;
  description: string;
} {
  const m = parseFloat(multiplier);
  if (m <= 0.75) return { label: "Shorter", color: "#EF4444", description: "AIRE uses fewer tokens for this subject" };
  if (m >= 1.25) return { label: "Longer", color: "#F59E0B", description: "AIRE uses more tokens for this subject" };
  return { label: "Calibrated", color: "#22C55E", description: "AIRE is well-tuned for this subject" };
}

function computeStats(entries: FeedbackEntry[]): {
  total: number;
  short: number;
  right: number;
  long: number;
  bySubject: SubjectStats[];
  recentEntries: FeedbackEntry[];
} {
  const total = entries.length;
  const short = entries.filter((e) => e.rating === "short").length;
  const right = entries.filter((e) => e.rating === "right").length;
  const long = entries.filter((e) => e.rating === "long").length;

  const subjectMap = new Map<string, { short: number; right: number; long: number }>();
  for (const e of entries) {
    const key = e.subject || "other";
    if (!subjectMap.has(key)) subjectMap.set(key, { short: 0, right: 0, long: 0 });
    const s = subjectMap.get(key)!;
    s[e.rating]++;
  }

  const bySubject: SubjectStats[] = Array.from(subjectMap.entries())
    .map(([subject, counts]) => ({
      subject,
      ...counts,
      total: counts.short + counts.right + counts.long,
    }))
    .sort((a, b) => b.total - a.total);

  const recentEntries = entries.slice(0, 20);

  return { total, short, right, long, bySubject, recentEntries };
}

export default function AireAnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  const { user } = useAuth();

  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch per-subject calibrations from DB (authenticated users only)
  const calibrationsQuery = trpc.aire.getSubjectCalibrations.useQuery(undefined, {
    enabled: !!user,
    retry: 1,
  });

  // Build a lookup map: subject -> calibration row
  const calibrationMap = new Map<string, { multiplier: string; sampleCount: number }>();
  if (calibrationsQuery.data?.calibrations) {
    for (const row of calibrationsQuery.data.calibrations) {
      calibrationMap.set(row.subject, { multiplier: row.multiplier, sampleCount: row.sampleCount });
    }
  }

  useEffect(() => {
    AsyncStorage.getItem(AIRE_KEY)
      .then((raw) => {
        if (raw) setEntries(JSON.parse(raw) as FeedbackEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = computeStats(entries);

  const handleClear = () => {
    H.impactLight();
    AsyncStorage.removeItem(AIRE_KEY)
      .then(() => setEntries([]))
      .catch(() => {});
  };

  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        {/* Header */}
        <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>AIRE Analytics</Text>
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            accessibilityLabel="Clear all feedback data"
            accessibilityRole="button"
          >
            <Text style={[styles.clearText, { color: colors.error }]}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

          {loading ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Loading...</Text>
            </View>
          ) : stats.total === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No feedback yet</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Rate AI responses on the solution screen using the Too Short / Just Right / Too Long buttons. Your ratings appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* Overall summary card */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Overall Response Length</Text>
                <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                  Based on {stats.total} rating{stats.total !== 1 ? "s" : ""}
                </Text>

                {/* Three-segment bar — animated */}
                <View style={styles.segmentBarWrap}>
                  {(["short", "right", "long"] as const).map((r) => {
                    const pct = stats.total > 0 ? (stats[r] / stats.total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <AnimatedProgressBar
                        key={r}
                        value={100}
                        color={RATING_COLORS[r]}
                        trackColor="transparent"
                        height={10}
                        borderRadius={0}
                        delay={100}
                        duration={500}
                        style={{ width: `${pct}%` as any }}
                      />
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legendRow}>
                  {(["short", "right", "long"] as const).map((r) => {
                    const pct = stats.total > 0 ? Math.round((stats[r] / stats.total) * 100) : 0;
                    return (
                      <View key={r} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: RATING_COLORS[r] }]} />
                        <View>
                          <Text style={[styles.legendLabel, { color: colors.foreground }]}>
                            {RATING_LABELS[r]}
                          </Text>
                          <Text style={[styles.legendCount, { color: colors.muted }]}>
                            {stats[r]} ({pct}%)
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Insight */}
                {stats.total >= 3 && (
                  <View style={[styles.insightBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
                    <IconSymbol size={14} name="waveform" color={colors.primary} />
                    <Text style={[styles.insightText, { color: colors.primary }]}>
                      {stats.long > stats.short && stats.long > stats.right
                        ? "AIRE is generating responses that feel too long. Consider using Concise Mode in AI Tutor Settings."
                        : stats.short > stats.long && stats.short > stats.right
                        ? "AIRE is generating responses that feel too short. Consider using Detailed Mode in AI Tutor Settings."
                        : `${Math.round((stats.right / stats.total) * 100)}% of responses felt just right -- AIRE is well-calibrated.`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Per-subject breakdown */}
              {stats.bySubject.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>By Subject</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                    {user ? "Calibration badges show how AIRE adjusts token budgets per subject" : "Sign in to see per-subject calibration"}
                  </Text>

                  {stats.bySubject.map((s) => {
                    const subjectColor = getSubjectColor(s.subject);
                    const subjectLabel = getSubjectLabel(s.subject);
                    const subjectEmoji = getSubjectEmoji(s.subject);
                    const rightPct = s.total > 0 ? Math.round((s.right / s.total) * 100) : 0;
                    const shortPct = s.total > 0 ? Math.round((s.short / s.total) * 100) : 0;
                    const longPct = s.total > 0 ? Math.round((s.long / s.total) * 100) : 0;

                    // Per-subject calibration badge from DB
                    const calibRow = calibrationMap.get(s.subject);
                    const calib = calibRow ? calibrationStatus(calibRow.multiplier) : null;

                    return (
                      <View key={s.subject} style={styles.subjectRow}>
                        <View style={styles.subjectLabelRow}>
                          <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
                          <Text style={[styles.subjectLabel, { color: colors.foreground }]} numberOfLines={1}>
                            {subjectEmoji} {subjectLabel}
                          </Text>
                          {calib && (
                            <View style={[styles.calibBadge, { backgroundColor: `${calib.color}18`, borderColor: `${calib.color}40` }]}>
                              <Text style={[styles.calibBadgeText, { color: calib.color }]}>{calib.label}</Text>
                            </View>
                          )}
                          <Text style={[styles.subjectCount, { color: colors.muted }]}>
                            {s.total}
                          </Text>
                        </View>

                        {/* Stacked bar */}
                        <View style={styles.subjectBarRow}>
                          <View style={[styles.subjectTrack, { backgroundColor: colors.border }]}>
                            {shortPct > 0 && (
                              <View
                                style={[
                                  styles.subjectFill,
                                  { width: `${shortPct}%` as any, backgroundColor: RATING_COLORS.short },
                                ]}
                              />
                            )}
                            {rightPct > 0 && (
                              <View
                                style={[
                                  styles.subjectFill,
                                  { width: `${rightPct}%` as any, backgroundColor: RATING_COLORS.right },
                                ]}
                              />
                            )}
                            {longPct > 0 && (
                              <View
                                style={[
                                  styles.subjectFill,
                                  { width: `${longPct}%` as any, backgroundColor: RATING_COLORS.long },
                                ]}
                              />
                            )}
                          </View>
                          <Text style={[styles.subjectPct, { color: RATING_COLORS.right }]}>
                            {rightPct}% ok
                          </Text>
                        </View>

                        {/* Calibration detail row (only when badge exists) */}
                        {calib && calibRow && (
                          <Text style={[styles.calibDetail, { color: colors.muted }]}>
                            {calib.description} ({calibRow.sampleCount} sample{calibRow.sampleCount !== 1 ? "s" : ""})
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Subject Calibration Summary (DB-backed, authenticated only) */}
              {user && calibrationMap.size > 0 && (
                <>
                  <Text style={[styles.sectionHeader, { color: colors.muted }]}>SUBJECT CALIBRATION</Text>
                  <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                      AIRE automatically adjusts token budgets per subject based on your feedback history.
                    </Text>
                    {Array.from(calibrationMap.entries()).map(([subject, row]) => {
                      const status = calibrationStatus(row.multiplier);
                      const subjectLabel = getSubjectLabel(subject);
                      const subjectEmoji = getSubjectEmoji(subject);
                      const multiplierNum = parseFloat(row.multiplier);
                      const multiplierDisplay = multiplierNum === 1.0 ? "1.0x" : `${multiplierNum.toFixed(1)}x`;
                      return (
                        <View key={subject} style={[styles.calibRow, { borderTopColor: colors.border }]}>
                          <View style={styles.calibRowLeft}>
                            <Text style={[styles.calibSubjectText, { color: colors.foreground }]}>
                              {subjectEmoji} {subjectLabel}
                            </Text>
                            <Text style={[styles.calibSampleText, { color: colors.muted }]}>
                              {row.sampleCount} sample{row.sampleCount !== 1 ? "s" : ""}
                            </Text>
                          </View>
                          <View style={styles.calibRowRight}>
                            <Text style={[styles.calibMultiplierText, { color: status.color }]}>
                              {multiplierDisplay}
                            </Text>
                            <View style={[styles.calibBadge, { backgroundColor: `${status.color}18`, borderColor: `${status.color}40` }]}>
                              <Text style={[styles.calibBadgeText, { color: status.color }]}>{status.label}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Recent ratings */}
              <Text style={[styles.sectionHeader, { color: colors.muted }]}>RECENT RATINGS</Text>
              {stats.recentEntries.map((e, i) => {
                const subjectLabel = getSubjectLabel(e.subject);
                const subjectEmoji = getSubjectEmoji(e.subject);
                const date = new Date(e.ts);
                const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <View
                    key={`${e.ts}-${i}`}
                    style={[styles.recentRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={[styles.recentIconWrap, { backgroundColor: `${RATING_COLORS[e.rating]}15` }]}>
                      <IconSymbol size={16} name={RATING_ICONS[e.rating]} color={RATING_COLORS[e.rating]} />
                    </View>
                    <View style={styles.recentContent}>
                      <Text style={[styles.recentProblem, { color: colors.foreground }]} numberOfLines={1}>
                        {e.problem || "Unknown problem"}
                      </Text>
                      <Text style={[styles.recentMeta, { color: colors.muted }]}>
                        {subjectEmoji} {subjectLabel} · {e.steps} step{e.steps !== 1 ? "s" : ""} · {dateStr}
                      </Text>
                    </View>
                    <Text style={[styles.recentRating, { color: RATING_COLORS[e.rating] }]}>
                      {RATING_LABELS[e.rating]}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "700" },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 14, fontWeight: "600" },

  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 64,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },

  card: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSubtitle: { fontSize: 12, marginBottom: 4 },

  segmentBarWrap: {
    flexDirection: "row",
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "transparent",
    gap: 2,
    marginTop: 4,
  },
  segmentBarFill: {
    height: 10,
    borderRadius: 6,
  },

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: { fontSize: 11, fontWeight: "600" },
  legendCount: { fontSize: 10, marginTop: 1 },

  insightBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  insightText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "500" },

  subjectRow: { marginBottom: 12 },
  subjectLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  subjectCount: { fontSize: 11 },
  subjectBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subjectTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    flexDirection: "row",
  },
  subjectFill: { height: 8 },
  subjectPct: { fontSize: 11, fontWeight: "700", minWidth: 44, textAlign: "right" },

  calibBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  calibBadgeText: { fontSize: 10, fontWeight: "700" },
  calibDetail: { fontSize: 11, marginTop: 3, lineHeight: 15 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },

  calibRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 0.5,
  },
  calibRowLeft: { flex: 1 },
  calibSubjectText: { fontSize: 13, fontWeight: "600" },
  calibSampleText: { fontSize: 11, marginTop: 2 },
  calibRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  calibMultiplierText: { fontSize: 13, fontWeight: "700" },

  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  recentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recentContent: { flex: 1 },
  recentProblem: { fontSize: 13, fontWeight: "600" },
  recentMeta: { fontSize: 11, marginTop: 2 },
  recentRating: { fontSize: 11, fontWeight: "700" },
});
