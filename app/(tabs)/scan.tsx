import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { type SubjectId } from "@/lib/subjects";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { CameraView, useCameraPermissions } from "@/lib/camera-wrapper";
import { loadGlobalGrade } from "@/lib/grade-levels";

// How long (ms) to wait after screen focus before auto-capturing
const AUTO_CAPTURE_DELAY = 1500;

type ScanMode = "camera" | "solving" | "web-picker";

function ScanScreenContent() {
  const colors = useColors();
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  const [mode, setMode] = useState<ScanMode>(Platform.OS !== "web" ? "camera" : "web-picker");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(Platform.OS !== "web");
  const [facing] = useState<"back" | "front">("back");
  const [torchOn, setTorchOn] = useState(false);
  const { isOnline } = useNetworkStatus();
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [selectedSubject] = useState<SubjectId | null>(null);

  // Countdown state for auto-capture
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCaptureFiredRef = useRef(false);

  // Pulse animation for the shutter ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [permission, requestPermission] = useCameraPermissions();

  // Scan history thumbnails (last 3 images with imageUri)
  const [scanThumbnails, setScanThumbnails] = useState<{ uri: string; data: string }[]>([]);

  const loadScanThumbnails = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem("math_history");
      const history: HistoryItem[] = raw ? JSON.parse(raw) : [];
      const withImages = history
        .filter((h) => h.imageUri)
        .slice(0, 3)
        .map((h) => ({ uri: h.imageUri!, data: JSON.stringify(h) }));
      setScanThumbnails(withImages);
    } catch (_) {}
  }, []);

  // Load global grade default on mount
  useEffect(() => {
    loadGlobalGrade().then((g: string | null) => { if (g) setGradeLevel(g); });
  }, []);

  // Request camera permission on mount (native only)
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!permission?.granted) requestPermission();
  }, []);

  // ─── Solve mutation ───────────────────────────────────────────────────────────
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
      } catch (_) { /* non-critical */ }
      router.push({ pathname: "/solution", params: { data: JSON.stringify(data) } });
    },
    onError: (err) => {
      H.notificationError();
      // Show a specific image quality hint rather than a generic error
      const isJsonError = err.message?.toLowerCase().includes("json") || err.message?.toLowerCase().includes("parse");
      const hint = isJsonError
        ? "The AI had trouble reading the image format. Try better lighting, hold the camera closer, or crop to just the question."
        : (err.message || "Try better lighting, hold the camera closer, or crop to just the question.");
      Alert.alert(
        "Couldn't solve that",
        hint,
        [
          { text: "Try Again", onPress: () => resetToCamera() },
          { text: "Cancel", style: "cancel" },
        ]
      );
    },
  });

  // ─── Submit image to solver ───────────────────────────────────────────────────
  const solveImage = useCallback(async (uri: string, mimeType?: string) => {
    if (!isOnline) {
      Alert.alert("No Internet", "You need an internet connection to solve problems.");
      resetToCamera();
      return;
    }
    setMode("solving");
    setSelectedImage(uri);
    try {
      let base64: string;
      // Detect MIME type from URI extension if not provided
      const ext = uri.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
      const resolvedMime = mimeType ??
        (ext === "png" ? "image/png" :
         ext === "gif" ? "image/gif" :
         ext === "webp" ? "image/webp" : "image/jpeg");

      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      solveMutation.mutate({
        imageBase64: base64,
        mimeType: resolvedMime,
        subject: selectedSubject ?? "other",
        gradeLevel: gradeLevel ?? undefined,
      });
    } catch (_) {
      Alert.alert("Error", "Failed to read image. Please try again.");
      resetToCamera();
    }
  }, [isOnline, selectedSubject, gradeLevel]);

  // ─── Auto-capture logic ───────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (autoCaptureFiredRef.current) return;
    autoCaptureFiredRef.current = true;
    setCountdown(2);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    countdownTimerRef.current = setTimeout(() => {
      setCountdown(1);
      countdownTimerRef.current = setTimeout(async () => {
        setCountdown(null);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        if (!cameraRef.current) return;
        try {
          H.impactMedium();
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.85,
            base64: false,
            skipProcessing: false,
          });
          if (photo?.uri) {
            setIsCameraActive(false);
            await solveImage(photo.uri);
          }
        } catch (_) {
          Alert.alert("Error", "Failed to take photo. Please try again.");
          resetToCamera();
        }
      }, 1000);
    }, 1000);
  }, [solveImage]);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdown(null);
    autoCaptureFiredRef.current = false;
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, []);

  const resetToCamera = useCallback(() => {
    solveMutation.reset();
    setSelectedImage(null);
    setMode(Platform.OS !== "web" ? "camera" : "web-picker");
    setIsCameraActive(Platform.OS !== "web");
    clearCountdown();
  }, [clearCountdown]);

  // Load thumbnails when screen gains focus
  useFocusEffect(useCallback(() => { loadScanThumbnails(); }, [loadScanThumbnails]));

  // Manage camera active state and trigger auto-capture when screen gains focus
  useFocusEffect(
    useCallback(() => {
      autoCaptureFiredRef.current = false;
      if (Platform.OS !== "web" && mode === "camera") {
        setIsCameraActive(true);
        // Give the camera viewfinder time to warm up, then start countdown
        const warmup = setTimeout(() => {
          if (permission?.granted) startCountdown();
        }, 600);
        return () => {
          clearTimeout(warmup);
          setIsCameraActive(false);
          clearCountdown();
        };
      }
      return () => {
        setIsCameraActive(false);
        clearCountdown();
      };
    }, [mode, permission?.granted, startCountdown, clearCountdown])
  );

  // When permission resolves to granted, activate camera and start countdown
  useEffect(() => {
    if (Platform.OS !== "web" && permission?.granted && mode === "camera" && !autoCaptureFiredRef.current) {
      setIsCameraActive(true);
      const warmup = setTimeout(() => startCountdown(), 600);
      return () => clearTimeout(warmup);
    }
  }, [permission?.granted, mode]);

  // ─── Pick from gallery ────────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    clearCountdown();
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
      setIsCameraActive(false);
      const asset = result.assets[0];
      // Pass the actual MIME type from the picker (e.g. image/png, image/jpeg)
      await solveImage(asset.uri, asset.mimeType ?? undefined);
    }
  };

  // ─── Manual shutter tap ───────────────────────────────────────────────────────
  const takePictureNow = async () => {
    clearCountdown();
    if (!cameraRef.current) return;
    try {
      H.impactMedium();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setIsCameraActive(false);
        await solveImage(photo.uri);
      }
    } catch (_) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  // ===== SOLVING OVERLAY =====
  if (mode === "solving") {
    return (
      <View style={[styles.solvingContainer, { backgroundColor: colors.background }]}>
        {selectedImage && (
          <Image source={{ uri: selectedImage }} style={styles.solvingBgImage} resizeMode="cover" blurRadius={4} />
        )}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.65)" }]} />
        <View style={styles.solvingContent}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.solvingTitle}>Solving…</Text>
          <Text style={styles.solvingSubtitle}>Reading your problem and building the solution</Text>
        </View>
        <TouchableOpacity
          onPress={resetToCamera}
          style={styles.solvingCancelBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.solvingCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ===== CAMERA VIEW (native only) =====
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
            enableTorch={torchOn}
          />
        )}

        {/* Top bar */}
        <View style={styles.cameraTopBar}>
          {/* Torch toggle */}
          <TouchableOpacity
            onPress={() => { H.impactLight(); setTorchOn(t => !t); }}
            style={[styles.cameraTopBtn, torchOn && styles.cameraTopBtnActive]}
            accessibilityLabel={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
            activeOpacity={0.75}
          >
            <IconSymbol size={20} name={torchOn ? "bolt.fill" : "bolt.slash.fill"} color={torchOn ? "#FFD700" : "#FFFFFF"} />
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

        {/* Countdown badge */}
        {countdown !== null && (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}

        <Text style={styles.cameraHint}>
          {countdown !== null
            ? `Auto-capturing in ${countdown}…`
            : "Position the problem within the frame"}
        </Text>

        {/* Scan history thumbnails */}
        {scanThumbnails.length > 0 && (
          <View style={styles.thumbnailStrip}>
            {scanThumbnails.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  H.impactLight();
                  try {
                    const parsed = JSON.parse(item.data);
                    router.push({ pathname: "/solution", params: { data: JSON.stringify(parsed) } });
                  } catch (_) {}
                }}
                style={styles.thumbnailBtn}
                activeOpacity={0.75}
              >
                <Image source={{ uri: item.uri }} style={styles.thumbnailImg} resizeMode="cover" />
                <View style={styles.thumbnailOverlay}>
                  <IconSymbol size={12} name="wand.and.stars" color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom controls: Gallery | Shutter | Spacer */}
        <View style={styles.bottomControls}>
          {/* Gallery button */}
          <TouchableOpacity onPress={pickFromGallery} style={styles.galleryCircleBtn} activeOpacity={0.8}>
            <IconSymbol size={26} name="photo.on.rectangle" color="#FFFFFF" />
            <Text style={styles.galleryCircleLabel}>Gallery</Text>
          </TouchableOpacity>

          {/* Shutter — manual override */}
          <TouchableOpacity onPress={takePictureNow} activeOpacity={0.8}>
            <Animated.View style={[styles.shutterBtn, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.shutterInner} />
            </Animated.View>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.galleryCircleBtn} />
        </View>
      </View>
    );
  }

  // ===== WEB FALLBACK: Gallery-only picker =====
  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Scan Problem</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Upload an image to solve instantly
        </Text>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <TouchableOpacity
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
      </View>
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
  cameraTopBtnActive: {
    backgroundColor: "rgba(255,215,0,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.6)",
  },
  cameraTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  viewfinderGuide: { position: "absolute", top: "25%", left: "10%", right: "10%", bottom: "25%", zIndex: 5 },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FFFFFF" },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  countdownBadge: {
    position: "absolute", top: "20%", alignSelf: "center", zIndex: 20,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  countdownText: { color: "#FFFFFF", fontSize: 32, fontWeight: "800" },
  cameraHint: {
    position: "absolute", bottom: "18%", left: 0, right: 0, textAlign: "center",
    color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600", zIndex: 10,
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

  // Solving overlay
  solvingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  solvingBgImage: { ...StyleSheet.absoluteFillObject as any, width: "100%", height: "100%" },
  solvingContent: { alignItems: "center", gap: 16, paddingHorizontal: 32 },
  solvingTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  solvingSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  solvingCancelBtn: {
    position: "absolute", bottom: 60,
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 24, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  solvingCancelText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },

  // Scan history thumbnail strip
  thumbnailStrip: {
    position: "absolute", bottom: 148, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 10,
    zIndex: 10, paddingHorizontal: 24,
  },
  thumbnailBtn: {
    width: 56, height: 56, borderRadius: 10, overflow: "hidden",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.6)",
  },
  thumbnailImg: { width: "100%", height: "100%" },
  thumbnailOverlay: {
    position: "absolute", bottom: 3, right: 3,
    backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6,
    padding: 2,
  },

  // Gallery button (web)
  galleryBtn: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 2, gap: 12 },
  galleryBtnText: { flex: 1, fontSize: 16, fontWeight: "600" },
  tipsBox: { padding: 16, borderRadius: 16, borderWidth: 1 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 15, fontWeight: "700" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  tipDot: { width: 6, height: 6, borderRadius: 3 },
  tipText: { fontSize: 14, lineHeight: 20, flex: 1 },
});
