/**
 * StructuredBlockRenderer
 *
 * Renders AI responses as a series of premium educational block cards.
 * Each block has a semantic type (direct-answer, formula, steps, etc.)
 * with its own accent color, icon, header, copy button, and collapse toggle.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { AIResponseRenderer } from '@/components/ai-response-renderer';
import { type BlockType, type StructuredBlock } from '@/lib/structured-blocks';

// ─── Block metadata ───────────────────────────────────────────────────────────

interface BlockMeta {
  icon: string;
  label: string;
  accentLight: string;
  accentDark: string;
  bgLight: string;
  bgDark: string;
  collapsible: boolean;
}

const BLOCK_META: Record<BlockType, BlockMeta> = {
  'direct-answer': {
    icon: '✦',
    label: 'ANSWER',
    accentLight: '#6366F1',
    accentDark: '#818CF8',
    bgLight: '#EEF2FF',
    bgDark: '#1E1B4B',
    collapsible: false,
  },
  'definition': {
    icon: '📖',
    label: 'DEFINITION',
    accentLight: '#3B82F6',
    accentDark: '#60A5FA',
    bgLight: '#EFF6FF',
    bgDark: '#1E3A5F',
    collapsible: true,
  },
  'concept': {
    icon: '◉',
    label: 'CONCEPT',
    accentLight: '#0891B2',
    accentDark: '#22D3EE',
    bgLight: '#ECFEFF',
    bgDark: '#164E63',
    collapsible: true,
  },
  'formula': {
    icon: '∑',
    label: 'FORMULA',
    accentLight: '#8B5CF6',
    accentDark: '#A78BFA',
    bgLight: '#F5F3FF',
    bgDark: '#2E1065',
    collapsible: false,
  },
  'steps': {
    icon: '①',
    label: 'STEPS',
    accentLight: '#0D9488',
    accentDark: '#2DD4BF',
    bgLight: '#F0FDFA',
    bgDark: '#134E4A',
    collapsible: true,
  },
  'example': {
    icon: '◆',
    label: 'EXAMPLE',
    accentLight: '#D97706',
    accentDark: '#FBBF24',
    bgLight: '#FFFBEB',
    bgDark: '#451A03',
    collapsible: true,
  },
  'insight': {
    icon: '★',
    label: 'KEY INSIGHT',
    accentLight: '#059669',
    accentDark: '#34D399',
    bgLight: '#ECFDF5',
    bgDark: '#064E3B',
    collapsible: true,
  },
  'warning': {
    icon: '⚠',
    label: 'COMMON MISTAKE',
    accentLight: '#DC2626',
    accentDark: '#F87171',
    bgLight: '#FEF2F2',
    bgDark: '#450A0A',
    collapsible: true,
  },
};

// ─── Block Card ───────────────────────────────────────────────────────────────

interface BlockCardProps {
  block: StructuredBlock;
  fontSize: number;
  index: number;
  startCollapsed?: boolean;
  compact?: boolean;
  onAction?: (text: string) => void;
}

function BlockCard({ block, fontSize, index, startCollapsed = false, compact = false, onAction }: BlockCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = useColors();
  const meta = BLOCK_META[block.type];

  const accent = isDark ? meta.accentDark : meta.accentLight;
  const cardBg = isDark ? meta.bgDark : meta.bgLight;
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';

  const [collapsed, setCollapsed] = useState(meta.collapsible && startCollapsed);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Entrance animation
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const delay = index * 60;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(enterTranslate, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = useCallback(() => {
    if (!meta.collapsible) return;
    setCollapsed(prev => !prev);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [meta.collapsible]);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(block.content);
      setCopied(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [block.content]);

  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const padV = compact ? 10 : 14;
  const padH = compact ? 12 : 16;

  return (
    <Animated.View
      style={[
        cardStyles.card,
        {
          backgroundColor: cardBg,
          borderColor: isDark ? `${accent}30` : `${accent}20`,
          borderLeftColor: accent,
          opacity: enterOpacity,
          transform: [{ translateY: enterTranslate }],
          marginBottom: compact ? 8 : 12,
        },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={meta.collapsible ? 0.7 : 1}
        style={[cardStyles.header, { paddingHorizontal: padH, paddingVertical: padV }]}
      >
        <View style={cardStyles.headerLeft}>
          <Text style={[cardStyles.icon, { color: accent, fontSize: compact ? 14 : 16 }]}>
            {meta.icon}
          </Text>
          <View style={cardStyles.headerTextCol}>
            <Text style={[cardStyles.label, { color: accent, fontSize: compact ? 9 : 10 }]}>
              {meta.label}
            </Text>
            {block.title ? (
              <Text
                style={[cardStyles.title, { color: textColor, fontSize: compact ? fontSize * 0.97 : fontSize * 1.02 }]}
                numberOfLines={collapsed ? 1 : undefined}
              >
                {block.title}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={cardStyles.headerRight}>
          <TouchableOpacity
            onPress={handleCopy}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
            style={[cardStyles.copyBtn, { borderColor: `${accent}40` }]}
          >
            <Text style={[cardStyles.copyBtnText, { color: copied ? accent : mutedColor }]}>
              {copied ? '✓' : 'Copy'}
            </Text>
          </TouchableOpacity>
          {meta.collapsible && (
            <Text style={[cardStyles.chevron, { color: mutedColor }]}>
              {collapsed ? '›' : '⌄'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Body */}
      {!collapsed && (
        <View style={[cardStyles.body, { paddingHorizontal: padH, paddingBottom: padV }]}>
          <AIResponseRenderer
            markdown={block.content}
            fontSize={compact ? fontSize * 0.93 : fontSize}
            color={textColor}
            codeBackground={isDark ? '#1E1E2E' : '#F3F4F6'}
            stripPreamble={false}
          />

          {/* Action buttons */}
          {onAction && (
            <View style={cardStyles.actionRow}>
              <TouchableOpacity
                style={[cardStyles.actionBtn, { borderColor: `${accent}50`, backgroundColor: `${accent}10` }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onAction(
                    block.title
                      ? `Please explain "${block.title}" more simply.`
                      : 'Please explain that more simply.'
                  );
                }}
              >
                <Text style={[cardStyles.actionBtnText, { color: accent }]}>↓ Simpler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[cardStyles.actionBtn, { borderColor: `${accent}50`, backgroundColor: `${accent}10` }]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  onAction(
                    block.title
                      ? `Please explain "${block.title}" in more detail.`
                      : 'Please explain that in more detail.'
                  );
                }}
              >
                <Text style={[cardStyles.actionBtnText, { color: accent }]}>↑ More Detail</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  icon: {
    marginTop: 1,
    fontWeight: '700',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontWeight: '600',
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  copyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 22,
  },
  body: {
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// ─── Main renderer ────────────────────────────────────────────────────────────

export interface StructuredBlockRendererProps {
  blocks: StructuredBlock[];
  fontSize?: number;
  startCollapsed?: boolean;
  compact?: boolean;
  onAction?: (text: string) => void;
}

export function StructuredBlockRenderer({
  blocks,
  fontSize = 15,
  startCollapsed = false,
  compact = false,
  onAction,
}: StructuredBlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <View>
      {blocks.map((block, index) => (
        <BlockCard
          key={block.id}
          block={block}
          fontSize={fontSize}
          index={index}
          startCollapsed={startCollapsed}
          compact={compact}
          onAction={onAction}
        />
      ))}
    </View>
  );
}
