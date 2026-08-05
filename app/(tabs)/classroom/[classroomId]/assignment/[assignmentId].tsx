import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import {
  ClassroomField,
  ClassroomPage,
  EmptyBlock,
  InlineError,
  LoadingBlock,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  StatTile,
  StatusPill,
  SurfaceCard,
  formatClassroomDate,
  getErrorMessage,
} from "@/components/classroom/classroom-ui";
import { useAssistantContext } from "@/components/contextual-assistant";
import { ErrorBoundary } from "@/components/error-boundary";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";
import { cancelAssignmentReminders } from "@/lib/homework-notifications";
import { trpc } from "@/lib/trpc";

function AssignmentDetailContent() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    classroomId: string | string[];
    assignmentId: string | string[];
  }>();
  const classroomId = Array.isArray(params.classroomId)
    ? params.classroomId[0]
    : params.classroomId;
  const assignmentId = Array.isArray(params.assignmentId)
    ? params.assignmentId[0]
    : params.assignmentId;
  const utils = trpc.useUtils();
  const { setContext, resetContext, openTutor } = useAssistantContext();

  const assignment = trpc.classroom.assignment.get.useQuery(
    { assignmentId },
    { enabled: Boolean(assignmentId), retry: false },
  );
  const comments = trpc.classroom.comment.list.useQuery(
    { assignmentId, limit: 50 },
    { enabled: Boolean(assignmentId), retry: false },
  );
  const submissions = trpc.classroom.submission.listForAssignment.useQuery(
    { assignmentId, limit: 50 },
    { enabled: assignment.data?.role === "teacher", retry: false },
  );

  const [responseText, setResponseText] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const hydratedResponse = useRef(false);

  const learnerAssignment =
    assignment.data?.role === "learner" ? assignment.data : null;
  const teacherAssignment =
    assignment.data?.role === "teacher" ? assignment.data : null;
  const refetchAssignment = assignment.refetch;
  const refetchComments = comments.refetch;

  useEffect(() => {
    if (!learnerAssignment || hydratedResponse.current) return;
    hydratedResponse.current = true;
    setResponseText(learnerAssignment.submission.responseText ?? "");
  }, [learnerAssignment]);

  useFocusEffect(
    useCallback(() => {
      void refetchAssignment();
      void refetchComments();
    }, [refetchAssignment, refetchComments]),
  );

  useFocusEffect(
    useCallback(() => {
      const data = assignment.data;
      setContext({
        source: "classroom",
        title: data
          ? `Get help with ${data.title}`
          : "Work through this assignment",
        detail: data
          ? `Class subject: ${data.subject}. Assignment instructions: ${data.instructions}. Provide hints and explanations that support learning without pretending work is complete when it is not.`
          : "Help me understand the assignment step by step and make a responsible plan to complete it.",
      });
      return resetContext;
    }, [assignment.data, resetContext, setContext]),
  );

  const invalidateAssignment = async () => {
    await Promise.all([
      utils.classroom.assignment.get.invalidate({ assignmentId }),
      utils.classroom.assignment.list.invalidate({ classroomId }),
      utils.classroom.getMyClasses.invalidate(),
      utils.classroom.progress.getMine.invalidate({ classroomId }),
      utils.classroom.progress.getClassSummary.invalidate({ classroomId }),
    ]);
  };

  const publish = trpc.classroom.assignment.publish.useMutation({
    onSuccess: async () => {
      await invalidateAssignment();
      H.notificationSuccess();
    },
    onError: (error) => {
      H.notificationError();
      setMutationError(getErrorMessage(error));
    },
  });

  const updateAssignment = trpc.classroom.assignment.update.useMutation({
    onSuccess: async () => {
      setEditing(false);
      await invalidateAssignment();
      H.notificationSuccess();
    },
    onError: (error) => {
      H.notificationError();
      setMutationError(getErrorMessage(error));
    },
  });

  const saveSubmission = trpc.classroom.submission.upsert.useMutation({
    onSuccess: async (_submission, variables) => {
      if (variables.status === "complete") {
        await cancelAssignmentReminders(assignmentId);
      }
      await invalidateAssignment();
      H.notificationSuccess();
    },
    onError: (error) => {
      H.notificationError();
      setMutationError(getErrorMessage(error));
    },
  });

  const addComment = trpc.classroom.comment.add.useMutation({
    onSuccess: async () => {
      setCommentBody("");
      await utils.classroom.comment.list.invalidate();
      H.notificationSuccess();
    },
    onError: (error) => {
      H.notificationError();
      setMutationError(getErrorMessage(error));
    },
  });

  const deleteComment = trpc.classroom.comment.delete.useMutation({
    onSuccess: async () => {
      await utils.classroom.comment.list.invalidate();
    },
    onError: (error) => setMutationError(getErrorMessage(error)),
  });

  const moderateComment = trpc.classroom.comment.moderate.useMutation({
    onSuccess: async () => {
      await utils.classroom.comment.list.invalidate();
    },
    onError: (error) => setMutationError(getErrorMessage(error)),
  });

  const beginEdit = () => {
    if (!teacherAssignment) return;
    setEditTitle(teacherAssignment.title);
    setEditInstructions(teacherAssignment.instructions);
    setEditSubject(teacherAssignment.subject);
    setEditing(true);
  };

  const confirmOwnCommentDelete = (commentId: string) => {
    Alert.alert(
      "Remove your comment?",
      "The message will be replaced with a deletion notice for everyone in the class.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteComment.mutate({ commentId }),
        },
      ],
    );
  };

  const chooseModerationReason = (commentId: string) => {
    Alert.alert(
      "Moderate comment",
      "Choose the clearest reason. The original body will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Spam",
          onPress: () => moderateComment.mutate({ commentId, reason: "spam" }),
        },
        {
          text: "Inappropriate",
          style: "destructive",
          onPress: () =>
            moderateComment.mutate({ commentId, reason: "inappropriate" }),
        },
        {
          text: "Personal information",
          style: "destructive",
          onPress: () =>
            moderateComment.mutate({
              commentId,
              reason: "personal_information",
            }),
        },
      ],
    );
  };

  const dueAt = assignment.data?.dueAt ? new Date(assignment.data.dueAt) : null;
  const overdue = Boolean(
    dueAt &&
    dueAt.getTime() < Date.now() &&
    learnerAssignment?.submission.status !== "complete",
  );

  return (
    <ClassroomPage
      title={assignment.data?.title ?? "Assignment"}
      subtitle={assignment.data?.subject ?? "Class work"}
      back
    >
      {assignment.isLoading ? (
        <LoadingBlock label="Loading assignment…" />
      ) : null}
      {assignment.error ? (
        <InlineError
          message={getErrorMessage(assignment.error)}
          onRetry={() => void assignment.refetch()}
        />
      ) : null}

      {assignment.data ? (
        <>
          <SurfaceCard>
            <View style={styles.assignmentHeader}>
              <StatusPill
                label={
                  teacherAssignment
                    ? assignment.data.status === "draft"
                      ? "DRAFT"
                      : "PUBLISHED"
                    : learnerAssignment?.submission.status === "complete"
                      ? "COMPLETE"
                      : overdue
                        ? "OVERDUE"
                        : "TO DO"
                }
                tone={
                  teacherAssignment
                    ? assignment.data.status === "draft"
                      ? "warning"
                      : "primary"
                    : learnerAssignment?.submission.status === "complete"
                      ? "success"
                      : overdue
                        ? "danger"
                        : "warning"
                }
              />
              <View style={styles.dueRow}>
                <IconSymbol
                  name="calendar"
                  size={16}
                  color={overdue ? colors.error : colors.muted}
                />
                <Text
                  style={[
                    styles.dueText,
                    { color: overdue ? colors.error : colors.muted },
                  ]}
                >
                  {formatClassroomDate(assignment.data.dueAt)}
                </Text>
              </View>
            </View>
            <Text style={[styles.instructions, { color: colors.foreground }]}>
              {assignment.data.instructions}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Ask AI Tutor about this assignment"
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={openTutor}
              style={[
                styles.tutorAction,
                { backgroundColor: `${colors.primary}12` },
              ]}
            >
              <IconSymbol name="sparkles" size={19} color={colors.primary} />
              <Text style={[styles.tutorActionText, { color: colors.primary }]}>
                Ask AI Tutor about this assignment
              </Text>
              <IconSymbol
                name="chevron.right"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </SurfaceCard>

          {teacherAssignment ? (
            <>
              <View style={styles.statRow}>
                <StatTile
                  label="Complete"
                  value={teacherAssignment.completedSubmissions}
                  tone="success"
                />
                <StatTile
                  label="Pending"
                  value={Math.max(
                    0,
                    teacherAssignment.totalLearners -
                      teacherAssignment.completedSubmissions,
                  )}
                  tone="warning"
                />
                <StatTile
                  label="Learners"
                  value={teacherAssignment.totalLearners}
                  tone="primary"
                />
              </View>

              {assignment.data.status === "draft" ? (
                <PrimaryButton
                  label="Publish to learners"
                  icon="paperplane.fill"
                  onPress={() => publish.mutate({ assignmentId })}
                  loading={publish.isPending}
                />
              ) : null}

              {!editing ? (
                <SecondaryButton
                  label="Edit assignment"
                  icon="pencil.line"
                  onPress={beginEdit}
                />
              ) : (
                <SurfaceCard>
                  <SectionTitle title="Edit assignment" />
                  <View style={styles.editFields}>
                    <ClassroomField
                      label="Title"
                      value={editTitle}
                      onChangeText={setEditTitle}
                      maxLength={160}
                    />
                    <ClassroomField
                      label="Subject"
                      value={editSubject}
                      onChangeText={setEditSubject}
                      maxLength={64}
                    />
                    <ClassroomField
                      label="Instructions"
                      value={editInstructions}
                      onChangeText={setEditInstructions}
                      maxLength={20_000}
                      multiline
                    />
                    <View style={styles.actionRow}>
                      <View style={styles.actionHalf}>
                        <SecondaryButton
                          label="Cancel"
                          icon="xmark"
                          onPress={() => setEditing(false)}
                        />
                      </View>
                      <View style={styles.actionHalf}>
                        <PrimaryButton
                          label="Save changes"
                          icon="checkmark"
                          loading={updateAssignment.isPending}
                          disabled={
                            !editTitle.trim() ||
                            !editSubject.trim() ||
                            !editInstructions.trim()
                          }
                          onPress={() =>
                            updateAssignment.mutate({
                              assignmentId,
                              title: editTitle.trim(),
                              subject: editSubject.trim(),
                              instructions: editInstructions.trim(),
                            })
                          }
                        />
                      </View>
                    </View>
                  </View>
                </SurfaceCard>
              )}

              <SectionTitle
                title="Learner submissions"
                detail={`${submissions.data?.items.length ?? 0} learners`}
              />
              {submissions.isLoading ? (
                <LoadingBlock label="Loading submissions…" />
              ) : null}
              {submissions.error ? (
                <InlineError message={getErrorMessage(submissions.error)} />
              ) : null}
              {submissions.data?.items.length === 0 ? (
                <EmptyBlock
                  icon="tray.full.fill"
                  title="No learners yet"
                  detail="Learners will appear here after joining the class."
                />
              ) : null}
              {submissions.data?.items.map((submission, index) => (
                <SurfaceCard
                  key={`${submission.learnerName}-${submission.joinedAt.toString()}-${index}`}
                >
                  <View style={styles.submissionHeader}>
                    <View style={styles.submissionNameRow}>
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: `${colors.primary}15` },
                        ]}
                      >
                        <Text
                          style={[styles.avatarText, { color: colors.primary }]}
                        >
                          {submission.learnerName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.submissionCopy}>
                        <Text
                          style={[
                            styles.submissionName,
                            { color: colors.foreground },
                          ]}
                        >
                          {submission.learnerName}
                        </Text>
                        <Text
                          style={[
                            styles.submissionTime,
                            { color: colors.muted },
                          ]}
                        >
                          {submission.submittedAt
                            ? `Submitted ${formatClassroomDate(submission.submittedAt)}`
                            : "Not submitted"}
                        </Text>
                      </View>
                    </View>
                    <StatusPill
                      label={
                        submission.status === "complete"
                          ? "COMPLETE"
                          : "PENDING"
                      }
                      tone={
                        submission.status === "complete" ? "success" : "warning"
                      }
                    />
                  </View>
                  {submission.responseText ? (
                    <Text
                      style={[
                        styles.responseBody,
                        { color: colors.foreground },
                      ]}
                    >
                      {submission.responseText}
                    </Text>
                  ) : (
                    <Text style={[styles.noResponse, { color: colors.muted }]}>
                      No written response.
                    </Text>
                  )}
                </SurfaceCard>
              ))}
            </>
          ) : null}

          {learnerAssignment ? (
            <SurfaceCard>
              <SectionTitle
                title="Your response"
                detail={`${responseText.length}/4000`}
              />
              <View style={styles.responseFields}>
                <ClassroomField
                  label="Response or notes"
                  placeholder="Write your response, working, or a brief completion note."
                  value={responseText}
                  onChangeText={setResponseText}
                  maxLength={4_000}
                  multiline
                  hint="You can save a draft, then mark the assignment complete when ready."
                />
                <View style={styles.actionRow}>
                  <View style={styles.actionHalf}>
                    <SecondaryButton
                      label="Save draft"
                      icon="doc.text"
                      disabled={saveSubmission.isPending}
                      onPress={() =>
                        saveSubmission.mutate({
                          assignmentId,
                          status: "pending",
                          responseText: responseText.trim() || null,
                        })
                      }
                    />
                  </View>
                  <View style={styles.actionHalf}>
                    <PrimaryButton
                      label={
                        learnerAssignment.submission.status === "complete"
                          ? "Update complete"
                          : "Mark complete"
                      }
                      icon="checkmark.circle.fill"
                      loading={saveSubmission.isPending}
                      onPress={() =>
                        saveSubmission.mutate({
                          assignmentId,
                          status: "complete",
                          responseText: responseText.trim() || null,
                        })
                      }
                    />
                  </View>
                </View>
                {learnerAssignment.submission.updatedAt ? (
                  <Text style={[styles.savedAt, { color: colors.muted }]}>
                    Last saved{" "}
                    {formatClassroomDate(
                      learnerAssignment.submission.updatedAt,
                    )}
                  </Text>
                ) : null}
              </View>
            </SurfaceCard>
          ) : null}

          {mutationError ? <InlineError message={mutationError} /> : null}

          <SectionTitle
            title="Class discussion"
            detail={`${comments.data?.items.length ?? 0} comments`}
          />
          <SurfaceCard>
            <ClassroomField
              label="Add to the discussion"
              placeholder="Ask a class-focused question or share a helpful explanation."
              value={commentBody}
              onChangeText={setCommentBody}
              maxLength={1_000}
              multiline
              hint="Comments are visible to everyone in this class. Do not share personal information."
            />
            <PrimaryButton
              label="Post comment"
              icon="paperplane.fill"
              disabled={!commentBody.trim()}
              loading={addComment.isPending}
              onPress={() =>
                addComment.mutate({ assignmentId, body: commentBody.trim() })
              }
            />
          </SurfaceCard>

          {comments.isLoading ? (
            <LoadingBlock label="Loading discussion…" />
          ) : null}
          {comments.error ? (
            <InlineError message={getErrorMessage(comments.error)} />
          ) : null}
          {comments.data?.items.length === 0 ? (
            <EmptyBlock
              icon="bubble.left.and.text.bubble.right.fill"
              title="No comments yet"
              detail="Start a focused discussion about this assignment."
            />
          ) : null}
          {comments.data?.items.map((comment) => (
            <SurfaceCard key={comment.id}>
              <View style={styles.commentHeader}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: `${colors.primary}12` },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {comment.authorName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.commentMeta}>
                  <Text
                    style={[styles.commentAuthor, { color: colors.foreground }]}
                  >
                    {comment.authorName}
                    {comment.isMine ? " · You" : ""}
                  </Text>
                  <Text style={[styles.commentTime, { color: colors.muted }]}>
                    {formatClassroomDate(comment.createdAt)}
                  </Text>
                </View>
                {!comment.isDeleted &&
                (comment.isMine || Boolean(teacherAssignment)) ? (
                  <TouchableOpacity
                    accessibilityLabel={
                      comment.isMine
                        ? "Remove your comment"
                        : "Moderate comment"
                    }
                    accessibilityRole="button"
                    activeOpacity={0.72}
                    onPress={() =>
                      comment.isMine
                        ? confirmOwnCommentDelete(comment.id)
                        : chooseModerationReason(comment.id)
                    }
                    style={styles.commentAction}
                  >
                    <IconSymbol
                      name={comment.isMine ? "trash.fill" : "hand.raised.fill"}
                      size={18}
                      color={comment.isMine ? colors.error : colors.warning}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              {comment.isDeleted ? (
                <View
                  style={[
                    styles.deletedBody,
                    { backgroundColor: `${colors.muted}10` },
                  ]}
                >
                  <IconSymbol
                    name="info.circle"
                    size={16}
                    color={colors.muted}
                  />
                  <Text style={[styles.deletedText, { color: colors.muted }]}>
                    Comment removed
                    {comment.moderationReason
                      ? ` · ${comment.moderationReason.replaceAll("_", " ")}`
                      : ""}
                  </Text>
                </View>
              ) : (
                <Text
                  style={[styles.commentBody, { color: colors.foreground }]}
                >
                  {comment.body}
                </Text>
              )}
            </SurfaceCard>
          ))}
        </>
      ) : null}
    </ClassroomPage>
  );
}

export default function AssignmentDetailScreen() {
  return (
    <ErrorBoundary label="Assignment">
      <AssignmentDetailContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  assignmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dueText: { fontSize: 11, fontWeight: "700" },
  instructions: { fontSize: 15, lineHeight: 23, marginTop: 17 },
  tutorAction: {
    minHeight: 48,
    borderRadius: 15,
    marginTop: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  tutorActionText: { flex: 1, fontSize: 13, fontWeight: "900" },
  statRow: { flexDirection: "row", gap: 9 },
  editFields: { gap: 14, marginTop: 14 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionHalf: { flex: 1 },
  submissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  submissionNameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "900" },
  submissionCopy: { flex: 1, minWidth: 0 },
  submissionName: { fontSize: 14, fontWeight: "900" },
  submissionTime: { fontSize: 10, marginTop: 3 },
  responseBody: { fontSize: 13, lineHeight: 20, marginTop: 13 },
  noResponse: { fontSize: 12, fontStyle: "italic", marginTop: 13 },
  responseFields: { gap: 14, marginTop: 13 },
  savedAt: { fontSize: 10, textAlign: "center" },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  commentMeta: { flex: 1, minWidth: 0 },
  commentAuthor: { fontSize: 13, fontWeight: "900" },
  commentTime: { fontSize: 10, marginTop: 2 },
  commentAction: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  commentBody: { fontSize: 14, lineHeight: 21, marginTop: 12 },
  deletedBody: {
    minHeight: 44,
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deletedText: {
    flex: 1,
    fontSize: 11,
    fontStyle: "italic",
    textTransform: "capitalize",
  },
});
