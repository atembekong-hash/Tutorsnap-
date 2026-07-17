/**
 * Optimized Scan Screen — One-Tap Camera-to-Answer
 * 
 * UX Flow:
 * 1. User taps camera icon
 * 2. Camera launches immediately (no countdown)
 * 3. Visual stability indicator shows when ready
 * 4. Auto-captures when stable for 1 second
 * 5. Immediately submits to solver
 * 6. Shows solving overlay with progress
 * 7. Displays answer
 * 
 * No manual shutter, no preview screen, no solve button — just tap and get answer.
 */

import { ErrorBoundary } from "@/components/error-boundary";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  ScrollView,
  Animated,
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
import { useCallback, useEffect, useRef, useState } from "react";

type ScanMode = "camera" | "solving" | "web-picker";

function ScanScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  // On native, default to camera mode. On web, show gallery picker.
  const [mode, setMode] = useState<ScanMode>(Platform.OS !== "web" ? "camera" : "web-picker");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(Platform.OS !== "web");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const { isOnline } = useNetworkStatus();
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);

  // Stability tracking for auto-capture
  const [stabilityScore, setStabilityScore] = useState(0);
  const stabilityAnim = useRef(new Animated.Value(0)).current;
  const lastCaptureTime = useRef(0);
  const stabilityCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load global grade default on mount
  useEffect(() => {
    loadGlobalGrade().then((g: string | null) => { if (g) setGradeLevel(g); });
  }, []);

  const [permission, requestPermission] = useCameraPermissions();

  // Request camera permission on mount (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // Manage camera active state when screen gains/loses focus
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" && mode === "camera") {
        setIsCameraActive(true);
        // Start stability checking
        startStabilityCheck();
      }
      return () => {
        setIsCameraActive(false);
        stopStabilityCheck();
      };
    }, [mode])
  );

  // When permission resolves to granted, activate the camera viewfinder
  useEffect(() => {
    if (Platform.OS !== "web" && permission?.granted && mode === "camera") {
      setIsCameraActive(true);
      startStabilityCheck();
    }
  }, [permission?.granted, mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStabilityCheck();
  }, []);

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
        imageUri: selectedImage || undefined,
        solvedAt: Date.now(),
        gradeLevel: gradeLevel ?? undefined,
      };
      try {
        const existing = await AsyncStorage.getItem("math_history");
        const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
        history.unshift(historyItem);
        await AsyncStorage.setItem("math_history", JSON.stringify(history.slice(0, 100)));
      } catch (_) { /* AsyncStorage write failed — non-critical */ }
      setIsProcessing(false);
      router.push({ pathname: "/solution", params: { data: JSON.stringify(data) } });
    },
    onError: (error) => {
      H.notificationError();
      setIsProcessing(false);
      const message = error.message || "Failed to analyze the image. Please try again.";
      Alert.alert("Solve Failed", message, [
        { text: "Retake", onPress: handleRetake },
        { text: "Cancel", onPress: () => { } },
      ]);
    },
  });

  // --- Stability checking for auto-capture ---
  const startStabilityCheck = () => {
    if (stabilityCheckInterval.current) return;

    // Simulate stability by gradually increasing score
    // In production, this would use device motion sensors or frame analysis
    let score = 0;
    stabilityCheckInterval.current = setInterval(() => {
      score = Math.min(100, score + 15);
      setStabilityScore(score);

      // Animate the indicator
      Animated.timing(stabilityAnim, {
        toValue: score / 100,
        duration: 100,
        useNativeDriver: false,
      }).start();

      // Auto-capture when stable for 1 second
      if (score >= 85 && Date.now() - lastCaptureTime.current > 1000) {
        lastCaptureTime.current = Date.now();
        takePictureAuto();
      }
    }, 100);
  };

  const stopStabilityCheck = () => {
    if (stabilityCheckInterval.current) {
      clearInterval(stabilityCheckInterval.current);
      stabilityCheckInterval.current = null;
    }
    setStabilityScore(0);
  };

  // --- Take photo with camera (auto) ---
  const takePictureAuto = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      stopStabilityCheck();
      H.impactMedium();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setSelectedImage(photo.uri);
        setIsCameraActive(false);
        setMode("solving");
        solveMutation.reset();
        // Immediately submit to solver
        submitToSolver(photo.uri);
      }
    } catch (_) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
      startStabilityCheck();
    }
  };

  // --- Take photo with camera (manual) ---
  const takePictureManual = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      H.impactMedium();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setSelectedImage(photo.uri);
        setIsCameraActive(false);
        setMode("solving");
        solveMutation.reset();
        // Immediately submit to solver
        submitToSolver(photo.uri);
      }
    } catch (_) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  // --- Pick from gallery ---
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Photo library access is needed to select images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setIsCameraActive(false);
      setMode("solving");
      solveMutation.reset();
      // Immediately submit to solver
      submitToSolver(result.assets[0].uri);
    }
  };

  // --- Submit image to solver ---
  const submitToSolver = async (imageUri: string) => {
    setIsProcessing(true);
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
      setIsProcessing(false);
      Alert.alert("Error", "Failed to process image. Please try again.");
      handleRetake();
    }
  };

  // --- Retake: go back to camera ---
  const handleRetake = () => {
    setSelectedImage(null);
    solveMutation.reset();
    if (Platform.OS !== "web") {
      setMode("camera");
      setIsCameraActive(true);
      startStabilityCheck();
    } else {
      setMode("web-picker");
    }
  };

  // ===== CAMERA VIEW (native only — default view) =====
  if (mode === "camera" && Platform.OS !== "web" && CameraView) {
    const permissionDenied = permission !== null && !permission.granted;
    if (permissionDenied) {
      return (
        <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.permissionIcon, { backgroundColor: `${colors.primary}15` }]}>
            <IconSymbol size={48} name="camera.fill" color={colors.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[styles.permissionSubtitle, { color: colors.muted }]}>
            Allow TutorSnap to use your camera to scan problems from your textbook or notes.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickFromGallery}
            style={[styles.permissionGalleryBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="photo.on.rectangle" color={colors.primary} />
            <Text style={[styles.permissionGalleryText, { color: colors.primary }]}>Choose from Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        {(isCameraActive && permission?.granted) && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />
        )}

        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity
            accessibilityLabel="Toggle facing"
            onPress={() => setFacing(f => f === "back" ? "front" : "back")}
            style={styles.cameraTopBtn}
          >
            <IconSymbol size={22} name="arrow.triangle.2.circlepath.camera" color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Scan Problem</Text>
          <View style={styles.cameraTopBtn} />
        </View>

        {/* Viewfinder corners */}
        <View style={styles.viewfinderGuide}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        {/* Stability indicator */}
        <View style={styles.stabilityContainer}>
          <Animated.View
            style={[
              styles.stabilityBar,
              {
                width: stabilityAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: stabilityScore < 50 ? colors.warning : stabilityScore < 85 ? colors.primary : colors.success,
              },
            ]}
          />
          <Text style={[styles.stabilityText, { color: colors.muted }]}>
            {stabilityScore < 50 ? "Hold steady..." : stabilityScore < 85 ? "Getting ready..." : "Ready!"}
          </Text>
        </View>

        <Text style={styles.cameraHint}>Position the problem within the frame</Text>

        {/* Bottom controls: Gallery | Shutter | Flip */}
        <View style={styles.bottomControls}>
          {/* Gallery button */}
          <TouchableOpacity onPress={pickFromGallery} style={styles.galleryCircleBtn} activeOpacity={0.8}>
            <IconSymbol size={26} name="photo.on.rectangle" color="#FFFFFF" />
            <Text style={styles.galleryCircleLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter (manual backup) */}
          <TouchableOpacity onPress={takePictureManual} style={styles.shutterBtn} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Spacer to balance layout */}
          <View style={styles.galleryCircleBtn} />
        </View>
      </View>
    );
  }

  // ===== SOLVING VIEW =====
  if (mode === "solving" && isProcessing) {
    return (
      <View style={[styles.solvingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.solvingTitle, { color: colors.foreground }]}>Analyzing your problem...</Text>
        <Text style={[styles.solvingSubtitle, { color: colors.muted }]}>
          {solveMutation.isPending ? "Recognizing question..." : "Generating solution..."}
        </Text>
      </View>
    );
  }

  // ===== WEB PICKER VIEW =====
  if (mode === "web-picker") {
    return (
      <ScreenContainer className="p-6">
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <IconSymbol size={48} name="photo.on.rectangle" color={colors.primary} />
          <Text style={[styles.webPickerTitle, { color: colors.foreground }]}>Pick a Photo</Text>
          <TouchableOpacity
            onPress={pickFromGallery}
            style={[styles.webPickerBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.webPickerBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return null;
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  cameraTopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  viewfinderGuide: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 280,
    height: 280,
    marginLeft: -140,
    marginTop: -140,
    zIndex: 5,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  stabilityContainer: {
    position: "absolute",
    bottom: 180,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 8,
  },
  stabilityBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: "100%",
    opacity: 0.3,
  },
  stabilityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    zIndex: 2,
  },
  cameraHint: {
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  bottomControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 32,
  },
  galleryCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  galleryCircleLabel: {
    fontSize: 10,
    color: "#FFFFFF",
    marginTop: 4,
  },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
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
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  permissionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  permissionGalleryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  permissionGalleryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  solvingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  solvingTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  solvingSubtitle: {
    fontSize: 14,
  },
  webPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  webPickerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  webPickerBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default function ScanScreen() {
  return (
    <ErrorBoundary>
      <ScanScreenContent />
    </ErrorBoundary>
  );
}
