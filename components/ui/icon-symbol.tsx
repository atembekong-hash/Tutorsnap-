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
  "camera.fill": "photo-camera",
  "arrow.triangle.2.circlepath.camera": "flip-camera-ios",
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
  // Bookmarks & Progress
  "bookmark": "bookmark-border",
  "bookmark.fill": "bookmark",
  "star.fill": "star",
  "star": "star-border",
  "trophy.fill": "emoji-events",
  "flame.fill": "local-fire-department",
  "chart.xyaxis.line": "show-chart",
  "arrow.up.right": "north-east",
  "arrow.counterclockwise": "replay",
  "arrow.left.and.right": "swap-horiz",
  "person.fill": "person",
  "gear": "settings",
  "sun.max.fill": "wb-sunny",
  "moon.fill": "dark-mode",
  "bell.fill": "notifications",
  "bell.slash.fill": "notifications-off",
  "mic.fill": "mic",
  "mic.slash.fill": "mic-off",
  "stop.fill": "stop",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "info.circle": "info",
  "questionmark.circle": "help",
  "wifi.slash": "wifi-off",
  "wifi": "wifi",
  // Settings extras
  "textformat.size": "format-size",
  "envelope.fill": "email",
  "person.2.fill": "group",
  "hand.raised.fill": "front-hand",
  "doc.text.fill": "description",
  "square.and.pencil": "edit-note",
  "eraser.fill": "backspace",
  "arrow.counterclockwise.circle.fill": "settings-backup-restore",
  "rectangle.stack.fill": "layers",
  "sparkles": "auto-awesome",
  "star.bubble.fill": "rate-review",
  "square.and.arrow.up.fill": "ios-share",
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
