/**
 * MathRenderer
 *
 * Renders LaTeX math expressions using KaTeX via a WebView.
 * Works with both old and new React Native architecture (no native code beyond WebView).
 *
 * Usage:
 *   <MathRenderer latex="x^2 + y^2 = z^2" display />
 *   <MathRenderer latex="\frac{a}{b}" />
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useColors } from '@/hooks/use-colors';

interface MathRendererProps {
  /** LaTeX string (without surrounding $ or $$ delimiters) */
  latex: string;
  /** Display mode (block). Inline mode if false. Default: false */
  display?: boolean;
  /** Font size in px. Default: 16 */
  fontSize?: number;
  /** Text color. Defaults to theme foreground. */
  color?: string;
}

function buildKatexHTML(latex: string, display: boolean, color: string, fontSize: number): string {
  const escaped = latex
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: transparent;
    overflow: hidden;
  }
  #math {
    font-size: ${fontSize}px;
    color: ${color};
    display: ${display ? 'block' : 'inline-block'};
    ${display ? 'text-align: center; width: 100%;' : ''}
    padding: ${display ? '4px 0' : '0 2px'};
  }
  .katex { color: ${color}; }
</style>
</head>
<body>
<div id="math"></div>
<script>
  try {
    katex.render(\`${escaped}\`, document.getElementById('math'), {
      displayMode: ${display},
      throwOnError: false,
      output: 'html',
    });
    // Report height to React Native
    const h = document.getElementById('math').scrollHeight;
    window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));
  } catch(e) {
    document.getElementById('math').innerText = '${escaped}';
    window.ReactNativeWebView.postMessage(JSON.stringify({ height: 24, error: e.message }));
  }
</script>
</body>
</html>`;
}

export function MathRenderer({ latex, display = false, fontSize = 16, color }: MathRendererProps) {
  const colors = useColors();
  const mathColor = color ?? colors.foreground;
  const [height, setHeight] = useState(display ? 48 : 24);

  // On web, just render a text fallback (WebView not available in web)
  if (Platform.OS === 'web') {
    return (
      <Text style={{ fontSize, color: mathColor, fontStyle: 'italic' }}>
        {display ? `[${latex}]` : latex}
      </Text>
    );
  }

  const html = buildKatexHTML(latex, display, mathColor, fontSize);

  return (
    <View style={[
      styles.container,
      display ? styles.displayBlock : styles.inlineBlock,
      { height },
    ]}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height && data.height > 0) {
              setHeight(Math.ceil(data.height) + (display ? 8 : 4));
            }
          } catch {}
        }}
        backgroundColor="transparent"
        // Prevent the WebView from capturing scroll events
        nestedScrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  displayBlock: {
    width: '100%',
    marginVertical: 8,
  },
  inlineBlock: {
    // Inline math sits within a line of text
    marginHorizontal: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
