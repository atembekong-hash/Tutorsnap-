/**
 * AIResponseRenderer — Clean, production-quality AI response rendering
 *
 * Fixes applied in this version:
 *   1. Dark mode code blocks: CodeCard and fence style now use useColorScheme()
 *   2. Inline math: text rule added to buildRenderRules so $...$ renders in paragraphs
 *   3. Typography: improved letter-spacing, paragraph spacing, heading weights
 *   4. Light/dark: all color-sensitive values use theme tokens or colorScheme check
 *
 * Architecture:
 *   1. processAIResponse() sanitizes and normalizes the raw text
 *   2. splitIntoSegments() splits text at $$...$$ block math boundaries only
 *      (inline $...$ stays inside Markdown segments for proper paragraph flow)
 *   3. Each Markdown segment renders via react-native-markdown-display with
 *      carefully tuned styles and custom rules
 *   4. Block math segments render via MathRenderer (SVG server or Unicode fallback)
 *   5. Inline math ($...$) inside Markdown is handled by the custom text rule
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { MathRenderer } from '@/components/math-renderer';
import { processAIResponse } from '@/lib/ai-response-pipeline';
import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

export interface AIResponseRendererProps {
  markdown: string;
  fontSize?: number;
  color?: string;
  codeBackground?: string;
  streaming?: boolean;
  containerStyle?: object;
  onLinkPress?: (url: string) => void;
  flavor?: 'commonmark' | 'github';
  animateWords?: boolean;
  stripPreamble?: boolean;
  onDefineWord?: (word: string) => void;
  blocksStartCollapsed?: boolean;
  compactBlocks?: boolean;
}

// ─── Segment types ─────────────────────────────────────────────────────────────
type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'math-block'; latex: string };

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
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

// ─── Inline math: convert $...$ to styled Unicode text within a paragraph ─────
function renderInlineMath(text: string, fontSize: number, color: string): React.ReactNode[] {
  const parts = text.split(/(\$[^$\n]+?\$)/g);
  if (parts.length === 1) return [text];

  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const latex = part.slice(1, -1).trim();
      const unicode = latexToInlineUnicode(latex);
      return (
        <Text
          key={i}
          style={{
            fontStyle: 'italic',
            fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
            fontSize: fontSize * 0.97,
            color,
            letterSpacing: 0.2,
          }}
        >
          {unicode}
        </Text>
      );
    }
    return part;
  });
}

// Lightweight inline LaTeX → Unicode (for paragraph-embedded math)
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
  [/\^{([^}]+)}/g,'($1)'],[/_{([^}]+)}/g,'₍$1₎'],
  [/\{/g,''],[/\}/g,''],[/\\,/g,' '],[/\\;/g,' '],[/\\ /g,' '],
];

function latexToInlineUnicode(latex: string): string {
  let r = latex;
  for (const [pat, rep] of INLINE_SYMBOL_MAP) r = r.replace(pat, rep);
  r = r.replace(/\\([a-zA-Z]+)/g, '$1');
  return r.trim();
}

// ─── Premium Code Card (dark/light aware) ─────────────────────────────────────
function CodeCard({ code, language, fontSize, isDark }: { code: string; language?: string; fontSize: number; isDark: boolean }) {
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

  const bg = isDark ? '#1E1E2E' : '#F3F4F6';
  const topBarBg = isDark ? '#181825' : '#E9EBF0';
  const codeFg = isDark ? '#CDD6F4' : '#1F2937';
  const labelFg = isDark ? '#585B70' : '#6B7280';
  const borderFg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const topBorderFg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[codeCardStyles.container, { backgroundColor: bg, borderColor: borderFg }]}>
      <View style={[codeCardStyles.topBar, { backgroundColor: topBarBg, borderBottomColor: topBorderFg }]}>
        <View style={codeCardStyles.dotRow}>
          <View style={[codeCardStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[codeCardStyles.dot, { backgroundColor: '#FFBD2E' }]} />
          <View style={[codeCardStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        {langLabel ? (
          <Text style={[codeCardStyles.langLabel, { color: labelFg }]}>{langLabel}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Text style={[codeCardStyles.copyBtn, { color: copied ? '#A6E3A1' : labelFg }]}>
            {copied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={codeCardStyles.scrollView}>
        <Text style={[codeCardStyles.code, { fontSize: fontSize * 0.84, lineHeight: fontSize * 0.84 * 1.7, color: codeFg }]}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const codeCardStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  dotRow: { flexDirection: 'row', gap: 6, marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  langLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  copyBtn: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  scrollView: { paddingHorizontal: 14, paddingVertical: 12 },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

// ─── Staggered Reveal ──────────────────────────────────────────────────────────
function StaggeredReveal({ children, streaming }: { children: React.ReactNode; streaming: boolean }) {
  const opacity = useRef(new Animated.Value(streaming ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(streaming ? 0 : 6)).current;

  useEffect(() => {
    if (!streaming) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }
  }, [streaming]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── Markdown styles ───────────────────────────────────────────────────────────
function buildMarkdownStyles(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
  textColor: string,
  codeBackground?: string,
  isDark?: boolean,
) {
  const primary = colors.primary;
  const surface = codeBackground ?? colors.surface;
  const border = colors.border;
  const muted = colors.muted;
  const lh = fontSize * 1.72;

  const codeBg = isDark ? '#1E1E2E' : '#F3F4F6';
  const codeFg = isDark ? '#CDD6F4' : '#1F2937';

  return {
    body: {
      fontSize,
      color: textColor,
      lineHeight: lh,
    },
    paragraph: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      marginTop: 0,
      marginBottom: fontSize * 0.75,
    },
    heading1: {
      fontSize: fontSize * 1.45,
      fontWeight: '800' as const,
      color: textColor,
      marginTop: 20,
      marginBottom: 8,
      lineHeight: fontSize * 1.45 * 1.25,
      letterSpacing: -0.5,
      paddingBottom: 6,
    },
    heading2: {
      fontSize: fontSize * 1.22,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 16,
      marginBottom: 6,
      lineHeight: fontSize * 1.22 * 1.3,
      letterSpacing: -0.3,
    },
    heading3: {
      fontSize: fontSize * 1.1,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 14,
      marginBottom: 5,
      lineHeight: fontSize * 1.1 * 1.35,
      letterSpacing: -0.2,
    },
    heading4: {
      fontSize: fontSize * 1.02,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 12,
      marginBottom: 4,
      lineHeight: fontSize * 1.02 * 1.35,
    },
    heading5: {
      fontSize: fontSize * 0.95,
      fontWeight: '600' as const,
      color: muted,
      marginTop: 10,
      marginBottom: 3,
      lineHeight: fontSize * 0.95 * 1.35,
    },
    heading6: {
      fontSize: fontSize * 0.9,
      fontWeight: '500' as const,
      color: muted,
      marginTop: 8,
      marginBottom: 2,
      lineHeight: fontSize * 0.9 * 1.35,
    },
    blockquote: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      borderLeftColor: primary,
      borderLeftWidth: 3,
      backgroundColor: `${primary}0A`,
      paddingLeft: 14,
      paddingTop: 8,
      paddingBottom: 8,
      marginTop: 10,
      marginBottom: 12,
      borderRadius: 4,
    },
    bullet_list: { marginBottom: 8, marginTop: 4 },
    ordered_list: { marginBottom: 8, marginTop: 4 },
    list_item: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      marginBottom: 4,
      flexDirection: 'row' as const,
    },
    bullet_list_icon: {
      color: primary,
      fontSize: fontSize * 0.5,
      marginTop: fontSize * 0.62,
      marginRight: 8,
      lineHeight: fontSize * 0.5,
    },
    ordered_list_icon: {
      color: primary,
      fontSize,
      fontWeight: '700' as const,
      marginRight: 6,
      lineHeight: lh,
    },
    fence: {
      fontSize: fontSize * 0.84,
      color: codeFg,
      backgroundColor: codeBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
      padding: 14,
      marginTop: 10,
      marginBottom: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: fontSize * 0.84 * 1.7,
    },
    code_inline: {
      fontSize: fontSize * 0.87,
      color: primary,
      backgroundColor: `${primary}14`,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    link: {
      color: primary,
      textDecorationLine: 'underline' as const,
    },
    strong: { fontWeight: '700' as const, color: textColor },
    em: { fontStyle: 'italic' as const, color: textColor },
    s: { textDecorationLine: 'line-through' as const },
    hr: { marginTop: 14, marginBottom: 14, borderColor: border, height: 1 },
    table: {
      fontSize,
      color: textColor,
      marginTop: 10,
      marginBottom: 14,
      borderColor: border,
      borderWidth: 1,
      borderRadius: 8,
    },
    th: {
      fontWeight: '600' as const,
      backgroundColor: `${primary}10`,
      padding: 10,
      borderColor: border,
      color: textColor,
    },
    td: { padding: 10, borderColor: border },
    tr: { borderColor: border },
  };
}

// ─── Custom render rules ───────────────────────────────────────────────────────
function buildRenderRules(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
  textColor: string,
  isDark: boolean,
) {
  const primary = colors.primary;
  const border = colors.border;
  const lh = fontSize * 1.72;

  return {
    // Fence: use our premium CodeCard (dark/light aware)
    fence: (node: any) => {
      const code = node.content ?? '';
      const lang = node.sourceInfo ?? '';
      return <CodeCard key={node.key} code={code.trim()} language={lang} fontSize={fontSize} isDark={isDark} />;
    },

    // HR: gradient line
    hr: (node: any) => (
      <View key={node.key} style={{ marginTop: 16, marginBottom: 16 }}>
        <LinearGradient
          colors={['transparent', `${primary}40`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 1, borderRadius: 1 }}
        />
      </View>
    ),

    // Bullet list icon: refined colored dot
    bullet_list_icon: (node: any) => (
      <View
        key={node.key}
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: primary,
          marginRight: 10,
          marginTop: (lh - 5) / 2,
          flexShrink: 0,
        }}
      />
    ),

    // Ordered list icon: colored number badge
    ordered_list_icon: (node: any) => {
      const num = node.index != null ? node.index + 1 : '•';
      return (
        <View
          key={node.key}
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: `${primary}18`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
            marginTop: (lh - 22) / 2,
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: fontSize * 0.75, fontWeight: '700', color: primary, lineHeight: 22 }}>
            {num}
          </Text>
        </View>
      );
    },

    // Strong: bold
    strong: (node: any, children: React.ReactNode[]) => (
      <Text key={node.key} style={{ fontWeight: '700', color: textColor }}>{children}</Text>
    ),

    // Text: handle inline math $...$ within paragraphs
    text: (node: any, children: React.ReactNode[], parent: any, styles: any) => {
      const content = node.content ?? '';
      if (content.includes('$')) {
        const parts = renderInlineMath(content, fontSize, textColor);
        if (parts.length > 1) {
          return (
            <Text key={node.key} style={{ fontSize, color: textColor, lineHeight: lh }}>
              {parts}
            </Text>
          );
        }
      }
      return (
        <Text key={node.key} style={styles.text}>
          {children}
        </Text>
      );
    },

    // Table: scrollable with rounded border
    table: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ marginTop: 10, marginBottom: 14, borderRadius: 10, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>{children}</View>
        </ScrollView>
      </View>
    ),

    // Table header row
    thead: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ backgroundColor: `${primary}10` }}>{children}</View>
    ),

    // H1: large bold heading with bottom border
    heading1: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ marginTop: 20, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: border }}>
        <Text style={{ fontSize: fontSize * 1.45, fontWeight: '800', color: textColor, letterSpacing: -0.5, lineHeight: fontSize * 1.45 * 1.25 }}>
          {children}
        </Text>
      </View>
    ),

    // H2: left accent bar
    heading2: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, marginBottom: 6 }}>
        <View style={{ width: 3, borderRadius: 2, backgroundColor: primary, marginRight: 10, marginTop: 3, alignSelf: 'stretch' }} />
        <Text style={{ flex: 1, fontSize: fontSize * 1.22, fontWeight: '700', color: textColor, letterSpacing: -0.3, lineHeight: fontSize * 1.22 * 1.3 }}>
          {children}
        </Text>
      </View>
    ),

    // H3: smaller accent bar
    heading3: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, marginBottom: 5 }}>
        <View style={{ width: 2.5, borderRadius: 2, backgroundColor: `${primary}70`, marginRight: 9, marginTop: 4, alignSelf: 'stretch' }} />
        <Text style={{ flex: 1, fontSize: fontSize * 1.1, fontWeight: '600', color: textColor, letterSpacing: -0.2, lineHeight: fontSize * 1.1 * 1.35 }}>
          {children}
        </Text>
      </View>
    ),

    // H5: formula label style
    heading5: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ marginTop: 10, marginBottom: 4 }}>
        <Text style={{ fontSize: fontSize * 0.95, fontWeight: '600', color: primary, letterSpacing: 0.3, lineHeight: fontSize * 0.95 * 1.35 }}>
          {children}
        </Text>
      </View>
    ),

    // H6: tip/warning label style
    heading6: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ marginTop: 8, marginBottom: 3 }}>
        <Text style={{ fontSize: fontSize * 0.9, fontWeight: '500', color: colors.muted, fontStyle: 'italic', lineHeight: fontSize * 0.9 * 1.35 }}>
          {children}
        </Text>
      </View>
    ),
  };
}

// ─── Fallback renderer ─────────────────────────────────────────────────────────
function FallbackRenderer({ text, fontSize, color }: { text: string; fontSize: number; color: string }) {
  const plain = text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/\$\$[\s\S]*?\$\$/g, '[math]')
    .replace(/\$[^$\n]+\$/g, '[math]')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
  return (
    <Text style={{ fontSize, color, lineHeight: fontSize * 1.72 }}>
      {plain}
    </Text>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function AIResponseRenderer({
  markdown,
  fontSize = 15,
  color,
  codeBackground,
  streaming = false,
  animateWords = false,
  containerStyle,
  onLinkPress,
  flavor = 'github',
  stripPreamble = !streaming,
  onDefineWord,
  blocksStartCollapsed = false,
  compactBlocks = false,
}: AIResponseRendererProps) {
  const colors = useColors();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const textColor = color ?? colors.foreground;

  const cleanMarkdown = useMemo(
    () => processAIResponse(markdown, { stripPreamble, normalizeLaTeX: true }),
    [markdown, stripPreamble],
  );

  const segments = useMemo(() => splitIntoSegments(cleanMarkdown), [cleanMarkdown]);

  const markdownStyles = useMemo(
    () => buildMarkdownStyles(colors, fontSize, textColor, codeBackground, isDark),
    [colors, fontSize, textColor, codeBackground, isDark],
  );

  const renderRules = useMemo(
    () => buildRenderRules(colors, fontSize, textColor, isDark),
    [colors, fontSize, textColor, isDark],
  );

  const handleLinkPress = useCallback(
    (url: string) => {
      if (onLinkPress) onLinkPress(url);
      else Linking.openURL(url).catch(() => {});
      return true;
    },
    [onLinkPress],
  );

  if (!cleanMarkdown) return null;

  const AnimatedWrapper = animateWords && !streaming ? AnimatedFadeInWrapper : React.Fragment;

  // Fast path: no block math
  if (segments.length === 1 && segments[0].type === 'markdown') {
    try {
      return (
        <StaggeredReveal streaming={streaming}>
          <View style={[styles.container, containerStyle]}>
            <AnimatedWrapper>
              <Markdown style={markdownStyles} rules={renderRules} onLinkPress={handleLinkPress}>
                {cleanMarkdown}
              </Markdown>
            </AnimatedWrapper>
          </View>
        </StaggeredReveal>
      );
    } catch {
      return (
        <View style={[styles.container, containerStyle]}>
          <FallbackRenderer text={cleanMarkdown} fontSize={fontSize} color={textColor} />
        </View>
      );
    }
  }

  // Mixed: Markdown + block math segments
  return (
    <StaggeredReveal streaming={streaming}>
      <View style={[styles.container, containerStyle]}>
        {segments.map((segment, index) => {
          if (segment.type === 'math-block') {
            return (
              <View key={index} style={styles.blockMathWrapper}>
                <MathRenderer latex={segment.latex} display fontSize={fontSize} color={textColor} />
              </View>
            );
          }
          if (!segment.content.trim()) return null;
          try {
            return (
              <Markdown key={index} style={markdownStyles} rules={renderRules} onLinkPress={handleLinkPress}>
                {segment.content}
              </Markdown>
            );
          } catch {
            return <FallbackRenderer key={index} text={segment.content} fontSize={fontSize} color={textColor} />;
          }
        })}
      </View>
    </StaggeredReveal>
  );
}

// ─── Error boundary ────────────────────────────────────────────────────────────
interface ErrorBoundaryState { hasError: boolean; errorText: string; }

export class AIResponseErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackText?: string; fontSize?: number; color?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallbackText?: string; fontSize?: number; color?: string }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorText: error.message };
  }
  render() {
    if (this.state.hasError) {
      const { fallbackText = '', fontSize = 15, color = '#11181C' } = this.props;
      return <FallbackRenderer text={fallbackText} fontSize={fontSize} color={color} />;
    }
    return this.props.children;
  }
}

// ─── Animated fade-in wrapper ──────────────────────────────────────────────────
function AnimatedFadeInWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: { flex: 0 },
  blockMathWrapper: {
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
});
