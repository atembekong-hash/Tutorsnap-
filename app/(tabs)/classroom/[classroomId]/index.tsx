import { useCallback, useEffect } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  ClassroomPage,
  EmptyBlock,
  IconButton,
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
import { syncAssignmentReminders } from "@/lib/homework-notifications";
import { trpc } from "@/lib/trpc";

function ClassWorkspaceContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ classroomId: string | string[] }>();
  const classroomId = Array.isArray(params.classroomId)
    ? params.classroomId[0]
    : params.classroomId;
  const { setContext, resetContext, openTutor } = useAssistantContext();

  const classroom = trpc.classroom.get.useQuery(
    { classroomId },
    { enabled: Boolean(classroomId), retry: false },
  );
  const assignments = trpc.classroom.assignment.list.useQuery(
    { classroomId, limit: 50 },
    { enabled: Boolean(classroomId), retry: false },
  );

  const teacher = classroom.data?.role === "teacher";
  const refetchClassroom = classroom.refetch;
  const refetchAssignments = assignments.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchClassroom();
      void refetchAssignments();
    }, [refetchAssignments, refetchClassroom]),
  );

  useEffect(() => {
    if (
      !classroom.data ||
      classroom.data.role !== "learner" ||
      !assignments.data
    )
      return;
    const reminderAssignments = classroom.data.isActive
      ? assignments.data.items.map((item) => ({
          id: item.id,
          title: item.title,
          dueAt: item.dueAt,
          status:
            "submissionStatus" in item && item.submissionStatus === "complete"
              ? ("complete" as const)
              : ("pending" as const),
        }))
      : [];
    void syncAssignmentReminders(classroomId, reminderAssignments);
  }, [assignments.data, classroom.data, classroomId]);

  useFocusEffect(
    useCallback(() => {
      const name = classroom.data?.name ?? "this class";
      setContext({
        source: "classroom",
        title: `Work on ${name} with AI Tutor`,
        detail: teacher
          ? `Help me plan clear ${classroom.data?.subject ?? "course"} assignments, anticipate misconceptions, and support learners without giving away answers.`
          : `Help me understand my ${classroom.data?.subject ?? "class"} assignments, make a study plan, and learn each concept step by step.`,
      });
      return resetContext;
    }, [
      classroom.data?.name,
      classroom.data?.subject,
      resetContext,
      setContext,
      teacher,
    ]),
  );

  const refreshing = classroom.isRefetching || assignments.isRefetching;
  const refresh = () => {
    void classroom.refetch();
    void assignments.refetch();
  };

  const openPath = (path: string) => {
    H.selectionFeedback();
    router.push(path as never);
  };

  const publishedCount =
    assignments.data?.items.filter((item) => item.status === "published")
      .length ?? 0;
  const draftCount =
    assignments.data?.items.filter((item) => item.status === "draft").length ??
    0;
  const learnerPending =
    assignments.data?.items.filter(
      (item) =>
        "submissionStatus" in item && item.submissionStatus === "pending",
    ).length ?? 0;
  const learnerComplete =
    assignments.data?.items.filter(
      (item) =>
        "submissionStatus" in item && item.submissionStatus === "complete",
    ).length ?? 0;

  return (
    <ClassroomPage
      title={classroom.data?.name ?? "Class"}
      subtitle={
        classroom.data
          ? `${classroom.data.subject}${classroom.data.gradeLevel ? ` · ${classroom.data.gradeLevel}` : ""}`
          : "Loading…"
      }
      back
      right={
        classroom.data ? (
          <IconButton
            label="Class settings"
            icon="gear"
            onPress={() =>
              openPath(`/(tabs)/classroom/${classroomId}/settings`)
            }
          />
        ) : null
      }
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ),
      }}
    >
      {classroom.isLoading || assignments.isLoading ? (
        <LoadingBlock label="Opening class…" />
      ) : null}

      {classroom.error ? (
        <InlineError
          message={getErrorMessage(classroom.error)}
          onRetry={() => void classroom.refetch()}
        />
      ) : null}
      {assignments.error ? (
        <InlineError
          message={getErrorMessage(assignments.error)}
          onRetry={() => void assignments.refetch()}
        />
      ) : null}

      {classroom.data ? (
        <>
          {!classroom.data.isActive ? (
            <SurfaceCard
              style={[
                styles.archivedCard,
                { borderColor: `${colors.warning}55` },
              ]}
            >
              <IconSymbol
                name="archivebox.fill"
                size={22}
                color={colors.warning}
              />
              <View style={styles.archivedCopy}>
                <Text
                  style={[styles.archivedTitle, { color: colors.foreground }]}
                >
                  Archived class
                </Text>
                <Text style={[styles.archivedDetail, { color: colors.muted }]}>
                  Assignments and discussions are read-only until the teacher
                  restores this class.
                </Text>
              </View>
            </SurfaceCard>
          ) : null}

          {teacher && classroom.data.joinCode ? (
            <SurfaceCard style={styles.codeCard}>
              <View style={styles.codeCopy}>
                <Text style={[styles.codeLabel, { color: colors.muted }]}>
                  LEARNER JOIN CODE
                </Text>
                <Text
                  selectable
                  style={[styles.codeValue, { color: colors.foreground }]}
                >
                  {classroom.data.joinCode}
                </Text>
                <Text style={[styles.codeDetail, { color: colors.muted }]}>
                  Share privately. Rotate it from Class settings whenever
                  needed.
                </Text>
              </View>
              <View
                style={[
                  styles.codeIcon,
                  { backgroundColor: `${colors.primary}14` },
                ]}
              >
                <IconSymbol
                  name="person.badge.plus"
                  size={28}
                  color={colors.primary}
                />
              </View>
            </SurfaceCard>
          ) : null}

          <View style={styles.statRow}>
            {teacher ? (
              <>
                <StatTile
                  label="Published"
                  value={publishedCount}
                  tone="primary"
                />
                <StatTile label="Drafts" value={draftCount} tone="warning" />
                <StatTile
                  label="Learners"
                  value={classroom.data.memberCount ?? 0}
                  tone="success"
                />
              </>
            ) : (
              <>
                <StatTile
                  label="To do"
                  value={learnerPending}
                  tone={learnerPending > 0 ? "warning" : "primary"}
                />
                <StatTile
                  label="Complete"
                  value={learnerComplete}
                  tone="success"
                />
                <StatTile
                  label="Assigned"
                  value={publishedCount}
                  tone="primary"
                />
              </>
            )}
          </View>

          <View style={styles.quickActions}>
            <View style={styles.quickAction}>
              <SecondaryButton
                label="Progress"
                icon="chart.line.uptrend.xyaxis"
                onPress={() =>
                  openPath(`/(tabs)/classroom/${classroomId}/progress`)
                }
              />
            </View>
            <View style={styles.quickAction}>
              <SecondaryButton
                label="Ask AI Tutor"
                icon="sparkles"
                onPress={openTutor}
              />
            </View>
          </View>

          <View style={styles.assignmentHeading}>
            <SectionTitle
              title="Assignments"
              detail={`${assignments.data?.items.length ?? 0} shown`}
            />
            {teacher && classroom.data.isActive ? (
              <TouchableOpacity
                accessibilityLabel="Create assignment"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() =>
                  openPath(`/(tabs)/classroom/${classroomId}/assignment/create`)
                }
                style={[
                  styles.addButton,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <IconSymbol name="plus" size={18} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>
                  New
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {assignments.data?.items.length === 0 ? (
            <EmptyBlock
              icon="pencil.and.list.clipboard"
              title={teacher ? "No assignments yet" : "No published work yet"}
              detail={
                teacher
                  ? "Create a draft, review it, then publish when learners should see it."
                  : "Your teacher’s published assignments will appear here."
              }
              action={
                teacher && classroom.data.isActive ? (
                  <PrimaryButton
                    label="Create first assignment"
                    icon="plus.circle.fill"
                    onPress={() =>
                      openPath(
                        `/(tabs)/classroom/${classroomId}/assignment/create`,
                      )
                    }
                  />
                ) : undefined
              }
            />
          ) : null}

          {assignments.data?.items.map((assignment) => {
            const submissionStatus =
              "submissionStatus" in assignment
                ? assignment.submissionStatus
                : null;
            const overdue = Boolean(
              assignment.dueAt &&
              new Date(assignment.dueAt).getTime() < Date.now() &&
              submissionStatus !== "complete",
            );
            const teacherCompleted =
              "completedSubmissions" in assignment
                ? assignment.completedSubmissions
                : null;
            const teacherTotal =
              "totalLearners" in assignment ? assignment.totalLearners : null;
            return (
              <TouchableOpacity
                key={assignment.id}
                accessibilityLabel={`Open assignment ${assignment.title}`}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() =>
                  openPath(
                    `/(tabs)/classroom/${classroomId}/assignment/${assignment.id}`,
                  )
                }
              >
                <SurfaceCard>
                  <View style={styles.assignmentTop}>
                    <View
                      style={[
                        styles.assignmentIcon,
                        { backgroundColor: `${colors.primary}12` },
                      ]}
                    >
                      <IconSymbol
                        name="doc.text.fill"
                        size={22}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.assignmentCopy}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.assignmentTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        {assignment.title}
                      </Text>
                      <Text
                        style={[
                          styles.assignmentSubject,
                          { color: colors.muted },
                        ]}
                      >
                        {assignment.subject}
                      </Text>
                    </View>
                    <StatusPill
                      label={
                        teacher
                          ? assignment.status === "draft"
                            ? "DRAFT"
                            : "PUBLISHED"
                          : submissionStatus === "complete"
                            ? "COMPLETE"
                            : overdue
                              ? "OVERDUE"
                              : "TO DO"
                      }
                      tone={
                        teacher
                          ? assignment.status === "draft"
                            ? "warning"
                            : "primary"
                          : submissionStatus === "complete"
                            ? "success"
                            : overdue
                              ? "danger"
                              : "warning"
                      }
                    />
                  </View>

                  <Text
                    numberOfLines={3}
                    style={[
                      styles.assignmentInstructions,
                      { color: colors.muted },
                    ]}
                  >
                    {assignment.instructions}
                  </Text>

                  <View
                    style={[
                      styles.assignmentFooter,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View style={styles.footerItem}>
                      <IconSymbol
                        name="calendar"
                        size={15}
                        color={overdue ? colors.error : colors.muted}
                      />
                      <Text
                        style={[
                          styles.footerText,
                          { color: overdue ? colors.error : colors.muted },
                        ]}
                      >
                        {formatClassroomDate(assignment.dueAt)}
                      </Text>
                    </View>
                    {teacher &&
                    teacherCompleted !== null &&
                    teacherTotal !== null ? (
                      <Text
                        style={[styles.footerText, { color: colors.muted }]}
                      >
                        {teacherCompleted}/{teacherTotal} complete
                      </Text>
                    ) : null}
                    <IconSymbol
                      name="chevron.right"
                      size={18}
                      color={colors.muted}
                    />
                  </View>
                </SurfaceCard>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}
    </ClassroomPage>
  );
}

export default function ClassWorkspaceScreen() {
  return (
    <ErrorBoundary label="Class workspace">
      <ClassWorkspaceContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  archivedCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  archivedCopy: { flex: 1 },
  archivedTitle: { fontSize: 14, fontWeight: "900" },
  archivedDetail: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  codeCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  codeCopy: { flex: 1 },
  codeLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  codeValue: {
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 5,
  },
  codeDetail: { fontSize: 11, lineHeight: 16, marginTop: 5 },
  codeIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: { flexDirection: "row", gap: 9 },
  quickActions: { flexDirection: "row", gap: 10 },
  quickAction: { flex: 1 },
  assignmentHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addButton: {
    minHeight: 38,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addButtonText: { fontSize: 13, fontWeight: "900" },
  assignmentTop: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  assignmentIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentCopy: { flex: 1, minWidth: 0 },
  assignmentTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  assignmentSubject: {
    fontSize: 11,
    textTransform: "capitalize",
    marginTop: 3,
  },
  assignmentInstructions: { fontSize: 13, lineHeight: 20, marginTop: 13 },
  assignmentFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: { fontSize: 11, fontWeight: "700" },
});
