import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type HistoryRow = { id: number; productId: string | null; status: string | null; expiresAt: number | null; createdAt: number; updatedAt: number; };
const STATUS_CONFIG: Record<string, { label: string; color: string }> = { active: { label: "Active", color: "#22C55E" }, cancelled: { label: "Cancelled", color: "#F59E0B" }, expired: { label: "Expired", color: "#6B7280" }, refunded: { label: "Refunded", color: "#EF4444" } };
function formatDate(ms: number) { return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function formatPlan(id: string | null) { if (!id) return "Unknown plan"; if (id.includes("annual")) return "Annual Plan"; if (id.includes("monthly")) return "Monthly Plan"; return id; }

function HistoryCard({ item, colors }: { item: HistoryRow; colors: ReturnType<typeof useColors> }) {
  const si = STATUS_CONFIG[item.status ?? ""] ?? { label: item.status ?? "Unknown", color: "#6B7280" };
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: si.color }]} />
        <Text style={[styles.planLabel, { color: colors.foreground }]}>{formatPlan(item.productId)}</Text>
        <View style={[styles.chip, { backgroundColor: `${si.color}18`, borderColor: `${si.color}40` }]}>
          <Text style={[styles.chipText, { color: si.color }]}>{si.label}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>Updated</Text><Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.updatedAt)}</Text></View>
        {item.expiresAt != null && <View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>Expires</Text><Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.expiresAt)}</Text></View>}
        <View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>First seen</Text><Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.createdAt)}</Text></View>
      </View>
    </View>
  );
}

export default function SubscriptionHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data, isLoading, error, refetch } = trpc.subscription.history.useQuery(undefined, { staleTime: 2 * 60 * 1000, retry: false });
  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="chevron.left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Subscription History</Text>
        <View style={styles.backBtn} />
      </View>
      {isLoading && <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.centerText, { color: colors.muted }]}>Loading history...</Text></View>}
      {error != null && !isLoading && (
        <View style={styles.center}>
          <IconSymbol name="exclamationmark.circle.fill" size={40} color={colors.error} />
          <Text style={[styles.centerText, { color: colors.muted }]}>{error.message.includes("UNAUTHORIZED") ? "Sign in to view your subscription history." : "Could not load history. Please try again."}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => refetch()}><Text style={[styles.retryText, { color: colors.background }]}>Retry</Text></TouchableOpacity>
        </View>
      )}
      {!isLoading && error == null && data != null && data.length === 0 && (
        <View style={styles.center}>
          <IconSymbol name="clock.fill" size={40} color={colors.muted} />
          <Text style={[styles.centerTitle, { color: colors.foreground }]}>No history yet</Text>
          <Text style={[styles.centerText, { color: colors.muted }]}>Your subscription events will appear here after your first purchase or renewal.</Text>
        </View>
      )}
      {!isLoading && error == null && data != null && data.length > 0 && (
        <FlatList data={data} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <HistoryCard item={item} colors={colors} />} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={[styles.listMeta, { color: colors.muted }]}>{data.length} event{data.length !== 1 ? "s" : ""} - most recent first</Text>} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  centerTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  centerText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { fontSize: 15, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  listMeta: { fontSize: 12, fontWeight: "600", marginBottom: 4, letterSpacing: 0.3 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  planLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  cardBody: { gap: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaKey: { fontSize: 13 },
  metaVal: { fontSize: 13, fontWeight: "500" },
});
