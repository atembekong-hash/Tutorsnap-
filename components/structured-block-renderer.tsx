/**
 * StructuredBlockRenderer
 *
 * Renders an ordered list of StructuredBlock objects as premium educational cards.
 * Each block type has its own accent color, icon, and layout.
 *
 * Block types:
 *   direct-answer  — Indigo accent, ✦ icon
 *   concept        — Blue accent, 📖 icon
 *   formula        — Purple accent, ∑ icon
 *   steps          — Teal accent, numbered icon
 *   example        — Amber accent, ◆ icon
 *   insight        — Green accent, ★ icon
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Markdown from 'react-native-markdown-display';
import { MathRenderer } from '@/components/math-renderer';
import { useColors } from '@/hooks/use-colors';
import { type StructuredBlock, type BlockType } from '@/lib/structured-blocks';

// ─── Block design tokens ──────────────────────────────────────────────────────

interface BlockDesign {
  accent: string;
  accentDark: string;
  label: string;
  icon: string;
  showCopy: boolean;
  collapsible: boolean;
}

const BLOCK_DESIGNS: Record<BlockType, BlockDesign> = {
  'direct-answer': {
    accent: '#6366F1',
    accentDark: '#818CF8',
    label: 'Answer',
    icon: '✦',
    showCopy: true,
    collapsible: false,
  },
  'concept': {
    accent: '#3B82F6',
    accentDark: '#60A5FA',
    label: 'Concept',
    icon: '◉',
    showCopy: true,
    collapsible: true,
  },
  'formula': {
    accent: '#8B5CF6',
    accentDark: '#A78BFA',
    label: 'Formula',
    icon: '∑',
    showCopy: true,
    collapsible: false,
  },
  'steps': {
    accent: '#0D9488',
    accentDark: '#2DD4BF',
    label: 'Step-by-Step',
    icon: '①',
    showCopy: false,
    collapsible: true,
  },
  'example': {
    accent: '#D97706',
    accentDark: '#FBBF24',
    label: 'Example',
    icon: '◆',
    showCopy: true,
    collapsible: true,
  },
  'insight': {
    accent: '#059669',
    accentDark: '#34D399',
    label: 'Key Insight',
    icon: '★',
    showCopy: true,
    collapsible: true,
  },
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({
  content,
  accent,
  compact = false,
}: {
  content: string;
  accent: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      // Strip Markdown symbols for clean copy
      const clean = content
        .replace(/#{1,6}\s+/g, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/~~([^~]+)~~/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '• ')
        .replace(/^\s*\d+\.\s+/gm, (m) => m)
        .replace(/\$\$([^$]+)\$\$/g, '$1')
        .replace(/\$([^$\n]+)\$/g, '$1')
        .trim();
      await Clipboard.setStringAsync(clean);
      setCopied(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }, [content]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <TouchableOpacity
      onPress={handleCopy}
      hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <Text style={[copyBtnStyles.text, { color: copied ? '#22C55E' : accent, fontSize: compact ? 11 : 12 }]}>
        {copied ? '✓ Copied' : 'Copy'}
      </Text>
    </TouchableOpacity>
  );
}

const copyBtnStyles = StyleSheet.create({
  text: { fontWeight: '600', letterSpacing: 0.2 },
});

// ─── Inline math helper (same as AIResponseRenderer) ─────────────────────────

const INLINE_SYMBOL_MAP: [RegExp, string][] = [
  [/\\alpha/g,'α'],[/\\beta/g,'β'],[/\\gamma/g,'γ'],[/\\delta/g,'δ'],
  [/\\epsilon/g,'ε'],[/\\theta/g,'θ'],[/\\lambda/g,'λ'],[/\\mu/g,'μ'],
  [/\\nu/g,'ν'],[/\\pi/g,'π'],[/\\rho/g,'ρ'],[/\\sigma/g,'σ'],
  [/\\tau/g,'τ'],[/\\phi/g,'φ'],[/\\omega/g,'ω'],[/\\Sigma/g,'Σ'],
  [/\\Delta/g,'Δ'],[/\\Omega/g,'Ω'],[/\\infty/g,'∞'],[/\\pm/g,'±'],
  [/\\times/g,'×'],[/\\div/g,'÷'],[/\\cdot/g,'·'],[/\\leq/g,'≤'],
  [/\\geq/g,'≥'],[/\\neq/g,'≠'],[/\\approx/g,'≈'],[/\\equiv/g,'≡'],
  [/\\rightarrow/g,'→'],[/\\leftarrow/g,'←'],[/\\Rightarrow/g,'⇒'],
  [/\\sqrt\{([^}]+)\}/g,'√($1)'],[/\\sqrt/g,'√'],
  [/\\frac\{([^}]+)\}\{([^}]+)\}/g,'($1)/($2)'],
  [/\\text\{([^}]+)\}/g,'$1'],[/\\mathrm\{([^}]+)\}/g,'$1'],
  [/\\mathbf\{([^}]+)\}/g,'$1'],[/\\left/g,''],[/\\right/g,''],
  [/\^2/g,'²'],[/\^3/g,'³'],[/\^n/g,'ⁿ'],[/\^i/g,'ⁱ'],
  [/\^{([^}]+)}/g,'($1)'],[/_{([^}]+)}/g,'_($1)'],
  [/\{/g,''],[/\}/g,''],[/\\,/g,' '],[/\\;/g,' '],[/\\ /g,' '],
];
function latexToInlineUnicode(latex: string): string {
  let r = latex;
  for (const [pat, rep] of INLINE_SYMBOL_MAP) r = r.replace(pat, rep);
  r = r.replace(/\\([a-zA-Z]+)/g, '$1');
  return r.trim();
}

// ─── Markdown styles builder ──────────────────────────────────────────────────

function buildMdStyles(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
  textColor: string,
  accent: string,
) {
  const lh = fontSize * 1.65;
  return {
    body: { fontSize, color: textColor, lineHeight: lh },
    paragraph: { fontSize, color: textColor, lineHeight: lh, marginTop: 0, marginBottom: fontSize * 0.7 },
    heading1: { fontSize: fontSize * 1.3, fontWeight: '700' as const, color: textColor, marginTop: 12, marginBottom: 6, lineHeight: fontSize * 1.3 * 1.25 },
    heading2: { fontSize: fontSize * 1.15, fontWeight: '700' as const, color: textColor, marginTop: 10, marginBottom: 5, lineHeight: fontSize * 1.15 * 1.3 },
    heading3: { fontSize: fontSize * 1.05, fontWeight: '600' as const, color: textColor, marginTop: 8, marginBottom: 4, lineHeight: fontSize * 1.05 * 1.35 },
    heading4: { fontSize, fontWeight: '600' as const, color: textColor, marginTop: 6, marginBottom: 3 },
    heading5: { fontSize: fontSize * 0.95, fontWeight: '600' as const, color: colors.muted, marginTop: 4, marginBottom: 2 },
    heading6: { fontSize: fontSize * 0.9, fontWeight: '500' as const, color: colors.muted, marginTop: 4, marginBottom: 2 },
    blockquote: {
      fontSize, color: textColor, lineHeight: lh,
      borderLeftColor: accent, borderLeftWidth: 3,
      backgroundColor: `${accent}0D`,
      paddingLeft: 12, paddingTop: 6, paddingBottom: 6,
      marginTop: 8, marginBottom: 10, borderRadius: 4,
    },
    bullet_list: { marginBottom: 6, marginTop: 2 },
    ordered_list: { marginBottom: 6, marginTop: 2 },
    list_item: { fontSize, color: textColor, lineHeight: lh, marginBottom: 3, flexDirection: 'row' as const },
    bullet_list_icon: { color: accent, fontSize: fontSize * 0.5, marginTop: fontSize * 0.6, marginRight: 8, lineHeight: fontSize * 0.5 },
    ordered_list_icon: { color: accent, fontSize, fontWeight: '700' as const, marginRight: 6, lineHeight: lh },
    fence: {
      fontSize: fontSize * 0.84, color: '#CDD6F4', backgroundColor: '#1E1E2E',
      borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
      padding: 12, marginTop: 8, marginBottom: 10,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: fontSize * 0.84 * 1.65,
    },
    code_inline: {
      fontSize: fontSize * 0.87, color: accent,
      backgroundColor: `${accent}14`, borderRadius: 4,
      paddingHorizontal: 4, paddingVertical: 1,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    link: { color: accent, textDecorationLine: 'underline' as const },
    strong: { fontWeight: '700' as const, color: textColor },
    em: { fontStyle: 'italic' as const, color: textColor },
    s: { textDecorationLine: 'line-through' as const },
    hr: { marginTop: 10, marginBottom: 10, borderColor: colors.border, height: 1 },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, marginVertical: 8 },
    th: { backgroundColor: `${accent}14`, padding: 8, fontWeight: '700' as const, color: textColor, fontSize },
    td: { padding: 8, color: textColor, fontSize, borderTopWidth: 1, borderTopColor: colors.border },
    tr: {},
    image: { maxWidth: '100%' as any },
  };
}

// ─── Markdown render rules (inline math) ─────────────────────────────────────

function buildRenderRules(fontSize: number, textColor: string) {
  return {
    text: (node: any, children: any, parent: any, styles: any) => {
      const raw: string = node.content ?? '';
      if (!raw.includes('$')) return <Text key={node.key} style={styles.text}>{raw}</Text>;
      const parts = raw.split(/(\$[^$\n]+?\$)/g);
      if (parts.length === 1) return <Text key={node.key} style={styles.text}>{raw}</Text>;
      return (
        <Text key={node.key} style={styles.text}>
          {parts.map((part, i) => {
            if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
              const unicode = latexToInlineUnicode(part.slice(1, -1).trim());
              return (
                <Text key={i} style={{ fontStyle: 'italic', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: fontSize * 0.97, color: textColor, letterSpacing: 0.2 }}>
                  {unicode}
                </Text>
              );
            }
            return part;
          })}
        </Text>
      );
    },
    fence: (node: any) => {
      const code = node.content ?? '';
      const lang = node.sourceInfo ?? '';
      return <CodeBlock key={node.key} code={code} language={lang} fontSize={fontSize} />;
    },
  };
}

// ─── Code block inside a structured block ────────────────────────────────────

function CodeBlock({ code, language, fontSize }: { code: string; language?: string; fontSize: number }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const langLabel = language && language !== 'text' ? language.toLowerCase() : null;
  return (
    <View style={codeBlockStyles.container}>
      <View style={codeBlockStyles.topBar}>
        <View style={codeBlockStyles.dotRow}>
          <View style={[codeBlockStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[codeBlockStyles.dot, { backgroundColor: '#FFBD2E' }]} />
          <View style={[codeBlockStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        {langLabel ? <Text style={codeBlockStyles.langLabel}>{langLabel}</Text> : <View style={{ flex: 1 }} />}
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Text style={[codeBlockStyles.copyBtn, copied && codeBlockStyles.copyBtnDone]}>
            {copied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={[codeBlockStyles.code, { fontSize: fontSize * 0.84, lineHeight: fontSize * 0.84 * 1.65 }]}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const codeBlockStyles = StyleSheet.create({
  container: { backgroundColor: '#1E1E2E', borderRadius: 10, marginTop: 8, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dotRow: { flexDirection: 'row', gap: 5, marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  langLabel: { flex: 1, fontSize: 11, color: '#6E7681', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textTransform: 'uppercase', letterSpacing: 0.8 },
  copyBtn: { fontSize: 12, color: '#6E7681', fontWeight: '600' },
  copyBtnDone: { color: '#22C55E' },
  code: { color: '#CDD6F4', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', padding: 12 },
});

// ─── Single block card ────────────────────────────────────────────────────────

interface BlockCardProps {
  block: StructuredBlock;
  fontSize: number;
  isDark: boolean;
  colors: ReturnType<typeof useColors>;
  index: number;
}

function BlockCard({ block, fontSize, isDark, colors, index }: BlockCardProps) {
  const design = BLOCK_DESIGNS[block.type];
  const accent = isDark ? design.accentDark : design.accent;
  const textColor = colors.foreground;
  const surface = colors.surface;
  const border = colors.border;

  const [collapsed, setCollapsed] = useState(false);
  const collapseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  // Staggered entrance animation
  useEffect(() => {
    const delay = index * 60;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleCollapse = useCallback(() => {
    const toValue = collapsed ? 1 : 0;
    Animated.timing(collapseAnim, { toValue, duration: 200, easing: Easing.ease, useNativeDriver: false }).start();
    setCollapsed(!collapsed);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [collapsed, collapseAnim]);

  const mdStyles = buildMdStyles(colors, fontSize, textColor, accent);
  const renderRules = buildRenderRules(fontSize, textColor);

  // Split content into markdown segments and block math
  const segments = splitContentSegments(block.content);

  const bodyContent = (
    <View>
      {segments.map((seg, i) => {
        if (seg.type === 'math-block') {
          return (
            <View key={i} style={{ marginVertical: 10, alignItems: 'center', width: '100%' }}>
              <MathRenderer latex={seg.latex} display fontSize={fontSize} color={textColor} />
            </View>
          );
        }
        if (!seg.content.trim()) return null;
        try {
          return (
            <Markdown key={i} style={mdStyles} rules={renderRules as any}>
              {seg.content}
            </Markdown>
          );
        } catch {
          return <Text key={i} style={{ fontSize, color: textColor, lineHeight: fontSize * 1.65 }}>{seg.content}</Text>;
        }
      })}
    </View>
  );

  return (
    <Animated.View
      style={[
        blockCardStyles.card,
        {
          backgroundColor: surface,
          borderColor: border,
          borderLeftColor: accent,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header row */}
      <View style={blockCardStyles.header}>
        <View style={blockCardStyles.headerLeft}>
          <Text style={[blockCardStyles.icon, { color: accent }]}>{design.icon}</Text>
          <Text style={[blockCardStyles.label, { color: accent }]}>{design.label.toUpperCase()}</Text>
          {block.title && (
            <Text style={[blockCardStyles.title, { color: textColor }]} numberOfLines={1}>
              {block.title}
            </Text>
          )}
        </View>
        <View style={blockCardStyles.headerRight}>
          {design.showCopy && (
            <CopyButton content={block.content} accent={accent} compact />
          )}
          {design.collapsible && (
            <TouchableOpacity
              onPress={toggleCollapse}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              style={{ marginLeft: 10 }}
            >
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                {collapsed ? '▸' : '▾'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body — collapsible */}
      {!collapsed && (
        <View style={blockCardStyles.body}>
          {bodyContent}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Content segment splitter (same as AIResponseRenderer) ───────────────────

type ContentSegment =
  | { type: 'markdown'; content: string }
  | { type: 'math-block'; latex: string };

function splitContentSegments(text: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const blockMathPattern = /\$\$([\s\S]*?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = blockMathPattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) segments.push({ type: 'markdown', content: before });
    const latex = match[1].trim();
    if (latex) segments.push({ type: 'math-block', latex });
    lastIndex = match.index + match[0].length;
  }
  const remaining = text.slice(lastIndex);
  if (remaining.trim()) segments.push({ type: 'markdown', content: remaining });
  return segments.length > 0 ? segments : [{ type: 'markdown', content: text }];
}

const blockCardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  icon: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginLeft: 4,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },
});

// ─── Main export ──────────────────────────────────────────────────────────────

export interface StructuredBlockRendererProps {
  blocks: StructuredBlock[];
  fontSize?: number;
  streaming?: boolean;
}

export function StructuredBlockRenderer({
  blocks,
  fontSize = 15,
  streaming = false,
}: StructuredBlockRendererProps) {
  const colors = useColors();
  const isDark = colors.background === '#151718' || colors.background.toLowerCase().includes('1');

  if (streaming || blocks.length === 0) return null;

  return (
    <View style={{ gap: 0 }}>
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          fontSize={fontSize}
          isDark={isDark}
          colors={colors}
          index={index}
        />
      ))}
    </View>
  );
}
