/**
 * AIResponseRenderer
 *
 * The single, centralized component for rendering all AI-generated content
 * in TutorSnap. Every chat message, solution explanation, step card, and
 * any other AI output MUST be rendered through this component.
 *
 * Features:
 * - Full Markdown rendering (CommonMark + GitHub Flavored Markdown)
 * - LaTeX math rendering (inline $...$ and block $$...$$) via KaTeX WebView
 * - Theme-aware styling (light/dark mode)
 * - Graceful fallback for malformed content
 * - Passes through the centralized sanitization pipeline automatically
 *
 * Usage:
 *   <AIResponseRenderer markdown={aiText} />
 *   <AIResponseRenderer markdown={streamingText} streaming />
 *   <AIResponseRenderer markdown={text} fontSize={14} color={colors.foreground} />
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Linking, Animated, Easing } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { MathRenderer } from '@/components/math-renderer';
import { processAIResponse } from '@/lib/ai-response-pipeline';
import { useColors } from '@/hooks/use-colors';

export interface AIResponseRendererProps {
  /** The raw AI response text (Markdown + LaTeX). Sanitized automatically. */
  markdown: string;
  /** Base font size. Defaults to 15. */
  fontSize?: number;
  /** Text color override. Defaults to theme foreground. */
  color?: string;
  /** Background color for code blocks. Defaults to theme surface. */
  codeBackground?: string;
  /** Enable streaming animation (fade-in for new tokens). Default: false. */
  streaming?: boolean;
  /** Additional container style. */
  containerStyle?: object;
  /** Called when a link is pressed. */
  onLinkPress?: (url: string) => void;
  /**
   * Flavor: 'github' enables GFM tables, task lists, and block math ($$).
   * Default: 'github'
   */
  flavor?: 'commonmark' | 'github';
  /** Whether to animate words fading in one-by-one during streaming. Default: false. */
  animateWords?: boolean;
  /**
   * Whether to strip AI preamble phrases ("Sure! Here is...").
   * Default: true for complete responses, false for streaming chunks.
   */
  stripPreamble?: boolean;
}

// Segment types for splitting content into markdown and math parts
type Segment =
  | { type: 'markdown'; content: string }
  | { type: 'math-block'; latex: string }
  | { type: 'math-inline'; latex: string };

/**
 * Split a markdown string into alternating markdown and math segments.
 * Block math ($$...$$) and inline math ($...$) are extracted as separate segments.
 */
function splitIntoSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match $$...$$ (block) first, then $...$ (inline)
  const mathPattern = /(\$\$[\s\S]*?\$\$|\$[^\n$]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathPattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) {
      segments.push({ type: 'markdown', content: before });
    }
    const raw = match[0];
    if (raw.startsWith('$$')) {
      segments.push({ type: 'math-block', latex: raw.slice(2, -2).trim() });
    } else {
      segments.push({ type: 'math-inline', latex: raw.slice(1, -1).trim() });
    }
    lastIndex = match.index + raw.length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    segments.push({ type: 'markdown', content: remaining });
  }

  return segments.length > 0 ? segments : [{ type: 'markdown', content: text }];
}

/**
 * Build the markdown styles object from the current theme colors and font size.
 */
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
  const lh = fontSize * 1.55;

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
      marginBottom: 8,
      marginTop: 0,
    },
    heading1: {
      fontSize: fontSize * 1.6,
      fontWeight: '800' as const,
      color: textColor,
      marginTop: 16,
      marginBottom: 8,
      lineHeight: fontSize * 1.6 * 1.3,
    },
    heading2: {
      fontSize: fontSize * 1.35,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 14,
      marginBottom: 6,
      lineHeight: fontSize * 1.35 * 1.3,
    },
    heading3: {
      fontSize: fontSize * 1.15,
      fontWeight: '700' as const,
      color: textColor,
      marginTop: 12,
      marginBottom: 4,
      lineHeight: fontSize * 1.15 * 1.3,
    },
    heading4: {
      fontSize: fontSize * 1.05,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 10,
      marginBottom: 4,
    },
    heading5: {
      fontSize,
      fontWeight: '600' as const,
      color: textColor,
      marginTop: 8,
      marginBottom: 2,
    },
    heading6: {
      fontSize: fontSize * 0.9,
      fontWeight: '600' as const,
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
      backgroundColor: `${primary}10`,
      paddingLeft: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    bullet_list: {
      marginBottom: 4,
    },
    ordered_list: {
      marginBottom: 4,
    },
    list_item: {
      fontSize,
      color: textColor,
      lineHeight: lh,
    },
    bullet_list_icon: {
      color: primary,
      fontSize,
    },
    ordered_list_icon: {
      color: primary,
      fontSize,
    },
    fence: {
      fontSize: fontSize * 0.88,
      color: textColor,
      backgroundColor: surface,
      borderColor: border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    code_inline: {
      fontSize: fontSize * 0.88,
      color: primary,
      backgroundColor: `${primary}12`,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    link: {
      color: primary,
      textDecorationLine: 'underline' as const,
    },
    strong: {
      fontWeight: 'bold' as const,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    s: {
      textDecorationLine: 'line-through' as const,
    },
    hr: {
      marginTop: 12,
      marginBottom: 12,
      borderColor: border,
    },
    table: {
      fontSize,
      color: textColor,
      marginTop: 8,
      marginBottom: 8,
      borderColor: border,
    },
    th: {
      fontWeight: '700' as const,
      backgroundColor: surface,
      padding: 6,
      borderColor: border,
    },
    td: {
      padding: 6,
      borderColor: border,
    },
    tr: {
      borderColor: border,
    },
  };
}

/**
 * Fallback renderer for when Markdown rendering fails or is unavailable.
 * Renders plain text with basic formatting stripped.
 */
function FallbackRenderer({
  text,
  fontSize,
  color,
}: {
  text: string;
  fontSize: number;
  color: string;
}) {
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
    <Text style={{ fontSize, color, lineHeight: fontSize * 1.5 }}>
      {plain}
    </Text>
  );
}

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

  // Run through the sanitization pipeline
  const cleanMarkdown = useMemo(
    () => processAIResponse(markdown, { stripPreamble, normalizeLaTeX: true }),
    [markdown, stripPreamble],
  );

  // Split content into markdown and math segments
  const segments = useMemo(() => splitIntoSegments(cleanMarkdown), [cleanMarkdown]);

  // Check if there are any math segments
  const hasMath = useMemo(
    () => segments.some((s) => s.type === 'math-block' || s.type === 'math-inline'),
    [segments],
  );

  // Build theme-aware markdown styles
  const markdownStyles = useMemo(
    () => buildMarkdownStyles(colors, fontSize, textColor, codeBackground),
    [colors, fontSize, textColor, codeBackground],
  );

  const handleLinkPress = useCallback(
    (url: string) => {
      if (onLinkPress) {
        onLinkPress(url);
      } else {
        Linking.openURL(url).catch(() => {});
      }
      return true;
    },
    [onLinkPress],
  );

  if (!cleanMarkdown) {
    return null;
  }

  // Wrap in fade-in animation when animateWords is enabled and streaming
  const AnimatedWrapper = animateWords && streaming ? AnimatedFadeInWrapper : React.Fragment;

  // If no math, render as plain markdown for performance
  if (!hasMath) {
    try {
      return (
        <View style={[styles.container, containerStyle]}>
          <AnimatedWrapper>
            <Markdown style={markdownStyles} onLinkPress={handleLinkPress}>
              {cleanMarkdown}
            </Markdown>
          </AnimatedWrapper>
        </View>
      );
    } catch {
      return (
        <View style={[styles.container, containerStyle]}>
          <FallbackRenderer text={cleanMarkdown} fontSize={fontSize} color={textColor} />
        </View>
      );
    }
  }

  // Render segments: markdown parts via Markdown, math via MathRenderer
  return (
    <View style={[styles.container, containerStyle]}>
      {segments.map((segment, index) => {
        if (segment.type === 'math-block') {
          return (
            <MathRenderer
              key={index}
              latex={segment.latex}
              display
              fontSize={fontSize}
              color={textColor}
            />
          );
        }
        if (segment.type === 'math-inline') {
          return (
            <View key={index} style={styles.inlineMathWrapper}>
              <MathRenderer
                latex={segment.latex}
                display={false}
                fontSize={fontSize - 1}
                color={textColor}
              />
            </View>
          );
        }
        // markdown segment
        if (!segment.content.trim()) return null;
        try {
          return (
            <Markdown key={index} style={markdownStyles} onLinkPress={handleLinkPress}>
              {segment.content}
            </Markdown>
          );
        } catch {
          return (
            <FallbackRenderer
              key={index}
              text={segment.content}
              fontSize={fontSize}
              color={textColor}
            />
          );
        }
      })}
    </View>
  );
}

/**
 * ErrorBoundary wrapper for AIResponseRenderer.
 * Catches render errors and shows a graceful fallback.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  errorText: string;
}

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
      return (
        <FallbackRenderer text={fallbackText} fontSize={fontSize} color={color} />
      );
    }
    return this.props.children;
  }
}

/**
 * Animated wrapper that fades in new content smoothly during streaming.
 * Each time content changes, a subtle fade-in is triggered.
 */
function AnimatedFadeInWrapper({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    opacity.setValue(0.4);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  });
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
  inlineMathWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
