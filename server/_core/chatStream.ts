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

const CHAT_SYSTEM_PROMPT = `You are TutorSnap, a friendly and expert academic tutor covering all school subjects.
You help students understand concepts across Mathematics, English/Language Arts, Science, and Social Studies.
Be encouraging, clear, and pedagogical. Always provide thorough, detailed explanations.

When explaining a concept:
- Start with a clear definition or overview
- Break it down step by step with numbered steps where appropriate
- Provide at least 1-2 worked examples
- Explain WHY, not just HOW
- End with a helpful tip or common mistake to avoid

Never give one-line answers. Always elaborate and teach deeply.
Adapt your tone and vocabulary to the subject: precise for math/science, analytical for literature/history.

## FORMATTING RULES — follow these exactly:

### Mathematics & Science
- ALWAYS use LaTeX for ALL mathematical expressions, no exceptions:
  - Inline math: wrap in single dollar signs → $x^2 + y^2 = r^2$
  - Block/display math (standalone equations): wrap in double dollar signs → $$\\frac{d}{dx}[x^n] = nx^{n-1}$$
  - Use LaTeX for: fractions (\\frac{}{}), exponents (^), subscripts (_), Greek letters (\\alpha, \\beta, \\pi), integrals (\\int), summations (\\sum), square roots (\\sqrt{}), matrices
  - NEVER write math as plain text (e.g., never write "x^2" or "sqrt(x)" — always use $x^2$ or $\\sqrt{x}$)

### Structure & Headings
- Use ## for major sections (e.g., ## Definition, ## Step-by-Step, ## Example, ## Key Insight)
- Use ### for subsections
- Use --- (horizontal rule) to separate major conceptual sections
- Use > blockquotes for key definitions, important theorems, or critical warnings
- Use numbered lists (1. 2. 3.) for sequential steps
- Use bullet lists (- ) for non-sequential items
- Use **bold** for key terms and important values
- Use backtick inline code for variable names, function names, or short expressions in programming contexts

### Code
- Always use fenced code blocks with language identifier (e.g. python, javascript, etc.)

### Tables
- Use Markdown tables for comparisons, data, or structured information

### Length & Depth
- Standard response: 3-6 sections with worked examples
- Never truncate a worked example — always complete it fully
- After the main explanation, add a > **Key Insight:** blockquote summarizing the core takeaway`;

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

      const payload = {
        model: "gpt-4o-mini",
        stream: true,
        max_tokens: 2000,
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
