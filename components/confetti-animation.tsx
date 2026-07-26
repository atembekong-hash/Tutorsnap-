/**
 * ConfettiAnimation — GPU-accelerated celebration particles
 *
 * Uses Reanimated 4 worklets (runs on the UI thread) for 60fps performance.
 * Replaces the old RN Animated version that used useNativeDriver: false.
 *
 * Shapes: circles, squares, diamonds — randomised per particle.
 * Physics: gravity + horizontal drift + rotation + fade-out.
 */
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

const COLORS = [
  "#FF6B6B", "#FF8E53", "#FFC300", "#4ECDC4",
  "#45B7D1", "#A78BFA", "#F472B6", "#34D399",
  "#FBBF24", "#60A5FA",
];

type Shape = "circle" | "square" | "diamond";

interface ParticleConfig {
  id: number;
  startX: number;
  color: string;
  shape: Shape;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  rotation: number;
}

function buildParticles(count: number): ParticleConfig[] {
  const shapes: Shape[] = ["circle", "square", "diamond"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startX: Math.random() * W,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 600,
    duration: 1800 + Math.random() * 1200,
    driftX: (Math.random() - 0.5) * 120,
    rotation: Math.random() * 720 - 360,
  }));
}

const PARTICLES_70 = buildParticles(70);

function Particle({ cfg }: { cfg: ParticleConfig }) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const easing = Easing.in(Easing.quad);

    opacity.value = withDelay(
      cfg.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: cfg.duration * 0.55, easing }),
      ),
    );
    translateY.value = withDelay(
      cfg.delay,
      withTiming(H + 60, { duration: cfg.duration, easing }),
    );
    translateX.value = withDelay(
      cfg.delay,
      withTiming(cfg.driftX, { duration: cfg.duration }),
    );
    rotate.value = withDelay(
      cfg.delay,
      withTiming(cfg.rotation, { duration: cfg.duration }),
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(translateX);
      cancelAnimation(rotate);
      cancelAnimation(opacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const extraRotate = cfg.shape === "diamond" ? 45 : 0;
    return {
      transform: [
        { translateX: cfg.startX + translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value + extraRotate}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const shapeStyle = {
    width: cfg.size,
    height: cfg.size,
    backgroundColor: cfg.color,
    borderRadius: cfg.shape === "circle" ? cfg.size / 2 : 2,
  };

  return (
    <Animated.View style={[styles.particle, style]}>
      <View style={shapeStyle} />
    </Animated.View>
  );
}

interface ConfettiAnimationProps {
  count?: number;
  /** Kept for API compatibility — not used (duration is per-particle). */
  duration?: number;
}

export function ConfettiAnimation({ count = 70 }: ConfettiAnimationProps) {
  const particles = count === 70 ? PARTICLES_70 : buildParticles(count);
  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((cfg) => (
        <Particle key={cfg.id} cfg={cfg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 999,
  },
  particle: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
