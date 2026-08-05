import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  ClassroomField,
  ClassroomPage,
  InlineError,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
  getErrorMessage,
} from "@/components/classroom/classroom-ui";
import { useAssistantContext } from "@/components/contextual-assistant";
import { ErrorBoundary } from "@/components/error-boundary";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";
import { trpc } from "@/lib/trpc";

function defaultDueParts(): { date: string; time: string } {
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = [
    due.getFullYear(),
    String(due.getMonth() + 1).padStart(2, "0"),
    String(due.getDate()).padStart(2, "0"),
  ].join("-");
  return { date, time: "17:00" };
}

function parseDueDate(
  dateText: string,
  timeText: string,
): Date | null | "invalid" {
  const date = dateText.trim();
  const time = timeText.trim();
  if (!date && !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return "invalid";
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hours ||
    parsed.getMinutes() !== minutes
  ) {
    return "invalid";
  }
  return parsed;
}

function CreateAssignmentContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ classroomId: string | string[] }>();
  const classroomId = Array.isArray(params.classroomId)
    ? params.classroomId[0]
    : params.classroomId;
  const utils = trpc.useUtils();
  const { setContext, resetContext, openTutor } = useAssistantContext();
  const defaults = useMemo(defaultDueParts, []);
  const classroom = trpc.classroom.get.useQuery(
    { classroomId },
    { enabled: Boolean(classroomId) },
  );

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(defaults.date);
  const [dueTime, setDueTime] = useState(defaults.time);
  const [attempted, setAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittingMode, setSubmittingMode] = useState<
    "draft" | "publish" | null
  >(null);

  const effectiveSubject = subject.trim() || classroom.data?.subject || "";
  const parsedDue = parseDueDate(dueDate, dueTime);
  const valid = Boolean(
    title.trim() &&
    instructions.trim() &&
    effectiveSubject &&
    parsedDue !== "invalid",
  );

  const createAssignment = trpc.classroom.assignment.create.useMutation();
  const publishAssignment = trpc.classroom.assignment.publish.useMutation();

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Draft this assignment with AI Tutor",
        detail: `Help me write a clear ${effectiveSubject || "class"} assignment with learner-friendly instructions, appropriate scope, and useful success criteria.`,
      });
      return resetContext;
    }, [effectiveSubject, resetContext, setContext]),
  );

  const submit = async (mode: "draft" | "publish") => {
    setAttempted(true);
    setSubmitError(null);
    if (!valid || submittingMode) return;
    setSubmittingMode(mode);
    try {
      const assignment = await createAssignment.mutateAsync({
        classroomId,
        title: title.trim(),
        instructions: instructions.trim(),
        subject: effectiveSubject,
        dueAt: parsedDue === "invalid" ? null : parsedDue,
      });
      if (mode === "publish") {
        await publishAssignment.mutateAsync({ assignmentId: assignment.id });
      }
      await Promise.all([
        utils.classroom.assignment.list.invalidate({ classroomId }),
        utils.classroom.getMyClasses.invalidate(),
      ]);
      H.notificationSuccess();
      router.replace(
        `/(tabs)/classroom/${classroomId}/assignment/${assignment.id}` as never,
      );
    } catch (error) {
      H.notificationError();
      setSubmitError(
        getErrorMessage(error, "The assignment could not be saved."),
      );
    } finally {
      setSubmittingMode(null);
    }
  };

  return (
    <ClassroomPage
      title="New assignment"
      subtitle={classroom.data?.name ?? "Teacher composer"}
      back
    >
      <SurfaceCard style={styles.tipCard}>
        <View
          style={[styles.tipIcon, { backgroundColor: `${colors.primary}14` }]}
        >
          <IconSymbol name="lightbulb.fill" size={23} color={colors.primary} />
        </View>
        <View style={styles.tipCopy}>
          <Text style={[styles.tipTitle, { color: colors.foreground }]}>
            Keep the task focused
          </Text>
          <Text style={[styles.tipDetail, { color: colors.muted }]}>
            MVP assignments are text-only. Add the goal, required work, and what
            a complete response should include.
          </Text>
        </View>
      </SurfaceCard>

      <ClassroomField
        label="Assignment title"
        placeholder="Example: Solve linear equations"
        value={title}
        onChangeText={setTitle}
        maxLength={160}
        autoCapitalize="sentences"
        error={attempted && !title.trim() ? "Enter an assignment title." : null}
      />

      <ClassroomField
        label="Instructions"
        placeholder="Explain the task, required steps, and what learners should submit."
        value={instructions}
        onChangeText={setInstructions}
        maxLength={20_000}
        multiline
        error={
          attempted && !instructions.trim()
            ? "Enter assignment instructions."
            : null
        }
      />

      <SecondaryButton
        label="Draft instructions with AI Tutor"
        icon="sparkles"
        onPress={openTutor}
      />

      <ClassroomField
        label="Subject"
        placeholder={classroom.data?.subject || "Subject"}
        value={subject}
        onChangeText={setSubject}
        maxLength={64}
        autoCapitalize="words"
        hint={
          subject.trim()
            ? undefined
            : `Using class subject: ${classroom.data?.subject ?? "loading…"}`
        }
        error={attempted && !effectiveSubject ? "Enter a subject." : null}
      />

      <View style={styles.dueRow}>
        <View style={styles.dueField}>
          <ClassroomField
            label="Due date"
            placeholder="YYYY-MM-DD"
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            error={
              attempted && parsedDue === "invalid" ? "Use YYYY-MM-DD." : null
            }
          />
        </View>
        <View style={styles.timeField}>
          <ClassroomField
            label="Time"
            placeholder="17:00"
            value={dueTime}
            onChangeText={setDueTime}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            error={
              attempted && parsedDue === "invalid" ? "Use 24-hour time." : null
            }
          />
        </View>
      </View>
      <Text style={[styles.localTimeNote, { color: colors.muted }]}>
        Due time uses this device’s local timezone. Clear both fields for no due
        date.
      </Text>

      {submitError ? <InlineError message={submitError} /> : null}

      <View style={styles.submitRow}>
        <View style={styles.submitHalf}>
          <SecondaryButton
            label={submittingMode === "draft" ? "Saving…" : "Save draft"}
            icon="doc.text"
            onPress={() => void submit("draft")}
            disabled={!valid || Boolean(submittingMode)}
          />
        </View>
        <View style={styles.submitHalf}>
          <PrimaryButton
            label="Create & publish"
            icon="paperplane.fill"
            onPress={() => void submit("publish")}
            loading={submittingMode === "publish"}
            disabled={!valid || Boolean(submittingMode)}
          />
        </View>
      </View>
    </ClassroomPage>
  );
}

export default function CreateAssignmentScreen() {
  return (
    <ErrorBoundary label="Create assignment">
      <CreateAssignmentContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tipCard: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tipIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tipCopy: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: "900" },
  tipDetail: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  dueRow: { flexDirection: "row", gap: 10 },
  dueField: { flex: 1.5 },
  timeField: { flex: 1 },
  localTimeNote: { fontSize: 11, lineHeight: 16, marginTop: -8 },
  submitRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  submitHalf: { flex: 1 },
});
