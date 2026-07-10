import React, { useState, useRef, useCallback } from "react";
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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
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

type ScanMode = "picker" | "camera" | "preview";

export default function ScanScreen() {
  const colors = useColors();
  const router = useRouter();
  const cameraRef = useRef<any>(null);
  const [mode, setMode] = useState<ScanMode>("picker");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const { isOnline } = useNetworkStatus();

  const [permission, requestPermission] = useCameraPermissions();

  // Deactivate camera when screen loses focus
  useFocusEffect(
    useCallback(() => {
      if (mode === "camera") setIsCameraActive(true);
      return () => setIsCameraActive(false);
    }, [mode])
  );

  const solveMutation = trpc.academic.solveFromImage.useMutation({
    onSuccess: async (data) => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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
      };
      try {
        const existing = await AsyncStorage.getItem("math_history");
        const history: HistoryItem[] = existing ? JSON.parse(existing) : [];
        history.unshift(historyItem);
        await AsyncStorage.setItem("math_history", JSON.stringify(history.slice(0, 100)));
      } catch (_) {}
      setIsProcessing(false);
      router.push({ pathname: "/solution", params: { data: JSON.stringify(data) } });
    },
    onError: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsProcessing(false);
    },
  });

  // --- Camera ---
  const openCamera = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Camera not available on web", "Please use the gallery option.");
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to scan problems. Please enable it in Settings.",
          [{ text: "OK" }]
        );
        return;
      }
    }
    setMode("camera");
    setIsCameraActive(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
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

  // --- Gallery ---
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
      setMode("preview");
      solveMutation.reset();
    }
  };

  // --- Solve ---
  const handleSolve = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
      });
    } catch (_) {
      setIsProcessing(false);
      Alert.alert("Error", "Failed to process image. Please try again.");
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setMode("picker");
    solveMutation.reset();
  };

  // ===== CAMERA VIEW (native only) =====
  if (mode === "camera" && Platform.OS !== "web" && CameraView) {
    return (
      <View style={styles.cameraContainer}>
        {isCameraActive && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />
        )}
        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          <TouchableOpacity
            onPress={() => { setMode("picker"); setIsCameraActive(false); }}
            style={styles.cameraTopBtn}
          >
            <IconSymbol size={22} name="xmark" color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Scan Problem</Text>
          <TouchableOpacity
            onPress={() => setFacing(f => f === "back" ? "front" : "back")}
            style={styles.cameraTopBtn}
          >
            <IconSymbol size={22} name="arrow.triangle.2.circlepath.camera" color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Viewfinder corners */}
        <View style={styles.viewfinderGuide}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.cameraHint}>Position the problem within the frame</Text>
        {/* Shutter */}
        <View style={styles.shutterRow}>
          <TouchableOpacity onPress={takePicture} style={styles.shutterBtn} activeOpacity={0.8}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
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
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
            <TouchableOpacity
              onPress={handleClear}
              style={[styles.clearOverlay, { backgroundColor: `${colors.error}E0` }]}
            >
              <IconSymbol size={16} name="xmark" color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {solveMutation.isError && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
              <IconSymbol size={16} name="exclamationmark.triangle.fill" color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                Failed to analyze the image. Please try a clearer photo.
              </Text>
            </View>
          )}

          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT HINT (OPTIONAL)</Text>
            <Text style={[styles.sectionHint, { color: colors.muted }]}>Helps the AI give a more accurate answer.</Text>
            <SubjectPicker value={selectedSubject} onChange={setSelectedSubject} showAll />
          </View>

          <TouchableOpacity
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
                <ActivityIndicator color="#FFFFFF" size="small" />
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

          <TouchableOpacity
            onPress={handleClear}
            style={[styles.retakeBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <IconSymbol size={18} name="camera.fill" color={colors.muted} />
            <Text style={[styles.retakeBtnText, { color: colors.muted }]}>Take Another Photo</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ===== PICKER VIEW (default) =====
  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Scan Problem</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Take a photo or upload an image
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Camera Button — native only */}
        {Platform.OS !== "web" && (
          <TouchableOpacity
            onPress={openCamera}
            style={[styles.uploadArea, { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }]}
            activeOpacity={0.8}
          >
            <View style={[styles.uploadIcon, { backgroundColor: `${colors.primary}20` }]}>
              <IconSymbol size={40} name="camera.fill" color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Tap to Take a Photo</Text>
            <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>
              Works with handwritten and printed problems
            </Text>
          </TouchableOpacity>
        )}

        {Platform.OS !== "web" && (
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.muted }]}>or</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        )}

        {/* Gallery Button */}
        <TouchableOpacity
          onPress={pickFromGallery}
          style={[styles.galleryBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <IconSymbol size={22} name="photo.on.rectangle" color={colors.primary} />
          <Text style={[styles.galleryBtnText, { color: colors.foreground }]}>Choose from Gallery</Text>
          <IconSymbol size={16} name="chevron.right" color={colors.muted} />
        </TouchableOpacity>

        {/* Tips */}
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

        {/* Subject Hint */}
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>SUBJECT HINT (OPTIONAL)</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Helps the AI give a more accurate answer. Leave blank for auto-detect.</Text>
          <SubjectPicker value={selectedSubject} onChange={setSelectedSubject} showAll />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, letterSpacing: 0.5 },
  sectionHint: { fontSize: 13, marginBottom: 10, lineHeight: 18 },

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
    position: "absolute", bottom: "22%", left: 0, right: 0, textAlign: "center",
    color: "rgba(255,255,255,0.8)", fontSize: 14, zIndex: 10,
  },
  shutterRow: { position: "absolute", bottom: 48, left: 0, right: 0, alignItems: "center", zIndex: 10 },
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 3, borderColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" },

  // Picker
  uploadArea: { borderWidth: 2, borderStyle: "dashed", borderRadius: 24, padding: 40, alignItems: "center", marginBottom: 16 },
  uploadIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  uploadTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  uploadSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 12 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: "600" },
  galleryBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, marginBottom: 20 },
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
});
