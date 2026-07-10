// This file is the TypeScript base declaration for the platform-specific camera wrapper.
// Metro will resolve to camera-wrapper.native.ts on iOS/Android and camera-wrapper.web.ts on web.
// TypeScript uses this file for type checking.

import type { ComponentType, RefObject } from "react";
import type { ViewStyle, StyleProp } from "react-native";

export interface CameraViewProps {
  style?: StyleProp<ViewStyle>;
  facing?: "back" | "front";
  ref?: RefObject<any>;
  [key: string]: any;
}

export declare const CameraView: ComponentType<CameraViewProps> | null;

export declare function useCameraPermissions(): [
  { granted: boolean } | null,
  () => Promise<{ granted: boolean }>
];
