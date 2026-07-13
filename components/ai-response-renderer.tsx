/**
 * AIResponseRenderer
 *
 * The single, centralized component for rendering all AI-generated content
 * in TutorSnap. Every chat message, solution explanation, step card, and
 * any other AI output MUST be rendered through this component.
 *
 * Features:
 * - Full Markdown rendering (CommonMark + GitHub Flavored Markdown)
 * - LaTeX math rendering (inline $...$ and block $$...$$) via KaTeX
 * - Streaming support with fade-in animation
 * - Theme-aware styling (light/dark mode)
 * - Graceful fallback for malformed content
 * - Passes through the centralized sanitization pipeline automatically
 *
 * Usage:
 *   <AIResponseRenderer markdown={aiText} />
 *   <AIResponseRenderer markdown={streamingText} streaming />
 *   <AIResponseRenderer markdown={text} fontSize={14} color={colors.foreground} />
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { EnrichedMarkdownText } from 'react-native-enriched-markdown';
import type { MarkdownStyle } from 'react-native-enriched-markdown';
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
  /**
   * Whether to strip AI preamble phrases ("Sure! Here is...").
   * Default: true for complete responses, false for streaming chunks.
   */
  stripPreamble?: boolean;
}

/**
 * Build the MarkdownStyle object from the current theme colors and font size.
 */
function buildMarkdownStyle(
  colors: ReturnType<typeof useColors>,
  fontSize: number,
): MarkdownStyle {
  const fg = colors.foreground;
  const muted = colors.muted;
  const primary = colors.primary;
  const surface = colors.surface;
  const border = colors.border;
  const lh = fontSize * 1.55;

  return {
    paragraph: {
      fontSize,
      color: fg,
      lineHeight: lh,
      marginBottom: 8,
    },
    h1: {
      fontSize: fontSize * 1.6,
      fontWeight: '800',
      color: fg,
      marginTop: 16,
      marginBottom: 8,
      lineHeight: fontSize * 1.6 * 1.3,
    },
    h2: {
      fontSize: fontSize * 1.35,
      fontWeight: '700',
      color: fg,
      marginTop: 14,
      marginBottom: 6,
      lineHeight: fontSize * 1.35 * 1.3,
    },
    h3: {
      fontSize: fontSize * 1.15,
      fontWeight: '700',
      color: fg,
      marginTop: 12,
      marginBottom: 4,
      lineHeight: fontSize * 1.15 * 1.3,
    },
    h4: {
      fontSize: fontSize * 1.05,
      fontWeight: '600',
      color: fg,
      marginTop: 10,
      marginBottom: 4,
      lineHeight: fontSize * 1.05 * 1.3,
    },
    h5: {
      fontSize,
      fontWeight: '600',
      color: fg,
      marginTop: 8,
      marginBottom: 2,
      lineHeight: lh,
    },
    h6: {
      fontSize: fontSize * 0.9,
      fontWeight: '600',
      color: muted,
      marginTop: 8,
      marginBottom: 2,
      lineHeight: fontSize * 0.9 * 1.4,
    },
    blockquote: {
      fontSize,
      color: muted,
      lineHeight: lh,
      borderColor: primary,
      borderWidth: 3,
      backgroundColor: `${primary}10`,
      marginTop: 8,
      marginBottom: 8,
    },
    list: {
      fontSize,
      color: fg,
      lineHeight: lh,
      bulletColor: primary,
      markerColor: primary,
      marginBottom: 4,
    },
    codeBlock: {
      fontSize: fontSize * 0.88,
      color: fg,
      backgroundColor: surface,
      borderColor: border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 12,
      marginTop: 8,
      marginBottom: 8,
    },
    code: {
      fontSize: fontSize * 0.88,
      color: primary,
      backgroundColor: `${primary}12`,
    },
    link: {
      color: primary,
      underline: true,
    },
    strong: {
      fontWeight: 'bold',
      color: fg,
    },
    em: {
      fontStyle: 'italic',
      color: fg,
    },
    strikethrough: {},
    thematicBreak: {
      marginTop: 12,
      marginBottom: 12,
    },
    table: {
      fontSize,
      color: fg,
      marginTop: 8,
      marginBottom: 8,
    },
    taskList: {
      // TaskListStyle only supports checkbox-specific props
      checkedColor: primary,
      borderColor: border,
      checkmarkColor: '#FFFFFF',
    },
    math: {
      // Block math ($$...$$)
      fontSize: fontSize * 1.05,
      color: fg,
      marginTop: 12,
      marginBottom: 12,
    },
    inlineMath: {
      // Inline math ($...$) — InlineMathStyle only supports color
      color: fg,
    },
  };
}

/**
 * Fallback renderer for when EnrichedMarkdownText fails or is unavailable.
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
  // Strip remaining Markdown/LaTeX syntax for plain text fallback
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

  // Build theme-aware MarkdownStyle
  const markdownStyle = useMemo(
    () => buildMarkdownStyle(colors, fontSize),
    [colors, fontSize],
  );

  // Override text color if provided
  const finalStyle = useMemo((): MarkdownStyle => {
    if (color && color !== colors.foreground) {
      return {
        ...markdownStyle,
        paragraph: { ...markdownStyle.paragraph, color },
        h1: { ...markdownStyle.h1, color },
        h2: { ...markdownStyle.h2, color },
        h3: { ...markdownStyle.h3, color },
        h4: { ...markdownStyle.h4, color },
        h5: { ...markdownStyle.h5, color },
        h6: { ...markdownStyle.h6, color },
        list: { ...markdownStyle.list, color },
        strong: { ...markdownStyle.strong, color },
        em: { ...markdownStyle.em, color },
        math: { ...markdownStyle.math, color },
        inlineMath: { color },
      };
    }
    if (codeBackground) {
      return {
        ...markdownStyle,
        codeBlock: { ...markdownStyle.codeBlock, backgroundColor: codeBackground },
      };
    }
    return markdownStyle;
  }, [markdownStyle, color, codeBackground, colors.foreground]);

  const handleLinkPress = useCallback(
    (event: { url: string }) => {
      const url = event.url;
      if (onLinkPress) {
        onLinkPress(url);
      } else {
        Linking.openURL(url).catch(() => {});
      }
    },
    [onLinkPress],
  );

  if (!cleanMarkdown) {
    return null;
  }

  // Graceful fallback: if EnrichedMarkdownText is unavailable (e.g. Expo Go),
  // catch the error and render plain text.
  try {
    return (
      <View style={[styles.container, containerStyle]}>
        <EnrichedMarkdownText
          markdown={cleanMarkdown}
          markdownStyle={finalStyle}
          flavor={flavor}
          streamingAnimation={streaming}
          md4cFlags={{ latexMath: true }}
          onLinkPress={handleLinkPress}
        />
      </View>
    );
  } catch {
    return (
      <View style={[styles.container, containerStyle]}>
        <FallbackRenderer
          text={cleanMarkdown}
          fontSize={fontSize}
          color={textColor}
        />
      </View>
    );
  }
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
      const { fallbackText = '', fontSize = 15, color = '#888888' } = this.props;
      return (
        <FallbackRenderer text={fallbackText} fontSize={fontSize} color={color} />
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
  },
});
