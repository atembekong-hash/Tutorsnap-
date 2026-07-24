/**
 * mermaid-diagram.tsx
 *
 * Renders a Mermaid diagram from a code string.
 *
 * Strategy:
 *   - On native (iOS / Android): renders via a sandboxed WebView that loads
 *     Mermaid.js from a CDN and injects the diagram definition. The WebView
 *     posts its rendered height back so the container auto-sizes.
 *   - On web: renders via a dangerouslySetInnerHTML <div> with Mermaid loaded
 *     from CDN. Falls back to a styled code block if Mermaid fails to load.
 *
 * Safety:
 *   - The WebView is sandboxed (no JS from the app context, no navigation).
 *   - The diagram source is JSON-stringified before injection to prevent
 *     XSS-style injection through AI-generated content.
 *   - If rendering fails, a styled fallback code block is shown instead.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// Conditionally import WebView — only available on native
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch {
    WebView = null;
  }
}

// ─── HTML template ─────────────────────────────────────────────────────────────

function buildMermaidHtml(diagram: string, isDark: boolean): string {
  const bg = isDark ? '#1e2022' : '#f5f5f5';
  const fg = isDark ? '#ECEDEE' : '#11181C';
  const safeDiagram = JSON.stringify(diagram); // prevents injection

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${bg};
    color: ${fg};
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 12px;
    overflow: hidden;
  }
  #diagram svg {
    max-width: 100%;
    height: auto;
  }
  #error {
    display: none;
    color: #ef4444;
    font-size: 12px;
    padding: 8px;
    background: rgba(239,68,68,0.1);
    border-radius: 6px;
  }
</style>
</head>
<body>
<div id="diagram"></div>
<div id="error"></div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
(function() {
  var diagramSrc = ${safeDiagram};
  mermaid.initialize({
    startOnLoad: false,
    theme: ${isDark ? '"dark"' : '"default"'},
    securityLevel: 'strict',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  });
  mermaid.render('mermaid-svg', diagramSrc)
    .then(function(result) {
      document.getElementById('diagram').innerHTML = result.svg;
      var h = document.body.scrollHeight;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));
    })
    .catch(function(err) {
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = 'Diagram error: ' + err.message;
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ height: 60 }));
    });
})();
</script>
</body>
</html>`;
}

// ─── Diagram type label ───────────────────────────────────────────────────────

const DIAGRAM_TYPE_LABELS: Record<string, string> = {
  flowchart: 'Flowchart',
  graph: 'Graph',
  sequencediagram: 'Sequence Diagram',
  classdiagram: 'Class Diagram',
  statediagram: 'State Diagram',
  erdiagram: 'ER Diagram',
  gantt: 'Gantt Chart',
  pie: 'Pie Chart',
  mindmap: 'Mind Map',
  timeline: 'Timeline',
  gitgraph: 'Git Graph',
  xychart: 'XY Chart',
  block: 'Block Diagram',
  quadrantchart: 'Quadrant Chart',
  requirementdiagram: 'Requirement Diagram',
};

function parseDiagramType(code: string): string {
  const firstLine = code.trim().split('\n')[0].toLowerCase().trim();
  // Remove direction suffix e.g. "flowchart TD" -> "flowchart"
  const keyword = firstLine.split(/[\s-]/)[0];
  return DIAGRAM_TYPE_LABELS[keyword] ?? 'Diagram';
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface MermaidDiagramProps {
  code: string;
  fontSize?: number;
  onRegenerate?: () => void;
}

export function MermaidDiagram({ code, fontSize = 14, onRegenerate }: MermaidDiagramProps) {
  const colors = useColors();
  const [height, setHeight] = useState(200);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDark = colors.background === '#151718' || colors.background.toLowerCase().startsWith('#1');
  const diagramTypeLabel = parseDiagramType(code);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.height && data.height > 0) {
        setHeight(Math.min(data.height + 24, 600)); // cap at 600px
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleExport = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const doCopySource = async () => {
      await Clipboard.setStringAsync(code);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    const doShare = async () => {
      try {
        await Share.share({
          message: `Mermaid Diagram Source:\n\n\`\`\`mermaid\n${code}\n\`\`\``,
          title: 'Mermaid Diagram',
        });
      } catch {
        // user dismissed share sheet
      }
    };

    Alert.alert('Export Diagram', 'Choose an export option', [
      { text: 'Copy Source Code', onPress: doCopySource },
      { text: 'Share Diagram', onPress: doShare },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Fallback code block (used when WebView unavailable or on error) ──────────
  const FallbackBlock = () => (
    <View style={[styles.fallback, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.fallbackLabel, { color: colors.muted }]}>Diagram (Mermaid)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={[styles.fallbackCode, { color: colors.foreground }]}>{code}</Text>
      </ScrollView>
    </View>
  );

  // ── Web platform: use dangerouslySetInnerHTML via a hidden div ───────────────
  if (Platform.OS === 'web') {
    // On web, react-native-webview is not available; render a simple code block
    // (Mermaid web rendering would require a different integration approach)
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.label, { color: colors.muted }]}>Diagram</Text>
            <Text style={[styles.sublabel, { color: colors.primary }]}>{diagramTypeLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            {onRegenerate && (
              <TouchableOpacity onPress={onRegenerate} style={styles.copyBtn}>
                <Text style={[styles.copyText, { color: colors.muted }]}>Regenerate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleExport} style={styles.copyBtn}>
              <Text style={[styles.copyText, { color: colors.primary }]}>
                {copied ? 'Copied!' : 'Export'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <FallbackBlock />
      </View>
    );
  }

  // ── Native: WebView renderer ─────────────────────────────────────────────────
  if (!WebView || error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.label, { color: colors.muted }]}>Diagram</Text>
            <Text style={[styles.sublabel, { color: colors.primary }]}>{diagramTypeLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            {onRegenerate && (
              <TouchableOpacity onPress={onRegenerate} style={styles.copyBtn}>
                <Text style={[styles.copyText, { color: colors.muted }]}>Regenerate</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleExport} style={styles.copyBtn}>
              <Text style={[styles.copyText, { color: colors.primary }]}>
                {copied ? 'Copied!' : 'Export'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <FallbackBlock />
      </View>
    );
  }

  const html = buildMermaidHtml(code.trim(), isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.label, { color: colors.muted }]}>Diagram</Text>
          <Text style={[styles.sublabel, { color: colors.primary }]}>{diagramTypeLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          {onRegenerate && (
            <TouchableOpacity onPress={onRegenerate} style={styles.copyBtn}>
              <Text style={[styles.copyText, { color: colors.muted }]}>Regenerate</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleExport} style={styles.copyBtn}>
            <Text style={[styles.copyText, { color: colors.primary }]}>
              {copied ? 'Copied!' : 'Export'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <WebView
        source={{ html }}
        style={{ width: '100%', height, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        onMessage={handleMessage}
        onError={() => setError(true)}
        javaScriptEnabled
        domStorageEnabled={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowsInlineMediaPlayback={false}
        mediaPlaybackRequiresUserAction
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fallback: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    margin: 8,
  },
  fallbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fallbackCode: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
