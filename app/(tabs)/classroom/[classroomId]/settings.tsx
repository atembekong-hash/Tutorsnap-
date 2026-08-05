import { useCallback, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  ClassroomField,
  ClassroomPage,
  EmptyBlock,
  InlineError,
  LoadingBlock,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
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
import { cancelClassroomAssignmentReminders } from "@/lib/homework-notifications";
import { trpc } from "@/lib/trpc";

function ClassSettingsContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ classroomId: string | string[] }>();
  const classroomId = Array.isArray(params.classroomId)
    ? params.classroomId[0]
    : params.classroomId;
  const utils = trpc.useUtils();
  const { setContext, resetContext } = useAssistantContext();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const classroom = trpc.classroom.get.useQuery(
    { classroomId },
    { enabled: Boolean(classroomId), retry: false },
  );
  const members = trpc.classroom.listMembers.useQuery(
    { classroomId, limit: 50 },
    { enabled: classroom.data?.role === "teacher", retry: false },
  );

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Manage this class responsibly",
        detail:
          "Help me communicate class expectations, protect learner privacy, and choose safe classroom management practices.",
      });
      return resetContext;
    }, [resetContext, setContext]),
  );

  const invalidateClass = async () => {
    await Promise.all([
      utils.classroom.get.invalidate({ classroomId }),
      utils.classroom.getMyClasses.invalidate(),
    ]);
  };

  const rotate = trpc.classroom.rotateJoinCode.useMutation({
    onSuccess: async () => {
      await invalidateClass();
      H.notificationSuccess();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });
  const archive = trpc.classroom.archive.useMutation({
    onSuccess: async () => {
      await invalidateClass();
      H.notificationSuccess();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });
  const restore = trpc.classroom.restore.useMutation({
    onSuccess: async () => {
      await invalidateClass();
      H.notificationSuccess();
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });
  const deleteClass = trpc.classroom.delete.useMutation({
    onSuccess: async () => {
      await utils.classroom.getMyClasses.invalidate();
      H.notificationSuccess();
      router.replace("/(tabs)/classroom" as never);
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });
  const leaveClass = trpc.classroom.leave.useMutation({
    onSuccess: async () => {
      await cancelClassroomAssignmentReminders(classroomId);
      await utils.classroom.getMyClasses.invalidate();
      H.notificationSuccess();
      router.replace("/(tabs)/classroom" as never);
    },
    onError: (error) => setActionError(getErrorMessage(error)),
  });

  const confirmRotate = () => {
    Alert.alert(
      "Rotate the join code?",
      "The current code will stop working immediately. Existing members will remain in the class.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Rotate code", onPress: () => rotate.mutate({ classroomId }) },
      ],
    );
  };

  const confirmArchive = () => {
    if (!classroom.data) return;
    if (!classroom.data.isActive) {
      restore.mutate({ classroomId });
      return;
    }
    Alert.alert(
      "Archive this class?",
      "Learners can still read existing work, but assignments, submissions, and comments become read-only until you restore it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", onPress: () => archive.mutate({ classroomId }) },
      ],
    );
  };

  const confirmDelete = () => {
    if (!classroom.data || deleteConfirmation !== classroom.data.name) return;
    Alert.alert(
      "Permanently delete this class?",
      "This permanently removes the class, assignments, submissions, comments, and memberships. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: () =>
            deleteClass.mutate({
              classroomId,
              confirmationName: deleteConfirmation,
            }),
        },
      ],
    );
  };

  const confirmLeave = () => {
    Alert.alert(
      "Leave this class?",
      "You will lose access to its assignments and discussion. You can rejoin later only with an active class code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave class",
          style: "destructive",
          onPress: () => leaveClass.mutate({ classroomId }),
        },
      ],
    );
  };

  const shareCode = async () => {
    const data = classroom.data;
    if (!data || data.role !== "teacher" || !data.joinCode) return;
    await Share.share({
      title: `Join ${data.name} in TutorSnap`,
      message: `Join ${data.name} in TutorSnap with code ${data.joinCode}. Open tutorsnap://classroom/join?code=${data.joinCode}`,
    });
  };

  const teacher = classroom.data?.role === "teacher";

  return (
    <ClassroomPage
      title="Class settings"
      subtitle={classroom.data?.name ?? "Manage access"}
      back
    >
      {classroom.isLoading ? (
        <LoadingBlock label="Loading class settings…" />
      ) : null}
      {classroom.error ? (
        <InlineError message={getErrorMessage(classroom.error)} />
      ) : null}
      {actionError ? <InlineError message={actionError} /> : null}

      {classroom.data ? (
        <>
          <SurfaceCard style={styles.identityCard}>
            <View
              style={[
                styles.classIcon,
                { backgroundColor: `${colors.primary}14` },
              ]}
            >
              <IconSymbol
                name="graduationcap.fill"
                size={27}
                color={colors.primary}
              />
            </View>
            <View style={styles.identityCopy}>
              <Text style={[styles.className, { color: colors.foreground }]}>
                {classroom.data.name}
              </Text>
              <Text style={[styles.classMeta, { color: colors.muted }]}>
                {classroom.data.subject}
                {classroom.data.gradeLevel
                  ? ` · ${classroom.data.gradeLevel}`
                  : ""}
              </Text>
            </View>
            <StatusPill
              label={teacher ? "TEACHER" : "LEARNER"}
              tone={teacher ? "primary" : "success"}
            />
          </SurfaceCard>

          {teacher ? (
            <>
              <SectionTitle title="Access" detail="Teacher only" />
              <SurfaceCard>
                <Text style={[styles.codeLabel, { color: colors.muted }]}>
                  CURRENT JOIN CODE
                </Text>
                <Text
                  selectable
                  style={[styles.codeValue, { color: colors.foreground }]}
                >
                  {classroom.data.joinCode}
                </Text>
                <Text style={[styles.codeHelp, { color: colors.muted }]}>
                  Share this privately with intended learners. Rotating it does
                  not remove current members.
                </Text>
                <View style={styles.buttonRow}>
                  <View style={styles.buttonHalf}>
                    <SecondaryButton
                      label="Share code"
                      icon="square.and.arrow.up"
                      onPress={() => void shareCode()}
                    />
                  </View>
                  <View style={styles.buttonHalf}>
                    <SecondaryButton
                      label="Rotate code"
                      icon="arrow.clockwise"
                      onPress={confirmRotate}
                      disabled={rotate.isPending}
                    />
                  </View>
                </View>
              </SurfaceCard>

              <SectionTitle
                title="Members"
                detail={`${classroom.data.memberCount ?? 0} learners`}
              />
              {members.isLoading ? (
                <LoadingBlock label="Loading class members…" />
              ) : null}
              {members.error ? (
                <InlineError message={getErrorMessage(members.error)} />
              ) : null}
              {members.data?.items.length === 0 ? (
                <EmptyBlock
                  icon="person.2.fill"
                  title="No members yet"
                  detail="Share the join code privately with learners you want in this class."
                />
              ) : null}
              {members.data?.items.map((member, index) => (
                <SurfaceCard
                  key={`${member.name}-${member.joinedAt.toString()}-${index}`}
                >
                  <View style={styles.memberRow}>
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: `${member.role === "teacher" ? colors.primary : colors.success}14`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          {
                            color:
                              member.role === "teacher"
                                ? colors.primary
                                : colors.success,
                          },
                        ]}
                      >
                        {member.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberCopy}>
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.foreground },
                        ]}
                      >
                        {member.name}
                      </Text>
                      <Text
                        style={[styles.memberDetail, { color: colors.muted }]}
                      >
                        Joined {formatClassroomDate(member.joinedAt)}
                      </Text>
                    </View>
                    {member.role === "teacher" ? (
                      <StatusPill label="TEACHER" tone="primary" />
                    ) : (
                      <Text
                        style={[styles.memberProgress, { color: colors.muted }]}
                      >
                        {member.completedAssignments}/
                        {member.totalPublishedAssignments} complete
                      </Text>
                    )}
                  </View>
                </SurfaceCard>
              ))}

              <SectionTitle title="Class lifecycle" />
              <SurfaceCard>
                <View style={styles.lifecycleCopy}>
                  <Text
                    style={[
                      styles.lifecycleTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {classroom.data.isActive
                      ? "Archive when teaching is complete"
                      : "Restore this archived class"}
                  </Text>
                  <Text
                    style={[styles.lifecycleDetail, { color: colors.muted }]}
                  >
                    {classroom.data.isActive
                      ? "Archiving preserves class history while making collaboration read-only."
                      : "Restoring makes assignment, submission, and discussion actions available again."}
                  </Text>
                </View>
                <SecondaryButton
                  label={
                    classroom.data.isActive ? "Archive class" : "Restore class"
                  }
                  icon={
                    classroom.data.isActive
                      ? "archivebox.fill"
                      : "arrow.counterclockwise.circle.fill"
                  }
                  onPress={confirmArchive}
                  disabled={archive.isPending || restore.isPending}
                />
              </SurfaceCard>

              <SectionTitle title="Danger zone" />
              <SurfaceCard
                style={[
                  styles.dangerCard,
                  { borderColor: `${colors.error}55` },
                ]}
              >
                <Text style={[styles.dangerTitle, { color: colors.error }]}>
                  Delete class permanently
                </Text>
                <Text style={[styles.dangerDetail, { color: colors.muted }]}>
                  Type the exact class name to unlock deletion:{" "}
                  {classroom.data.name}
                </Text>
                <View style={styles.dangerFields}>
                  <ClassroomField
                    label="Confirm class name"
                    placeholder={classroom.data.name}
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    autoCapitalize="sentences"
                  />
                  <PrimaryButton
                    label="Delete permanently"
                    icon="trash.fill"
                    destructive
                    loading={deleteClass.isPending}
                    disabled={deleteConfirmation !== classroom.data.name}
                    onPress={confirmDelete}
                  />
                </View>
              </SurfaceCard>
            </>
          ) : (
            <>
              <SectionTitle title="Your membership" />
              <SurfaceCard>
                <Text
                  style={[styles.lifecycleTitle, { color: colors.foreground }]}
                >
                  Leave this class
                </Text>
                <Text style={[styles.lifecycleDetail, { color: colors.muted }]}>
                  Leaving removes your membership. Your teacher’s class and
                  other learners are unaffected.
                </Text>
                <View style={styles.leaveAction}>
                  <PrimaryButton
                    label="Leave class"
                    icon="rectangle.portrait.and.arrow.right"
                    destructive
                    loading={leaveClass.isPending}
                    onPress={confirmLeave}
                  />
                </View>
              </SurfaceCard>
            </>
          )}
        </>
      ) : null}
    </ClassroomPage>
  );
}

export default function ClassSettingsScreen() {
  return (
    <ErrorBoundary label="Class settings">
      <ClassSettingsContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  identityCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  classIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: { flex: 1, minWidth: 0 },
  className: { fontSize: 17, fontWeight: "900" },
  classMeta: { fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  codeLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  codeValue: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 5,
    marginTop: 6,
  },
  codeHelp: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 17 },
  buttonHalf: { flex: 1 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "900" },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 14, fontWeight: "900" },
  memberDetail: { fontSize: 10, marginTop: 3 },
  memberProgress: { fontSize: 10, fontWeight: "700" },
  lifecycleCopy: { marginBottom: 15 },
  lifecycleTitle: { fontSize: 15, fontWeight: "900" },
  lifecycleDetail: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  dangerCard: {},
  dangerTitle: { fontSize: 15, fontWeight: "900" },
  dangerDetail: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  dangerFields: { gap: 14, marginTop: 16 },
  leaveAction: { marginTop: 16 },
});
