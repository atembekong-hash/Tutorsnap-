/**
 * AI Response Rendering Test Screen
 *
 * Comprehensive validation of the AIResponseRenderer pipeline.
 * Covers: Algebra, Calculus, Fractions, Matrices, Chemistry,
 * Physics, Bullet lists, Numbered lists, Tables, Nested formatting,
 * Mixed Markdown + LaTeX, Streaming responses, Long responses.
 *
 * Access via dev tools or navigate to /dev/render-test
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AIResponseRenderer } from "@/components/ai-response-renderer";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";

const TEST_CASES: { label: string; category: string; content: string }[] = [
  {
    label: "Algebra — Quadratic Formula",
    category: "Math",
    content: `## Quadratic Formula

The quadratic formula solves any equation of the form $ax^2 + bx + c = 0$.

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Example:** Solve $2x^2 - 4x - 6 = 0$

Here $a = 2$, $b = -4$, $c = -6$.

$$x = \\frac{4 \\pm \\sqrt{16 + 48}}{4} = \\frac{4 \\pm 8}{4}$$

So $x = 3$ or $x = -1$.`,
  },
  {
    label: "Calculus — Derivatives",
    category: "Math",
    content: `## Derivatives

The derivative of $f(x) = x^n$ is:

$$f'(x) = nx^{n-1}$$

### Chain Rule

If $h(x) = f(g(x))$, then:

$$h'(x) = f'(g(x)) \\cdot g'(x)$$

**Example:** Find the derivative of $y = \\sin(x^2)$.

Let $u = x^2$, so $y = \\sin(u)$.

$$\\frac{dy}{dx} = \\cos(u) \\cdot 2x = 2x\\cos(x^2)$$`,
  },
  {
    label: "Calculus — Integration",
    category: "Math",
    content: `## Definite Integral

$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$

where $F$ is the antiderivative of $f$.

**Example:** Compute $\\int_0^1 x^2\\,dx$.

$$\\int_0^1 x^2\\,dx = \\left[\\frac{x^3}{3}\\right]_0^1 = \\frac{1}{3} - 0 = \\frac{1}{3}$$`,
  },
  {
    label: "Fractions — Operations",
    category: "Math",
    content: `## Fraction Operations

**Addition:** $\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}$

**Example:**

$$\\frac{2}{3} + \\frac{3}{4} = \\frac{8 + 9}{12} = \\frac{17}{12}$$

**Division:** $\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c} = \\frac{ad}{bc}$

**Example:**

$$\\frac{3}{5} \\div \\frac{2}{7} = \\frac{3 \\times 7}{5 \\times 2} = \\frac{21}{10}$$`,
  },
  {
    label: "Matrices — Operations",
    category: "Math",
    content: `## Matrix Multiplication

For matrices $A$ (m×n) and $B$ (n×p), the product $C = AB$ has dimensions m×p.

$$C_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}$$

**Example:**

$$\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\begin{pmatrix} 5 & 6 \\\\ 7 & 8 \\end{pmatrix} = \\begin{pmatrix} 19 & 22 \\\\ 43 & 50 \\end{pmatrix}$$

The **determinant** of a 2×2 matrix:

$$\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc$$`,
  },
  {
    label: "Chemistry — Equations",
    category: "Science",
    content: `## Chemical Equations

**Combustion of methane:**

$$\\text{CH}_4 + 2\\text{O}_2 \\rightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}$$

**Photosynthesis:**

$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

**pH formula:**

$$\\text{pH} = -\\log_{10}[\\text{H}^+]$$

A neutral solution has $\\text{pH} = 7$. Acids have $\\text{pH} < 7$, bases have $\\text{pH} > 7$.`,
  },
  {
    label: "Physics — Equations",
    category: "Science",
    content: `## Physics Equations

**Newton's Second Law:**

$$F = ma$$

**Kinematic equation:**

$$v^2 = v_0^2 + 2a\\Delta x$$

**Einstein's mass-energy equivalence:**

$$E = mc^2$$

**Gravitational force:**

$$F = G\\frac{m_1 m_2}{r^2}$$

where $G = 6.674 \\times 10^{-11}\\,\\text{N m}^2\\text{kg}^{-2}$.`,
  },
  {
    label: "Bullet Lists",
    category: "Formatting",
    content: `## Study Tips

- Review your notes within 24 hours of class
- Use active recall instead of passive re-reading
- Space your practice sessions over multiple days
- Teach the concept to someone else
- Get adequate sleep before exams

### Nested list example

- Mathematics
  - Algebra
  - Calculus
  - Statistics
- Sciences
  - Physics
  - Chemistry
  - Biology`,
  },
  {
    label: "Numbered Lists",
    category: "Formatting",
    content: `## How to Solve a Word Problem

1. Read the problem carefully
2. Identify what is given and what is unknown
3. Choose the appropriate formula or method
4. Substitute the known values
5. Solve for the unknown
6. Check your answer by substituting back

### Steps to factor a quadratic $ax^2 + bx + c$

1. Find two numbers that multiply to $ac$ and add to $b$
2. Rewrite the middle term using those numbers
3. Factor by grouping
4. Verify by expanding`,
  },
  {
    label: "Tables",
    category: "Formatting",
    content: `## Trigonometric Values

| Angle | $\\sin\\theta$ | $\\cos\\theta$ | $\\tan\\theta$ |
|-------|-------------|-------------|-------------|
| $0°$  | $0$         | $1$         | $0$         |
| $30°$ | $\\frac{1}{2}$ | $\\frac{\\sqrt{3}}{2}$ | $\\frac{1}{\\sqrt{3}}$ |
| $45°$ | $\\frac{\\sqrt{2}}{2}$ | $\\frac{\\sqrt{2}}{2}$ | $1$ |
| $60°$ | $\\frac{\\sqrt{3}}{2}$ | $\\frac{1}{2}$ | $\\sqrt{3}$ |
| $90°$ | $1$         | $0$         | undefined   |`,
  },
  {
    label: "Nested Formatting",
    category: "Formatting",
    content: `## Complex Formatting

> **Key Insight:** The quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ always works, but factoring is faster when possible.

### When to use each method

1. **Factoring** — when the discriminant $b^2 - 4ac$ is a perfect square
2. **Completing the square** — when you need the vertex form $a(x-h)^2 + k$
3. **Quadratic formula** — when the other methods are too complex

The discriminant $\\Delta = b^2 - 4ac$ tells you:

- $\\Delta > 0$: **two real roots**
- $\\Delta = 0$: **one repeated root** $x = -\\frac{b}{2a}$
- $\\Delta < 0$: **two complex roots** $x = \\frac{-b \\pm i\\sqrt{|\\Delta|}}{2a}$`,
  },
  {
    label: "Mixed Markdown + LaTeX",
    category: "Mixed",
    content: `## The Fundamental Theorem of Calculus

The **Fundamental Theorem of Calculus** connects differentiation and integration.

### Part 1

If $f$ is continuous on $[a, b]$ and $F(x) = \\int_a^x f(t)\\,dt$, then:

$$F'(x) = f(x)$$

This means differentiation and integration are *inverse operations*.

### Part 2

If $F$ is an antiderivative of $f$ on $[a, b]$, then:

$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$

> This is one of the most important results in all of mathematics.

**Applications:**
- Computing areas under curves
- Solving differential equations
- Probability distributions (e.g. $\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$)`,
  },
  {
    label: "LaTeX Delimiter Variants",
    category: "Pipeline",
    content: `## LaTeX Delimiter Normalization Test

This tests that the pipeline converts \\(...\\) and \\[...\\] to standard delimiters.

Inline with parentheses: \\(E = mc^2\\)

Block with brackets:
\\[
\\int_0^\\infty e^{-x}\\,dx = 1
\\]

Standard inline: $F = ma$

Standard block:
$$\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}$$`,
  },
  {
    label: "Code Blocks",
    category: "Formatting",
    content: `## Python Example

Here is how to solve a quadratic equation in Python:

\`\`\`python
import math

def quadratic(a, b, c):
    discriminant = b**2 - 4*a*c
    if discriminant < 0:
        return None  # complex roots
    x1 = (-b + math.sqrt(discriminant)) / (2*a)
    x2 = (-b - math.sqrt(discriminant)) / (2*a)
    return x1, x2

print(quadratic(1, -5, 6))  # (3.0, 2.0)
\`\`\`

The time complexity is $O(1)$ since it performs a fixed number of operations.`,
  },
  {
    label: "Long Response",
    category: "Stress",
    content: `## Complete Guide to Calculus

Calculus is the mathematical study of continuous change. It has two main branches: **differential calculus** and **integral calculus**.

### 1. Limits

The foundation of calculus is the concept of a limit. We write:

$$\\lim_{x \\to a} f(x) = L$$

This means that as $x$ approaches $a$, $f(x)$ approaches $L$.

**Key limit rules:**

- $\\lim_{x \\to a} [f(x) + g(x)] = \\lim_{x \\to a} f(x) + \\lim_{x \\to a} g(x)$
- $\\lim_{x \\to a} [f(x) \\cdot g(x)] = \\lim_{x \\to a} f(x) \\cdot \\lim_{x \\to a} g(x)$
- $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$

### 2. Derivatives

The derivative measures the instantaneous rate of change:

$$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

**Differentiation rules:**

| Rule | Formula |
|------|---------|
| Power | $\\frac{d}{dx} x^n = nx^{n-1}$ |
| Product | $(fg)' = f'g + fg'$ |
| Quotient | $\\left(\\frac{f}{g}\\right)' = \\frac{f'g - fg'}{g^2}$ |
| Chain | $(f \\circ g)' = (f' \\circ g) \\cdot g'$ |

### 3. Integrals

The integral is the reverse of differentiation:

$$\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$$

**Important integrals:**

- $\\int e^x\\,dx = e^x + C$
- $\\int \\sin x\\,dx = -\\cos x + C$
- $\\int \\cos x\\,dx = \\sin x + C$
- $\\int \\frac{1}{x}\\,dx = \\ln|x| + C$

### 4. Applications

Calculus has countless applications:

1. **Physics** — velocity $v = \\frac{ds}{dt}$, acceleration $a = \\frac{dv}{dt}$
2. **Economics** — marginal cost $MC = \\frac{dC}{dQ}$
3. **Biology** — population growth $\\frac{dP}{dt} = rP$
4. **Engineering** — optimization, signal processing

> The beauty of calculus is that it provides a unified language for describing change in any system.`,
  },
];

export default function RenderTestScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = TEST_CASES[selectedIndex];

  const startStreaming = () => {
    if (isStreaming) return;
    const full = TEST_CASES.find(t => t.label === "Mixed Markdown + LaTeX")?.content ?? "";
    setStreamingText("");
    setIsStreaming(true);
    let i = 0;
    streamTimerRef.current = setInterval(() => {
      i += 8;
      setStreamingText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(streamTimerRef.current!);
        setIsStreaming(false);
      }
    }, 30);
  };

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  const categories = Array.from(new Set(TEST_CASES.map(t => t.category)));

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol size={22} name="chevron.left" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Render Pipeline Test
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Sidebar: test case list */}
        <ScrollView
          style={[styles.sidebar, { borderRightColor: colors.border, backgroundColor: colors.surface }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Streaming test */}
          <TouchableOpacity
            onPress={startStreaming}
            style={[
              styles.sidebarItem,
              isStreaming && { backgroundColor: `${colors.primary}20` },
              { borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.sidebarCategory, { color: colors.primary }]}>Stream</Text>
            <Text style={[styles.sidebarLabel, { color: colors.foreground }]} numberOfLines={2}>
              {isStreaming ? "⏳ Streaming..." : "▶ Start Streaming"}
            </Text>
          </TouchableOpacity>

          {categories.map(cat => (
            <View key={cat}>
              <View style={[styles.categoryHeader, { backgroundColor: colors.background }]}>
                <Text style={[styles.categoryLabel, { color: colors.muted }]}>{cat.toUpperCase()}</Text>
              </View>
              {TEST_CASES.filter(t => t.category === cat).map((tc, i) => {
                const globalIdx = TEST_CASES.indexOf(tc);
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedIndex(globalIdx)}
                    style={[
                      styles.sidebarItem,
                      globalIdx === selectedIndex && { backgroundColor: `${colors.primary}15` },
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sidebarLabel,
                        { color: globalIdx === selectedIndex ? colors.primary : colors.foreground },
                      ]}
                      numberOfLines={2}
                    >
                      {tc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Main: rendered output */}
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {isStreaming || streamingText ? (
            <>
              <Text style={[styles.testLabel, { color: colors.muted }]}>STREAMING TEST</Text>
              <View style={[styles.renderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AIResponseRenderer
                  markdown={streamingText}
                  fontSize={14}
                  streaming={isStreaming}
                  flavor="github"
                  stripPreamble={false}
                />
              </View>
              {!isStreaming && (
                <TouchableOpacity
                  onPress={() => { setStreamingText(""); }}
                  style={[styles.resetBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.resetBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.testLabel, { color: colors.muted }]}>{selected.category.toUpperCase()}</Text>
              <Text style={[styles.testTitle, { color: colors.foreground }]}>{selected.label}</Text>
              <View style={[styles.renderBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AIResponseRenderer
                  markdown={selected.content}
                  fontSize={14}
                  flavor="github"
                  stripPreamble={false}
                />
              </View>
              <View style={[styles.rawBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.rawLabel, { color: colors.muted }]}>RAW INPUT</Text>
                <Text style={[styles.rawText, { color: colors.muted }]} selectable>
                  {selected.content}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  sidebar: {
    width: 130,
    borderRightWidth: 0.5,
  },
  categoryHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  sidebarItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  sidebarCategory: { fontSize: 9, fontWeight: "700", marginBottom: 2 },
  sidebarLabel: { fontSize: 11, fontWeight: "500", lineHeight: 15 },
  testLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  testTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  renderBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  rawBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 24,
  },
  rawLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  rawText: { fontSize: 11, fontFamily: "monospace", lineHeight: 16 },
  resetBtn: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  resetBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
