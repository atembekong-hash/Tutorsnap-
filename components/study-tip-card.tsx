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
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const TIP_CACHE_KEY = "tutorsnap_study_tip_cache";
const TIP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedTip {
  tip: string;
  subject: string;
  cachedAt: number;
}

interface StudyTipCardProps {
  subject: string; // the currently selected subject
}

export function StudyTipCard({ subject }: StudyTipCardProps) {
  const colors = useColors();
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tipSubject, setTipSubject] = useState<string>("");

  const tipMutation = trpc.academic.studyTip.useMutation({
    onSuccess: async (data) => {
      setTip(data.tip);
      setTipSubject(subject);
      setLoading(false);
      // Cache it
      const cache: CachedTip = { tip: data.tip, subject, cachedAt: Date.now() };
      await AsyncStorage.setItem(TIP_CACHE_KEY, JSON.stringify(cache));
    },
    onError: () => {
      setLoading(false);
    },
  });

  const fetchTip = useCallback(
    async (forceRefresh = false) => {
      if (loading) return;
      // Check cache first
      if (!forceRefresh) {
        try {
          const raw = await AsyncStorage.getItem(TIP_CACHE_KEY);
          if (raw) {
            const cached: CachedTip = JSON.parse(raw);
            const age = Date.now() - cached.cachedAt;
            if (age < TIP_CACHE_TTL_MS && cached.subject === subject) {
              setTip(cached.tip);
              setTipSubject(cached.subject);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      setLoading(true);
      tipMutation.mutate({ subject });
    },
    [subject, loading]
  );

  // Fetch on mount and when subject changes
  useEffect(() => {
    fetchTip(false);
  }, [subject]);

  const handleRefresh = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchTip(true);
  };

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
        </View>
        <TouchableOpacity
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
    marginTop: 12,
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
  refreshBtn: { padding: 4 },
  refreshIcon: { fontSize: 20, fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { fontSize: 13 },
  tipText: { fontSize: 14, lineHeight: 21 },
  tapText: { fontSize: 13, lineHeight: 20 },
});
