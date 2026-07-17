/**
 * Direct HTTP endpoint for solving math problems from images
 * Bypasses tRPC to work around serialization issues
 */

import { Express } from "express";
import { callOpenAI, type OpenAIMessage } from "./openai-integration";

export function registerSolveDirectRoute(app: Express) {
  app.post("/api/solve-direct", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", subject = "other", gradeLevel } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }

      console.log(`[solve-direct] Solving image for subject: ${subject}`);

      // Build the message with image
      const messages: OpenAIMessage[] = [
        {
          role: "system",
          content: `You are a helpful math tutor. Solve the math problem in the image. Subject: ${subject}${gradeLevel ? `, Grade: ${gradeLevel}` : ""}. Return JSON with: {"problem": "...", "answer": "...", "steps": [...], "conceptExplained": "...", "tips": "...", "subject": "${subject}"}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Solve this math problem and return the result as JSON.",
            },
          ] as any,
        },
      ];

      // Call OpenAI
      const response = await callOpenAI({
        model: "gpt-4o",
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      });

      // Extract and parse the JSON response
      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { answer: content };

      return res.json(result);
    } catch (error) {
      console.error("[solve-direct] Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
