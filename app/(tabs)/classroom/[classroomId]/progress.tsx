import { useCallback } from "react";
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
  InlineError,
  LoadingBlock,
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
import { trpc } from "@/lib/trpc";

function ProgressContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ classroomId: string | string[] }>();
  const classroomId = Array.isArray(params.classroomId)
    ? params.classroomId[0]
    : params.classroomId;
  const { setContext, resetContext } = useAssistantContext();
  const classroom = trpc.classroom.get.useQuery(
    { classroomId },
    { enabled: Boolean(classroomId) },
  );
  const teacherSummary = trpc.classroom.progress.getClassSummary.useQuery(
    { classroomId },
    { enabled: classroom.data?.role === "teacher", retry: false },
  );
  const learnerSummary = trpc.classroom.progress.getMine.useQuery(
    { classroomId },
    { enabled: classroom.data?.role === "learner", retry: false },
  );

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Plan next steps with AI Tutor",
        detail:
          classroom.data?.role === "teacher"
            ? `Use the aggregate progress for ${classroom.data.name} to suggest supportive review activities without ranking or comparing individual learners.`
            : `Use my private progress in ${classroom.data?.name ?? "this class"} to help me prioritize pending work and make a realistic study plan.`,
      });
      return resetContext;
    }, [classroom.data?.name, classroom.data?.role, resetContext, setContext]),
  );

  const refreshing =
    classroom.isRefetching ||
    teacherSummary.isRefetching ||
    learnerSummary.isRefetching;
  const refresh = () => {
    void classroom.refetch();
    if (classroom.data?.role === "teacher") void teacherSummary.refetch();
    if (classroom.data?.role === "learner") void learnerSummary.refetch();
  };

  const percentage =
    teacherSummary.data?.completionPercent ??
    learnerSummary.data?.completionPercent ??
    0;

  return (
    <ClassroomPage
      title="Class progress"
      subtitle={classroom.data?.name ?? "Completion, not competition"}
      back
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
      {classroom.isLoading ||
      (classroom.data?.role === "teacher"
        ? teacherSummary.isLoading
        : learnerSummary.isLoading) ? (
        <LoadingBlock label="Calculating progress…" />
      ) : null}

      {classroom.error ? (
        <InlineError message={getErrorMessage(classroom.error)} />
      ) : null}
      {teacherSummary.error ? (
        <InlineError message={getErrorMessage(teacherSummary.error)} />
      ) : null}
      {learnerSummary.error ? (
        <InlineError message={getErrorMessage(learnerSummary.error)} />
      ) : null}

      {classroom.data ? (
        <SurfaceCard style={styles.privacyCard}>
          <View
            style={[
              styles.privacyIcon,
              { backgroundColor: `${colors.success}14` },
            ]}
          >
            <IconSymbol
              name="checkmark.shield.fill"
              size={24}
              color={colors.success}
            />
          </View>
          <View style={styles.privacyCopy}>
            <Text style={[styles.privacyTitle, { color: colors.foreground }]}>
              Progress without ranking
            </Text>
            <Text style={[styles.privacyDetail, { color: colors.muted }]}>
              {classroom.data.role === "teacher"
                ? "You see aggregate completion and assignment status. TutorSnap does not create a public learner leaderboard."
                : "Only you and your class teacher can see your submission status. Other learners cannot see your progress."}
            </Text>
          </View>
        </SurfaceCard>
      ) : null}

      {teacherSummary.data ? (
        <>
          <SurfaceCard>
            <View style={styles.completionHeader}>
              <View>
                <Text style={[styles.completionLabel, { color: colors.muted }]}>
                  OVERALL COMPLETION
                </Text>
                <Text
                  style={[styles.completionValue, { color: colors.foreground }]}
                >
                  {percentage}%
                </Text>
              </View>
              <StatusPill
                label={
                  percentage >= 80
                    ? "ON TRACK"
                    : percentage >= 50
                      ? "IN PROGRESS"
                      : "NEEDS SUPPORT"
                }
                tone={
                  percentage >= 80
                    ? "success"
                    : percentage >= 50
                      ? "primary"
                      : "warning"
                }
              />
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: `${colors.muted}20` },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: `${Math.max(0, Math.min(100, percentage))}%`,
                  },
                ]}
              />
            </View>
          </SurfaceCard>

          <View style={styles.statRow}>
            <StatTile
              label="Complete"
              value={teacherSummary.data.completedSubmissions}
              tone="success"
            />
            <StatTile
              label="Pending"
              value={teacherSummary.data.pendingSubmissions}
              tone="warning"
            />
            <StatTile
              label="Overdue"
              value={teacherSummary.data.overdueSubmissions}
              tone="danger"
            />
          </View>

          <View style={styles.statRow}>
            <StatTile
              label="Learners"
              value={teacherSummary.data.learnerCount}
              tone="primary"
            />
            <StatTile
              label="Published"
              value={teacherSummary.data.publishedAssignmentCount}
              tone="primary"
            />
            <StatTile
              label="Expected"
              value={teacherSummary.data.expectedSubmissions}
              tone="primary"
            />
          </View>

          {teacherSummary.data.assignments.length === 0 ? (
            <EmptyBlock
              icon="chart.line.uptrend.xyaxis"
              title="No published progress yet"
              detail="Publish an assignment to begin tracking aggregate completion."
            />
          ) : null}

          {teacherSummary.data.assignments.map((item) => (
            <SurfaceCard key={item.id}>
              <View style={styles.itemHeader}>
                <View style={styles.itemCopy}>
                  <Text
                    style={[styles.itemTitle, { color: colors.foreground }]}
                  >
                    {item.title}
                  </Text>
                  <Text style={[styles.itemDue, { color: colors.muted }]}>
                    {formatClassroomDate(item.dueAt)}
                  </Text>
                </View>
                <StatusPill
                  label={`${item.completed}/${item.completed + item.pending} COMPLETE`}
                  tone={
                    item.pending === 0
                      ? "success"
                      : item.overdue > 0
                        ? "danger"
                        : "primary"
                  }
                />
              </View>
              <View style={styles.itemStats}>
                <Text style={[styles.itemStat, { color: colors.success }]}>
                  {item.completed} complete
                </Text>
                <Text style={[styles.itemStat, { color: colors.warning }]}>
                  {item.pending} pending
                </Text>
                {item.overdue > 0 ? (
                  <Text style={[styles.itemStat, { color: colors.error }]}>
                    {item.overdue} overdue
                  </Text>
                ) : null}
              </View>
            </SurfaceCard>
          ))}
        </>
      ) : null}

      {learnerSummary.data ? (
        <>
          <SurfaceCard>
            <View style={styles.completionHeader}>
              <View>
                <Text style={[styles.completionLabel, { color: colors.muted }]}>
                  YOUR COMPLETION
                </Text>
                <Text
                  style={[styles.completionValue, { color: colors.foreground }]}
                >
                  {percentage}%
                </Text>
              </View>
              <StatusPill
                label={
                  learnerSummary.data.pending === 0
                    ? "ALL CLEAR"
                    : `${learnerSummary.data.pending} TO DO`
                }
                tone={learnerSummary.data.pending === 0 ? "success" : "warning"}
              />
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: `${colors.muted}20` },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.success,
                    width: `${Math.max(0, Math.min(100, percentage))}%`,
                  },
                ]}
              />
            </View>
          </SurfaceCard>

          <View style={styles.statRow}>
            <StatTile
              label="Complete"
              value={learnerSummary.data.completed}
              tone="success"
            />
            <StatTile
              label="Pending"
              value={learnerSummary.data.pending}
              tone="warning"
            />
            <StatTile
              label="Overdue"
              value={learnerSummary.data.overdue}
              tone="danger"
            />
          </View>

          {learnerSummary.data.assignments.length === 0 ? (
            <EmptyBlock
              icon="checkmark.circle.fill"
              title="No published work"
              detail="Your teacher has not published any assignments yet."
            />
          ) : null}

          {learnerSummary.data.assignments.map((item) => (
            <TouchableOpacity
              key={item.id}
              accessibilityLabel={`Open assignment ${item.title}`}
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() => {
                H.selectionFeedback();
                router.push(
                  `/(tabs)/classroom/${classroomId}/assignment/${item.id}` as never,
                );
              }}
            >
              <SurfaceCard>
                <View style={styles.itemHeader}>
                  <View style={styles.itemCopy}>
                    <Text
                      style={[styles.itemTitle, { color: colors.foreground }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.itemDue,
                        { color: item.isOverdue ? colors.error : colors.muted },
                      ]}
                    >
                      {formatClassroomDate(item.dueAt)}
                    </Text>
                  </View>
                  <StatusPill
                    label={
                      item.status === "complete"
                        ? "COMPLETE"
                        : item.isOverdue
                          ? "OVERDUE"
                          : "TO DO"
                    }
                    tone={
                      item.status === "complete"
                        ? "success"
                        : item.isOverdue
                          ? "danger"
                          : "warning"
                    }
                  />
                  <IconSymbol
                    name="chevron.right"
                    size={18}
                    color={colors.muted}
                  />
                </View>
              </SurfaceCard>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ClassroomPage>
  );
}

export default function ProgressScreen() {
  return (
    <ErrorBoundary label="Class progress">
      <ProgressContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  privacyCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  privacyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  privacyCopy: { flex: 1 },
  privacyTitle: { fontSize: 14, fontWeight: "900" },
  privacyDetail: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  completionLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  completionValue: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  statRow: { flexDirection: "row", gap: 9 },
  itemHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemCopy: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: "900" },
  itemDue: { fontSize: 11, marginTop: 4 },
  itemStats: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  itemStat: { fontSize: 11, fontWeight: "800" },
});
