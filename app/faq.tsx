import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import * as H from "@/lib/haptics";
import * as Linking from "expo-linking";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenTransition } from "@/hooks/use-screen-transition";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── FAQ Data ──────────────────────────────────────────────────────────────
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: "gs1",
    category: "Getting Started",
    question: "How do I solve a math problem with TutorSnap?",
    answer: "There are two ways:\n\n1. Type your problem — Tap the Solve tab, type your problem in the text box (you can use the math keyboard for symbols like √, ∫, π), then tap Solve.\n\n2. Take a photo — Tap the camera button in the center of the tab bar, point your camera at the problem, and tap the shutter. TutorSnap will read and solve it automatically.",
    tags: ["solve", "type", "camera", "how to"],
  },
  {
    id: "gs2",
    category: "Getting Started",
    question: "What subjects does TutorSnap support?",
    answer: "TutorSnap covers a wide range of academic subjects:\n\n• Mathematics: Algebra, Geometry, Calculus, Statistics, Trigonometry\n• Science: Physics, Chemistry, Biology\n• Humanities: History, Geography, Literature, Grammar\n• Languages: English, Spanish, French, and more\n\nYou can set your preferred subjects in Settings → Preferred Subjects to get personalized practice problems.",
    tags: ["subjects", "math", "science", "history", "languages"],
  },
  {
    id: "gs3",
    category: "Getting Started",
    question: "Is TutorSnap free to use?",
    answer: "TutorSnap offers a generous free tier that includes:\n• Unlimited problem solving\n• Step-by-step explanations\n• AI chat tutor\n• Practice quizzes\n• Streak tracking and badges\n\nPremium features (if available) will be clearly marked in the app.",
    tags: ["free", "pricing", "cost", "premium"],
  },
  {
    id: "gs4",
    category: "Getting Started",
    question: "Do I need to create an account?",
    answer: "No account is required to use TutorSnap. All your study data — history, streaks, badges, and preferences — is stored locally on your device.\n\nIf you want to sync your data across multiple devices in the future, you can create an account from Settings.",
    tags: ["account", "login", "sign up", "registration"],
  },
  // Camera & Scanning
  {
    id: "cam1",
    category: "Camera & Scanning",
    question: "The camera isn't recognizing my problem. What should I try?",
    answer: "Try these tips for better scan accuracy:\n\n1. Lighting — Make sure the problem is well-lit. Natural light or a desk lamp works best. Avoid shadows across the text.\n\n2. Angle — Hold the camera directly above the problem, not at an angle.\n\n3. Distance — Keep the camera 20–30 cm (8–12 inches) from the page.\n\n4. Contrast — Dark ink on white paper works best. Pencil writing may be harder to read.\n\n5. Crop — After taking the photo, crop it to show only the problem you want solved.",
    tags: ["camera", "scan", "photo", "recognition", "not working"],
  },
  {
    id: "cam2",
    category: "Camera & Scanning",
    question: "Can I scan problems from a textbook or worksheet?",
    answer: "Yes! TutorSnap can read printed text from textbooks, worksheets, and handwritten notes. For best results:\n\n• Printed text: Works very well\n• Neat handwriting: Works well\n• Messy handwriting: May need manual correction after scanning\n\nAfter scanning, you can edit the recognized text before solving.",
    tags: ["textbook", "worksheet", "handwriting", "printed"],
  },
  {
    id: "cam3",
    category: "Camera & Scanning",
    question: "Can I upload a photo from my gallery instead of taking a new one?",
    answer: "Yes. When you tap the camera button, you'll see an option to choose from your photo library. This lets you solve problems from screenshots, photos you've already taken, or images sent to you.",
    tags: ["gallery", "photo library", "upload", "image"],
  },
  // Streaks & Progress
  {
    id: "str1",
    category: "Streaks & Progress",
    question: "How does the streak system work?",
    answer: "Your streak counts consecutive days on which you solve at least one problem or complete your daily goal.\n\n• Solve at least 1 problem per day to maintain your streak\n• Your streak resets to 0 if you miss a day (unless you use a Streak Shield)\n• Streaks are tracked in your local timezone\n\nTip: Set a daily reminder in Settings → Notifications to help you stay consistent.",
    tags: ["streak", "daily", "consecutive", "reset"],
  },
  {
    id: "str2",
    category: "Streaks & Progress",
    question: "What is a Streak Shield and how do I use it?",
    answer: "A Streak Shield protects your streak for one missed day. You earn shields by:\n• Reaching streak milestones (7, 30, 100 days)\n• Completing bonus challenges\n\nTo use a shield: Go to the Progress screen → tap the shield icon next to your streak. The shield will be consumed and your streak will be preserved for that day.\n\nYou can hold up to 3 shields at a time.",
    tags: ["shield", "streak freeze", "protect", "missed day"],
  },
  {
    id: "str3",
    category: "Streaks & Progress",
    question: "Why did my streak reset even though I solved a problem?",
    answer: "This can happen if:\n\n1. Timezone mismatch — The streak resets at midnight in your local timezone. If your device clock is wrong, the day boundary may be off.\n\n2. App data cleared — If you cleared the app's data or reinstalled, local progress is lost.\n\n3. Daily goal not met — If you set a daily goal (e.g. solve 5 problems), solving fewer than that won't count.\n\nIf you believe this is a bug, please use Settings → Report a Bug to let us know.",
    tags: ["streak reset", "bug", "timezone", "lost progress"],
  },
  {
    id: "str4",
    category: "Streaks & Progress",
    question: "How do I earn badges?",
    answer: "Badges are earned by reaching milestones:\n\n• Problem Count — Solve 10, 50, 100, 500 problems\n• Streak — Maintain a 7, 30, 100-day streak\n• Subject Mastery — Reach Bronze, Silver, or Gold mastery in a subject\n• Quiz Performance — Score 80%+ on a timed quiz\n• Consistency — Complete your daily goal 7 days in a row\n\nView all your earned badges on the Progress screen.",
    tags: ["badges", "achievements", "milestones", "earn"],
  },
  // Practice & Quizzes
  {
    id: "prac1",
    category: "Practice & Quizzes",
    question: "How does the Practice Quiz work?",
    answer: "The Practice Quiz generates AI-powered questions based on your chosen subject and difficulty level.\n\n1. Go to the Practice tab\n2. Select a subject and difficulty (Easy / Medium / Hard)\n3. Choose quiz length (3, 5, or 10 questions)\n4. Tap Start Quiz\n\nYou'll see multiple-choice questions with a timer. After completing, you'll get a score and detailed explanations for each answer.",
    tags: ["quiz", "practice", "multiple choice", "score"],
  },
  {
    id: "prac2",
    category: "Practice & Quizzes",
    question: "What is Subject Mastery?",
    answer: "Subject Mastery tracks how well you're doing in each subject over time.\n\n• Bronze — Solve 5+ problems in a subject\n• Silver — Solve 20+ problems with 70%+ quiz accuracy\n• Gold — Solve 50+ problems with 85%+ quiz accuracy\n\nYour mastery level is shown on the Progress screen and as a badge on your profile.",
    tags: ["mastery", "subject", "bronze", "silver", "gold", "level"],
  },
  {
    id: "prac3",
    category: "Practice & Quizzes",
    question: "Can I review my past quiz results?",
    answer: "Yes. Go to the Practice tab and tap 'View Quiz History' to see all your past quizzes with scores, dates, and subject breakdowns. You can also see which questions you got wrong and review the correct answers.",
    tags: ["quiz history", "past results", "review", "scores"],
  },
  // AI Tutor
  {
    id: "ai1",
    category: "AI Tutor",
    question: "What can I ask the AI Tutor?",
    answer: "The AI Tutor (Chat tab) can help with:\n\n• Explaining concepts — 'Explain the Pythagorean theorem'\n• Step-by-step walkthroughs — 'Walk me through solving 2x² + 5x - 3 = 0'\n• Follow-up questions — 'Why did you use that formula?'\n• Study tips — 'How should I study for a calculus exam?'\n• Essay help — 'Help me outline an essay about the French Revolution'\n\nThe AI Tutor remembers the last 50 messages in your conversation.",
    tags: ["chat", "ai tutor", "ask", "explain", "help"],
  },
  {
    id: "ai2",
    category: "AI Tutor",
    question: "Is the AI Tutor always accurate?",
    answer: "The AI Tutor is highly capable but not perfect. For complex or multi-step problems, it may occasionally make errors.\n\nWe recommend:\n• Always verify important answers with your teacher or textbook\n• Use the step-by-step explanations to understand the reasoning, not just copy the answer\n• If you spot an error, use Settings → Report a Bug to let us know\n\nAcademic integrity is important — use TutorSnap as a learning aid, not a shortcut.",
    tags: ["accuracy", "wrong answer", "error", "reliable"],
  },
  {
    id: "ai3",
    category: "AI Tutor",
    question: "Why does the AI Tutor sometimes give different answers to the same question?",
    answer: "AI responses have a small degree of randomness (called 'temperature') to make them more natural and varied. For math problems, the answer should always be the same, but the explanation style may vary slightly.\n\nIf you're getting significantly different answers to the same math problem, please report it via Settings → Report a Bug.",
    tags: ["different answers", "inconsistent", "random", "temperature"],
  },
  // Data & Privacy
  {
    id: "priv1",
    category: "Data & Privacy",
    question: "Where is my study data stored?",
    answer: "All your study data — history, streaks, badges, preferences, and flashcards — is stored locally on your device using AsyncStorage. It never leaves your device unless you explicitly share it.\n\nTutorSnap does not have a server-side database for your personal study data.",
    tags: ["data", "storage", "local", "privacy", "where"],
  },
  {
    id: "priv2",
    category: "Data & Privacy",
    question: "How do I delete all my data?",
    answer: "You have two options:\n\n1. Partial reset — Settings → Clear History (deletes solved problems only)\n2. Full reset — Settings → Reset All Progress (deletes everything: streak, badges, history, preferences)\n\nFor a formal GDPR/CCPA data deletion request, go to Settings → Legal & Privacy Hub → Data Deletion Request.",
    tags: ["delete data", "reset", "clear history", "GDPR", "privacy"],
  },
  {
    id: "priv3",
    category: "Data & Privacy",
    question: "Does TutorSnap share my data with third parties?",
    answer: "No. TutorSnap does not sell or share your personal data with third parties.\n\nThe only data that leaves your device is the content of problems you submit for solving (sent to our AI service to generate answers). This is not linked to your identity.\n\nSee our full Privacy Policy at tutorsnapai.tech/privacy.",
    tags: ["third party", "share data", "sell", "privacy policy"],
  },
  // Troubleshooting
  {
    id: "ts1",
    category: "Troubleshooting",
    question: "The app is running slowly or freezing. What should I do?",
    answer: "Try these steps:\n\n1. Restart the app — Close TutorSnap completely and reopen it\n2. Clear history — If you have thousands of solved problems, clearing history (Settings → Clear History) can speed things up\n3. Restart your device — A fresh restart often resolves performance issues\n4. Update the app — Make sure you're on the latest version\n\nIf the issue persists, please report it via Settings → Report a Bug.",
    tags: ["slow", "freezing", "performance", "lag", "crash"],
  },
  {
    id: "ts2",
    category: "Troubleshooting",
    question: "I'm not receiving notifications. How do I fix this?",
    answer: "Check these settings:\n\n1. In TutorSnap — Go to Settings → Notification Center and make sure the relevant notification types are enabled\n2. On your device — Go to your device Settings → Notifications → TutorSnap and make sure notifications are allowed\n3. Do Not Disturb — Check that DND mode isn't blocking TutorSnap notifications\n4. Daily Reminder time — Make sure your reminder time is set correctly in Settings → Notifications\n\nIf notifications still don't work, try toggling them off and on again in the Notification Center.",
    tags: ["notifications", "not receiving", "alerts", "reminder"],
  },
  {
    id: "ts3",
    category: "Troubleshooting",
    question: "The camera scanner isn't working at all. What's wrong?",
    answer: "If the camera doesn't open or crashes:\n\n1. Check permissions — Go to your device Settings → Privacy → Camera and make sure TutorSnap has camera access\n2. Restart the app — Close and reopen TutorSnap\n3. Restart your device — This often resolves camera permission issues\n4. Update the app — Camera features may be improved in newer versions\n\nIf none of these work, please report the issue via Settings → Report a Bug with your device model and OS version.",
    tags: ["camera not working", "crash", "permissions", "black screen"],
  },
  {
    id: "ts4",
    category: "Troubleshooting",
    question: "How do I contact support if my issue isn't listed here?",
    answer: "You can reach us through several channels:\n\n• In-app: Settings → Contact Support (opens a pre-filled email)\n• Email: support@tutorsnapai.tech\n• Bug reports: Settings → Report a Bug\n• Feedback: Settings → Send Feedback\n\nWe typically respond within 1–2 business days. Please include your device model, OS version, and a description of the issue.",
    tags: ["contact", "support", "email", "help", "not listed"],
  },
];

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🔍" },
  { id: "Getting Started", label: "Getting Started", emoji: "🚀" },
  { id: "Camera & Scanning", label: "Camera", emoji: "📸" },
  { id: "Streaks & Progress", label: "Streaks", emoji: "🔥" },
  { id: "Practice & Quizzes", label: "Practice", emoji: "📝" },
  { id: "AI Tutor", label: "AI Tutor", emoji: "🤖" },
  { id: "Data & Privacy", label: "Privacy", emoji: "🔒" },
  { id: "Troubleshooting", label: "Help", emoji: "🛠️" },
];

export default function FAQScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      if (!q) return matchesCategory;
      const matchesSearch =
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags.some((t) => t.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  const handleToggle = (id: string) => {
    H.impactLight()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCategoryPress = (id: string) => {
    H.impactLight()
    setActiveCategory(id);
    setExpandedId(null);
  };

  const { fadeStyle } = useScreenTransition({ duration: 280, translateY: 16 });
  return (
    <ScreenContainer>
      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
      {/* Header */}
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="arrow.left" color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Help Center</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <IconSymbol size={18} name="magnifyingglass" color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== "ios" && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}
            accessibilityLabel="Toggle search">
            <IconSymbol size={18} name="xmark.circle.fill" color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              activeOpacity={0.7}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: activeCategory === cat.id ? colors.primary : colors.surface,
                  borderColor: activeCategory === cat.id ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: activeCategory === cat.id ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Result Count */}
        <Text style={[styles.resultCount, { color: colors.muted }]}>
          {filtered.length} {filtered.length === 1 ? "question" : "questions"}
          {search ? ` for "${search}"` : ""}
        </Text>

        {/* FAQ Items */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤔</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results found</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              Try different keywords, or contact our support team directly.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@tutorsnapai.tech")}
              style={[styles.contactBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <IconSymbol size={16} name="envelope.fill" color="#FFFFFF" />
              <Text style={styles.contactBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((item, idx) => (
            <TouchableOpacity
              accessibilityLabel="Toggle"
              key={item.id}
              onPress={() => handleToggle(item.id)}
              activeOpacity={0.7}
              style={[
                styles.faqCard,
                {
                  backgroundColor: expandedId === item.id ? `${colors.primary}08` : colors.surface,
                  borderColor: expandedId === item.id ? `${colors.primary}40` : colors.border,
                  marginBottom: idx === filtered.length - 1 ? 0 : 6,
                },
              ]}
            >
              <View style={styles.faqHeader}>
                <View style={[styles.categoryDot, { backgroundColor: `${colors.primary}30` }]}>
                  <Text style={styles.categoryDotText}>
                    {CATEGORIES.find((c) => c.id === item.category)?.emoji ?? "❓"}
                  </Text>
                </View>
                <Text style={[styles.faqQuestion, { color: colors.foreground, flex: 1 }]}>
                  {item.question}
                </Text>
                <IconSymbol
                  size={18}
                  name={expandedId === item.id ? "chevron.up" : "chevron.down"}
                  color={colors.muted}
                />
              </View>
              {expandedId === item.id && (
                <View style={[styles.faqAnswer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.faqAnswerText, { color: colors.muted }]}>
                    {item.answer}
                  </Text>
                  <View style={styles.tagRow}>
                    {item.tags.slice(0, 4).map((tag) => (
                      <View key={tag} style={[styles.tag, { backgroundColor: `${colors.primary}12` }]}>
                        <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Contact Footer */}
        {filtered.length > 0 && (
          <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.footerTitle, { color: colors.foreground }]}>Still need help?</Text>
            <Text style={[styles.footerDesc, { color: colors.muted }]}>
              Our support team is here for you. We typically respond within 1–2 business days.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL("mailto:support@tutorsnapai.tech")}
              style={[styles.footerBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <IconSymbol size={16} name="envelope.fill" color="#FFFFFF" />
              <Text style={styles.footerBtnText}>Email Support</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    
      </Animated.View></ScreenContainer>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 0,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryEmoji: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: "600" },
  resultCount: {
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 16,
    marginBottom: 10,
  },
  faqCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  categoryDot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryDotText: { fontSize: 16 },
  faqQuestion: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 0.5,
    paddingTop: 12,
  },
  faqAnswerText: { fontSize: 14, lineHeight: 22 },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    padding: 32,
    marginHorizontal: 16,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  contactBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  footerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  footerTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  footerDesc: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  footerBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
