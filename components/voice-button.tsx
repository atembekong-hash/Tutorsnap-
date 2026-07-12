/**
 * VoiceButton — a mic button that records audio and returns a transcript.
 * Shows animated pulse while recording, spinner while processing.
 */
import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as H from "@/lib/haptics";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  size?: number;
}

export function VoiceButton({ onTranscript, size = 44 }: VoiceButtonProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const { status, isRecording, startRecording, stopRecording, reset } =
    useVoiceRecorder(onTranscript);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop.current?.stop();
    };
  }, [isRecording, pulseAnim]);

  // Auto-reset error after 2s
  useEffect(() => {
    if (status === "error") {
      const t = setTimeout(reset, 2000);
      return () => clearTimeout(t);
    }
  }, [status, reset]);

  const handlePress = async () => {
    H.impactMedium();
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const isProcessing = status === "processing" || status === "requesting";
  const isError = status === "error";

  const bgColor = isRecording
    ? colors.error
    : isError
    ? `${colors.error}30`
    : `${colors.primary}15`;

  const iconColor = isRecording
    ? "#FFFFFF"
    : isError
    ? colors.error
    : colors.primary;

  return (
    <TouchableOpacity
      accessibilityLabel={isRecording ? "Stop recording" : isProcessing ? "Processing voice input" : "Start voice input"}
      accessibilityRole="button"
      accessibilityState={{ disabled: isProcessing, selected: isRecording }}
      onPress={handlePress}
      disabled={isProcessing}
      activeOpacity={0.8}
      style={{ width: size, height: size }}
    >
      <Animated.View
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <IconSymbol
            size={size * 0.45}
            name={isRecording ? "stop.fill" : "mic.fill"}
            color={iconColor}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
});
