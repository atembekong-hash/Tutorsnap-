/**
 * AIResponseRenderer — Premium 7-Layer Response Presentation
 *
 * Layer 1: Inter typography (400/500/600/700/800) + JetBrains Mono for code
 * Layer 2: Custom render rules — H2/H3 accent bars, callout blockquotes,
 *           premium code cards with copy button, numbered badges, gradient HR,
 *           styled tables with alternating rows
 * Layer 3: LaTeX math via MathRenderer (pure JS Unicode/SVG)
 * Layer 5: AI bubble redesign (left accent border, metadata footer)
 * Layer 6: Syntax-highlighted code cards (Catppuccin Mocha dark theme)
 * Layer 7: Staggered section reveal animation for complete responses
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
}

// ─── Segment types ────────────────────────────────────────────────────────────
type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'math-block'; latex: string }
  | { type: 'math-inline'; latex: string };

function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^\n$]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = mathPattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) segments.push({ type: 'markdown', content: before });
    const raw = match[0];
    if (raw.startsWith('$$')) {
      segments.push({ type: 'math-block', latex: raw.slice(2, -2).trim() });
    } else {
      segments.push({ type: 'math-inline', latex: raw.slice(1, -1).trim() });
    }
    lastIndex = match.index + raw.length;
  }
  const remaining = text.slice(lastIndex);
  if (remaining) segments.push({ type: 'markdown', content: remaining });
  return segments.length > 0 ? segments : [{ type: 'markdown', content: text }];
}

// ─── Premium Code Card (Catppuccin Mocha dark theme) ─────────────────────────
function CodeCard({ code, language, fontSize }: { code: string; language?: string; fontSize: number }) {
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
    <View style={codeCardStyles.container}>
      <View style={codeCardStyles.topBar}>
        <View style={codeCardStyles.dotRow}>
          <View style={[codeCardStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[codeCardStyles.dot, { backgroundColor: '#FFBD2E' }]} />
          <View style={[codeCardStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        {langLabel ? (
          <Text style={codeCardStyles.langLabel}>{langLabel}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
          <Text style={[codeCardStyles.copyBtn, copied && codeCardStyles.copyBtnDone]}>
            {copied ? '✓ Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={codeCardStyles.scrollView}>
        <Text style={[codeCardStyles.code, { fontSize: fontSize * 0.84, lineHeight: fontSize * 0.84 * 1.7 }]}>
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

const codeCardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#181825',
  },
  dotRow: { flexDirection: 'row', gap: 6, marginRight: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  langLabel: {
    flex: 1,
    fontSize: 11,
    color: '#585B70',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  copyBtn: { fontSize: 11, color: '#585B70', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtnDone: { color: '#A6E3A1' },
  scrollView: { paddingHorizontal: 14, paddingVertical: 12 },
  code: {
    color: '#CDD6F4',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

// ─── Callout Blockquote ───────────────────────────────────────────────────────
function CalloutBlockquote({ children, primary }: { children: React.ReactNode; primary: string }) {
  return (
    <View style={[calloutStyles.container, { borderColor: `${primary}28`, backgroundColor: `${primary}07` }]}>
      <View style={[calloutStyles.bar, { backgroundColor: primary }]} />
      <View style={calloutStyles.content}>{children}</View>
    </View>
  );
}

const calloutStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 14,
    overflow: 'hidden',
  },
  bar: { width: 4 },
  content: { flex: 1, paddingHorizontal: 14, paddingVertical: 11 },
});

// ─── Staggered Reveal (complete responses only) ───────────────────────────────
function StaggeredReveal({ children, streaming }: { children: React.ReactNode; streaming: boolean }) {
  const opacity = useRef(new Animated.Value(streaming ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(streaming ? 0 : 8)).current;

  useEffect(() => {
    if (!streaming) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streaming]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Markdown styles ──────────────────────────────────────────────────────────
function buildMarkdownStyles(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
  textColor: string,
  codeBackground?: string,
) {
  const primary = colors.primary;
  const surface = codeBackground ?? colors.surface;
  const border = colors.border;
  const muted = colors.muted;
  const lh = fontSize * 1.68;

  return {
    body: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      fontFamily: 'Inter_400Regular',
    },
    paragraph: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      marginBottom: fontSize * 0.9,
      marginTop: 0,
      fontFamily: 'Inter_400Regular',
    },
    heading1: {
      fontSize: fontSize * 1.47,
      fontFamily: 'Inter_800ExtraBold',
      color: textColor,
      marginTop: 20,
      marginBottom: 10,
      lineHeight: fontSize * 1.47 * 1.3,
      letterSpacing: -0.5,
      borderBottomWidth: 0.5,
      borderBottomColor: border,
      paddingBottom: 8,
    },
    heading2: {
      fontSize: fontSize * 1.25,
      fontFamily: 'Inter_700Bold',
      color: textColor,
      marginTop: 18,
      marginBottom: 8,
      lineHeight: fontSize * 1.25 * 1.3,
      letterSpacing: -0.3,
    },
    heading3: {
      fontSize: fontSize * 1.12,
      fontFamily: 'Inter_600SemiBold',
      color: textColor,
      marginTop: 14,
      marginBottom: 6,
      lineHeight: fontSize * 1.12 * 1.3,
      letterSpacing: -0.2,
    },
    heading4: {
      fontSize: fontSize * 1.04,
      fontFamily: 'Inter_600SemiBold',
      color: textColor,
      marginTop: 12,
      marginBottom: 4,
    },
    heading5: {
      fontSize,
      fontFamily: 'Inter_600SemiBold',
      color: textColor,
      marginTop: 10,
      marginBottom: 2,
    },
    heading6: {
      fontSize: fontSize * 0.9,
      fontFamily: 'Inter_500Medium',
      color: muted,
      marginTop: 8,
      marginBottom: 2,
    },
    blockquote: {
      fontSize,
      color: muted,
      lineHeight: lh,
      borderLeftColor: primary,
      borderLeftWidth: 3,
      backgroundColor: `${primary}08`,
      paddingLeft: 14,
      marginTop: 10,
      marginBottom: 14,
      borderRadius: 6,
    },
    bullet_list: { marginBottom: 8, marginTop: 4 },
    ordered_list: { marginBottom: 8, marginTop: 4 },
    list_item: {
      fontSize,
      color: textColor,
      lineHeight: lh,
      fontFamily: 'Inter_400Regular',
      marginBottom: 5,
    },
    bullet_list_icon: { color: primary, fontSize: fontSize * 0.55, marginTop: fontSize * 0.58 },
    ordered_list_icon: { color: primary, fontSize, fontFamily: 'Inter_700Bold' },
    fence: {
      fontSize: fontSize * 0.84,
      color: '#CDD6F4',
      backgroundColor: '#1E1E2E',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.07)',
      padding: 14,
      marginTop: 10,
      marginBottom: 14,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_inline: {
      fontSize: fontSize * 0.87,
      color: primary,
      backgroundColor: `${primary}14`,
      borderRadius: 4,
      paddingHorizontal: 5,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    link: {
      color: primary,
      textDecorationLine: 'underline' as const,
      fontFamily: 'Inter_500Medium',
    },
    strong: { fontFamily: 'Inter_700Bold', color: textColor },
    em: { fontStyle: 'italic' as const, color: textColor, fontFamily: 'Inter_400Regular' },
    s: { textDecorationLine: 'line-through' as const },
    hr: { marginTop: 16, marginBottom: 16, borderColor: 'transparent', height: 1 },
    table: {
      fontSize,
      color: textColor,
      marginTop: 10,
      marginBottom: 14,
      borderColor: border,
    },
    th: {
      fontFamily: 'Inter_600SemiBold',
      backgroundColor: `${primary}10`,
      padding: 10,
      borderColor: border,
      color: textColor,
    },
    td: { padding: 10, borderColor: border, fontFamily: 'Inter_400Regular' },
    tr: { borderColor: border },
  };
}

// ─── Custom render rules ──────────────────────────────────────────────────────
function buildRenderRules(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
  textColor: string,
) {
  const primary = colors.primary;
  const border = colors.border;
  const lh = fontSize * 1.68;

  return {
    // H2: left accent bar
    heading2: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, marginBottom: 8 }}>
        <View style={{ width: 3, borderRadius: 2, backgroundColor: primary, marginRight: 10, marginTop: 2, alignSelf: 'stretch' }} />
        <Text style={{ flex: 1, fontSize: fontSize * 1.25, fontFamily: 'Inter_700Bold', color: textColor, letterSpacing: -0.3, lineHeight: fontSize * 1.25 * 1.35 }}>
          {children}
        </Text>
      </View>
    ),

    // H3: subtle left bar
    heading3: (node: any, children: React.ReactNode[]) => (
      <View key={node.key} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, marginBottom: 6 }}>
        <View style={{ width: 2, borderRadius: 1, backgroundColor: `${primary}60`, marginRight: 8, marginTop: 2, alignSelf: 'stretch' }} />
        <Text style={{ flex: 1, fontSize: fontSize * 1.12, fontFamily: 'Inter_600SemiBold', color: textColor, letterSpacing: -0.2, lineHeight: fontSize * 1.12 * 1.35 }}>
          {children}
        </Text>
      </View>
    ),

    // Blockquote: premium callout card
    blockquote: (node: any, children: React.ReactNode[]) => (
      <CalloutBlockquote key={node.key} primary={primary}>
        {children}
      </CalloutBlockquote>
    ),

    // HR: gradient line
    hr: (node: any) => (
      <View key={node.key} style={{ marginTop: 18, marginBottom: 18 }}>
        <LinearGradient
          colors={['transparent', `${primary}35`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 1, borderRadius: 1 }}
        />
      </View>
    ),

    // Fence: premium code card
    fence: (node: any) => {
      const code = node.content ?? '';
      const lang = node.sourceInfo ?? '';
      return <CodeCard key={node.key} code={code.trim()} language={lang} fontSize={fontSize} />;
    },

    // Ordered list icon: numbered badge
    ordered_list_icon: (node: any) => {
      const num = node.index != null ? node.index + 1 : '•';
      return (
        <View key={node.key} style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: `${primary}18`, alignItems: 'center', justifyContent: 'center', marginRight: 9, marginTop: (lh - 22) / 2, flexShrink: 0 }}>
          <Text style={{ fontSize: fontSize * 0.72, fontFamily: 'Inter_700Bold', color: primary, lineHeight: 22 }}>
            {num}
          </Text>
        </View>
      );
    },

    // Bullet list icon: refined dot
    bullet_list_icon: (node: any) => (
      <View key={node.key} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: primary, marginRight: 10, marginTop: (lh - 6) / 2, flexShrink: 0 }} />
    ),

    // Strong: Inter Bold
    strong: (node: any, children: React.ReactNode[]) => (
      <Text key={node.key} style={{ fontFamily: 'Inter_700Bold', color: textColor }}>{children}</Text>
    ),

    // Table: rounded container
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
  };
}

// ─── Fallback renderer ────────────────────────────────────────────────────────
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
  return <Text style={{ fontSize, color, lineHeight: fontSize * 1.68, fontFamily: 'Inter_400Regular' }}>{plain}</Text>;
}

// ─── Main component ───────────────────────────────────────────────────────────
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
}: AIResponseRendererProps) {
  const colors = useColors();
  const textColor = color ?? colors.foreground;

  const cleanMarkdown = useMemo(
    () => processAIResponse(markdown, { stripPreamble, normalizeLaTeX: true }),
    [markdown, stripPreamble],
  );

  const segments = useMemo(() => splitIntoSegments(cleanMarkdown), [cleanMarkdown]);
  const hasMath = useMemo(
    () => segments.some((s) => s.type === 'math-block' || s.type === 'math-inline'),
    [segments],
  );

  const markdownStyles = useMemo(
    () => buildMarkdownStyles(colors, fontSize, textColor, codeBackground),
    [colors, fontSize, textColor, codeBackground],
  );

  const renderRules = useMemo(
    () => buildRenderRules(colors, fontSize, textColor),
    [colors, fontSize, textColor],
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

  const AnimatedWrapper = animateWords && streaming ? AnimatedFadeInWrapper : React.Fragment;

  if (!hasMath) {
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

  return (
    <StaggeredReveal streaming={streaming}>
      <View style={[styles.container, containerStyle]}>
        {segments.map((segment, index) => {
          if (segment.type === 'math-block') {
            return <MathRenderer key={index} latex={segment.latex} display fontSize={fontSize} color={textColor} />;
          }
          if (segment.type === 'math-inline') {
            return (
              <View key={index} style={styles.inlineMathWrapper}>
                <MathRenderer latex={segment.latex} display={false} fontSize={fontSize - 1} color={textColor} />
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

// ─── Error boundary ───────────────────────────────────────────────────────────
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

// ─── Animated fade-in wrapper (streaming) ────────────────────────────────────
function AnimatedFadeInWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    opacity.setValue(0.4);
    Animated.timing(opacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
  });
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: { flex: 0 },
  inlineMathWrapper: { flexDirection: 'row', alignItems: 'center' },
});
