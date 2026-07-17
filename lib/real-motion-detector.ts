/**
 * Real motion detection using device accelerometer and gyroscope
 * Measures actual device movement to determine if camera is stable
 */

import { Accelerometer, Gyroscope } from "expo-sensors";

export interface MotionData {
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  totalMotion: number; // 0-100 (0 = still, 100 = moving fast)
  isStable: boolean; // true if motion below threshold
}

const MOTION_THRESHOLD = 0.5; // m/s² threshold for stability
const ROTATION_THRESHOLD = 0.1; // rad/s threshold for stability

/**
 * Real-time motion monitor using device sensors
 */
export class RealMotionMonitor {
  private accelHistory: Array<{ x: number; y: number; z: number }> = [];
  private gyroHistory: Array<{ x: number; y: number; z: number }> = [];
  private readonly windowSize = 10; // frames to average
  private isListening = false;

  constructor() {
    // Set sensor update intervals for responsiveness
    Accelerometer.setUpdateInterval(100); // 10 FPS
    Gyroscope.setUpdateInterval(100);
  }

  /**
   * Start listening to device motion sensors
   */
  start(onMotionUpdate: (motion: MotionData) => void): () => void {
    if (this.isListening) return () => {};

    this.isListening = true;
    this.accelHistory = [];
    this.gyroHistory = [];

    const accelSubscription = Accelerometer.addListener((data: any) => {
      this.accelHistory.push({
        x: data.x,
        y: data.y,
        z: data.z,
      });

      if (this.accelHistory.length > this.windowSize) {
        this.accelHistory.shift();
      }

      this.updateMotion(onMotionUpdate);
    });

    const gyroSubscription = Gyroscope.addListener((data: any) => {
      this.gyroHistory.push({
        x: data.x,
        y: data.y,
        z: data.z,
      });

      if (this.gyroHistory.length > this.windowSize) {
        this.gyroHistory.shift();
      }

      this.updateMotion(onMotionUpdate);
    });

    // Return unsubscribe function
    return () => {
      this.isListening = false;
      accelSubscription.remove();
      gyroSubscription.remove();
    };
  }

  /**
   * Calculate current motion from sensor data
   */
  private updateMotion(onMotionUpdate: (motion: MotionData) => void): void {
    if (this.accelHistory.length === 0 || this.gyroHistory.length === 0) {
      return;
    }

    // Get latest readings
    const latestAccel = this.accelHistory[this.accelHistory.length - 1];
    const latestGyro = this.gyroHistory[this.gyroHistory.length - 1];

    // Calculate acceleration magnitude (excluding gravity ~9.8 m/s²)
    const accelMagnitude = Math.sqrt(
      latestAccel.x ** 2 + latestAccel.y ** 2 + (latestAccel.z - 9.8) ** 2
    );

    // Calculate rotation magnitude
    const rotationMagnitude = Math.sqrt(
      latestGyro.x ** 2 + latestGyro.y ** 2 + latestGyro.z ** 2
    );

    // Average motion over window
    const avgAccel =
      this.accelHistory.reduce(
        (sum, a) =>
          sum +
          Math.sqrt(a.x ** 2 + a.y ** 2 + (a.z - 9.8) ** 2),
        0
      ) / this.accelHistory.length;

    const avgRotation =
      this.gyroHistory.reduce(
        (sum, g) => sum + Math.sqrt(g.x ** 2 + g.y ** 2 + g.z ** 2),
        0
      ) / this.gyroHistory.length;

    // Normalize to 0-100 scale
    const accelScore = Math.min(100, (avgAccel / MOTION_THRESHOLD) * 100);
    const rotationScore = Math.min(100, (avgRotation / ROTATION_THRESHOLD) * 100);
    const totalMotion = (accelScore + rotationScore) / 2;

    const isStable = avgAccel < MOTION_THRESHOLD && avgRotation < ROTATION_THRESHOLD;

    onMotionUpdate({
      accelerationX: latestAccel.x,
      accelerationY: latestAccel.y,
      accelerationZ: latestAccel.z,
      rotationX: latestGyro.x,
      rotationY: latestGyro.y,
      rotationZ: latestGyro.z,
      totalMotion: Math.round(totalMotion),
      isStable,
    });
  }

  /**
   * Stop listening to sensors
   */
  stop(): void {
    this.isListening = false;
    this.accelHistory = [];
    this.gyroHistory = [];
  }
}
