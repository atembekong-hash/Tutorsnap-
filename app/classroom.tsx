/**
 * Classroom Route Redirect
 *
 * The full classroom experience lives in the Classroom tab (app/(tabs)/classroom.tsx).
 * This screen simply redirects there so that any push("/classroom") from Settings
 * lands on the complete feature set (leaderboard, analytics, homework, etc.).
 */
import { Redirect } from "expo-router";

export default function ClassroomRedirect() {
  return <Redirect href="/(tabs)/classroom" />;
}
