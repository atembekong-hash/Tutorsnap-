/**
 * Torch/flashlight handler for low-light camera capture
 * Integrates with native camera APIs to control device flashlight
 */

export type TorchMode = "off" | "on" | "auto";

export interface TorchState {
  isSupported: boolean;
  isEnabled: boolean;
  mode: TorchMode;
  brightness: number; // 0-100
}

/**
 * Torch manager for device flashlight control
 */
export class TorchManager {
  private cameraRef: any;
  private torchEnabled = false;
  private torchMode: TorchMode = "off";

  constructor(cameraRef: any) {
    this.cameraRef = cameraRef;
  }

  /**
   * Check if torch is supported on device
   */
  async isSupported(): Promise<boolean> {
    try {
      if (!this.cameraRef?.current?.isTorchAvailable) {
        return false;
      }

      const available = await this.cameraRef.current.isTorchAvailable();
      return available === true;
    } catch {
      return false;
    }
  }

  /**
   * Enable torch/flashlight
   */
  async enableTorch(): Promise<boolean> {
    try {
      if (!this.cameraRef?.current?.setTorchMode) {
        return false;
      }

      await this.cameraRef.current.setTorchMode("on");
      this.torchEnabled = true;
      this.torchMode = "on";
      return true;
    } catch (error) {
      console.error("Failed to enable torch:", error);
      return false;
    }
  }

  /**
   * Disable torch/flashlight
   */
  async disableTorch(): Promise<boolean> {
    try {
      if (!this.cameraRef?.current?.setTorchMode) {
        return false;
      }

      await this.cameraRef.current.setTorchMode("off");
      this.torchEnabled = false;
      this.torchMode = "off";
      return true;
    } catch (error) {
      console.error("Failed to disable torch:", error);
      return false;
    }
  }

  /**
   * Toggle torch on/off
   */
  async toggleTorch(): Promise<boolean> {
    if (this.torchEnabled) {
      return this.disableTorch();
    } else {
      return this.enableTorch();
    }
  }

  /**
   * Set torch mode (off, on, auto)
   */
  async setTorchMode(mode: TorchMode): Promise<boolean> {
    try {
      if (!this.cameraRef?.current?.setTorchMode) {
        return false;
      }

      await this.cameraRef.current.setTorchMode(mode);
      this.torchMode = mode;
      this.torchEnabled = mode === "on" || mode === "auto";
      return true;
    } catch (error) {
      console.error("Failed to set torch mode:", error);
      return false;
    }
  }

  /**
   * Get current torch state
   */
  async getState(): Promise<TorchState> {
    const supported = await this.isSupported();

    return {
      isSupported: supported,
      isEnabled: this.torchEnabled,
      mode: this.torchMode,
      brightness: this.torchEnabled ? 100 : 0,
    };
  }

  /**
   * Enable auto torch (turn on in low light)
   */
  async enableAutoTorch(): Promise<boolean> {
    return this.setTorchMode("auto");
  }

  /**
   * Disable auto torch
   */
  async disableAutoTorch(): Promise<boolean> {
    return this.setTorchMode("off");
  }
}

/**
 * Detect if environment is low-light based on brightness metrics
 */
export function isLowLight(brightness: number): boolean {
  // Brightness < 30 is considered low-light
  return brightness < 30;
}

/**
 * Recommend torch mode based on brightness
 */
export function recommendTorchMode(brightness: number): TorchMode {
  if (isLowLight(brightness)) {
    return "on";
  }
  if (brightness < 50) {
    return "auto";
  }
  return "off";
}
