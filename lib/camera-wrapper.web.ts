// Camera is not available on web — provide null stubs so imports don't crash
export const CameraView = null;

export function useCameraPermissions(): [{ granted: boolean } | null, () => Promise<{ granted: boolean }>] {
  return [{ granted: false }, async () => ({ granted: false })];
}
