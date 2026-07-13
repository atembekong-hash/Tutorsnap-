import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "tag.fill": "label",
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
  "doc.on.doc.fill": "content-copy",
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
  "arrowshape.turn.up.left.fill": "reply",
  "eye.fill": "visibility",
  // Bookmarks & Progress
  "bookmark": "bookmark-border",
  "bookmark.fill": "bookmark",
  "star.fill": "star",
  "star": "star-border",
  "medal.fill": "military-tech",
  "crown.fill": "workspace-premium",
  "link": "link",
  "trophy.fill": "emoji-events",
  "flame.fill": "local-fire-department",
  "chart.xyaxis.line": "show-chart",
  "arrow.up.right": "north-east",
  "arrow.up.circle.fill": "arrow-circle-up",
  "arrow.counterclockwise": "replay",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "timer": "timer",
  "forward.end.fill": "skip-next",
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
  "plus": "add",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "info.circle": "info",
  "questionmark.circle": "help",
  "wifi.slash": "wifi-off",
  "wifi": "wifi",
  // Settings extras
  "textformat.size": "format-size",
  "envelope.fill": "email",
  "calendar": "calendar-today",
  "calendar.badge.plus": "event",
  "book.fill": "menu-book",
  "clock.badge.checkmark": "alarm-on",
  "pencil.line": "edit",
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
  "square.and.arrow.up.on.square.fill": "upload-file",
  "square.and.arrow.down.fill": "download",
  "person.crop.circle.badge.minus": "person-remove",
  "person.crop.circle.fill": "account-circle",
  // Code
  "chevron.left.forwardslash.chevron.right": "code",
  // New settings pages
  "bubble.left.and.text.bubble.right.fill": "forum",
  "ladybug.fill": "bug-report",
  "bell.badge.fill": "notification-important",
  "doc.badge.gearshape.fill": "manage-accounts",
  "cookie.fill": "cookie",
  "doc.plaintext.fill": "article",
  "person.3.fill": "groups",
  "person.badge.minus.fill": "person-remove",
  "person.badge.plus": "person-add",
  "checkmark.shield.fill": "verified-user",
  "scale.3d": "balance",
  "globe": "language",
  "shield.lefthalf.filled": "security",
  "lock.doc.fill": "lock",
  "text.badge.checkmark": "fact-check",
  "waveform.badge.exclamationmark": "report-problem",
  // Solution screen
  "text.bubble": "chat",
  "doc.fill": "insert-drive-file",
  // Homework completion
  "circle": "radio-button-unchecked",
  "paintbrush.fill": "brush",
  "slider.horizontal.3": "tune",
  "arrow.up.arrow.down": "swap-vert",
  "graduationcap.fill": "school",
  "arrow.clockwise.circle.fill": "refresh",
  "creditcard.fill": "credit-card",
  "gift.fill": "card-giftcard",
} as unknown as IconMapping;

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
