/**
 * StreakMilestoneModal
 * Full-screen confetti burst + celebration overlay shown when the user
 * hits a streak milestone (3, 7, 14, 30 days).
 *
 * Usage:
 *   const [milestone, setMilestone] = useState<MilestoneInfo | null>(null);
 *   // after recordSolve():
 *   const hit = await checkStreakMilestone(newStreak);
 *   if (hit) setMilestone(hit);
 *   // in JSX:
 *   <StreakMilestoneModal info={milestone} onDismiss={() => setMilestone(null)} />
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/use-colors";
import type { MilestoneInfo } from "@/lib/streak-milestones";

const { width: SCREEN_WIDTH, height: SCREEN_H } = Dimensions.get("window");

// ─── Confetti ────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "#F59E0B", "#6366F1", "#10B981", "#EF4444",
  "#3B82F6", "#EC4899", "#14B8A6", "#F97316",
  "#8B5CF6", "#22D3EE", "#A3E635", "#FB7185",
];
const CONFETTI_SHAPES = ["square", "rect", "circle"] as const;

function ConfettiParticle({ index }: { index: number }) {
  const x = useRef(
    new Animated.Value(Math.random() * SCREEN_WIDTH * 1.2 - SCREEN_WIDTH * 0.1)
  ).current;
  const y = useRef(new Animated.Value(-30 - Math.random() * 60)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.4 + Math.random() * 0.8)).current;

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 7 + Math.random() * 10;
  const shape = CONFETTI_SHAPES[index % CONFETTI_SHAPES.length];
  const duration = 1600 + Math.random() * 1400;
  const delay = Math.random() * 600;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: SCREEN_H + 40,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 720 * (Math.random() > 0.5 ? 1 : -1),
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.3 + Math.random() * 0.5,
        duration: duration * 0.6,
        delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(delay + duration * 0.65),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.35,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 720],
    outputRange: ["0deg", "720deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: shape === "rect" ? size * 2 : size,
        height: shape === "rect" ? size * 0.45 : size,
        borderRadius: shape === "circle" ? size / 2 : 2,
        backgroundColor: color,
        transform: [
          { translateX: x },
          { translateY: y },
          { rotate: spin },
          { scale },
        ],
        opacity,
      }}
    />
  );
}

// ─── Card animation ───────────────────────────────────────────────────────────
function AnimatedCard({
  info,
  onDismiss,
  avatarUri,
  displayName,
}: {
  info: MilestoneInfo;
  onDismiss: () => void;
  avatarUri?: string;
  displayName?: string;
}) {
  const colors = useColors();
  const cardScale = useRef(new Animated.Value(0.6)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss after 5 s (longer to allow sharing)
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async () => {
    const message = `${info.emoji} I just hit a ${info.title} on TutorSnap! ${info.subtitle} Join me at tutorsnapai.tech`;
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(message);
      } else {
        await Share.share({ message });
      }
    } catch { /* user cancelled or share unavailable */ }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: cardScale }],
          opacity: cardOpacity,
        },
      ]}
    >
      {/* Avatar circle */}
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.cardAvatar} />
      ) : (
        <View style={[styles.cardAvatarPlaceholder, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.cardAvatarInitial, { color: colors.primary }]}>
            {(displayName ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Streak count badge */}
      <View style={[styles.streakBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
        <Text style={styles.streakBadgeEmoji}>{info.emoji}</Text>
        <Text style={[styles.streakBadgeCount, { color: colors.primary }]}>{info.days}</Text>
        <Text style={[styles.streakBadgeLabel, { color: colors.muted }]}>day streak</Text>
      </View>

      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
        {info.title}
      </Text>
      <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
        {info.subtitle}
      </Text>

      {/* Action row */}
      <View style={styles.actionRow}>
        {/* Share button */}
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.8}
          style={[styles.shareBtn, { borderColor: colors.primary }]}
          accessibilityLabel="Share my streak"
          accessibilityRole="button"
        >
          <Text style={[styles.shareBtnText, { color: colors.primary }]}>
            {Platform.OS === "web" ? "Copy" : "Share"} 🔗
          </Text>
        </TouchableOpacity>

        {/* Dismiss button */}
        <TouchableOpacity
          onPress={onDismiss}
          activeOpacity={0.8}
          style={[styles.dismissBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel="Dismiss celebration"
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>Keep it up! 🚀</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
interface Props {
  info: MilestoneInfo | null;
  onDismiss: () => void;
  avatarUri?: string;
  displayName?: string;
}

export function StreakMilestoneModal({ info, onDismiss, avatarUri, displayName }: Props) {
  if (!info) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
      >
        {/* Confetti layer */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: 60 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </View>

        {/* Card -- stop propagation so tapping card doesn't dismiss */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <AnimatedCard info={info} onDismiss={onDismiss} avatarUri={avatarUri} displayName={displayName} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    borderRadius: 28,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  cardAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  cardAvatarPlaceholder: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  cardAvatarInitial: { fontSize: 28, fontWeight: "800" },
  streakBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 12,
  },
  streakBadgeEmoji: { fontSize: 22 },
  streakBadgeCount: { fontSize: 28, fontWeight: "900" },
  streakBadgeLabel: { fontSize: 13, fontWeight: "600" },
  cardEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  cardSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  dismissText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
