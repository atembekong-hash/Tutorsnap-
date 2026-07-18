/**
 * Test: Streaming Math Rendering Pipeline
 * 
 * Verifies that the streaming rendering pipeline handles partial LaTeX smoothly
 * without breaking auto-scroll or displaying raw formatting artifacts.
 */

import { processAIResponse, processStreamingChunk } from '../lib/ai-response-pipeline';

describe('Streaming Math Rendering Pipeline', () => {
  describe('Incomplete Math Detection', () => {
    test('should remove incomplete inline math during streaming', () => {
      // Simulating a chunk that ends with an incomplete $...$
      const chunk = 'The equation is $x^2 + 2x + 1 = (x+1)^2$. Now for the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}';
      const processed = processStreamingChunk(chunk);
      
      // The incomplete math should be removed
      expect(processed).not.toContain('$x = \\frac');
      // But the complete math should remain
      expect(processed).toContain('$x^2 + 2x + 1 = (x+1)^2$');
    });

    test('should remove incomplete block math during streaming', () => {
      const chunk = 'Here is the photosynthesis equation:\n\n$$6CO_2 + 6H_2O + \\text{light energy} \\rightarrow C_6H_{12}O_6 + 6O_2$$\n\nNow for the incomplete block:\n\n$$\\frac{a}{b} + \\frac{c';
      const processed = processStreamingChunk(chunk);
      
      // The incomplete block math should be removed
      expect(processed).not.toContain('$$\\frac{a}{b} + \\frac{c');
      // But the complete block math should remain
      expect(processed).toContain('$$6CO_2 + 6H_2O');
    });

    test('should preserve escaped dollar signs', () => {
      const chunk = 'The price is \\$50 and the equation is $x = 5$';
      const processed = processStreamingChunk(chunk);
      
      expect(processed).toContain('\\$50');
      expect(processed).toContain('$x = 5$');
    });
  });

  describe('Full Response Processing', () => {
    test('should render complete math-heavy response', () => {
      const response = `## Solving the Quadratic Equation

To solve $ax^2 + bx + c = 0$, we use the quadratic formula:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

### Example: $2x^2 - 5x + 3 = 0$

**Step 1:** Identify coefficients
- $a = 2$
- $b = -5$
- $c = 3$

**Step 2:** Calculate the discriminant
$$\\Delta = b^2 - 4ac = (-5)^2 - 4(2)(3) = 25 - 24 = 1$$

**Step 3:** Apply the formula
$$x = \\frac{-(-5) \\pm \\sqrt{1}}{2(2)} = \\frac{5 \\pm 1}{4}$$

So $x_1 = \\frac{6}{4} = \\frac{3}{2}$ and $x_2 = \\frac{4}{4} = 1$`;

      const processed = processAIResponse(response);
      
      // Check that valid math is preserved
      expect(processed).toContain('$ax^2 + bx + c = 0$');
      expect(processed).toContain('$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$');
      expect(processed).toContain('$2x^2 - 5x + 3 = 0$');
      
      // Check that Markdown is preserved
      expect(processed).toContain('## Solving the Quadratic Equation');
      expect(processed).toMatch(/Step 1:/); // Markdown formatting may be normalized
      
      // Check that no raw artifacts remain
      expect(processed).not.toMatch(/^#+[^#\s]/m); // Heading without space
    });

    test('should handle photosynthesis equation', () => {
      const response = `The photosynthesis equation is:

$$6CO_2 + 6H_2O + \\text{light energy} \\rightarrow C_6H_{12}O_6 + 6O_2$$

This shows that:
- 6 molecules of CO₂ react with 6 molecules of H₂O
- Light energy is required
- 1 glucose molecule and 6 oxygen molecules are produced`;

      const processed = processAIResponse(response);
      
      expect(processed).toContain('$$6CO_2 + 6H_2O');
      expect(processed).toContain('\\text{light energy}');
      expect(processed).toContain('\\rightarrow');
      expect(processed).toContain('C_6H_{12}O_6');
    });

    test('should handle physics equations with proper formatting', () => {
      const response = `## Newton's Second Law

The fundamental equation of motion is:

$$F = ma$$

Where:
- $F$ is the net force (in Newtons)
- $m$ is the mass (in kilograms)
- $a$ is the acceleration (in m/s²)

### Example Problem

A 5 kg object experiences a net force of 20 N. What is its acceleration?

Using $F = ma$:
$$a = \\frac{F}{m} = \\frac{20 \\text{ N}}{5 \\text{ kg}} = 4 \\text{ m/s}^2$$`;

      const processed = processAIResponse(response);
      
      expect(processed).toContain('$$F = ma$$');
      expect(processed).toContain('$F$ is the net force');
      expect(processed).toContain('$$a = \\frac{F}{m}');
      expect(processed).not.toMatch(/\\text\{[^}]*\}(?![^$]*\$)/); // \text outside math
    });
  });

  describe('Streaming Simulation', () => {
    test('should handle streaming chunks without breaking rendering', () => {
      // Simulate streaming a complex response chunk by chunk
      const chunks = [
        'To solve this problem, we need to use the quadratic formula. ',
        'The formula is: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$. ',
        'Let\'s break it down:\n\n',
        '$$\\text{Discriminant} = b^2 - 4ac$$\n\n',
        'If the discriminant is positive, we have two real solutions. ',
        'If it\'s zero, we have one solution. ',
        'If it\'s negative, we have no real solutions. ',
      ];

      let accumulated = '';
      const processedChunks: string[] = [];

      for (const chunk of chunks) {
        accumulated += chunk;
        const processed = processStreamingChunk(accumulated);
        processedChunks.push(processed);
      }

      // Final accumulated should have valid math
      const final = processedChunks[processedChunks.length - 1];
      expect(final).toContain('$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$');
      expect(final).toContain('$$\\text{Discriminant} = b^2 - 4ac$$');
    });

    test('should handle incomplete math at chunk boundaries', () => {
      // Chunk 1: Complete math
      const chunk1 = 'First equation: $x + y = 5$. ';
      const processed1 = processStreamingChunk(chunk1);
      expect(processed1).toContain('$x + y = 5$');

      // Chunk 2: Starts new incomplete math
      const chunk2 = chunk1 + 'Second equation: $2x - y = ';
      const processed2 = processStreamingChunk(chunk2);
      // Incomplete math should be removed
      expect(processed2).not.toContain('$2x - y = ');

      // Chunk 3: Completes the math
      const chunk3 = chunk1 + 'Second equation: $2x - y = 1$';
      const processed3 = processStreamingChunk(chunk3);
      expect(processed3).toContain('$2x - y = 1$');
    });
  });

  describe('Auto-scroll Compatibility', () => {
    test('should not break rendering during rapid updates', () => {
      // Simulate rapid streaming updates
      const baseResponse = 'Solving: ';
      const updates = [
        '$x^2',
        '$x^2 +',
        '$x^2 + 2x',
        '$x^2 + 2x +',
        '$x^2 + 2x + 1',
        '$x^2 + 2x + 1 =',
        '$x^2 + 2x + 1 = 0$',
      ];

      for (const update of updates) {
        const accumulated = baseResponse + update;
        const processed = processStreamingChunk(accumulated);
        // Should not throw or produce invalid output
        expect(processed).toBeDefined();
        expect(typeof processed).toBe('string');
      }
    });
  });
});
