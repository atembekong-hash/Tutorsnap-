/**
 * Real-time frame stability detection for camera scanning
 * Detects focus quality, motion, and brightness to determine optimal capture moment
 */

export interface FrameStability {
  focusQuality: number; // 0-100
  motionLevel: number; // 0-100 (lower is better)
  brightness: number; // 0-100
  isStable: boolean; // true if all metrics meet thresholds
  stability: number; // 0-100 overall score
}

const FOCUS_THRESHOLD = 70;
const MOTION_THRESHOLD = 30;
const BRIGHTNESS_MIN = 30;
const BRIGHTNESS_MAX = 95;
const STABILITY_THRESHOLD = 75;

/**
 * Analyze frame stability from camera data
 * In production, this would use device sensors or ML models
 * For now, returns simulated but realistic values
 */
export function analyzeFrameStability(): FrameStability {
  // Simulated frame analysis
  // In production, this would integrate with:
  // - Device accelerometer (motion detection)
  // - Camera focus metrics (if available)
  // - Image brightness analysis
  // - Deep learning focus quality model

  const focusQuality = 65 + Math.random() * 30; // 65-95
  const motionLevel = Math.random() * 40; // 0-40
  const brightness = 50 + Math.random() * 40; // 50-90

  const focusScore = Math.min(100, focusQuality);
  const motionScore = Math.max(0, 100 - motionLevel);
  const brightnessScore =
    brightness >= BRIGHTNESS_MIN && brightness <= BRIGHTNESS_MAX ? 100 : 50;

  const stability = (focusScore + motionScore + brightnessScore) / 3;

  return {
    focusQuality: focusScore,
    motionLevel,
    brightness,
    isStable:
      focusScore >= FOCUS_THRESHOLD &&
      motionLevel <= MOTION_THRESHOLD &&
      brightness >= BRIGHTNESS_MIN &&
      brightness <= BRIGHTNESS_MAX,
    stability: Math.round(stability),
  };
}

/**
 * Monitor stability over time and trigger capture when stable
 */
export class StabilityMonitor {
  private stabilityHistory: FrameStability[] = [];
  private readonly windowSize = 5; // frames to average
  private readonly requiredStableFrames = 3;

  addFrame(frame: FrameStability): boolean {
    this.stabilityHistory.push(frame);

    // Keep only recent frames
    if (this.stabilityHistory.length > this.windowSize) {
      this.stabilityHistory.shift();
    }

    // Check if stable for required duration
    return this.isReadyToCapture();
  }

  private isReadyToCapture(): boolean {
    if (this.stabilityHistory.length < this.requiredStableFrames) {
      return false;
    }

    // Check last N frames
    const recentFrames = this.stabilityHistory.slice(-this.requiredStableFrames);
    return recentFrames.every((f) => f.isStable);
  }

  getAverageStability(): number {
    if (this.stabilityHistory.length === 0) return 0;
    const sum = this.stabilityHistory.reduce((acc, f) => acc + f.stability, 0);
    return Math.round(sum / this.stabilityHistory.length);
  }

  reset(): void {
    this.stabilityHistory = [];
  }
}
