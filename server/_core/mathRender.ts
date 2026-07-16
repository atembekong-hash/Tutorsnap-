/**
 * mathRender.ts
 * GET /api/math/svg?latex=...&display=1
 *
 * Renders a LaTeX expression to SVG using MathJax-node.
 * Returns JSON: { svg: string, width: number, height: number }
 * Cached in-process with an LRU-style Map (max 500 entries).
 */

import type { Express, Request, Response } from "express";

// Lazy-init MathJax-node to avoid blocking startup
let mjReady = false;
let mjInitPromise: Promise<void> | null = null;

function getMathJax(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mj = require("mathjax-node");
  if (mjReady) return Promise.resolve(mj);
  if (!mjInitPromise) {
    mjInitPromise = new Promise<void>((resolve, reject) => {
      mj.config({
        MathJax: {
          SVG: { font: "TeX", blacker: 0, matchFontHeight: false },
          tex2jax: { processEscapes: true },
        },
      });
      mj.start();
      // mathjax-node doesn't emit a ready event, but start() is synchronous
      mjReady = true;
      resolve();
    });
  }
  return mjInitPromise.then(() => mj);
}

// Simple in-process cache
const CACHE_MAX = 500;
const cache = new Map<string, { svg: string; width: number; height: number }>();

function cacheSet(key: string, value: { svg: string; width: number; height: number }) {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

export function registerMathRenderRoute(app: Express) {
  app.get("/api/math/svg", async (req: Request, res: Response) => {
    const latex = (req.query.latex as string) ?? "";
    const display = req.query.display === "1" || req.query.display === "true";

    if (!latex.trim()) {
      return res.status(400).json({ error: "Missing latex parameter" });
    }

    const cacheKey = `${display ? "D" : "I"}:${latex}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Math-Cache", "hit");
      return res.json(cached);
    }

    try {
      const mj = await getMathJax();
      const result = await new Promise<any>((resolve, reject) => {
        mj.typeset(
          {
            math: latex,
            format: display ? "TeX" : "inline-TeX",
            svg: true,
            speakText: false,
          },
          (data: any) => {
            if (data.errors) reject(new Error(data.errors.join(", ")));
            else resolve(data);
          }
        );
      });

      // Extract width/height from SVG viewBox or width/height attributes
      const svgStr: string = result.svg ?? "";
      const wMatch = svgStr.match(/width="([^"]+)ex"/);
      const hMatch = svgStr.match(/height="([^"]+)ex"/);
      const exPx = 8; // 1ex ≈ 8px at 16px base
      const width = wMatch ? Math.ceil(parseFloat(wMatch[1]) * exPx) : 200;
      const height = hMatch ? Math.ceil(parseFloat(hMatch[1]) * exPx) : 40;

      const payload = { svg: svgStr, width, height };
      cacheSet(cacheKey, payload);
      res.setHeader("X-Math-Cache", "miss");
      return res.json(payload);
    } catch (err: any) {
      console.error("[MathRender] Error:", err.message);
      return res.status(422).json({ error: err.message ?? "Render failed" });
    }
  });
}
