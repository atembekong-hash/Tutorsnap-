import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  // Navigation
  "house.fill": "home",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.up": "expand-less",
  "chevron.down": "expand-more",
  "arrow.left": "arrow-back",
  "paperplane.fill": "send",
  // Math
  "sum": "functions",
  "function": "functions",
  "x.squareroot": "calculate",
  "triangle": "change-history",
  "chart.line.uptrend.xyaxis": "trending-up",
  "chart.bar.fill": "bar-chart",
  "brain.head.profile": "psychology",
  "wand.and.stars": "auto-fix-high",
  "bolt.fill": "bolt",
  // Camera / Media
  "camera.fill": "camera-alt",
  "photo.on.rectangle": "photo-library",
  // UI
  "magnifyingglass": "search",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "clock.fill": "history",
  "list.bullet": "list",
  "lightbulb.fill": "lightbulb",
  "checkmark.circle.fill": "check-circle",
  "exclamationmark.triangle.fill": "warning",
  "trash.fill": "delete",
  "square.and.arrow.up": "share",
  "doc.on.doc": "content-copy",
  "pencil.and.list.clipboard": "assignment",
  "bubble.left.fill": "chat-bubble",
  "eye.fill": "visibility",
  // Code
  "chevron.left.forwardslash.chevron.right": "code",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
