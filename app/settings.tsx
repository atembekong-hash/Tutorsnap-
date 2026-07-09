import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type SettingRowProps = {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
};

function SettingRow({ icon, iconColor, label, description, rightElement, onPress, showChevron }: SettingRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}18` }]}>
        <MaterialIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
        {description && (
          <Text style={[styles.settingDesc, { color: colors.muted }]}>{description}</Text>
        )}
      </View>
      {rightElement && <View style={styles.settingRight}>{rightElement}</View>}
      {showChevron && (
        <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useThemeContext();
  const isDark = colorScheme === "dark";

  const handleToggleTheme = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleColorScheme();
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon={isDark ? "dark-mode" : "light-mode"}
            iconColor={isDark ? "#6366F1" : "#F59E0B"}
            label="Dark Mode"
            description={isDark ? "Currently using dark theme" : "Currently using light theme"}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={handleToggleTheme}
                trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                thumbColor={isDark ? colors.primary : colors.muted}
                ios_backgroundColor={colors.border}
              />
            }
          />
        </View>

        {/* Study Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>STUDY</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="emoji-events"
            iconColor="#F59E0B"
            label="Progress & Streaks"
            description="View your study statistics"
            onPress={() => router.push("/progress" as any)}
            showChevron
          />
          <SettingRow
            icon="bookmark"
            iconColor="#4F46E5"
            label="Bookmarks"
            description="View saved solutions"
            onPress={() => router.push("/bookmarks" as any)}
            showChevron
          />
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingRow
            icon="school"
            iconColor="#10B981"
            label="StudyGenius AI"
            description="Version 2.0 — All subjects covered"
          />
          <SettingRow
            icon="calculate"
            iconColor="#4F46E5"
            label="Subjects Covered"
            description="Math, English/ELA, Science, Social Studies"
          />
          <SettingRow
            icon="auto-awesome"
            iconColor="#EC4899"
            label="Powered by AI"
            description="GPT-4o mini for accurate solutions"
          />
        </View>

        {/* Theme Preview */}
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>THEME PREVIEW</Text>
        <View style={[styles.themePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeRow}>
            {/* Light preview */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isDark) toggleColorScheme();
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: "#FFFFFF",
                  borderColor: !isDark ? colors.primary : "#E5E7EB",
                  borderWidth: !isDark ? 2.5 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.themeCardHeader, { backgroundColor: "#F8F8FC" }]}>
                <View style={[styles.themeCardDot, { backgroundColor: "#4F46E5" }]} />
                <View style={[styles.themeCardLine, { backgroundColor: "#0F0F14", width: "60%" }]} />
              </View>
              <View style={{ padding: 8, gap: 4 }}>
                <View style={[styles.themeCardLine, { backgroundColor: "#6B7280", width: "80%" }]} />
                <View style={[styles.themeCardLine, { backgroundColor: "#6B7280", width: "50%" }]} />
              </View>
              <Text style={[styles.themeLabel, { color: "#0F0F14" }]}>Light</Text>
              {!isDark && (
                <View style={[styles.themeCheck, { backgroundColor: "#4F46E5" }]}>
                  <MaterialIcons name="check" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Dark preview */}
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!isDark) toggleColorScheme();
              }}
              style={[
                styles.themeCard,
                {
                  backgroundColor: "#0F0F14",
                  borderColor: isDark ? "#6366F1" : "#2D2D3D",
                  borderWidth: isDark ? 2.5 : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.themeCardHeader, { backgroundColor: "#1A1A24" }]}>
                <View style={[styles.themeCardDot, { backgroundColor: "#6366F1" }]} />
                <View style={[styles.themeCardLine, { backgroundColor: "#F0F0FF", width: "60%" }]} />
              </View>
              <View style={{ padding: 8, gap: 4 }}>
                <View style={[styles.themeCardLine, { backgroundColor: "#9CA3AF", width: "80%" }]} />
                <View style={[styles.themeCardLine, { backgroundColor: "#9CA3AF", width: "50%" }]} />
              </View>
              <Text style={[styles.themeLabel, { color: "#F0F0FF" }]}>Dark</Text>
              {isDark && (
                <View style={[styles.themeCheck, { backgroundColor: "#6366F1" }]}>
                  <MaterialIcons name="check" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "800" },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 0.5,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingContent: { flex: 1, gap: 2 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 13, lineHeight: 18 },
  settingRight: {},
  themePreview: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  themeRow: { flexDirection: "row", gap: 12 },
  themeCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  themeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 6,
  },
  themeCardDot: { width: 8, height: 8, borderRadius: 4 },
  themeCardLine: { height: 6, borderRadius: 3 },
  themeLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    paddingBottom: 10,
  },
  themeCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
