/**
 * Handles manual capture override and timeout fallback
 * Allows user to force capture if auto-capture doesn't trigger
 */

export interface CaptureTimeoutConfig {
  autoCaptureLockDuration: number; // ms to lock auto-capture after manual capture
  timeoutDuration: number; // ms before allowing manual capture override
  enableTimeoutFallback: boolean; // true to allow manual capture after timeout
}

const DEFAULT_CONFIG: CaptureTimeoutConfig = {
  autoCaptureLockDuration: 2000, // 2 seconds
  timeoutDuration: 10000, // 10 seconds
  enableTimeoutFallback: true,
};

/**
 * Manages capture timeout and manual override logic
 */
export class CaptureTimeoutHandler {
  private config: CaptureTimeoutConfig;
  private timeoutStartTime: number | null = null;
  private lastCaptureTime: number | null = null;
  private isAutoCaptureLocked = false;

  constructor(config: Partial<CaptureTimeoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start timeout timer
   */
  startTimeout(): void {
    this.timeoutStartTime = Date.now();
  }

  /**
   * Check if timeout has elapsed
   */
  isTimeoutElapsed(): boolean {
    if (!this.timeoutStartTime) return false;

    const elapsed = Date.now() - this.timeoutStartTime;
    return elapsed >= this.config.timeoutDuration;
  }

  /**
   * Get remaining time until timeout (in ms)
   */
  getRemainingTime(): number {
    if (!this.timeoutStartTime) return this.config.timeoutDuration;

    const elapsed = Date.now() - this.timeoutStartTime;
    return Math.max(0, this.config.timeoutDuration - elapsed);
  }

  /**
   * Lock auto-capture after manual capture
   */
  lockAutoCapture(): void {
    this.isAutoCaptureLocked = true;
    this.lastCaptureTime = Date.now();

    // Auto-unlock after duration
    setTimeout(() => {
      this.isAutoCaptureLocked = false;
    }, this.config.autoCaptureLockDuration);
  }

  /**
   * Check if auto-capture is currently locked
   */
  isAutoCaptureLocked_(): boolean {
    if (!this.isAutoCaptureLocked) return false;

    if (!this.lastCaptureTime) return false;

    const elapsed = Date.now() - this.lastCaptureTime;
    return elapsed < this.config.autoCaptureLockDuration;
  }

  /**
   * Check if manual capture is allowed
   */
  canManualCapture(): boolean {
    // Always allow manual capture
    return true;
  }

  /**
   * Check if timeout fallback is enabled and elapsed
   */
  shouldEnableTimeoutFallback(): boolean {
    return (
      this.config.enableTimeoutFallback &&
      this.isTimeoutElapsed()
    );
  }

  /**
   * Reset timeout
   */
  resetTimeout(): void {
    this.timeoutStartTime = null;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.timeoutStartTime = null;
    this.lastCaptureTime = null;
    this.isAutoCaptureLocked = false;
  }
}
