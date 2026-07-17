import { ErrorBoundary } from "@/components/error-boundary";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as H from "@/lib/haptics";
import * as FileSystem from "expo-file-system/legacy";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryItem, MathSubject } from "@/shared/types";
import { SubjectPicker } from "@/components/subject-picker";
import { type SubjectId } from "@/lib/subjects";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { CameraView, useCameraPermissions } from "@/lib/camera-wrapper";
import { GRADE_OPTIONS, GRADE_LABELS, loadGlobalGrade, saveGlobalGrade } from "@/lib/grade-levels";
import { useRef, useState, useEffect, useCallback } from "react";

function ScanScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const stabilityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [mode, setMode] = useState<"camera" | "solving" | "web-picker">(
    Platform.OS !== "web" ? "camera" : "web-picker"
  );
  const [isCameraActive, setIsCameraActive] = useState(Platform.OS !== "web");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const { isOnline } = useNetworkStatus();
  const [permission, requestPermission] = useCameraPermissions();

  // Load global grade on mount
  useEffect(() => {
    loadGlobalGrade().then((g: string | null) => {
      if (g) setGradeLevel(g);
    });
  }, []);

  // Request camera permission on mount
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // Auto-activate camera on screen focus
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" && mode === "camera") {
        setIsCameraActive(true);
        startStabilityCheck();
      }
      return () => {
        setIsCameraActive(false);
        stopStabilityCheck();
      };
    }, [mode])
  );

  // Activate camera when permission is granted
  useEffect(() => {
    if (Platform.OS !== "web" && permission?.granted && mode === "camera") {
      setIsCameraActive(true);
      startStabilityCheck();
    }
  }, [permission?.granted, mode]);

  const solveMutation = trpc.academic.solveFromImage.useMutation({
    onSuccess: async (data) => {
      H.notificationSuccess();
      const historyItem: HistoryItem = {
        id: `history-${Date.now()}`,
        problem: data.problem,
        answer: data.answer,
        subject: data.subject as MathSubject,
        steps: data.steps || [],
        conceptExplained: data.conceptExplained,
        tips: data.tips,
        solvedAt: Date.now(),
        gradeLevel: gradeLevel ?? undefined,
      };
      try {
        const existing = await AsyncStorage.getItem("math_history");
        const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
        history.unshift(historyItem);
        await AsyncStorage.setItem("math_history", JSON.stringify(history.slice(0, 100)));
      } catch (_) {
        /* non-critical */
      }
      setMode("camera");
      router.push({ pathname: "/solution", params: { data: JSON.stringify(data) } });
    },
    onError: () => {
      H.notificationError();
      setMode("camera");
      Alert.alert("Error", "Couldn't solve that problem. Please try again.");
    },
  });

  // Start stability check for auto-capture
  const startStabilityCheck = () => {
    if (stabilityCheckIntervalRef.current) return;
    stabilityCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      // If no frame in last 800ms, camera is stable
      if (now - lastFrameTimeRef.current > 800) {
        autoCaptureAndSolve();
      }
    }, 1000);
  };

  const stopStabilityCheck = () => {
    if (stabilityCheckIntervalRef.current) {
      clearInterval(stabilityCheckIntervalRef.current);
      stabilityCheckIntervalRef.current = null;
    }
  };

  // Auto-capture when stable
  const autoCaptureAndSolve = async () => {
    if (!cameraRef.current || mode !== "camera") return;
    stopStabilityCheck();
    try {
      H.impactMedium();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setMode("solving");
        await submitImage(photo.uri);
      }
    } catch (_) {
      setMode("camera");
      startStabilityCheck();
    }
  };

  // Submit image to solver
  const submitImage = async (imageUri: string) => {
    try {
      let base64: string;
      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      solveMutation.mutate({
        imageBase64: base64,
        mimeType: "image/jpeg",
        subject: selectedSubject ?? "other",
        gradeLevel: gradeLevel ?? undefined,
      });
    } catch (_) {
      setMode("camera");
      Alert.alert("Error", "Failed to process image. Please try again.");
      startStabilityCheck();
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Photo library access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setMode("solving");
      await submitImage(result.assets[0].uri);
    }
  };

  // Permission denied screen
  if (mode === "camera" && Platform.OS !== "web") {
    const permissionDenied = permission !== null && !permission.granted;
    if (permissionDenied) {
      return (
        <ScreenContainer className="items-center justify-center gap-4">
          <View style={[styles.permissionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <IconSymbol size={48} name="camera.fill" color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[styles.permissionSubtitle, { color: colors.muted }]}>
            Allow TutorSnap to scan problems from your textbook.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.permissionBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFromGallery}
            style={[styles.permissionGalleryBtn, { borderColor: colors.border }]}
          >
            <IconSymbol size={18} name="photo.on.rectangle" color={colors.primary} />
            <Text style={[styles.permissionGalleryText, { color: colors.primary }]}>Choose from Gallery</Text>
          </TouchableOpacity>
        </ScreenContainer>
      );
    }
  }

  // Camera view
  if (mode === "camera" && Platform.OS !== "web" && CameraView) {
    return (
      <View style={styles.cameraContainer}>
        {isCameraActive && permission?.granted && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            enableTorch={isTorchOn}
            onFrameUpdate={() => {
              lastFrameTimeRef.current = Date.now();
            }}
          />
        )}

        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity
            onPress={() => setFacing(f => f === "back" ? "front" : "back")}
            style={styles.cameraTopBtn}
          >
            <IconSymbol size={22} name="arrow.triangle.2.circlepath.camera" color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsTorchOn(!isTorchOn)}
            style={[styles.cameraTopBtn, isTorchOn && { backgroundColor: "#FFD70033" }]}
          >
            <IconSymbol size={22} name={isTorchOn ? "bolt.fill" : "bolt.slash.fill"} color={isTorchOn ? "#FFD700" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>

        {/* Stability indicator */}
        <View style={styles.stabilityContainer}>
          <View style={[styles.stabilityDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.stabilityText, { color: colors.foreground }]}>Hold steady...</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraBottomBar}>
          <TouchableOpacity
            onPress={pickFromGallery}
            style={[styles.galleryBtn, { borderColor: colors.border }]}
          >
            <IconSymbol size={24} name="photo.on.rectangle" color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowGradePicker(true)}
            style={[styles.gradeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.gradeBtnText, { color: colors.foreground }]}>
              {gradeLevel ? GRADE_LABELS[gradeLevel as keyof typeof GRADE_LABELS] : "Grade"}
            </Text>
          </TouchableOpacity>
          <SubjectPicker
            selectedSubject={selectedSubject}
            onSelect={setSelectedSubject}
            trigger={
              <TouchableOpacity
                style={[styles.subjectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.subjectBtnText, { color: colors.foreground }]}>
                  {selectedSubject ? selectedSubject.charAt(0).toUpperCase() + selectedSubject.slice(1) : "Subject"}
                </Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Grade picker modal */}
        {showGradePicker && (
          <View style={styles.modal}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Grade Level</Text>
              {GRADE_OPTIONS.map((grade) => (
                <TouchableOpacity
                  key={grade}
                  onPress={() => {
                    setGradeLevel(grade);
                    saveGlobalGrade(grade);
                    setShowGradePicker(false);
                  }}
                  style={[
                    styles.modalOption,
                    gradeLevel === grade && { backgroundColor: `${colors.primary}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: gradeLevel === grade ? colors.primary : colors.foreground },
                    ]}
                  >
                    {GRADE_LABELS[grade as keyof typeof GRADE_LABELS]}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowGradePicker(false)}
                style={[styles.modalClose, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }

  // Solving overlay
  if (mode === "solving") {
    return (
      <ScreenContainer className="items-center justify-center gap-4">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.solvingText, { color: colors.foreground }]}>Solving your problem...</Text>
        <TouchableOpacity
          onPress={() => {
            setMode("camera");
            solveMutation.reset();
            startStabilityCheck();
          }}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  // Web gallery picker
  if (mode === "web-picker") {
    return (
      <ScreenContainer className="items-center justify-center gap-4">
        <View style={[styles.permissionIcon, { backgroundColor: `${colors.primary}15` }]}>
          <IconSymbol size={48} name="photo.on.rectangle" color={colors.primary} />
        </View>
        <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Pick a Problem</Text>
        <Text style={[styles.permissionSubtitle, { color: colors.muted }]}>
          Select an image of a math problem to solve.
        </Text>
        <TouchableOpacity
          onPress={pickFromGallery}
          style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.permissionBtnText}>Choose Image</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  return null;
}

export default function ScanScreen() {
  return (
    <ErrorBoundary>
      <ScanScreenContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  cameraTopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00000040",
    justifyContent: "center",
    alignItems: "center",
  },
  stabilityContainer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
  },
  stabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  stabilityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cameraBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#00000060",
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gradeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradeBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  subjectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  subjectBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000080",
    justifyContent: "flex-end",
    zIndex: 20,
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalClose: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  solvingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  permissionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  permissionGalleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
    gap: 8,
  },
  permissionGalleryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
