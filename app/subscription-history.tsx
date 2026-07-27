import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type HistoryRow = { id: number; productId: string | null; status: string | null; expiresAt: number | null; createdAt: number; updatedAt: number; platform?: string | null; };
const STATUS_CONFIG: Record<string, { label: string; color: string; guidance: string }> = {
  active: { label: "Active", color: "#22C55E", guidance: "Your subscription is active. Enjoy all premium features." },
  cancelled: { label: "Cancelled", color: "#F59E0B", guidance: "Your subscription has been cancelled. Access continues until the expiry date shown below." },
  expired: { label: "Expired", color: "#6B7280", guidance: "This subscription has expired. Upgrade to restore premium access." },
  refunded: { label: "Refunded", color: "#EF4444", guidance: "This subscription was refunded. Premium access has been removed." },
};
function formatDate(ms: number): string { return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function inferPlatform(productId: string | null, platform?: string | null): string | null { const p = platform ?? ""; if (p === "ios" || p === "android") return p; const id = (productId ?? "").toLowerCase(); if (id.includes("android") || id.includes("google") || id.includes("play")) return "android"; if (id.includes("ios") || id.includes("apple")) return "ios"; return null; }
function isCancelledButActive(row: HistoryRow): boolean { return row.status === "cancelled" && row.expiresAt != null && row.expiresAt > Date.now(); }
function isInGracePeriod(row: HistoryRow): boolean { return row.status === "active" && row.expiresAt != null && row.expiresAt < Date.now(); }

function PlatformBadge({ platform, colors }: { platform: string; colors: ReturnType<typeof useColors> }) {
  const label = platform === "ios" ? "iOS" : platform === "android" ? "Android" : null;
  return (<View style={[styles.platformBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}><Text style={[styles.platformText, { color: colors.primary }]}>{label}</Text></View>);
}

function HistoryCard({ item, colors }: { item: HistoryRow; colors: ReturnType<typeof useColors> }) {
  const si = STATUS_CONFIG[item.status ?? ""] ?? { label: item.status ?? "Unknown", color: "#6B7280", guidance: "" };
  const platform = inferPlatform(item.productId, item.platform);
  const cancelledActive = isCancelledButActive(item);
  const gracePeriod = isInGracePeriod(item);
  const displayColor = gracePeriod ? "#F59E0B" : si.color;
  const displayLabel = gracePeriod ? "Grace Period" : cancelledActive ? "Cancelled (Active)" : si.label;
  const displayGuidance = gracePeriod ? "Your payment failed but you are in a grace period. Update your payment method to keep access." : cancelledActive && item.expiresAt != null ? "Premium access continues until " + formatDate(item.expiresAt) + "." : si.guidance;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {gracePeriod && (<View style={[styles.warningBanner, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" }]}><IconSymbol name="exclamationmark.triangle.fill" size={14} color="#F59E0B" /><Text style={[styles.warningText, { color: "#F59E0B" }]}>Payment issue — update your payment method to avoid losing access</Text></View>)}
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: displayColor }]} />
        <Text style={[styles.planLabel, { color: colors.foreground }]}>{formatPlan(item.productId)}</Text>
        <View style={[styles.chip, { backgroundColor: displayColor + "18", borderColor: displayColor + "40" }]}><Text style={[styles.chipText, { color: displayColor }]}>{displayLabel}</Text></View>
      </View>
      {platform != null && (<View style={styles.platformRow}><PlatformBadge platform={platform} colors={colors} /></View>)}
      <View style={styles.cardBody}>
        {item.expiresAt != null && (<View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>{item.status === "cancelled" ? "Access until" : "Renews / Expires"}</Text><Text style={[styles.metaVal, { color: cancelledActive ? "#F59E0B" : colors.foreground, fontWeight: cancelledActive ? "700" : "500" }]}>{formatDate(item.expiresAt)}</Text></View>)}
        <View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>Last updated</Text><Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.updatedAt)}</Text></View>
        <View style={styles.metaRow}><Text style={[styles.metaKey, { color: colors.muted }]}>First seen</Text><Text style={[styles.metaVal, { color: colors.foreground }]}>{formatDate(item.createdAt)}</Text></View>
      </View>
      {displayGuidance !== "" && (<Text style={[styles.guidance, { color: colors.muted }]}>{displayGuidance}</Text>)}
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><IconSymbol name="chevron.left" size={22} color={colors.primary} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Subscription History</Text>
        <View style={styles.backBtn} />
      </View>
      {isLoading && (<View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.centerText, { color: colors.muted }]}>Loading history...</Text></View>)}
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
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  warningText: { fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 16 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  planLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  platformRow: { flexDirection: "row" },
  platformBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  platformText: { fontSize: 11, fontWeight: "600" },
  cardBody: { gap: 6 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaKey: { fontSize: 13 },
  metaVal: { fontSize: 13, fontWeight: "500" },
  guidance: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
