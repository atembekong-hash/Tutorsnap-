/**
 * ProblemCommentSheet
 *
 * A Modal bottom-sheet that shows the comment thread for a classroom problem.
 * Students can add comments, reply to specific comments (quoted reply), and
 * delete their own comments.
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import {
  getComments,
  addComment,
  deleteComment,
  type ProblemComment,
} from "@/lib/problem-comments";

interface Props {
  visible: boolean;
  onClose: () => void;
  problemId: string;
  problemText: string;
  displayName: string;
}

export function ProblemCommentSheet({
  visible,
  onClose,
  problemId,
  problemText,
  displayName,
}: Props) {
  const colors = useColors();
  const [comments, setComments] = useState<ProblemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ProblemComment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    const data = await getComments(problemId);
    setComments(data);
    setLoading(false);
  }, [problemId]);

  useEffect(() => {
    if (visible) {
      loadComments();
      setInputText("");
      setReplyingTo(null);
    }
  }, [visible, loadComments]);

  const handleSubmit = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await addComment(
      problemId,
      displayName || "Student",
      trimmed,
      replyingTo
        ? { id: replyingTo.id, author: replyingTo.author, text: replyingTo.text }
        : undefined
    );
    setComments(updated);
    setInputText("");
    setReplyingTo(null);
    setSubmitting(false);
    // Scroll to bottom after posting
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleReply = (comment: ProblemComment) => {
    setReplyingTo(comment);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDelete = async (commentId: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const updated = await deleteComment(problemId, commentId);
    setComments(updated);
    if (replyingTo?.id === commentId) setReplyingTo(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const renderComment = ({ item }: { item: ProblemComment }) => {
    const isOwn = item.author === (displayName || "Student");
    const hasReply = !!item.replyToId;

    return (
      <View style={[styles.commentRow, isOwn && styles.commentRowOwn]}>
        <View
          style={[
            styles.commentBubble,
            {
              backgroundColor: isOwn ? `${colors.primary}18` : colors.surface,
              borderColor: isOwn ? `${colors.primary}30` : colors.border,
            },
          ]}
        >
          {/* Quoted reply block */}
          {hasReply && (
            <View style={[styles.replyQuote, { backgroundColor: `${colors.muted}15`, borderLeftColor: colors.primary }]}>
              <Text style={[styles.replyQuoteAuthor, { color: colors.primary }]}>
                ↩ {item.replyToAuthor}
              </Text>
              <Text style={[styles.replyQuoteText, { color: colors.muted }]} numberOfLines={2}>
                {item.replyToText}
              </Text>
            </View>
          )}

          {/* Comment meta row */}
          <View style={styles.commentMeta}>
            <Text style={[styles.commentAuthor, { color: isOwn ? colors.primary : colors.foreground }]}>
              {item.author}
            </Text>
            <Text style={[styles.commentTime, { color: colors.muted }]}>{formatTime(item.createdAt)}</Text>
            {/* Reply button */}
            <TouchableOpacity
              onPress={() => handleReply(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Reply"
            >
              <IconSymbol size={12} name="arrowshape.turn.up.left.fill" color={colors.muted} />
            </TouchableOpacity>
            {/* Delete own comment */}
            {isOwn && (
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                accessibilityLabel="Delete comment"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol size={13} name="xmark.circle.fill" color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Comment text */}
          <Text style={[styles.commentText, { color: colors.foreground }]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <IconSymbol size={18} name="bubble.left.fill" color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>Comments</Text>
              {comments.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>{comments.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <IconSymbol size={22} name="xmark.circle.fill" color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Problem snippet */}
          <View style={[styles.problemSnippet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.problemSnippetText, { color: colors.muted }]} numberOfLines={2}>
              {problemText}
            </Text>
          </View>

          {/* Comment list */}
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No comments yet</Text>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Be the first to leave a note or question about this problem.
                  </Text>
                </View>
              }
            />
          )}

          {/* Reply context bar */}
          {replyingTo && (
            <View style={[styles.replyBar, { backgroundColor: `${colors.primary}10`, borderTopColor: `${colors.primary}30` }]}>
              <View style={styles.replyBarLeft}>
                <IconSymbol size={13} name="arrowshape.turn.up.left.fill" color={colors.primary} />
                <Text style={[styles.replyBarText, { color: colors.primary }]} numberOfLines={1}>
                  Replying to <Text style={{ fontWeight: "700" }}>{replyingTo.author}</Text>: {replyingTo.text.slice(0, 50)}
                </Text>
              </View>
              <TouchableOpacity onPress={handleCancelReply} accessibilityLabel="Cancel reply">
                <IconSymbol size={16} name="xmark.circle.fill" color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input row */}
          <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={replyingTo ? `Reply to ${replyingTo.author}…` : "Add a comment or question…"}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={300}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
              blurOnSubmit
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    inputText.trim() && !submitting ? colors.primary : `${colors.primary}40`,
                },
              ]}
              activeOpacity={0.8}
              accessibilityLabel="Send comment"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol size={18} name="paperplane.fill" color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 580,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  problemSnippet: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  problemSnippetText: {
    fontSize: 12,
    lineHeight: 17,
  },
  loadingRow: {
    paddingVertical: 32,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 24,
  },
  commentRow: {
    marginBottom: 10,
    alignItems: "flex-start",
  },
  commentRowOwn: {
    alignItems: "flex-end",
  },
  commentBubble: {
    maxWidth: "85%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  replyQuoteAuthor: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  replyQuoteText: {
    fontSize: 11,
    lineHeight: 15,
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  commentTime: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  replyBarLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyBarText: {
    fontSize: 12,
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 90,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
