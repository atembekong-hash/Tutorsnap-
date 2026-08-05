import { useCallback } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  ClassroomPage,
  EmptyBlock,
  InlineError,
  LoadingBlock,
  PrimaryButton,
  SecondaryButton,
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

function ClassroomHomeContent() {
  const colors = useColors();
  const router = useRouter();
  const { setContext, resetContext, openTutor } = useAssistantContext();
  const status = trpc.classroom.status.useQuery();
  const classes = trpc.classroom.getMyClasses.useQuery(
    { includeArchived: false },
    { enabled: status.data?.enabled === true },
  );

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Plan class work with AI Tutor",
        detail:
          "Help me create a clear assignment, break down class work, or make a focused study plan for my next due item.",
      });
      return resetContext;
    }, [resetContext, setContext]),
  );

  const refreshing = status.isRefetching || classes.isRefetching;
  const refresh = useCallback(() => {
    void status.refetch();
    if (status.data?.enabled) void classes.refetch();
  }, [classes, status]);

  const actions = (
    <View style={styles.actionRow}>
      <View style={styles.actionHalf}>
        <PrimaryButton
          label="Create class"
          icon="plus.circle.fill"
          onPress={() => router.push("/(tabs)/classroom/create" as never)}
        />
      </View>
      <View style={styles.actionHalf}>
        <SecondaryButton
          label="Join with code"
          icon="person.badge.plus"
          onPress={() => router.push("/(tabs)/classroom/join" as never)}
        />
      </View>
    </View>
  );

  return (
    <ClassroomPage
      title="Guided Classroom"
      subtitle="Private, focused, asynchronous learning"
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
      {status.isLoading ? (
        <LoadingBlock label="Checking Classroom availability…" />
      ) : null}

      {status.error ? (
        <InlineError
          message={getErrorMessage(status.error)}
          onRetry={() => void status.refetch()}
        />
      ) : null}

      {status.data && !status.data.enabled ? (
        <EmptyBlock
          icon="shield.lefthalf.filled"
          title="Classroom is temporarily paused"
          detail="Your existing TutorSnap learning tools are still available. Classroom data will remain untouched while access is paused."
          action={
            <SecondaryButton
              label="Plan with AI Tutor"
              icon="sparkles"
              onPress={openTutor}
            />
          }
        />
      ) : null}

      {status.data?.enabled ? (
        <>
          <SurfaceCard style={styles.heroCard}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: `${colors.primary}14` },
              ]}
            >
              <IconSymbol
                name="person.3.fill"
                size={30}
                color={colors.primary}
              />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                Teach or learn in one place
              </Text>
              <Text style={[styles.heroDetail, { color: colors.muted }]}>
                Create a class as a teacher, or join a private class with its
                eight-character code. Your role stays specific to each class.
              </Text>
            </View>
          </SurfaceCard>

          {actions}

          {classes.isLoading ? (
            <LoadingBlock label="Loading your classes…" />
          ) : null}
          {classes.error ? (
            <InlineError
              message={getErrorMessage(classes.error)}
              onRetry={() => void classes.refetch()}
            />
          ) : null}

          {classes.data?.length === 0 ? (
            <EmptyBlock
              icon="graduationcap.fill"
              title="No classes yet"
              detail="Create a class to assign work, or enter a teacher’s code to join as a learner."
              action={actions}
            />
          ) : null}

          {classes.data?.map((classroom) => {
            const teacher = classroom.role === "teacher";
            const counts = classroom.assignmentCounts;
            const primaryCount = teacher ? counts.published : counts.pending;
            const secondaryCount = teacher ? counts.draft : counts.completed;
            return (
              <TouchableOpacity
                key={classroom.id}
                accessibilityLabel={`Open ${classroom.name}`}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => {
                  H.selectionFeedback();
                  router.push(`/(tabs)/classroom/${classroom.id}` as never);
                }}
              >
                <SurfaceCard>
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.classIcon,
                        { backgroundColor: `${colors.primary}12` },
                      ]}
                    >
                      <IconSymbol
                        name={teacher ? "person.2.fill" : "book.fill"}
                        size={23}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.classCopy}>
                      <Text
                        numberOfLines={1}
                        style={[styles.className, { color: colors.foreground }]}
                      >
                        {classroom.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.classMeta, { color: colors.muted }]}
                      >
                        {classroom.subject}
                        {classroom.gradeLevel
                          ? ` · ${classroom.gradeLevel}`
                          : ""}
                      </Text>
                    </View>
                    <StatusPill
                      label={teacher ? "TEACHER" : "LEARNER"}
                      tone={teacher ? "primary" : "success"}
                    />
                  </View>

                  <View style={styles.metricRow}>
                    <View style={styles.metric}>
                      <Text
                        style={[
                          styles.metricValue,
                          { color: colors.foreground },
                        ]}
                      >
                        {primaryCount}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        {teacher ? "Published" : "To do"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.metric}>
                      <Text
                        style={[
                          styles.metricValue,
                          { color: colors.foreground },
                        ]}
                      >
                        {secondaryCount}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        {teacher ? "Drafts" : "Complete"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricDivider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <View style={styles.metric}>
                      <Text
                        style={[
                          styles.metricValue,
                          { color: colors.foreground },
                        ]}
                      >
                        {teacher
                          ? (classroom.memberCount ?? 0)
                          : counts.published}
                      </Text>
                      <Text
                        style={[styles.metricLabel, { color: colors.muted }]}
                      >
                        {teacher ? "Learners" : "Assigned"}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[styles.nextRow, { borderTopColor: colors.border }]}
                  >
                    <IconSymbol
                      name="calendar"
                      size={16}
                      color={classroom.nextDue ? colors.primary : colors.muted}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.nextText,
                        {
                          color: classroom.nextDue
                            ? colors.foreground
                            : colors.muted,
                        },
                      ]}
                    >
                      {classroom.nextDue
                        ? `${classroom.nextDue.title} · ${formatClassroomDate(classroom.nextDue.dueAt)}`
                        : teacher
                          ? "No upcoming published due date"
                          : "You’re clear for now"}
                    </Text>
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

export default function ClassroomHomeScreen() {
  return (
    <ErrorBoundary label="Classroom">
      <ClassroomHomeContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: "900", letterSpacing: -0.25 },
  heroDetail: { marginTop: 5, fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: "row", gap: 10 },
  actionHalf: { flex: 1 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  classCopy: { flex: 1, minWidth: 0 },
  className: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  classMeta: { marginTop: 3, fontSize: 12, textTransform: "capitalize" },
  metricRow: { flexDirection: "row", alignItems: "center", marginTop: 17 },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: 20, fontWeight: "900" },
  metricLabel: { marginTop: 3, fontSize: 10, fontWeight: "700" },
  metricDivider: { width: 1, height: 28 },
  nextRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    paddingTop: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: "600" },
});
