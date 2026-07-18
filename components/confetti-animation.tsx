/**
 * Confetti Animation Component for celebrating tier achievements
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, Dimensions, StyleSheet } from "react-native";

const { width, height } = Dimensions.get("window");

interface ConfettiPiece {
  id: number;
  left: Animated.Value;
  top: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
}

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F"];

export function ConfettiAnimation({ duration = 3000 }: { duration?: number }) {
  const confettiPieces = useRef<ConfettiPiece[]>([]);

  useEffect(() => {
    // Generate confetti pieces
    const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: new Animated.Value(Math.random() * width),
      top: new Animated.Value(-20),
      rotation: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    confettiPieces.current = pieces;

    // Animate each piece
    pieces.forEach((piece) => {
      Animated.sequence([
        Animated.parallel([
          // Fall down
          Animated.timing(piece.top, {
            toValue: height + 100,
            duration,
            useNativeDriver: false,
          }),
          // Rotate
          Animated.timing(piece.rotation, {
            toValue: Math.random() * 720,
            duration,
            useNativeDriver: false,
          }),
          // Fade out
          Animated.timing(piece.opacity, {
            toValue: 0,
            duration: duration * 0.8,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    });
  }, [duration]);

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.current.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confetti,
            {
              left: piece.left,
              top: piece.top,
              opacity: piece.opacity,
              transform: [{ rotate: piece.rotation }],
            },
          ]}
        >
          <View
            style={[
              styles.confettiPiece,
              { backgroundColor: piece.color },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  confetti: {
    position: "absolute",
    width: 10,
    height: 10,
  },
  confettiPiece: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
