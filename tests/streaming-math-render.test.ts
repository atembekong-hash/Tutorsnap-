/**
 * Tests for the AI Response Processing Pipeline (plain-text mode)
 * The pipeline strips ALL LaTeX, Markdown, dollar signs, em/en dashes.
 */
import { describe, test, expect } from 'vitest';
import { processAIResponse, processStreamingChunk } from '../lib/ai-response-pipeline';

describe('AI Response Processing Pipeline (Plain Text)', () => {
  describe('LaTeX Stripping', () => {
    test('should strip inline dollar-sign math', () => {
      const processed = processAIResponse('The equation $x^2 + 3x = 0$ has two solutions.');
      expect(processed).not.toContain('$');
      expect(processed).toContain('x^2 + 3x = 0');
    });

    test('should strip block math', () => {
      const processed = processAIResponse('Formula:\n$$x = \\frac{-b}{2a}$$');
      expect(processed).not.toContain('$');
      expect(processed).not.toContain('\\frac');
    });

    test('should convert frac to division', () => {
      const processed = processAIResponse('We have $\\frac{a}{b}$.');
      expect(processed).not.toContain('$');
      expect(processed).toContain('a / b');
    });

    test('should convert sqrt', () => {
      const processed = processAIResponse('Value: $\\sqrt{x}$.');
      expect(processed).not.toContain('$');
      expect(processed).toContain('sqrt(x)');
    });
  });

  describe('Markdown Stripping', () => {
    test('should strip bold', () => {
      const processed = processAIResponse('This is **bold** text.');
      expect(processed).not.toContain('**');
      expect(processed).toContain('bold');
    });

    test('should strip headings', () => {
      const processed = processAIResponse('## Step 1');
      expect(processed).not.toMatch(/^#{1,6}\s/m);
      expect(processed).toContain('Step 1');
    });

    test('should strip backticks', () => {
      const processed = processAIResponse('Use the `formula` here.');
      expect(processed).not.toContain('`');
      expect(processed).toContain('formula');
    });
  });

  describe('Special Character Stripping', () => {
    test('should replace em dashes', () => {
      const processed = processAIResponse('The answer \u2014 42.');
      expect(processed).not.toContain('\u2014');
    });

    test('should replace en dashes', () => {
      const processed = processAIResponse('Pages 10\u201320.');
      expect(processed).not.toContain('\u2013');
    });

    test('should strip stray dollar signs', () => {
      const processed = processAIResponse('The cost is $50.');
      expect(processed).not.toContain('$');
    });
  });

  describe('Full Response Processing', () => {
    test('should produce clean plain text from math-heavy response', () => {
      const response = '## Solving\nGiven $2x^2 - 5x + 3 = 0$, use **the formula**.';
      const processed = processAIResponse(response);
      expect(processed).not.toContain('$');
      expect(processed).not.toContain('**');
      expect(processed).not.toMatch(/^#{1,6}\s/m);
      expect(processed).toContain('2x^2 - 5x + 3 = 0');
    });

    test('should produce clean plain text from physics response', () => {
      const response = '## Newton\nThe equation $$F = ma$$ where **F** is force.';
      const processed = processAIResponse(response);
      expect(processed).not.toContain('$');
      expect(processed).not.toContain('**');
      expect(processed).toContain('F = ma');
    });

    test('should produce clean plain text from photosynthesis response', () => {
      const response = 'Equation: $$6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6$$';
      const processed = processAIResponse(response);
      expect(processed).not.toContain('$');
      expect(processed).not.toContain('\\rightarrow');
    });
  });

  describe('Streaming Processing', () => {
    test('should handle streaming chunks without throwing', () => {
      const chunks = ['To solve: ', 'x^2 + 2x + 1 = 0. ', 'Use the formula.'];
      let acc = '';
      for (const chunk of chunks) {
        acc += chunk;
        const processed = processStreamingChunk(acc);
        expect(processed).toBeDefined();
        expect(typeof processed).toBe('string');
        expect(processed).not.toContain('$');
      }
    });

    test('should strip LaTeX from streaming chunks', () => {
      const processed = processStreamingChunk('Equation: $2x - y = 1$');
      expect(processed).not.toContain('$');
      expect(processed).toContain('2x - y = 1');
    });

    test('should not throw on rapid updates', () => {
      const updates = ['x^2', 'x^2 +', 'x^2 + 2x', 'x^2 + 2x + 1 = 0'];
      for (const update of updates) {
        const processed = processStreamingChunk('Solving: ' + update);
        expect(processed).toBeDefined();
        expect(typeof processed).toBe('string');
      }
    });
  });
});
