import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";

type KeyboardTab = "basic" | "algebra" | "calculus" | "greek";

const KEYBOARD_TABS: { id: KeyboardTab; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "algebra", label: "Algebra" },
  { id: "calculus", label: "Calculus" },
  { id: "greek", label: "Greek" },
];

const KEYS: Record<KeyboardTab, { symbol: string; display?: string }[]> = {
  basic: [
    { symbol: "+" },
    { symbol: "-" },
    { symbol: "×" },
    { symbol: "÷" },
    { symbol: "=" },
    { symbol: "≠" },
    { symbol: "≤" },
    { symbol: "≥" },
    { symbol: "<" },
    { symbol: ">" },
    { symbol: "(" },
    { symbol: ")" },
    { symbol: "[" },
    { symbol: "]" },
    { symbol: "%" },
    { symbol: "^" },
    { symbol: "²", display: "x²" },
    { symbol: "³", display: "x³" },
    { symbol: "√", display: "√" },
    { symbol: "∛", display: "∛" },
    { symbol: "|", display: "|x|" },
    { symbol: "∞" },
    { symbol: "±" },
    { symbol: "≈" },
  ],
  algebra: [
    { symbol: "x" },
    { symbol: "y" },
    { symbol: "z" },
    { symbol: "n" },
    { symbol: "a" },
    { symbol: "b" },
    { symbol: "c" },
    { symbol: "f(x)", display: "f(x)" },
    { symbol: "g(x)", display: "g(x)" },
    { symbol: "→" },
    { symbol: "⟺" },
    { symbol: "∈" },
    { symbol: "∉" },
    { symbol: "⊂" },
    { symbol: "∪" },
    { symbol: "∩" },
    { symbol: "∅" },
    { symbol: "ℝ" },
    { symbol: "ℤ" },
    { symbol: "ℕ" },
    { symbol: "log", display: "log" },
    { symbol: "ln", display: "ln" },
    { symbol: "e" },
    { symbol: "!" },
  ],
  calculus: [
    { symbol: "∫", display: "∫" },
    { symbol: "∬", display: "∬" },
    { symbol: "∮", display: "∮" },
    { symbol: "d/dx", display: "d/dx" },
    { symbol: "∂/∂x", display: "∂/∂x" },
    { symbol: "lim", display: "lim" },
    { symbol: "→0", display: "→0" },
    { symbol: "→∞", display: "→∞" },
    { symbol: "Σ", display: "Σ" },
    { symbol: "∏", display: "∏" },
    { symbol: "Δ", display: "Δ" },
    { symbol: "∇", display: "∇" },
    { symbol: "sin", display: "sin" },
    { symbol: "cos", display: "cos" },
    { symbol: "tan", display: "tan" },
    { symbol: "sin⁻¹", display: "sin⁻¹" },
    { symbol: "cos⁻¹", display: "cos⁻¹" },
    { symbol: "tan⁻¹", display: "tan⁻¹" },
    { symbol: "sinh", display: "sinh" },
    { symbol: "cosh", display: "cosh" },
    { symbol: "π" },
    { symbol: "e" },
    { symbol: "i" },
    { symbol: "∞" },
  ],
  greek: [
    { symbol: "α" },
    { symbol: "β" },
    { symbol: "γ" },
    { symbol: "δ" },
    { symbol: "ε" },
    { symbol: "ζ" },
    { symbol: "η" },
    { symbol: "θ" },
    { symbol: "λ" },
    { symbol: "μ" },
    { symbol: "ν" },
    { symbol: "ξ" },
    { symbol: "π" },
    { symbol: "ρ" },
    { symbol: "σ" },
    { symbol: "τ" },
    { symbol: "φ" },
    { symbol: "χ" },
    { symbol: "ψ" },
    { symbol: "ω" },
    { symbol: "Γ" },
    { symbol: "Δ" },
    { symbol: "Λ" },
    { symbol: "Σ" },
  ],
};

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export function MathKeyboard({ onInsert, onBackspace, onClear }: MathKeyboardProps) {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<KeyboardTab>("basic");

  const handleKey = (symbol: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onInsert(symbol);
  };

  const handleBackspace = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBackspace();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Tab Row */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {KEYBOARD_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                {
                  borderBottomColor: isActive ? colors.primary : "transparent",
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? colors.primary : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Backspace & Clear */}
        <TouchableOpacity
          onPress={handleBackspace}
          style={[styles.actionKey, { backgroundColor: `${colors.error}15` }]}
        >
          <Text style={[styles.actionKeyText, { color: colors.error }]}>⌫</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClear}
          style={[styles.actionKey, { backgroundColor: `${colors.muted}15` }]}
        >
          <Text style={[styles.actionKeyText, { color: colors.muted }]}>CLR</Text>
        </TouchableOpacity>
      </View>

      {/* Keys Grid */}
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        style={styles.keysScroll}
      >
        <View style={styles.keysGrid}>
          {KEYS[activeTab].map((key, index) => (
            <TouchableOpacity
              key={`${activeTab}-${index}`}
              onPress={() => handleKey(key.symbol)}
              style={[
                styles.key,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              activeOpacity={0.65}
            >
              <Text style={[styles.keyText, { color: colors.foreground }]}>
                {key.display || key.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    paddingBottom: 8,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  actionKey: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  actionKeyText: {
    fontSize: 13,
    fontWeight: "700",
  },
  keysScroll: {
    maxHeight: 140,
  },
  keysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 6,
  },
  key: {
    width: "11%",
    aspectRatio: 1.4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 36,
  },
  keyText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
