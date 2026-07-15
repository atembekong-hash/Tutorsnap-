/**
 * MathRenderer
 *
 * Renders LaTeX math expressions as styled text using pure JavaScript.
 * No native modules required — works on all platforms and architectures.
 *
 * For simple expressions, converts LaTeX to Unicode approximations.
 * For complex expressions, renders the raw LaTeX in a monospace italic style.
 *
 * Usage:
 *   <MathRenderer latex="x^2 + y^2 = z^2" display />
 *   <MathRenderer latex="\frac{a}{b}" />
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface MathRendererProps {
  /** LaTeX string (without surrounding $ or $$ delimiters) */
  latex: string;
  /** Display mode (block). Inline mode if false. Default: false */
  display?: boolean;
  /** Font size in px. Default: 16 */
  fontSize?: number;
  /** Text color. Defaults to theme foreground. */
  color?: string;
}

// Unicode superscript/subscript maps
const SUPERSCRIPTS: Record<string, string> = {
  '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3',
  '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077',
  '8': '\u2078', '9': '\u2079', '+': '\u207A', '-': '\u207B',
  '=': '\u207C', '(': '\u207D', ')': '\u207E', 'n': '\u207F',
  'i': '\u2071',
};

const SUBSCRIPTS: Record<string, string> = {
  '0': '\u2080', '1': '\u2081', '2': '\u2082', '3': '\u2083',
  '4': '\u2084', '5': '\u2085', '6': '\u2086', '7': '\u2087',
  '8': '\u2088', '9': '\u2089', '+': '\u208A', '-': '\u208B',
  '=': '\u208C', '(': '\u208D', ')': '\u208E',
  'a': '\u2090', 'e': '\u2091', 'o': '\u2092', 'x': '\u2093',
  'h': '\u2095', 'k': '\u2096', 'l': '\u2097', 'm': '\u2098',
  'n': '\u2099', 'p': '\u209A', 's': '\u209B', 't': '\u209C',
};

// Common LaTeX symbol replacements
const SYMBOL_MAP: [RegExp, string][] = [
  [/\\alpha/g, '\u03B1'],
  [/\\beta/g, '\u03B2'],
  [/\\gamma/g, '\u03B3'],
  [/\\delta/g, '\u03B4'],
  [/\\epsilon/g, '\u03B5'],
  [/\\zeta/g, '\u03B6'],
  [/\\eta/g, '\u03B7'],
  [/\\theta/g, '\u03B8'],
  [/\\iota/g, '\u03B9'],
  [/\\kappa/g, '\u03BA'],
  [/\\lambda/g, '\u03BB'],
  [/\\mu/g, '\u03BC'],
  [/\\nu/g, '\u03BD'],
  [/\\xi/g, '\u03BE'],
  [/\\pi/g, '\u03C0'],
  [/\\rho/g, '\u03C1'],
  [/\\sigma/g, '\u03C3'],
  [/\\tau/g, '\u03C4'],
  [/\\phi/g, '\u03C6'],
  [/\\chi/g, '\u03C7'],
  [/\\psi/g, '\u03C8'],
  [/\\omega/g, '\u03C9'],
  [/\\Gamma/g, '\u0393'],
  [/\\Delta/g, '\u0394'],
  [/\\Theta/g, '\u0398'],
  [/\\Lambda/g, '\u039B'],
  [/\\Pi/g, '\u03A0'],
  [/\\Sigma/g, '\u03A3'],
  [/\\Phi/g, '\u03A6'],
  [/\\Psi/g, '\u03A8'],
  [/\\Omega/g, '\u03A9'],
  [/\\infty/g, '\u221E'],
  [/\\pm/g, '\u00B1'],
  [/\\mp/g, '\u2213'],
  [/\\times/g, '\u00D7'],
  [/\\div/g, '\u00F7'],
  [/\\cdot/g, '\u00B7'],
  [/\\leq/g, '\u2264'],
  [/\\geq/g, '\u2265'],
  [/\\neq/g, '\u2260'],
  [/\\approx/g, '\u2248'],
  [/\\equiv/g, '\u2261'],
  [/\\sim/g, '\u223C'],
  [/\\propto/g, '\u221D'],
  [/\\rightarrow/g, '\u2192'],
  [/\\leftarrow/g, '\u2190'],
  [/\\Rightarrow/g, '\u21D2'],
  [/\\Leftarrow/g, '\u21D0'],
  [/\\leftrightarrow/g, '\u2194'],
  [/\\forall/g, '\u2200'],
  [/\\exists/g, '\u2203'],
  [/\\nabla/g, '\u2207'],
  [/\\partial/g, '\u2202'],
  [/\\in/g, '\u2208'],
  [/\\notin/g, '\u2209'],
  [/\\subset/g, '\u2282'],
  [/\\supset/g, '\u2283'],
  [/\\cup/g, '\u222A'],
  [/\\cap/g, '\u2229'],
  [/\\emptyset/g, '\u2205'],
  [/\\therefore/g, '\u2234'],
  [/\\because/g, '\u2235'],
  [/\\angle/g, '\u2220'],
  [/\\perp/g, '\u22A5'],
  [/\\parallel/g, '\u2225'],
  [/\\triangle/g, '\u25B3'],
  [/\\degree/g, '\u00B0'],
  [/\\circ/g, '\u00B0'],
  [/\\sqrt/g, '\u221A'],
  [/\\sum/g, '\u2211'],
  [/\\prod/g, '\u220F'],
  [/\\int/g, '\u222B'],
  [/\\iint/g, '\u222C'],
  [/\\iiint/g, '\u222D'],
  [/\\oint/g, '\u222E'],
  [/\\lim/g, 'lim'],
  [/\\log/g, 'log'],
  [/\\ln/g, 'ln'],
  [/\\sin/g, 'sin'],
  [/\\cos/g, 'cos'],
  [/\\tan/g, 'tan'],
  [/\\cot/g, 'cot'],
  [/\\sec/g, 'sec'],
  [/\\csc/g, 'csc'],
  [/\\arcsin/g, 'arcsin'],
  [/\\arccos/g, 'arccos'],
  [/\\arctan/g, 'arctan'],
  [/\\max/g, 'max'],
  [/\\min/g, 'min'],
  [/\\det/g, 'det'],
  [/\\quad/g, '  '],
  [/\\qquad/g, '    '],
  [/\\,/g, ' '],
  [/\\;/g, ' '],
  [/\\!/g, ''],
  [/\\ /g, ' '],
  [/\\text\{([^}]*)\}/g, '$1'],
  [/\\textbf\{([^}]*)\}/g, '$1'],
  [/\\textit\{([^}]*)\}/g, '$1'],
  [/\\mathrm\{([^}]*)\}/g, '$1'],
  [/\\mathbf\{([^}]*)\}/g, '$1'],
  [/\\mathit\{([^}]*)\}/g, '$1'],
  [/\\left/g, ''],
  [/\\right/g, ''],
  [/\\big/g, ''],
  [/\\Big/g, ''],
  [/\\bigg/g, ''],
  [/\\Bigg/g, ''],
];

/**
 * Convert a LaTeX string to a readable Unicode approximation.
 */
function latexToUnicode(latex: string): string {
  let result = latex;

  // Apply symbol replacements
  for (const [pattern, replacement] of SYMBOL_MAP) {
    result = result.replace(pattern, replacement);
  }

  // Handle \frac{a}{b} → a/b
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');

  // Handle superscripts: ^{...} or ^x
  result = result.replace(/\^{([^}]*)}/g, (_, content) => {
    return content.split('').map((c: string) => SUPERSCRIPTS[c] ?? c).join('');
  });
  result = result.replace(/\^([a-zA-Z0-9])/g, (_, c) => SUPERSCRIPTS[c] ?? `^${c}`);

  // Handle subscripts: _{...} or _x
  result = result.replace(/_{([^}]*)}/g, (_, content) => {
    return content.split('').map((c: string) => SUBSCRIPTS[c] ?? c).join('');
  });
  result = result.replace(/_([a-zA-Z0-9])/g, (_, c) => SUBSCRIPTS[c] ?? `_${c}`);

  // Handle \sqrt{x} → √(x)
  result = result.replace(/√\{([^}]*)\}/g, '√($1)');
  result = result.replace(/√([a-zA-Z0-9])/g, '√$1');

  // Clean up remaining braces
  result = result.replace(/\{/g, '');
  result = result.replace(/\}/g, '');

  // Clean up remaining backslashes from unknown commands
  result = result.replace(/\\([a-zA-Z]+)/g, '$1');

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

export function MathRenderer({ latex, display = false, fontSize = 16, color }: MathRendererProps) {
  const colors = useColors();
  const mathColor = color ?? colors.foreground;

  const rendered = useMemo(() => latexToUnicode(latex), [latex]);

  return (
    <View style={[
      styles.container,
      display ? styles.displayBlock : styles.inlineBlock,
    ]}>
      <Text
        style={[
          styles.mathText,
          {
            fontSize: display ? fontSize * 1.1 : fontSize,
            color: mathColor,
            textAlign: display ? 'center' : 'left',
          },
        ]}
        selectable
      >
        {rendered}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  displayBlock: {
    width: '100%',
    marginVertical: 8,
    paddingVertical: 4,
  },
  inlineBlock: {
    marginHorizontal: 2,
  },
  mathText: {
    fontFamily: undefined, // Use system font for best Unicode support
    fontStyle: 'italic',
    letterSpacing: 0.3,
    lineHeight: undefined, // Let it auto-calculate
  },
});
