import React, { useState, useRef, useCallback, useEffect } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  Alert,
  ScrollView,
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
import { DotsLoader } from "@/components/skeleton";

type ScanMode = "camera" | "preview" | "web-picker";

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
  const [showGradePicker, setShowGradePicker] = useState(false);

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
        // Activate camera once permission resolves (or if already granted)
        setIsCameraActive(true);
      }
      return () => setIsCameraActive(false);
    }, [mode])
  );

  // When permission resolves to granted, activate the camera viewfinder
  useEffect(() => {
    if (Platform.OS !== "web" && permission?.granted && mode === "camera") {
      setIsCameraActive(true);
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
    onError: () => {
      H.notificationError();
      setIsProcessing(false);
    },
  });

  // --- Take photo with camera ---
  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      H.impactMedium();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setSelectedImage(photo.uri);
        setIsCameraActive(false);
        setMode("preview");
        solveMutation.reset();
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
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setIsCameraActive(false);
      setMode("preview");
      solveMutation.reset();
    }
  };

  // --- Solve the image ---
  const handleSolve = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    H.impactMedium();
    try {
      let base64: string;
      if (Platform.OS === "web") {
        const response = await fetch(selectedImage);
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
        base64 = await FileSystem.readAsStringAsync(selectedImage, {
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
    }
  };

  // --- Retake: go back to camera ---
  const handleRetake = () => {
    setSelectedImage(null);
    solveMutation.reset();
    if (Platform.OS !== "web") {
      setMode("camera");
      setIsCameraActive(true);
    } else {
      setMode("web-picker");
    }
  };

  // ===== CAMERA VIEW (native only — default view) =====
  if (mode === "camera" && Platform.OS !== "web" && CameraView) {
    // permission === null means still loading — show camera UI optimistically
    // Only show permission screen when we know it's definitively denied
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
          <TouchableOpacity accessibilityLabel="Gallery" accessibilityRole="button"
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
          {/* Subject hint label */}
          <View style={styles.cameraTopBtn} />
        </View>

        {/* Viewfinder corners */}
        <View style={styles.viewfinderGuide}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>

        <Text style={styles.cameraHint}>Position the problem within the frame</Text>

        {/* Bottom controls: Gallery | Shutter | Flip */}
        <View style={styles.bottomControls}>
          {/* Gallery button */}
          <TouchableOpacity accessibilityLabel="Gallery" accessibilityRole="button" onPress={pickFromGallery} style={styles.galleryCircleBtn} activeOpacity={0.8}>
            <IconSymbol size={26} name="photo.on.rectangle" color="#FFFFFF" />
            <Text style={styles.galleryCircleLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter */}
          <TouchableOpacity onPress={takePicture} style={styles.shutterBtn} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          {/* Spacer to balance layout */}
          <View style={styles.galleryCircleBtn} />
        </View>
      </View>
    );
  }

  // ===== PREVIEW + SOLVE VIEW =====
  if (mode === "preview" && selectedImage) {
    return (
      <ScreenContainer>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Review Photo</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Looks good? Tap Solve to get the answer.
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={[styles.imagePreview, { borderColor: colors.border }]}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" accessibilityLabel="Captured problem image" />
            <TouchableOpacity accessibilityLabel="Close" accessibilityRole="button"
              onPress={handleRetake}
              style={[styles.clearOverlay, { backgroundColor: `${colors.error}E0` }]}
            >
              <IconSymbol size={16} name="xmark" color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {solveMutation.isError && (
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.errorBox, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                <IconSymbol size={16} name="exclamationmark.triangle.fill" color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>
                  Failed to analyze the image. Please try a clearer photo.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { solveMutation.reset(); handleSolve(); H.impactLight(); }}
                style={{ backgroundColor: colors.error, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'center', marginTop: 8 }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT HINT (OPTIONAL)</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }]}>Helps the AI give a more accurate answer.</Text>
            <SubjectPicker value={selectedSubject} onChange={setSelectedSubject} showAll />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>GRADE LEVEL (OPTIONAL)</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }]}>Tailors the explanation depth to your level.</Text>
            <TouchableOpacity
              onPress={() => { setShowGradePicker(true); H.impactLight(); }}
              style={[styles.gradePill, { backgroundColor: gradeLevel ? `${colors.primary}15` : colors.surface, borderColor: gradeLevel ? colors.primary : colors.border }]}
              accessibilityLabel={gradeLevel ? `Level: ${GRADE_LABELS[gradeLevel]}. Tap to change.` : "Set level"}
              accessibilityRole="button"
            >
              <IconSymbol size={14} name="graduationcap.fill" color={gradeLevel ? colors.primary : colors.muted} />
              <Text style={[styles.gradePillText, { color: gradeLevel ? colors.primary : colors.muted }]}>
                {gradeLevel ? GRADE_LABELS[gradeLevel] : "Any level"}
              </Text>
              <IconSymbol size={12} name="chevron.right" color={gradeLevel ? colors.primary : colors.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityLabel="Solve problem"
            onPress={handleSolve}
            disabled={isProcessing || solveMutation.isPending || !isOnline}
            style={[
              styles.solveBtn,
              { backgroundColor: isOnline ? colors.primary : colors.muted },
              (isProcessing || solveMutation.isPending || !isOnline) && { opacity: 0.7 },
            ]}
            activeOpacity={0.85}
          >
            {isProcessing || solveMutation.isPending ? (
              <>
                <DotsLoader color="#FFFFFF" />
                <Text style={styles.solveBtnText}>Analyzing Image...</Text>
              </>
            ) : !isOnline ? (
              <>
                <IconSymbol size={20} name="wifi.slash" color="#FFFFFF" />
                <Text style={styles.solveBtnText}>No Internet Connection</Text>
              </>
            ) : (
              <>
                <IconSymbol size={20} name="wand.and.stars" color="#FFFFFF" />
                <Text style={styles.solveBtnText}>Solve This Problem</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity accessibilityLabel="Camera" accessibilityRole="button"
            onPress={handleRetake}
            style={[styles.retakeBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="camera.fill" color={colors.muted} />
            <Text style={[styles.retakeBtnText, { color: colors.muted }]}>
              {Platform.OS !== "web" ? "Take Another Photo" : "Choose Another Image"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ===== WEB FALLBACK: Gallery-only picker =====
  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Scan Problem</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Upload an image to solve
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <TouchableOpacity accessibilityLabel="Gallery" accessibilityRole="button"
          onPress={pickFromGallery}
          style={[styles.galleryBtn, { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }]}
          activeOpacity={0.8}
        >
          <IconSymbol size={22} name="photo.on.rectangle" color={colors.primary} />
          <Text style={[styles.galleryBtnText, { color: colors.foreground }]}>Choose from Gallery</Text>
          <IconSymbol size={16} name="chevron.right" color={colors.muted} />
        </TouchableOpacity>

        <View style={[styles.tipsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.tipsHeader}>
            <IconSymbol size={16} name="lightbulb.fill" color={colors.warning} />
            <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips for Best Results</Text>
          </View>
          {[
            "Ensure good lighting — avoid shadows",
            "Keep the entire problem in frame",
            "Avoid blurry or tilted images",
            "Works with handwriting and printed text",
            "Supports equations, graphs, and word problems",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={[styles.tipDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.tipText, { color: colors.muted }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT HINT (OPTIONAL)</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Helps the AI give a more accurate answer. Leave blank for auto-detect.</Text>
          <SubjectPicker value={selectedSubject} onChange={setSelectedSubject} showAll />
        </View>

        <View style={{ marginTop: 16, marginBottom: 8 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>GRADE LEVEL (OPTIONAL)</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Tailors the explanation depth to your level.</Text>
          <TouchableOpacity
            onPress={() => { setShowGradePicker(true); H.impactLight(); }}
            style={[styles.gradePill, { backgroundColor: gradeLevel ? `${colors.primary}15` : colors.surface, borderColor: gradeLevel ? colors.primary : colors.border }]}
            accessibilityLabel={gradeLevel ? `Level: ${GRADE_LABELS[gradeLevel]}. Tap to change.` : "Set level"}
            accessibilityRole="button"
          >
            <IconSymbol size={14} name="graduationcap.fill" color={gradeLevel ? colors.primary : colors.muted} />
            <Text style={[styles.gradePillText, { color: gradeLevel ? colors.primary : colors.muted }]}>
              {gradeLevel ? GRADE_LABELS[gradeLevel] : "Any level"}
            </Text>
            <IconSymbol size={12} name="chevron.right" color={gradeLevel ? colors.primary : colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Grade Picker Sheet */}
      {showGradePicker && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} activeOpacity={1} onPress={() => setShowGradePicker(false)} />
          <View style={[styles.gradeSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.gradeSheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.gradeSheetTitle, { color: colors.foreground }]}>Set your level</Text>
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>Explanations will match your grade level.</Text>
            <View style={styles.gradeGrid}>
              {GRADE_OPTIONS.map((opt) => {
                const isActive = gradeLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.gradeCell, { backgroundColor: isActive ? `${colors.primary}18` : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      const next = isActive ? null : opt.id;
                      setGradeLevel(next);
                      saveGlobalGrade(next);
                      H.impactLight();
                      setShowGradePicker(false);
                    }}
                  >
                    <Text style={[styles.gradeCellLabel, { color: isActive ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                    <Text style={[styles.gradeCellSub, { color: colors.muted }]}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}
        </ScreenContainer>
  );
}
export default function ScanScreen() {
  return (
    <ErrorBoundary label="Scan">
      <ScanScreenContent />
    </ErrorBoundary>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, letterSpacing: 0.5 },
  sectionHint: { fontSize: 13, marginBottom: 10, lineHeight: 18 },

  // Permission screen
  permissionContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  permissionIcon: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  permissionTitle: { fontSize: 22, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  permissionSubtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 32 },
  permissionBtn: { width: "100%", padding: 16, borderRadius: 16, alignItems: "center", marginBottom: 12 },
  permissionBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  permissionGalleryBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  permissionGalleryText: { fontSize: 15, fontWeight: "600" },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  cameraTopBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cameraTopBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  cameraTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  viewfinderGuide: { position: "absolute", top: "25%", left: "10%", right: "10%", bottom: "25%", zIndex: 5 },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FFFFFF" },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  cameraHint: {
    position: "absolute", bottom: "18%", left: 0, right: 0, textAlign: "center",
    color: "rgba(255,255,255,0.8)", fontSize: 14, zIndex: 10,
  },
  bottomControls: {
    position: "absolute", bottom: 48, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-evenly",
    zIndex: 10, paddingHorizontal: 24,
  },
  galleryCircleBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  galleryCircleLabel: { color: "#FFFFFF", fontSize: 10, fontWeight: "600", marginTop: 2 },
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 3, borderColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" },

  // Gallery button (web)
  galleryBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 2, gap: 12, marginBottom: 20 },
  galleryBtnText: { flex: 1, fontSize: 16, fontWeight: "600" },
  tipsBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 15, fontWeight: "700" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipText: { fontSize: 14, lineHeight: 20, flex: 1 },

  // Preview
  imagePreview: { borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 16, height: 280, position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  clearOverlay: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 14 },
  solveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 16, gap: 8, marginBottom: 12 },
  solveBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  retakeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  retakeBtnText: { fontSize: 15, fontWeight: "600" },
  gradePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  gradePillText: { fontSize: 14, fontWeight: "600", flex: 1 },
  gradeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 36 },
  gradeSheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  gradeSheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  gradeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gradeCell: { width: "30%", padding: 12, borderRadius: 14, borderWidth: 1.5, alignItems: "center", gap: 2 },
  gradeCellLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  gradeCellSub: { fontSize: 10, textAlign: "center" },
});
