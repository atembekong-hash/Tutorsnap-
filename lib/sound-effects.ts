/**
 * Sound effects manager for screen transitions.
 * Provides subtle audio cues for navigation with optional toggle in settings.
 * Uses Web Audio API (built-in, no external dependencies).
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOUND_ENABLED_KEY = "@tutorsnap/soundEffectsEnabled";

// Web Audio API context for generating simple beep sounds
let audioContext: AudioContext | null = null;

/**
 * Initialize Web Audio API context (web only)
 */
function initWebAudio() {
  if (Platform.OS === "web" && !audioContext) {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    } catch (e) {
      console.warn("Web Audio API not available");
    }
  }
}

/**
 * Play a subtle transition sound using Web Audio API
 */
function playWebTransitionSound() {
  if (!audioContext) return;

  try {
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    // Subtle rising tone: 300Hz -> 400Hz over 100ms
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    // Fade out quickly
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    console.warn("Failed to play transition sound:", e);
  }
}

/**
 * Check if sound effects are enabled
 */
export async function isSoundEffectsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    return value !== "false"; // Default to true
  } catch {
    return true;
  }
}

/**
 * Toggle sound effects setting
 */
export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? "true" : "false");
  } catch (e) {
    console.warn("Failed to save sound effects setting:", e);
  }
}

/**
 * Play transition sound if enabled
 */
export async function playTransitionSound(): Promise<void> {
  const enabled = await isSoundEffectsEnabled();
  if (!enabled) return;

  if (Platform.OS === "web") {
    initWebAudio();
    playWebTransitionSound();
  }
  // Native platforms: sound effects not available without expo-av
  // Users can still toggle the setting, but sounds won't play on native
}

/**
 * Play a subtle "pop" sound for button taps
 */
export async function playTapSound(): Promise<void> {
  const enabled = await isSoundEffectsEnabled();
  if (!enabled) return;

  if (Platform.OS === "web") {
    initWebAudio();
    if (audioContext) {
      try {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        // Quick beep: 500Hz
        osc.frequency.setValueAtTime(500, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (e) {
        console.warn("Failed to play tap sound:", e);
      }
    }
  }
}
