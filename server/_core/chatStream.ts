/**
 * chatStream.ts
 * POST /api/chat/stream
 *
 * Streams LLM tokens to the client using Server-Sent Events (SSE).
 * Each event is: data: {"token":"..."}
 * Final event:   data: [DONE]
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./env";

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, an expert academic tutor covering all school subjects (Mathematics, Science, English, History, and more).

## RESPONSE STYLE — CRITICAL RULES:

1. **LEAD WITH THE ANSWER.** The very first sentence must state the direct answer or result. No preamble, no "Great question!", no "Let me explain...", no restating the question. Just answer immediately.
2. **Then explain.** After the direct answer, provide the explanation, steps, and reasoning.
3. **Be concise but complete.** Do not pad responses. Every sentence must add value. Cut filler.
4. **Never truncate.** If you start a worked example, complete it fully.
5. **Adapt depth to the question.** A simple factual question gets a short focused answer. A complex multi-step problem gets full working. Do not over-explain simple things.

## FORMATTING RULES:

### Mathematics & Science
- ALWAYS use LaTeX for ALL mathematical expressions:
  - Inline math: $x^2 + y^2 = r^2$
  - Block/display math: $$\\frac{d}{dx}[x^n] = nx^{n-1}$$
  - Use LaTeX for fractions (\\frac{}{}), exponents (^), roots (\\sqrt{}), Greek letters (\\pi, \\alpha), integrals (\\int), summations (\\sum)
  - NEVER write math as plain text — always use LaTeX

### Structure
- Use # for the main topic heading
- Use ## for major sections (Key Concept, Step-by-Step, Worked Example, Summary)
- Use ### for subsections
- Use ##### for standalone formulas
- Use ###### for Pro Tips or Common Mistakes
- Use > blockquotes for important theorems or warnings
- Use numbered lists for sequential steps
- Use **bold** for key terms
- Use --- to separate major sections

### Length
- Simple question (e.g. "What is 5+3?"): 2-4 sentences max.
- Medium question (e.g. "Explain quadratic formula"): 1 worked example + summary.
- Complex question (e.g. "Solve this integral step by step"): full working, all steps, summary.
- Always end with a ###### Pro Tip or ###### Common Mistake if space allows.`;

const GRADE_LEVEL_DESCRIPTIONS: Record<string, string> = {
  grade1:     "Grade 1 (age 6-7): Use very simple words, very short sentences, and fun real-world examples a young child would understand. Avoid all jargon.",
  grade2:     "Grade 2 (age 7-8): Use simple words and short sentences. Relate concepts to everyday objects and activities a child knows.",
  grade3:     "Grade 3 (age 8-9): Use clear, simple language. Introduce basic subject vocabulary with immediate plain-English definitions.",
  grade4:     "Grade 4 (age 9-10): Use friendly, clear language. Introduce subject terms with definitions and simple examples.",
  grade5:     "Grade 5 (age 10-11): Use clear language with some subject-specific terms. Provide step-by-step explanations with relatable examples.",
  grade6:     "Grade 6 (age 11-12): Use very simple language, short sentences, relatable real-world examples. Avoid jargon.",
  grade7:     "Grade 7 (age 12-13): Simple language, concrete examples, introduce basic terminology with clear definitions.",
  grade8:     "Grade 8 (age 13-14): Moderate complexity, introduce subject-specific terms, use step-by-step explanations.",
  grade9:     "Grade 9 (age 14-15): High school level, standard academic vocabulary, structured explanations.",
  grade10:    "Grade 10 (age 15-16): GCSE / sophomore level, precise academic language, multi-step reasoning.",
  gcse:       "GCSE / Grade 10-11: UK secondary school level, exam-focused explanations, mark-scheme style answers.",
  alevel:     "A-Level / Grade 11-12: Advanced pre-university level, rigorous explanations, introduce university concepts.",
  university: "University / Degree level: Assume strong subject knowledge, use technical terminology freely, provide rigorous academic-level explanations.",
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

interface TutorProfile {
  nickname?: string;
  tone?: "encouraging" | "formal" | "casual" | "socratic";
  responseLength?: "brief" | "standard" | "detailed";
  learningStyle?: "visual" | "step-by-step" | "conceptual" | "example-heavy";
  language?: string;
  showWorking?: boolean;
  useEmojis?: boolean;
}

function buildTutorProfileContext(profile?: TutorProfile): string {
  if (!profile) return "";
  const parts: string[] = [];

  if (profile.nickname) {
    parts.push(`Address the student as "${profile.nickname}" when appropriate.`);
  }

  const toneMap: Record<string, string> = {
    encouraging: "Be warm, positive, and encouraging. Celebrate small wins and build confidence.",
    formal:      "Use formal, precise academic language. Be professional and concise.",
    casual:      "Be relaxed and conversational, like a friendly study buddy. Use informal language.",
    socratic:    "Use the Socratic method: guide the student to discover answers through questions rather than stating them directly.",
  };
  if (profile.tone && toneMap[profile.tone]) parts.push(toneMap[profile.tone]);

  const lengthMap: Record<string, string> = {
    brief:    "Keep responses SHORT and to the point. Avoid unnecessary elaboration.",
    standard: "Provide balanced responses: thorough but not overwhelming.",
    detailed: "Provide COMPREHENSIVE, in-depth explanations. Elaborate fully on every concept.",
  };
  if (profile.responseLength && lengthMap[profile.responseLength]) parts.push(lengthMap[profile.responseLength]);

  const styleMap: Record<string, string> = {
    "visual":        "Use diagrams described in text, tables, and visual analogies where possible.",
    "step-by-step":  "Always break explanations into numbered steps. Never skip steps.",
    "conceptual":    "Focus on the underlying concept and theory before showing calculations.",
    "example-heavy": "Lead with worked examples. Show at least 2-3 examples per concept.",
  };
  if (profile.learningStyle && styleMap[profile.learningStyle]) parts.push(styleMap[profile.learningStyle]);

  if (profile.language && profile.language !== "English") {
    parts.push(`Respond in ${profile.language}.`);
  }

  if (profile.showWorking === false) {
    parts.push("Give the final answer directly without showing every intermediate working step.");
  } else if (profile.showWorking === true) {
    parts.push("Always show ALL working steps in full detail.");
  }

  if (profile.useEmojis === false) {
    parts.push("Do NOT use emoji in your responses.");
  } else if (profile.useEmojis === true) {
    parts.push("You may use emoji sparingly to make responses friendlier.");
  }

  return parts.length > 0 ? `\n\nTUTOR PERSONALISATION:\n${parts.map((p) => `- ${p}`).join("\n")}` : "";
}

export function registerChatStreamRoute(app: Express) {
  app.post("/api/chat/stream", async (req: Request, res: Response) => {
    try {
      const { messages, subject, gradeLevel, tutorProfile } = req.body as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
        subject?: string;
        gradeLevel?: string;
        tutorProfile?: TutorProfile;
      };

      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      const subjectContext = subject
        ? `\nThe student is currently focused on: ${subject}. Tailor your explanations to this subject when relevant.`
        : "";
      const gradeCtx =
        gradeLevel && GRADE_LEVEL_DESCRIPTIONS[gradeLevel]
          ? `\nADAPT YOUR RESPONSE to this student's level: ${GRADE_LEVEL_DESCRIPTIONS[gradeLevel]}`
          : "";
      const profileCtx = buildTutorProfileContext(tutorProfile);
      const systemPrompt = CHAT_SYSTEM_PROMPT + subjectContext + gradeCtx + profileCtx;

      // Scale max_tokens by the complexity of the last user message.
      // Floors are intentionally generous — a math explanation always needs room.
      // ≤10 words → 1200 (short question but may need a full worked solution)
      // ≤30 words → 1600 (medium explanation)
      // >30 words → 2000 (long/multi-part question)
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const wordCount = lastUserMsg.trim().split(/\s+/).filter(Boolean).length;
      const streamMaxTokens = wordCount <= 10 ? 1200 : wordCount <= 30 ? 1600 : 2000;

      const payload = {
        model: "gpt-4o-mini",
        stream: true,
        max_tokens: streamMaxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      };

      const upstream = await fetch(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        const errText = await upstream.text();
        res.status(502).json({ error: `LLM error: ${upstream.status} ${errText}` });
        return;
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      const reader = upstream.body?.getReader();
      if (!reader) {
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      const flush = () => {
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (raw === "[DONE]") {
            res.write("data: [DONE]\n\n");
            return;
          }
          try {
            const parsed = JSON.parse(raw) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch {
            // skip malformed chunk
          }
        }
      };

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        flush();
      }

      // Flush any remaining buffer
      if (buffer.trim()) {
        buffer += "\n";
        flush();
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("[chatStream] error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      } else {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
