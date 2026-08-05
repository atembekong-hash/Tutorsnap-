import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  ClassroomField,
  ClassroomPage,
  InlineError,
  PrimaryButton,
  SecondaryButton,
  StatusPill,
  SurfaceCard,
  getErrorMessage,
} from "@/components/classroom/classroom-ui";
import { useAssistantContext } from "@/components/contextual-assistant";
import { ErrorBoundary } from "@/components/error-boundary";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as H from "@/lib/haptics";
import { trpc } from "@/lib/trpc";

const PENDING_JOIN_CODE_KEY = "@tutorsnap/pendingClassroomJoinCode";

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function JoinClassContent() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const utils = trpc.useUtils();
  const { setContext, resetContext } = useAssistantContext();
  const [code, setCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const routeCode = Array.isArray(params.code)
        ? params.code[0]
        : params.code;
      const storedCode = await AsyncStorage.getItem(PENDING_JOIN_CODE_KEY);
      const next = normalizeCode(routeCode || storedCode || "");
      if (active && next) setCode(next);
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, [params.code]);

  useFocusEffect(
    useCallback(() => {
      setContext({
        source: "classroom",
        title: "Prepare to join a class with AI Tutor",
        detail:
          "Help me understand how to get ready for a new class, organize upcoming assignments, and ask useful academic questions.",
      });
      return resetContext;
    }, [resetContext, setContext]),
  );

  const preview = trpc.classroom.getByCode.useQuery(
    { code: submittedCode },
    {
      enabled: submittedCode.length === 8,
      retry: false,
    },
  );

  const join = trpc.classroom.join.useMutation({
    onSuccess: async (classroom) => {
      await AsyncStorage.removeItem(PENDING_JOIN_CODE_KEY);
      await utils.classroom.getMyClasses.invalidate();
      H.notificationSuccess();
      router.replace(`/(tabs)/classroom/${classroom.id}` as never);
    },
  });

  const codeError =
    attempted && code.length !== 8
      ? "Enter the complete eight-character class code."
      : null;

  const findClass = () => {
    setAttempted(true);
    if (code.length !== 8) return;
    if (submittedCode === code) {
      void preview.refetch();
    } else {
      setSubmittedCode(code);
    }
  };

  return (
    <ClassroomPage title="Join a class" subtitle="Learner access" back>
      <SurfaceCard style={styles.infoCard}>
        <View
          style={[styles.infoIcon, { backgroundColor: `${colors.primary}14` }]}
        >
          <IconSymbol name="lock.doc.fill" size={25} color={colors.primary} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            Use a teacher’s private code
          </Text>
          <Text style={[styles.infoDetail, { color: colors.muted }]}>
            TutorSnap will show the class name before you join. A code never
            exposes the teacher’s email or the learner list.
          </Text>
        </View>
      </SurfaceCard>

      <ClassroomField
        label="Class code"
        placeholder="ABCD2345"
        value={code}
        onChangeText={(value) => {
          const normalized = normalizeCode(value);
          setCode(normalized);
          if (normalized !== submittedCode) setSubmittedCode("");
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        keyboardType="visible-password"
        textContentType="oneTimeCode"
        error={codeError}
        hint="Codes use eight letters and numbers. Spaces and dashes are ignored."
        style={styles.codeField}
      />

      {!preview.data ? (
        <PrimaryButton
          label="Find class"
          icon="magnifyingglass"
          onPress={findClass}
          loading={preview.isFetching}
          disabled={code.length !== 8}
        />
      ) : null}

      {preview.error ? (
        <InlineError
          message={
            preview.error.data?.code === "TOO_MANY_REQUESTS"
              ? "Too many class-code attempts. Wait a few minutes before trying again."
              : "That class code is invalid or unavailable. Check the code with your teacher."
          }
        />
      ) : null}

      {preview.data ? (
        <SurfaceCard>
          <View style={styles.previewTop}>
            <View
              style={[
                styles.classIcon,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <IconSymbol
                name="graduationcap.fill"
                size={27}
                color={colors.success}
              />
            </View>
            <View style={styles.previewCopy}>
              <StatusPill label="CLASS FOUND" tone="success" />
              <Text style={[styles.className, { color: colors.foreground }]}>
                {preview.data.name}
              </Text>
              <Text style={[styles.classMeta, { color: colors.muted }]}>
                {preview.data.subject}
                {preview.data.gradeLevel ? ` · ${preview.data.gradeLevel}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.previewActions}>
            <View style={styles.actionHalf}>
              <SecondaryButton
                label="Use another code"
                icon="arrow.counterclockwise"
                onPress={() => {
                  setSubmittedCode("");
                  setAttempted(false);
                }}
              />
            </View>
            <View style={styles.actionHalf}>
              <PrimaryButton
                label="Join class"
                icon="person.badge.plus"
                onPress={() => join.mutate({ code: submittedCode })}
                loading={join.isPending}
              />
            </View>
          </View>
        </SurfaceCard>
      ) : null}

      {join.error ? (
        <InlineError message={getErrorMessage(join.error)} />
      ) : null}
    </ClassroomPage>
  );
}

export default function JoinClassScreen() {
  return (
    <ErrorBoundary label="Join class">
      <JoinClassContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: "900" },
  infoDetail: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  codeField: {
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 5,
    textAlign: "center",
  },
  previewTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  classIcon: {
    width: 58,
    height: 58,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: { flex: 1, gap: 5 },
  className: { fontSize: 20, fontWeight: "900", letterSpacing: -0.35 },
  classMeta: { fontSize: 13, textTransform: "capitalize" },
  previewActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  actionHalf: { flex: 1 },
});
