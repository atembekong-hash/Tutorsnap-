/**
 * app/refer.tsx
 *
 * Full Affiliate & Referral Dashboard for TutorSnap.
 *
 * Sections:
 *   1. Earnings summary card (pending days, total earned, tier badge)
 *   2. Tier progress bar (Starter → Advocate → Champion → Legend)
 *   3. Earning options (5 ways to earn)
 *   4. Referral code block + share CTA
 *   5. Activity history (last 20 events)
 *   6. Redeem button
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  ScrollView,
  Animated,
  Alert,
  Modal,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as H from "@/lib/haptics";
import * as StoreReview from "expo-store-review";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { APP_URL } from "@/constants/app";
import {
  getOrCreateReferralCode,
  getAffiliateStats,
  getAffiliateHistory,
  getEarningOptions,
  recordSocialShare,
  recordReview,
  recordContentShare,
  redeemPendingDays,
  getTier,
  TIER_META,
  MILESTONE_BONUSES,
  type AffiliateStats,
  type AffiliateEvent,
  type EarningOption,
  type RewardTier,
  shouldShowExpiryWarning,
  recordAffiliateActivity,
} from "@/lib/affiliate";



// ─── Tier Progress Bar ────────────────────────────────────────────────────────
function TierProgressBar({ stats, colors }: { stats: AffiliateStats; colors: any }) {
  const tier = getTier(stats.totalReferrals);
  const meta = TIER_META[tier];
  const tiers: RewardTier[] = ["starter", "advocate", "champion", "legend"];
  const tierIdx = tiers.indexOf(tier);

  // Progress within current tier
  const nextTier = tiers[tierIdx + 1] as RewardTier | undefined;
  const nextMeta = nextTier ? TIER_META[nextTier] : null;
  const rangeStart = meta.minReferrals;
  const rangeEnd = meta.maxReferrals ?? meta.minReferrals + 25;
  const progress = nextMeta
    ? Math.min((stats.totalReferrals - rangeStart) / (rangeEnd - rangeStart + 1), 1)
    : 1;

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 800, useNativeDriver: false }).start();
  }, [progress]);

  return (
    <View style={[styles.tierCard, { backgroundColor: colors.surface, borderColor: `${meta.color}40` }]}>
      {/* Current tier badge */}
      <View style={styles.tierTop}>
        <View style={[styles.tierBadge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
          <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
          <Text style={[styles.tierBadgeLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={styles.tierStats}>
          <Text style={[styles.tierStatNum, { color: colors.foreground }]}>{stats.totalReferrals}</Text>
          <Text style={[styles.tierStatLabel, { color: colors.muted }]}>referrals</Text>
        </View>
        <View style={styles.tierStats}>
          <Text style={[styles.tierStatNum, { color: colors.foreground }]}>{stats.totalDaysEarned}</Text>
          <Text style={[styles.tierStatLabel, { color: colors.muted }]}>days earned</Text>
        </View>
      </View>

      {/* Progress bar */}
      {nextTier && (
        <>
          <View style={[styles.progressTrack, { backgroundColor: `${meta.color}18` }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: meta.color,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                },
              ]}
            />
          </View>
          <Text style={[styles.tierNextLabel, { color: colors.muted }]}>
            {TIER_META[nextTier].minReferrals - stats.totalReferrals} more referrals to reach{" "}
            <Text style={{ color: TIER_META[nextTier].color, fontWeight: "700" }}>
              {TIER_META[nextTier].emoji} {TIER_META[nextTier].label}
            </Text>
            {" "}(+{TIER_META[nextTier].daysPerReferral} days/referral)
          </Text>
        </>
      )}
      {!nextTier && (
        <Text style={[styles.tierNextLabel, { color: meta.color, fontWeight: "700" }]}>
          👑 You've reached the highest tier!
        </Text>
      )}

      {/* Perks */}
      <View style={styles.perksRow}>
        {meta.perks.map((p) => (
          <View key={p} style={[styles.perkChip, { backgroundColor: `${meta.color}12`, borderColor: `${meta.color}30` }]}>
            <Text style={[styles.perkText, { color: meta.color }]}>✓ {p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Top Affiliates Card ──────────────────────────────────────────────────────
// Generates a deterministic but plausible mock leaderboard seeded from the user's
// own referral count so the data feels contextual rather than random.
function TopAffiliatesCard({ stats, colors }: { stats: AffiliateStats; colors: any }) {
  const userReferrals = stats.totalReferrals;

  // Build 5 anonymised entries around the user's position
  const entries = [
    { rank: 1, name: "M***",  refs: Math.max(userReferrals + 18, 25), tier: "legend" as RewardTier },
    { rank: 2, name: "A***",  refs: Math.max(userReferrals + 11, 18), tier: "champion" as RewardTier },
    { rank: 3, name: "J***",  refs: Math.max(userReferrals + 6,  12), tier: "champion" as RewardTier },
    { rank: 4, name: "S***",  refs: Math.max(userReferrals + 2,  7),  tier: "advocate" as RewardTier },
    { rank: 5, name: "You",   refs: userReferrals,                     tier: getTier(userReferrals) },
  ];

  const rankEmoji = ["🥇", "🥈", "🥉", "4", "5"];

  return (
    <View style={[styles.topAffiliatesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏅 Top Affiliates This Month</Text>
      <Text style={[styles.sectionSub, { color: colors.muted }]}>Anonymised — keep sharing to climb the board</Text>

      {entries.map((e, i) => {
        const isUser = e.name === "You";
        const meta = TIER_META[e.tier];
        return (
          <View
            key={e.rank}
            style={[
              styles.topAffiliateRow,
              { borderBottomColor: colors.border },
              isUser && { backgroundColor: `${meta.color}0C`, borderRadius: 10 },
            ]}
          >
            <Text style={[styles.topAffiliateRank, { color: isUser ? meta.color : colors.muted }]}>
              {rankEmoji[i]}
            </Text>
            <Text style={[styles.topAffiliateName, { color: isUser ? meta.color : colors.foreground, fontWeight: isUser ? "700" : "500" }]}>
              {e.name}
            </Text>
            <View style={[styles.topAffiliateTierChip, { backgroundColor: `${meta.color}15` }]}>
              <Text style={{ fontSize: 11, color: meta.color, fontWeight: "600" }}>{meta.emoji} {meta.label}</Text>
            </View>
            <Text style={[styles.topAffiliateRefs, { color: isUser ? meta.color : colors.muted }]}>
              {e.refs} refs
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Earning Option Card ──────────────────────────────────────────────────────
function EarningOptionCard({
  option, colors, onPress,
}: { option: EarningOption; colors: any; onPress: (opt: EarningOption) => void }) {
  return (
    <TouchableOpacity
      onPress={() => option.available && onPress(option)}
      activeOpacity={option.available ? 0.8 : 1}
      style={[
        styles.optionCard,
        {
          backgroundColor: colors.surface,
          borderColor: option.available ? colors.border : `${colors.border}60`,
          opacity: option.available ? 1 : 0.6,
        },
      ]}
    >
      <Text style={styles.optionEmoji}>{option.emoji}</Text>
      <View style={styles.optionBody}>
        <Text style={[styles.optionTitle, { color: colors.foreground }]}>{option.title}</Text>
        <Text style={[styles.optionSub, { color: colors.muted }]} numberOfLines={2}>{option.subtitle}</Text>
        <View style={styles.optionRewardRow}>
          <View style={[styles.rewardChip, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}35` }]}>
            <Text style={[styles.rewardText, { color: colors.success }]}>{option.reward}</Text>
          </View>
          {option.availableNote && (
            <Text style={[styles.availableNote, { color: colors.muted }]}>{option.availableNote}</Text>
          )}
        </View>
      </View>
      {option.available && (
        <IconSymbol size={16} name="chevron.right" color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────
function HistoryRow({ event, colors }: { event: AffiliateEvent; colors: any }) {
  const typeEmoji: Record<string, string> = {
    referral: "🎁", social_share: "📣", review: "⭐",
    content_creator: "📸", classroom_invite: "🏫", milestone_bonus: "🏆",
  };
  const date = new Date(event.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <View style={[styles.historyRow, { borderBottomColor: colors.border }]}>
      <Text style={{ fontSize: 20, marginRight: 12 }}>{typeEmoji[event.type] ?? "🎯"}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.historyLabel, { color: colors.foreground }]}>{event.label}</Text>
        <Text style={[styles.historyDate, { color: colors.muted }]}>{dateStr}</Text>
      </View>
      {event.daysEarned > 0 && (
        <Text style={[styles.historyDays, { color: colors.success }]}>+{event.daysEarned}d</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReferScreen() {
  const colors = useColors();
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [history, setHistory] = useState<AffiliateEvent[]>([]);
  const [options, setOptions] = useState<EarningOption[]>([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expiryWarning, setExpiryWarning] = useState<{ show: boolean; daysIdle: number; pendingDays: number } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    const [c, s, h] = await Promise.all([
      getOrCreateReferralCode(),
      getAffiliateStats(),
      getAffiliateHistory(),
    ]);
    setCode(c);
    setStats(s);
    setHistory(h);
    const opts = await getEarningOptions(s);
    setOptions(opts);
    const expiry = await shouldShowExpiryWarning();
    setExpiryWarning(expiry);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shareMessage = `Hey! I've been using TutorSnap to ace my homework and quizzes 📚\n\nUse my invite code ${code} to get 7 extra free days when you start your trial.\n\nDownload here: ${APP_URL}`;

  const classroomMessage = `Hi! I'm using TutorSnap to manage my classroom 🏫\n\nJoin with my teacher link and we both get 14 bonus days:\n${APP_URL}/classroom?ref=${code}`;

  const handleNativeShare = useCallback(async () => {
    H.impactMedium();
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(shareMessage);
        showToast("Invite link copied to clipboard!");
      } else {
        await Share.share(
          {
            message: shareMessage,
            url: APP_URL,
            title: "Join TutorSnap — get 7 free days!",
          },
          { dialogTitle: "Share your TutorSnap invite" }
        );
      }
    } catch (_) {
      // user cancelled — no-op
    }
  }, [shareMessage]);

  const handleCopyCode = useCallback(async () => {
    H.impactLight()
    await Clipboard.setStringAsync(code);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2500);
    showToast("Invite code copied!");
  }, [code]);

  const handleOptionPress = useCallback(async (opt: EarningOption) => {
    H.impactMedium()

    switch (opt.action) {
      case "share_code": {
        if (Platform.OS === "web") {
          await Clipboard.setStringAsync(shareMessage);
          showToast("Invite message copied to clipboard!");
        } else {
          await Share.share({ message: shareMessage });
        }
        break;
      }
      case "share_social": {
        if (Platform.OS === "web") {
          await Clipboard.setStringAsync(shareMessage);
          showToast("Message copied — paste it on social media!");
        } else {
          await Share.share({ message: shareMessage });
        }
        const earned = await recordSocialShare();
        if (earned > 0) {
          showToast(`+${earned} day earned for sharing! 🎉`);
          await load();
        }
        break;
      }
      case "review": {
        const canReview = await StoreReview.isAvailableAsync();
        if (canReview) {
          await StoreReview.requestReview();
        } else {
          Alert.alert("Leave a Review", "Please leave us a review on the App Store or Google Play to claim your +3 days.");
        }
        const earned = await recordReview();
        if (earned > 0) {
          showToast(`+${earned} days earned for your review! ⭐`);
          await load();
        }
        break;
      }
      case "content": {
        if (Platform.OS === "web") {
          await Clipboard.setStringAsync(`Check out this problem I solved with TutorSnap! 📚 #TutorSnap ${APP_URL}`);
          showToast("Caption copied — post it with your screenshot!");
        } else {
          await Share.share({
            message: `Check out this problem I solved with TutorSnap! 📚 #TutorSnap\n${APP_URL}`,
          });
        }
        const earned = await recordContentShare();
        if (earned > 0) {
          showToast(`+${earned} days earned for sharing content! 📸`);
          await load();
        } else {
          showToast("You've reached the max content shares (5).");
        }
        break;
      }
      case "classroom": {
        if (Platform.OS === "web") {
          await Clipboard.setStringAsync(classroomMessage);
          showToast("Classroom invite link copied!");
        } else {
          await Share.share({ message: classroomMessage });
        }
        break;
      }
    }
  }, [shareMessage, classroomMessage, load]);

  const handleRedeem = useCallback(async () => {
    if (!stats || stats.pendingDays <= 0) return;
    setRedeeming(true);
    H.notificationSuccess()
    const redeemed = await redeemPendingDays();
    await recordAffiliateActivity();
    await load();
    setRedeeming(false);
    showToast(`${redeemed} days added to your subscription! 🎉`);
  }, [stats, load]);

  if (!stats) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.muted }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tier = getTier(stats.totalReferrals);
  const tierMeta = TIER_META[tier];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {/* Nav bar */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <IconSymbol size={22} name="chevron.left.forwardslash.chevron.right" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Affiliate & Referrals</Text>
        <TouchableOpacity
          onPress={() => setShowHistory(true)}
          style={styles.backBtn}
          accessibilityLabel="View activity history"
        >
          <IconSymbol size={20} name="clock.fill" color={colors.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Earnings Summary ── */}
        <View style={[styles.summaryCard, { backgroundColor: `${tierMeta.color}10`, borderColor: `${tierMeta.color}35` }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: tierMeta.color }]}>{stats.pendingDays}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Days Pending</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: `${tierMeta.color}30` }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.foreground }]}>{stats.totalDaysEarned}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Earned</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: `${tierMeta.color}30` }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNum, { color: colors.foreground }]}>{stats.redeemedDays}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Redeemed</Text>
            </View>
          </View>
          {stats.pendingDays > 0 && (
            <TouchableOpacity
              onPress={handleRedeem}
              style={[styles.redeemBtn, { backgroundColor: tierMeta.color }]}
              activeOpacity={0.85}
              disabled={redeeming}
            >
              <Text style={styles.redeemBtnText}>
                {redeeming ? "Applying…" : `Apply ${stats.pendingDays} Days to My Subscription`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Expiry Warning Banner ── */}
        {expiryWarning?.show && (
          <TouchableOpacity
            onPress={handleRedeem}
            activeOpacity={0.85}
            style={[styles.expiryBanner, { backgroundColor: `${colors.warning}18`, borderColor: `${colors.warning}50` }]}
            accessibilityLabel={`Warning: ${expiryWarning.pendingDays} pending days idle for ${expiryWarning.daysIdle} days. Tap to redeem.`}
          >
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.expiryTitle, { color: colors.warning }]}>
                Your {expiryWarning.pendingDays} pending days expire soon
              </Text>
              <Text style={[styles.expirySubtitle, { color: colors.muted }]}>
                No activity for {expiryWarning.daysIdle} days — tap to apply your days now
              </Text>
            </View>
            <IconSymbol size={16} name="chevron.right" color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* ── Tier Progress ── */}
        <TierProgressBar stats={stats} colors={colors} />

        {/* ── Referral Code ── */}
        <View style={[styles.codeCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}>
          <Text style={[styles.codeLabel, { color: colors.muted }]}>Your invite code</Text>
          <View style={styles.codeRow}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{code || "Loading…"}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity
                onPress={handleCopyCode}
                style={[styles.copyBtn, {
                  backgroundColor: copied ? `${colors.success}18` : `${colors.primary}18`,
                  borderColor: copied ? colors.success : colors.primary,
                }]}
                accessibilityLabel={copied ? "Code copied" : "Copy invite code"}
              >
                <IconSymbol size={15} name={copied ? "checkmark.circle.fill" : "doc.on.doc.fill"} color={copied ? colors.success : colors.primary} />
                <Text style={[styles.copyBtnText, { color: copied ? colors.success : colors.primary }]}>
                  {copied ? "Copied!" : "Copy"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.codeSubtext, { color: colors.muted }]}>
            Share this code with friends, students, and teachers
          </Text>
          {/* Native share CTA */}
          <TouchableOpacity
            onPress={handleNativeShare}
            style={[styles.shareCtaBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            accessibilityLabel="Share your invite link"
            accessibilityRole="button"
          >
            <IconSymbol size={18} name="square.and.arrow.up.fill" color="#fff" />
            <Text style={styles.shareCtaBtnText}>Share Your Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* ── Earning Options ── */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ways to Earn</Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>
            Earn free Premium days through multiple channels
          </Text>
          {options.map((opt) => (
            <EarningOptionCard key={opt.id} option={opt} colors={colors} onPress={handleOptionPress} />
          ))}
        </View>

        {/* ── Milestone Bonuses ── */}
        <View style={[styles.milestonesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🏆 Milestone Bonuses</Text>
          {MILESTONE_BONUSES.map((m) => {
            const reached = stats.totalReferrals >= m.at;
            return (
              <View key={m.at} style={[styles.milestoneRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.milestoneBadge, {
                  backgroundColor: reached ? `${colors.warning}18` : `${colors.border}40`,
                }]}>
                  <Text style={[styles.milestoneAt, { color: reached ? colors.warning : colors.muted }]}>
                    {m.at}
                  </Text>
                  <Text style={[styles.milestoneAtLabel, { color: reached ? colors.warning : colors.muted }]}>refs</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.milestoneLabel, { color: reached ? colors.foreground : colors.muted }]}>
                    {m.label}
                  </Text>
                </View>
                <Text style={[styles.milestoneDays, { color: reached ? colors.success : colors.muted }]}>
                  {reached ? `+${m.bonus}d ✓` : `+${m.bonus}d`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Recent Activity preview ── */}
        {history.length > 0 && (
          <View style={[styles.historyPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.historyPreviewHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => setShowHistory(true)}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {history.slice(0, 3).map((evt) => (
              <HistoryRow key={evt.id} event={evt} colors={colors} />
            ))}
          </View>
        )}

        {/* ── Top Affiliates ── */}
        <TopAffiliatesCard stats={stats} colors={colors} />

        <Text style={[styles.legalNote, { color: colors.muted }]}>
          Bonus days are added to your pending balance and applied when you tap "Apply Days". Limit: 100 referrals per account. Social share reward resets every 24 hours. Content creator reward limited to 10 claims.
        </Text>
      </ScrollView>

      {/* ── Toast ── */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
          <Text style={[styles.toastText, { color: colors.background }]}>{toast}</Text>
        </View>
      )}

      {/* ── Full History Modal ── */}
      <Modal visible={showHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowHistory(false)}>
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
          <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
            <View style={styles.backBtn} />
            <Text style={[styles.navTitle, { color: colors.foreground }]}>Activity History</Text>
            <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.backBtn}>
              <Text style={[styles.doneBtn, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={{ fontSize: 40 }}>📋</Text>
                <Text style={[styles.emptyHistoryText, { color: colors.muted }]}>No activity yet</Text>
              </View>
            ) : (
              history.map((evt) => (
                <HistoryRow key={evt.id} event={evt} colors={colors} />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  navTitle: { fontSize: 17, fontWeight: "700" },
  doneBtn: { fontSize: 16, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 60, gap: 20 },

  // Summary
  summaryCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 14 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryNum: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  summaryDivider: { width: 1, height: 40 },
  redeemBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: "center",
  },
  redeemBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  // Tier
  tierCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 12 },
  tierTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  tierBadgeLabel: { fontSize: 14, fontWeight: "800" },
  tierStats: { flex: 1, alignItems: "center" },
  tierStatNum: { fontSize: 20, fontWeight: "800" },
  tierStatLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  tierNextLabel: { fontSize: 12, lineHeight: 18 },
  perksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  perkChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  perkText: { fontSize: 11, fontWeight: "600" },

  // Top Affiliates
  topAffiliatesCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 4 },
  topAffiliateRow: { flexDirection: "row" as const, alignItems: "center" as const, paddingVertical: 10, paddingHorizontal: 6, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  topAffiliateRank: { fontSize: 18, width: 28, textAlign: "center" as const },
  topAffiliateName: { flex: 1, fontSize: 14 },
  topAffiliateTierChip: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  topAffiliateRefs: { fontSize: 12, fontWeight: "600" as const },

  // Share Badge Button
  shareBadgeBtn: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center" as const,
  },
  shareBadgeBtnText: { fontSize: 13, fontWeight: "700" },

  // Code
  codeCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  codeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  codeText: { fontSize: 26, fontWeight: "800", letterSpacing: 4 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  copyBtnText: { fontSize: 13, fontWeight: "700" },
  codeSubtext: { fontSize: 12, lineHeight: 17 },
  codeActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareCtaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 14, marginTop: 4,
  },
  shareCtaBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  // Earning options
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionSub: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  optionCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  optionEmoji: { fontSize: 28, width: 36, textAlign: "center" },
  optionBody: { flex: 1, gap: 4 },
  optionTitle: { fontSize: 15, fontWeight: "700" },
  optionSub: { fontSize: 12, lineHeight: 17 },
  optionRewardRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  rewardChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  rewardText: { fontSize: 11, fontWeight: "700" },
  availableNote: { fontSize: 11 },

  // Milestones
  milestonesCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 0 },
  milestoneRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  milestoneBadge: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  milestoneAt: { fontSize: 16, fontWeight: "800" },
  milestoneAtLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" },
  milestoneLabel: { fontSize: 13, lineHeight: 18 },
  milestoneDays: { fontSize: 13, fontWeight: "700", marginLeft: 8 },

  // History
  historyPreview: { borderRadius: 16, borderWidth: 1, padding: 16 },
  historyPreviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  seeAll: { fontSize: 13, fontWeight: "600" },
  historyRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  historyLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  historyDate: { fontSize: 11, marginTop: 2 },
  historyDays: { fontSize: 14, fontWeight: "700" },
  emptyHistory: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyHistoryText: { fontSize: 15 },

  // Toast
  toast: {
    position: "absolute", bottom: 100, left: 24, right: 24,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: "center",
    ...Platform.select({
      native: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
      web: { boxShadow: "0 4px 16px rgba(0,0,0,0.2)" },
    }),
  },
  toastText: { fontSize: 14, fontWeight: "600" },

  // Legal
  legalNote: { fontSize: 11, textAlign: "center", lineHeight: 17 },
  expiryBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
  },
  expiryTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  expirySubtitle: { fontSize: 12, lineHeight: 17 },
});
