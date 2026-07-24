/**
 * interactive-blocks.tsx
 *
 * Native renderers for the four AI-auto-inserted interactive component types:
 *   - :::checklist  — interactive tap-to-check list
 *   - :::flashcard  — flip card (front/back)
 *   - :::comparison — side-by-side comparison table
 *   - :::timeline   — vertical timeline with labels
 *
 * Each component is self-contained and styled with theme tokens.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';
import { addBookmark } from '@/lib/bookmarks';
import { useRouter } from 'expo-router';

// ─── Checklist ─────────────────────────────────────────────────────────────────

interface ChecklistProps {
  items: string[];
}

export function InteractiveChecklist({ items }: ChecklistProps) {
  const colors = useColors();
  const [checked, setChecked] = useState<boolean[]>(() => items.map(() => false));

  const toggle = (i: number) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const doneCount = checked.filter(Boolean).length;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Checklist</Text>
        <Text style={[styles.cardBadge, { color: colors.primary }]}>
          {doneCount}/{items.length}
        </Text>
      </View>
      {items.map((item, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => toggle(i)}
          style={styles.checkRow}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: checked[i] ? colors.primary : colors.border,
                backgroundColor: checked[i] ? colors.primary : 'transparent',
              },
            ]}
          >
            {checked[i] && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text
            style={[
              styles.checkLabel,
              {
                color: checked[i] ? colors.muted : colors.foreground,
                textDecorationLine: checked[i] ? 'line-through' : 'none',
              },
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Flashcard ─────────────────────────────────────────────────────────────────

interface FlashcardProps {
  front: string;
  back: string;
  /** Subject context — used when saving to the Flashcards deck */
  subject?: string;
}

export function InteractiveFlashcard({ front, back, subject }: FlashcardProps) {
  const colors = useColors();
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const handleSaveToDeck = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await addBookmark({
        id: `flashcard-${Date.now()}`,
        problem: front,
        answer: back,
        subject: (subject as any) ?? 'mathematics',
        steps: [],
        solvedAt: Date.now(),
      });
      setSaved(true);
      Alert.alert(
        'Saved to Deck',
        'This flashcard has been added to your Flashcards deck.',
        [
          { text: 'View Flashcards', onPress: () => router.push('/flashcards' as any) },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Error', 'Could not save to deck. Please try again.');
    }
  };

  const flip = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(anim, {
      toValue: flipped ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setFlipped((f) => !f));
  };

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <TouchableOpacity onPress={flip} activeOpacity={0.85} style={styles.flashcardOuter}>
      {/* Front face */}
      <Animated.View
        style={[
          styles.card,
          styles.flashcardFace,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            transform: [{ rotateY: frontRotate }],
            opacity: flipped ? 0 : 1,
            position: flipped ? 'absolute' : 'relative',
          },
        ]}
      >
        <Text style={styles.flashcardHint}>Tap to reveal</Text>
        <Text style={[styles.flashcardText, { color: '#fff' }]}>{front}</Text>
      </Animated.View>
      {/* Back face */}
      <Animated.View
        style={[
          styles.card,
          styles.flashcardFace,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primary,
            borderWidth: 2,
            transform: [{ rotateY: backRotate }],
            opacity: flipped ? 1 : 0,
            position: flipped ? 'relative' : 'absolute',
          },
        ]}
      >
        <Text style={[styles.flashcardHint, { color: colors.primary }]}>Answer</Text>
        <Text style={[styles.flashcardText, { color: colors.foreground }]}>{back}</Text>
        <Text style={[styles.flashcardHint, { color: colors.muted, marginTop: 8 }]}>Tap to flip back</Text>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); handleSaveToDeck(); }}
          style={[styles.saveDeckBtn, { backgroundColor: saved ? colors.success + '22' : colors.primary + '18', borderColor: saved ? colors.success : colors.primary }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.saveDeckText, { color: saved ? colors.success : colors.primary }]}>
            {saved ? '✓ Saved to Deck' : '+ Save to Deck'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Comparison ────────────────────────────────────────────────────────────────

interface ComparisonProps {
  headers: string[];
  rows: string[][];
}

export function InteractiveComparison({ headers, rows }: ComparisonProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 8 }]}>Comparison</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View style={[styles.tableRow, { backgroundColor: colors.primary + '22' }]}>
            {headers.map((h, i) => (
              <View key={i} style={[styles.tableCell, i === 0 && styles.tableCellFirst]}>
                <Text style={[styles.tableHeaderText, { color: colors.primary }]}>{h}</Text>
              </View>
            ))}
          </View>
          {/* Data rows */}
          {rows.map((row, ri) => (
            <View
              key={ri}
              style={[
                styles.tableRow,
                { backgroundColor: ri % 2 === 0 ? 'transparent' : colors.border + '33' },
              ]}
            >
              {row.map((cell, ci) => (
                <View key={ci} style={[styles.tableCell, ci === 0 && styles.tableCellFirst]}>
                  <Text
                    style={[
                      styles.tableCellText,
                      { color: ci === 0 ? colors.foreground : colors.muted },
                      ci === 0 && { fontWeight: '600' },
                    ]}
                  >
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

interface TimelineEntry {
  label: string;
  description: string;
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export function InteractiveTimeline({ entries }: TimelineProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 12 }]}>Timeline</Text>
      {entries.map((entry, i) => (
        <View key={i} style={styles.timelineRow}>
          {/* Spine */}
          <View style={styles.timelineSpine}>
            <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
            {i < entries.length - 1 && (
              <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
            )}
          </View>
          {/* Content */}
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineLabel, { color: colors.primary }]}>{entry.label}</Text>
            <Text style={[styles.timelineDesc, { color: colors.foreground }]}>{entry.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Parsers ───────────────────────────────────────────────────────────────────

/** Parse :::checklist ... ::: block into string[] */
export function parseChecklist(raw: string): string[] {
  return raw
    .split('\n')
    .map((l) => l.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

/** Parse :::flashcard ... ::: block into { front, back } */
export function parseFlashcard(raw: string): { front: string; back: string } {
  const lines = raw.split('\n');
  let front = '';
  let back = '';
  for (const line of lines) {
    const fl = line.match(/^front:\s*(.+)/i);
    const bl = line.match(/^back:\s*(.+)/i);
    if (fl) front = fl[1].trim();
    if (bl) back = bl[1].trim();
  }
  return { front: front || 'Front', back: back || 'Back' };
}

/** Parse :::comparison ... ::: block into { headers, rows } */
export function parseComparison(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split('|').map((h) => h.trim()).filter(Boolean);
  const rows = lines.slice(1).map((l) => l.split('|').map((c) => c.trim()).filter(Boolean));
  return { headers, rows };
}

/** Parse :::timeline ... ::: block into TimelineEntry[] */
export function parseTimeline(raw: string): TimelineEntry[] {
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(':');
      if (idx === -1) return { label: l, description: '' };
      return { label: l.slice(0, idx).trim(), description: l.slice(idx + 1).trim() };
    });
}

/**
 * Split a markdown string into segments, extracting :::type ... ::: blocks
 * as typed segments alongside regular markdown text.
 */
export type InteractiveSegment =
  | { type: 'markdown'; content: string }
  | { type: 'checklist'; raw: string }
  | { type: 'flashcard'; raw: string }
  | { type: 'comparison'; raw: string }
  | { type: 'timeline'; raw: string };

export function splitInteractiveBlocks(text: string): InteractiveSegment[] {
  const segments: InteractiveSegment[] = [];
  // Match :::type\n...content...\n::: blocks
  const blockRe = /:::(\w+)\n([\s\S]*?):::/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) segments.push({ type: 'markdown', content: before });

    const blockType = match[1].toLowerCase() as InteractiveSegment['type'];
    const raw = match[2];
    if (['checklist', 'flashcard', 'comparison', 'timeline'].includes(blockType)) {
      segments.push({ type: blockType as any, raw });
    } else {
      // Unknown block type — treat as markdown
      segments.push({ type: 'markdown', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining.trim()) segments.push({ type: 'markdown', content: remaining });

  return segments.length > 0 ? segments : [{ type: 'markdown', content: text }];
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginVertical: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Checklist
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  // Flashcard
  flashcardOuter: {
    minHeight: 120,
    marginVertical: 8,
  },
  flashcardFace: {
    width: '100%',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  flashcardHint: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  flashcardText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  saveDeckBtn: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: 'center',
  },
  saveDeckText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Comparison table
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    minWidth: 110,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(128,128,128,0.2)',
  },
  tableCellFirst: {
    minWidth: 130,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineSpine: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
});
