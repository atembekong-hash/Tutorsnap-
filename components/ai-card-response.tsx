/**
 * AICardResponse
 *
 * Renders a parsed AI response as an ordered list of ResponseCardView components.
 * Falls back to the legacy AIResponseRenderer if parsing fails or the response
 * is still streaming.
 */

import React, { useCallback } from "react";
import { View } from "react-native";

import { ResponseCardView } from "@/components/response-card";
import { AIResponseRenderer } from "@/components/ai-response-renderer";
import type { ParsedResponse, ResponseCard } from "@/lib/response-cards";

interface AICardResponseProps {
  /** Parsed card data from the server */
  parsed?: ParsedResponse | null;
  /** Raw text — used as fallback when parsed is null/undefined */
  rawText?: string;
  /** True while the server is still streaming */
  streaming?: boolean;
  /** Subject context for "Practice Similar" action */
  subject?: string;
  /** Called when user taps "Explain Simpler" on a card */
  onExplainSimpler?: (card: ResponseCard) => void;
  /** Called when user taps "Explain in More Detail" on a card */
  onExplainDetail?: (card: ResponseCard) => void;
  /** Called when user taps "Practice Similar Question" on a card */
  onPracticeSimilar?: (card: ResponseCard) => void;
  /** Called when user taps "Generate Another Example" on a card */
  onGenerateExample?: (card: ResponseCard) => void;
}

export function AICardResponse({
  parsed,
  rawText,
  streaming,
  onExplainSimpler,
  onExplainDetail,
  onPracticeSimilar,
  onGenerateExample,
}: AICardResponseProps) {
  // If we have parsed cards, render them
  if (parsed && parsed.cards && parsed.cards.length > 0) {
    return (
      <View style={{ gap: 2 }}>
        {parsed.cards.map((card, index) => (
          <ResponseCardView
            key={card.id}
            card={card}
            index={index}
            streaming={streaming}
            onExplainSimpler={onExplainSimpler}
            onExplainDetail={onExplainDetail}
            onPracticeSimilar={onPracticeSimilar}
            onGenerateExample={onGenerateExample}
          />
        ))}
      </View>
    );
  }

  // Fallback: render raw text with the legacy renderer
  if (rawText) {
    return (
      <AIResponseRenderer
        markdown={rawText}
        streaming={streaming}
      />
    );
  }

  return null;
}
