/**
 * MathRenderer — Publication-quality LaTeX rendering
 *
 * Strategy:
 *   1. Simple expressions (no fractions, integrals, matrices, etc.):
 *      → Pure JS Unicode approximation (instant, no network)
 *   2. Complex expressions:
 *      → Server SVG via /api/math/svg (MathJax-node, in-process cache)
 *      → Falls back to styled Unicode text if server unavailable
 *
 * Usage:
 *   <MathRenderer latex="\frac{a}{b}" display />
 *   <MathRenderer latex="x^2 + y^2" />
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useColors } from '@/hooks/use-colors';

export interface MathRendererProps {
  latex: string;
  display?: boolean;
  fontSize?: number;
  color?: string;
}

// ─── Complexity heuristic ─────────────────────────────────────────────────────
const COMPLEX_PATTERNS = [
  /\\frac/,
  /\\int/,
  /\\sum/,
  /\\prod/,
  /\\lim/,
  /\\sqrt\{[^}]{3,}\}/,
  /\\begin/,
  /\\matrix/,
  /\\pmatrix/,
  /\\bmatrix/,
  /\\overline/,
  /\\underbrace/,
  /\\overbrace/,
  /\\vec/,
  /\\hat/,
  /\^{[^}]{2,}}/,
  /_{[^}]{2,}}/,
];

function isComplex(latex: string): boolean {
  return COMPLEX_PATTERNS.some((p) => p.test(latex));
}

// ─── Unicode superscript/subscript maps ──────────────────────────────────────
const SUPERSCRIPTS: Record<string, string> = {
  '0':'\u2070','1':'\u00B9','2':'\u00B2','3':'\u00B3',
  '4':'\u2074','5':'\u2075','6':'\u2076','7':'\u2077',
  '8':'\u2078','9':'\u2079','+':'\u207A','-':'\u207B',
  '=':'\u207C','(':'\u207D',')':'\u207E','n':'\u207F','i':'\u2071',
};
const SUBSCRIPTS: Record<string, string> = {
  '0':'\u2080','1':'\u2081','2':'\u2082','3':'\u2083',
  '4':'\u2084','5':'\u2085','6':'\u2086','7':'\u2087',
  '8':'\u2088','9':'\u2089','+':'\u208A','-':'\u208B',
  '=':'\u208C','(':'\u208D',')':'\u208E',
  'a':'\u2090','e':'\u2091','o':'\u2092','x':'\u2093',
  'h':'\u2095','k':'\u2096','l':'\u2097','m':'\u2098',
  'n':'\u2099','p':'\u209A','s':'\u209B','t':'\u209C',
};

const SYMBOL_MAP: [RegExp, string][] = [
  [/\\alpha/g,'\u03B1'],[/\\beta/g,'\u03B2'],[/\\gamma/g,'\u03B3'],
  [/\\delta/g,'\u03B4'],[/\\epsilon/g,'\u03B5'],[/\\zeta/g,'\u03B6'],
  [/\\eta/g,'\u03B7'],[/\\theta/g,'\u03B8'],[/\\iota/g,'\u03B9'],
  [/\\kappa/g,'\u03BA'],[/\\lambda/g,'\u03BB'],[/\\mu/g,'\u03BC'],
  [/\\nu/g,'\u03BD'],[/\\xi/g,'\u03BE'],[/\\pi/g,'\u03C0'],
  [/\\rho/g,'\u03C1'],[/\\sigma/g,'\u03C3'],[/\\tau/g,'\u03C4'],
  [/\\phi/g,'\u03C6'],[/\\chi/g,'\u03C7'],[/\\psi/g,'\u03C8'],
  [/\\omega/g,'\u03C9'],[/\\Gamma/g,'\u0393'],[/\\Delta/g,'\u0394'],
  [/\\Theta/g,'\u0398'],[/\\Lambda/g,'\u039B'],[/\\Pi/g,'\u03A0'],
  [/\\Sigma/g,'\u03A3'],[/\\Phi/g,'\u03A6'],[/\\Psi/g,'\u03A8'],
  [/\\Omega/g,'\u03A9'],[/\\infty/g,'\u221E'],[/\\pm/g,'\u00B1'],
  [/\\mp/g,'\u2213'],[/\\times/g,'\u00D7'],[/\\div/g,'\u00F7'],
  [/\\cdot/g,'\u00B7'],[/\\leq/g,'\u2264'],[/\\geq/g,'\u2265'],
  [/\\neq/g,'\u2260'],[/\\approx/g,'\u2248'],[/\\equiv/g,'\u2261'],
  [/\\sim/g,'\u223C'],[/\\propto/g,'\u221D'],[/\\rightarrow/g,'\u2192'],
  [/\\leftarrow/g,'\u2190'],[/\\Rightarrow/g,'\u21D2'],[/\\Leftarrow/g,'\u21D0'],
  [/\\leftrightarrow/g,'\u2194'],[/\\forall/g,'\u2200'],[/\\exists/g,'\u2203'],
  [/\\nabla/g,'\u2207'],[/\\partial/g,'\u2202'],[/\\in/g,'\u2208'],
  [/\\notin/g,'\u2209'],[/\\subset/g,'\u2282'],[/\\supset/g,'\u2283'],
  [/\\cup/g,'\u222A'],[/\\cap/g,'\u2229'],[/\\emptyset/g,'\u2205'],
  [/\\therefore/g,'\u2234'],[/\\because/g,'\u2235'],[/\\angle/g,'\u2220'],
  [/\\perp/g,'\u22A5'],[/\\parallel/g,'\u2225'],[/\\triangle/g,'\u25B3'],
  [/\\degree/g,'\u00B0'],[/\\circ/g,'\u00B0'],[/\\sqrt/g,'\u221A'],
  [/\\sum/g,'\u2211'],[/\\prod/g,'\u220F'],[/\\int/g,'\u222B'],
  [/\\iint/g,'\u222C'],[/\\iiint/g,'\u222D'],[/\\oint/g,'\u222E'],
  [/\\lim/g,'lim'],[/\\log/g,'log'],[/\\ln/g,'ln'],
  [/\\sin/g,'sin'],[/\\cos/g,'cos'],[/\\tan/g,'tan'],
  [/\\cot/g,'cot'],[/\\sec/g,'sec'],[/\\csc/g,'csc'],
  [/\\arcsin/g,'arcsin'],[/\\arccos/g,'arccos'],[/\\arctan/g,'arctan'],
  [/\\max/g,'max'],[/\\min/g,'min'],[/\\det/g,'det'],
  [/\\quad/g,'  '],[/\\qquad/g,'    '],[/\\,/g,' '],[/\\;/g,' '],[/\\!/g,''],
  [/\\ /g,' '],[/\\text\{([^}]*)\}/g,'$1'],[/\\textbf\{([^}]*)\}/g,'$1'],
  [/\\textit\{([^}]*)\}/g,'$1'],[/\\mathrm\{([^}]*)\}/g,'$1'],
  [/\\mathbf\{([^}]*)\}/g,'$1'],[/\\mathit\{([^}]*)\}/g,'$1'],
  [/\\left/g,''],[/\\right/g,''],[/\\big/g,''],[/\\Big/g,''],
  [/\\bigg/g,''],[/\\Bigg/g,''],
];

function latexToUnicode(latex: string): string {
  let result = latex;
  for (const [pattern, replacement] of SYMBOL_MAP) {
    result = result.replace(pattern, replacement);
  }
  result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1)/($2)');
  result = result.replace(/\^{([^}]*)}/g, (_, content) =>
    content.split('').map((c: string) => SUPERSCRIPTS[c] ?? c).join(''));
  result = result.replace(/\^([a-zA-Z0-9])/g, (_, c) => SUPERSCRIPTS[c] ?? `^${c}`);
  result = result.replace(/_{([^}]*)}/g, (_, content) =>
    content.split('').map((c: string) => SUBSCRIPTS[c] ?? c).join(''));
  result = result.replace(/_([a-zA-Z0-9])/g, (_, c) => SUBSCRIPTS[c] ?? `_${c}`);
  result = result.replace(/\u221A\{([^}]*)\}/g, '\u221A($1)');
  result = result.replace(/\u221A([a-zA-Z0-9])/g, '\u221A$1');
  result = result.replace(/\{/g, '').replace(/\}/g, '');
  result = result.replace(/\\([a-zA-Z]+)/g, '$1');
  result = result.replace(/\s+/g, ' ').trim();
  return result;
}

// ─── Server SVG renderer ──────────────────────────────────────────────────────
function ServerMathRenderer({
  latex, display, fontSize = 16, color,
}: MathRendererProps & { color: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'done'; svg: string; width: number; height: number }
    | { status: 'error' }
  >({ status: 'loading' });
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ status: 'loading' });

    // Fallback to Unicode after 3 seconds if SVG server is slow or unavailable
    timeoutRef.current = setTimeout(() => {
      if (!ac.signal.aborted) {
        ac.abort();
        setState({ status: 'error' });
      }
    }, 3000);

    // Use the local API server (same process)
    // On web: replace the Metro port (8081) with the API port (3000)
    const apiBase = Platform.OS === 'web'
      ? (() => {
          try {
            const origin = window.location.origin;
            // Handle both :8081 and no-port cases (proxied envs)
            return origin.includes(':8081')
              ? origin.replace(':8081', ':3000')
              : origin.replace(/\/+$/, '') + ':3000';
          } catch { return 'http://127.0.0.1:3000'; }
        })()
      : 'http://127.0.0.1:3000';
    const url = `${apiBase}/api/math/svg?latex=${encodeURIComponent(latex)}&display=${display ? '1' : '0'}`;

    fetch(url, { signal: ac.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!ac.signal.aborted) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setState({ status: 'done', svg: data.svg, width: data.width, height: data.height });
        }
      })
      .catch(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!ac.signal.aborted) setState({ status: 'error' });
      });

    return () => {
      ac.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [latex, display]);

  if (state.status === 'loading') {
    return (
      <View style={[styles.loadingBox, display && styles.displayBlock]}>
        <ActivityIndicator size="small" color={color} />
      </View>
    );
  }
  if (state.status === 'error') {
    return <SimpleMathRenderer latex={latex} display={display} fontSize={fontSize} color={color} />;
  }

  const colorizedSvg = state.svg
    .replace(/currentColor/g, color)
    .replace(/fill="black"/g, `fill="${color}"`)
    .replace(/stroke="black"/g, `stroke="${color}"`);

  const scale = fontSize / 16;
  const w = Math.ceil(state.width * scale);
  const h = Math.ceil(state.height * scale);

  return (
    <View style={[display && styles.displayBlock, { alignItems: display ? 'center' : 'flex-start' }]}>
      <SvgXml xml={colorizedSvg} width={w} height={h} />
    </View>
  );
}

// ─── Simple (Unicode) renderer ────────────────────────────────────────────────
function SimpleMathRenderer({
  latex, display = false, fontSize = 16, color,
}: MathRendererProps & { color: string }) {
  const rendered = useMemo(() => latexToUnicode(latex), [latex]);
  const fs = display ? fontSize * 1.1 : fontSize;
  return (
    <View style={[styles.container, display ? styles.displayBlock : styles.inlineBlock]}>
      <Text
        style={[styles.mathText, { fontSize: fs, color, textAlign: display ? 'center' : 'left' }]}
        selectable
      >
        {rendered}
      </Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MathRenderer({ latex, display = false, fontSize = 16, color }: MathRendererProps) {
  const colors = useColors();
  const textColor = color ?? colors.foreground;
  const complex = useMemo(() => isComplex(latex), [latex]);

  if (complex) {
    return <ServerMathRenderer latex={latex} display={display} fontSize={fontSize} color={textColor} />;
  }
  return <SimpleMathRenderer latex={latex} display={display} fontSize={fontSize} color={textColor} />;
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  displayBlock: { width: '100%', marginVertical: 10, paddingVertical: 4, alignItems: 'center' },
  inlineBlock: { marginHorizontal: 2 },
  loadingBox: { height: 36, justifyContent: 'center', alignItems: 'center' },
  mathText: {
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    letterSpacing: 0.3,
  },
});
