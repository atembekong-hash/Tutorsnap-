import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as H from "@/lib/haptics";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { GRADE_LABELS } from "@/lib/grade-levels";

const TIP_CACHE_KEY = "tutorsnap_study_tip_cache";
const TIP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTip {
  tip: string;
  subject: string;
  gradeLevel: string | null;
  cachedAt: number;
}

interface StudyTipCardProps {
  subject: string; // the currently selected subject
  gradeLevel?: string | null;
}

export function StudyTipCard({ subject, gradeLevel = null }: StudyTipCardProps) {
  const colors = useColors();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipSubject, setTipSubject] = useState<string>("");
  const [tipGrade, setTipGrade] = useState<string | null>(null);

  const tipMutation = trpc.academic.studyTip.useMutation({
    onSuccess: async (data) => {
      setTip(data.tip);
      setTipSubject(subject);
      setTipGrade(gradeLevel);
      setLoading(false);
      // Cache it — include gradeLevel so tips don't mix across grade levels
      const cache: CachedTip = { tip: data.tip, subject, gradeLevel, cachedAt: Date.now() };
      await AsyncStorage.setItem(TIP_CACHE_KEY, JSON.stringify(cache));
    },
    onError: () => {
      setLoading(false);
    },
  });

  const fetchTip = useCallback(
    async (forceRefresh = false) => {
      if (loading) return;
      // Check cache first — invalidate if subject or gradeLevel changed
      if (!forceRefresh) {
        try {
          const raw = await AsyncStorage.getItem(TIP_CACHE_KEY);
          if (raw) {
            const cached: CachedTip = JSON.parse(raw);
            const age = Date.now() - cached.cachedAt;
            if (
              age < TIP_CACHE_TTL_MS &&
              cached.subject === subject &&
              (cached.gradeLevel ?? null) === (gradeLevel ?? null)
            ) {
              setTip(cached.tip);
              setTipSubject(cached.subject);
              setTipGrade(cached.gradeLevel ?? null);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      setLoading(true);
      tipMutation.mutate({ subject, gradeLevel: gradeLevel ?? undefined });
    },
    [subject, gradeLevel, loading]
  );

  // Fetch on mount and when subject or gradeLevel changes
  useEffect(() => {
    fetchTip(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, gradeLevel]);

  const handleRefresh = () => {
    H.impactLight();
    fetchTip(true);
  };

  const gradeLabelText = tipGrade ? GRADE_LABELS[tipGrade] ?? tipGrade : null;

  return (
    <View style={[styles.card, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}25` }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.bulbEmoji}>💡</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Tip of the Day</Text>
          {tipSubject ? (
            <View style={[styles.subjectPill, { backgroundColor: `${colors.primary}18` }]}>
              <Text style={[styles.subjectPillText, { color: colors.primary }]} numberOfLines={1}>
                {tipSubject.replace(/_/g, " ")}
              </Text>
            </View>
          ) : null}
          {gradeLabelText ? (
            <View style={[styles.gradePill, { backgroundColor: `${colors.primary}12` }]}>
              <Text style={[styles.gradePillText, { color: colors.primary }]} numberOfLines={1}>
                {gradeLabelText}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityLabel="Refresh study tip"
          onPress={handleRefresh}
          disabled={loading}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.refreshIcon, { color: loading ? colors.muted : colors.primary }]}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Generating tip…</Text>
        </View>
      ) : tip ? (
        <Text style={[styles.tipText, { color: colors.foreground }]}>{tip}</Text>
      ) : (
        <TouchableOpacity onPress={() => fetchTip(true)} activeOpacity={0.75}>
          <Text style={[styles.tapText, { color: colors.muted }]}>Tap ↻ to get a study tip for {subject.replace(/_/g, " ")}.</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  bulbEmoji: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: "700" },
  subjectPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 120,
  },
  subjectPillText: { fontSize: 11, fontWeight: "600" },
  gradePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 100,
  },
  gradePillText: { fontSize: 11, fontWeight: "600" },
  refreshBtn: { padding: 4 },
  refreshIcon: { fontSize: 20, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13 },
  tipText: { fontSize: 14, lineHeight: 21 },
  tapText: { fontSize: 13, lineHeight: 20 },
});
