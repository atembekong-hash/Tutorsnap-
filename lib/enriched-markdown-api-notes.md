# react-native-enriched-markdown API Notes (v0.7.4)

## Main Component
`EnrichedMarkdownText` from `react-native-enriched-markdown`

## Key Props (EnrichedMarkdownTextProps)
- `markdown: string` — the content to render (NOT children)
- `markdownStyle?: MarkdownStyle` — style config for all elements
- `flavor?: 'commonmark' | 'github'` — use 'github' for GFM tables + task lists + block math ($$)
- `streamingAnimation?: boolean` — true for LLM streaming fade-in
- `streamingConfig?: StreamingConfig` — fine-grained streaming control
- `md4cFlags?: Md4cFlags` — parser flags
  - `latexMath?: boolean` — default true, enables $...$ and $$...$$ parsing
  - `superscript?: boolean` — ^text^
  - `subscript?: boolean` — ~text~
  - `highlight?: boolean` — ==text==
- `onLinkPress?: (event: LinkPressEvent) => void`
- `style?: ViewStyle` — outer container style (NOT text style)

## MarkdownStyle Keys
paragraph, h1, h2, h3, h4, h5, h6, blockquote, list, codeBlock, code, link, strong, em, strikethrough, underline, image, inlineImage, thematicBreak, table, taskList, math, inlineMath, spoiler, superscript, subscript, highlight

## Math Rendering
- Inline math: `$...$`
- Block math: `$$...$$` (requires flavor="github")
- latexMath flag defaults to true
- Web: requires `katex` peer dep (already installed)
- Native: uses RaTeX native dependency (bundled)

## Streaming
- Set `streamingAnimation={true}` for LLM streaming
- Update `markdown` prop incrementally as tokens arrive

## Web Support
- Uses WebAssembly (md4c compiled to WASM)
- LaTeX requires katex (installed)
- Import from `react-native-enriched-markdown` — Metro resolves .web.js automatically

## Important
- Requires New Architecture (Fabric) — already enabled in app.config.ts (newArchEnabled: true)
- Does NOT work in Expo Go — works in dev builds and production APK/IPA
- The `style` prop is a ViewStyle (container), not TextStyle
