import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import {
  ClassroomField,
  ClassroomPage,
  InlineError,
  PrimaryButton,
  SectionTitle,
  SurfaceCard,
  getErrorMessage,
} from "@/components/classroom/classroom-ui";
import { useAssistantContext } from "@/components/contextual-assistant";
import { ErrorBoundary } from "@/components/error-boundary";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";
import { trpc } from "@/lib/trpc";

const SUBJECTS = [
  "Algebra",
  "Geometry",
  "Calculus",
  "Biology",
  "Chemistry",
  "Physics",
  "English",
  "History",
];

function CreateClassContent() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { setContext, resetContext } = useAssistantContext();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Algebra");
  const [gradeLevel, setGradeLevel] = useState("");
  const [attempted, setAttempted] = useState(false);

  const nameError = attempted && !name.trim() ? "Enter a class name." : null;
  const subjectError = attempted && !subject.trim() ? "Enter a subject." : null;
  const valid = Boolean(name.trim() && subject.trim());

  const createClass = trpc.classroom.create.useMutation({
    onSuccess: async (classroom) => {
      await utils.classroom.getMyClasses.invalidate();
      H.notificationSuccess();
      router.replace(`/(tabs)/classroom/${classroom.id}` as never);
    },
  });

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Design a focused class with AI Tutor",
        detail: `I am creating a ${subject || "new"} class${gradeLevel ? ` for ${gradeLevel}` : ""}. Help me define clear learning goals and a first assignment.`,
      });
      return resetContext;
    }, [gradeLevel, resetContext, setContext, subject]),
  );

  const roleNote = useMemo(
    () =>
      "You will be the teacher for this class only. TutorSnap will not change your account-wide role, and learners can join only with the generated code.",
    [],
  );

  const submit = () => {
    setAttempted(true);
    if (!valid || createClass.isPending) return;
    createClass.mutate({
      name: name.trim(),
      subject: subject.trim(),
      gradeLevel: gradeLevel.trim() || null,
    });
  };

  return (
    <ClassroomPage title="Create a class" subtitle="Teacher setup" back>
      <SurfaceCard style={styles.roleCard}>
        <View
          style={[styles.roleIcon, { backgroundColor: `${colors.primary}14` }]}
        >
          <IconSymbol
            name="checkmark.shield.fill"
            size={25}
            color={colors.primary}
          />
        </View>
        <View style={styles.roleCopy}>
          <Text style={[styles.roleTitle, { color: colors.foreground }]}>
            Private by default
          </Text>
          <Text style={[styles.roleDetail, { color: colors.muted }]}>
            {roleNote}
          </Text>
        </View>
      </SurfaceCard>

      <SectionTitle title="Class details" detail="Required fields" />
      <ClassroomField
        label="Class name"
        placeholder="Example: Period 2 Algebra"
        value={name}
        onChangeText={setName}
        maxLength={120}
        autoCapitalize="words"
        error={nameError}
      />

      <ClassroomField
        label="Subject"
        placeholder="Example: Algebra"
        value={subject}
        onChangeText={setSubject}
        maxLength={64}
        autoCapitalize="words"
        error={subjectError}
      />

      <View style={styles.chips}>
        {SUBJECTS.map((option) => {
          const selected = subject.toLowerCase() === option.toLowerCase();
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              activeOpacity={0.76}
              onPress={() => {
                H.selectionFeedback();
                setSubject(option);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? `${colors.primary}18`
                    : colors.surface,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.primary : colors.muted },
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ClassroomField
        label="Grade or level"
        hint="Optional. Examples: Grade 8, AP, Introductory college."
        placeholder="Grade 8"
        value={gradeLevel}
        onChangeText={setGradeLevel}
        maxLength={32}
        autoCapitalize="words"
      />

      {createClass.error ? (
        <InlineError message={getErrorMessage(createClass.error)} />
      ) : null}

      <PrimaryButton
        label="Create class"
        icon="plus.circle.fill"
        onPress={submit}
        loading={createClass.isPending}
        disabled={!valid}
      />
    </ClassroomPage>
  );
}

export default function CreateClassScreen() {
  return (
    <ErrorBoundary label="Create class">
      <CreateClassContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  roleCard: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCopy: { flex: 1 },
  roleTitle: { fontSize: 15, fontWeight: "900" },
  roleDetail: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -4 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12, fontWeight: "800" },
});
