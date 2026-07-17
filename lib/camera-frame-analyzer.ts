/**
 * Real-time camera frame analysis for intelligent auto-capture.
 * Analyzes focus, brightness, contrast, and motion to determine capture readiness.
 */

export interface FrameQualityMetrics {
  focusScore: number;      // 0-100: edge density, texture variance
  brightnessScore: number; // 0-100: histogram distribution
  contrastScore: number;   // 0-100: dynamic range
  motionScore: number;     // 0-100: frame-to-frame stability (100 = no motion)
  overallScore: number;    // 0-100: weighted average
  isReady: boolean;        // true if all metrics pass threshold
}

interface FrameHistory {
  brightness: number[];
  motion: number[];
  timestamp: number;
}

class CameraFrameAnalyzer {
  private frameHistory: FrameHistory = {
    brightness: [],
    motion: [],
    timestamp: Date.now(),
  };

  private previousFrame: Uint8ClampedArray | null = null;
  private readonly maxHistorySize = 10;
  private readonly focusThreshold = 70;
  private readonly brightnessThreshold = 70;
  private readonly contrastThreshold = 60;
  private readonly motionThreshold = 70; // 70 = low motion (stable)
  private readonly stabilityWindow = 500; // ms

  /**
   * Analyze a camera frame and return quality metrics.
   * Expects raw pixel data (RGBA or grayscale).
   */
  analyzeFrame(frameData: Uint8ClampedArray, width: number, height: number): FrameQualityMetrics {
    const grayscale = this.toGrayscale(frameData);

    // Calculate individual metrics
    const focusScore = this.calculateFocusScore(grayscale, width, height);
    const brightnessScore = this.calculateBrightnessScore(grayscale);
    const contrastScore = this.calculateContrastScore(grayscale);
    const motionScore = this.calculateMotionScore(grayscale);

    // Update history
    this.frameHistory.brightness.push(brightnessScore);
    this.frameHistory.motion.push(motionScore);
    if (this.frameHistory.brightness.length > this.maxHistorySize) {
      this.frameHistory.brightness.shift();
      this.frameHistory.motion.shift();
    }
    this.frameHistory.timestamp = Date.now();

    // Store for next frame's motion calculation
    this.previousFrame = grayscale;

    // Calculate weighted overall score
    const overallScore =
      focusScore * 0.35 +
      brightnessScore * 0.25 +
      contrastScore * 0.20 +
      motionScore * 0.20;

    // Determine if ready to capture
    const isReady =
      focusScore >= this.focusThreshold &&
      brightnessScore >= this.brightnessThreshold &&
      contrastScore >= this.contrastThreshold &&
      motionScore >= this.motionThreshold &&
      this.isStable();

    return {
      focusScore: Math.round(focusScore),
      brightnessScore: Math.round(brightnessScore),
      contrastScore: Math.round(contrastScore),
      motionScore: Math.round(motionScore),
      overallScore: Math.round(overallScore),
      isReady,
    };
  }

  /**
   * Convert RGBA or RGB frame to grayscale.
   */
  private toGrayscale(frameData: Uint8ClampedArray): Uint8ClampedArray {
    const grayscale = new Uint8ClampedArray(frameData.length / 4);
    for (let i = 0; i < frameData.length; i += 4) {
      // Standard luminance formula
      grayscale[i / 4] = Math.round(
        0.299 * frameData[i] +
        0.587 * frameData[i + 1] +
        0.114 * frameData[i + 2]
      );
    }
    return grayscale;
  }

  /**
   * Calculate focus score based on edge density and texture variance.
   * High edge density = sharp, in-focus image.
   */
  private calculateFocusScore(grayscale: Uint8ClampedArray, width: number, height: number): number {
    let edgeCount = 0;
    const sampleSize = Math.min(width * height, 10000); // Sample to avoid slowdown
    const step = Math.max(1, Math.floor((width * height) / sampleSize));

    for (let i = 0; i < grayscale.length - width; i += step) {
      const dx = Math.abs(grayscale[i + 1] - grayscale[i]);
      const dy = Math.abs(grayscale[i + width] - grayscale[i]);
      if (dx > 20 || dy > 20) edgeCount++;
    }

    const edgeDensity = (edgeCount / (sampleSize / step)) * 100;
    return Math.min(100, edgeDensity * 1.5); // Scale to 0-100
  }

  /**
   * Calculate brightness score.
   * Optimal range: 40-200 (out of 255). Score decreases outside this range.
   */
  private calculateBrightnessScore(grayscale: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < grayscale.length; i++) {
      sum += grayscale[i];
    }
    const avgBrightness = sum / grayscale.length;

    // Optimal range: 60-180
    if (avgBrightness < 40) return (avgBrightness / 40) * 50; // Too dark
    if (avgBrightness < 60) return 50 + ((avgBrightness - 40) / 20) * 25;
    if (avgBrightness <= 180) return 100; // Optimal
    if (avgBrightness < 220) return 100 - ((avgBrightness - 180) / 40) * 30;
    return Math.max(0, 70 - ((avgBrightness - 220) / 35) * 70); // Too bright
  }

  /**
   * Calculate contrast score based on dynamic range.
   * High contrast = good visibility of text/content.
   */
  private calculateContrastScore(grayscale: Uint8ClampedArray): number {
    let min = 255;
    let max = 0;
    const sampleSize = Math.min(grayscale.length, 5000);
    const step = Math.max(1, Math.floor(grayscale.length / sampleSize));

    for (let i = 0; i < grayscale.length; i += step) {
      if (grayscale[i] < min) min = grayscale[i];
      if (grayscale[i] > max) max = grayscale[i];
    }

    const dynamicRange = max - min;
    // Optimal range: 100-200
    if (dynamicRange < 50) return (dynamicRange / 50) * 30;
    if (dynamicRange < 100) return 30 + ((dynamicRange - 50) / 50) * 40;
    if (dynamicRange <= 200) return 100;
    return Math.max(50, 100 - ((dynamicRange - 200) / 55) * 50);
  }

  /**
   * Calculate motion score based on frame-to-frame difference.
   * High score = stable (low motion). Low score = blurry (high motion).
   */
  private calculateMotionScore(grayscale: Uint8ClampedArray): number {
    if (!this.previousFrame || this.previousFrame.length !== grayscale.length) {
      return 100; // Can't compare first frame
    }

    let diffSum = 0;
    const sampleSize = Math.min(grayscale.length, 5000);
    const step = Math.max(1, Math.floor(grayscale.length / sampleSize));

    for (let i = 0; i < grayscale.length; i += step) {
      diffSum += Math.abs(grayscale[i] - this.previousFrame[i]);
    }

    const avgDiff = diffSum / (sampleSize / step);
    // Normalize to 0-100 (0 = high motion, 100 = no motion)
    // Threshold: >30 avg diff = motion detected
    return Math.max(0, 100 - (avgDiff / 30) * 100);
  }

  /**
   * Check if metrics have been stable for the required window.
   */
  private isStable(): boolean {
    if (this.frameHistory.motion.length < 3) return false;

    const recentMotion = this.frameHistory.motion.slice(-3);
    const avgMotion = recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;

    return avgMotion >= this.motionThreshold;
  }

  /**
   * Reset analyzer state (e.g., when switching cameras).
   */
  reset(): void {
    this.frameHistory = { brightness: [], motion: [], timestamp: Date.now() };
    this.previousFrame = null;
  }
}

// Singleton instance
let analyzerInstance: CameraFrameAnalyzer | null = null;

export function getCameraFrameAnalyzer(): CameraFrameAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new CameraFrameAnalyzer();
  }
  return analyzerInstance;
}

export function resetCameraFrameAnalyzer(): void {
  if (analyzerInstance) {
    analyzerInstance.reset();
  }
}
