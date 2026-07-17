/**
 * Image quality analysis and enhancement for document scanning.
 * Analyzes brightness, contrast, focus, and applies preprocessing.
 */

export interface ImageQualityScore {
  brightness: number;      // 0-100: optimal range 40-200 (out of 255)
  contrast: number;        // 0-100: dynamic range (optimal 100-200)
  focus: number;           // 0-100: edge density / sharpness
  overall: number;         // 0-100: weighted average
  isAcceptable: boolean;   // true if quality >= 65
  recommendations: string[];
}

/**
 * Analyze image quality from base64 string or file path.
 * Returns quality metrics and recommendations.
 */
export async function analyzeImageQuality(imageBase64: string): Promise<ImageQualityScore> {
  try {
    // Convert base64 to ImageData for analysis
    const imageData = await base64ToImageData(imageBase64);
    if (!imageData) {
      return {
        brightness: 0,
        contrast: 0,
        focus: 0,
        overall: 0,
        isAcceptable: false,
        recommendations: ["Unable to analyze image. Please try again."],
      };
    }

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale for analysis
    const grayscale = toGrayscale(data);

    // Calculate metrics
    const brightness = calculateBrightness(grayscale);
    const contrast = calculateContrast(grayscale);
    const focus = calculateFocus(grayscale, width, height);

    // Weighted average
    const overall = brightness * 0.3 + contrast * 0.35 + focus * 0.35;

    // Generate recommendations
    const recommendations: string[] = [];
    if (brightness < 40) recommendations.push("Image too dark. Try better lighting.");
    if (brightness > 90) recommendations.push("Image too bright. Reduce glare or adjust angle.");
    if (contrast < 50) recommendations.push("Low contrast. Ensure text is clearly visible.");
    if (focus < 60) recommendations.push("Image may be blurry. Hold camera steady.");

    return {
      brightness: Math.round(brightness),
      contrast: Math.round(contrast),
      focus: Math.round(focus),
      overall: Math.round(overall),
      isAcceptable: overall >= 65,
      recommendations,
    };
  } catch (error) {
    console.error("Error analyzing image quality:", error);
    return {
      brightness: 0,
      contrast: 0,
      focus: 0,
      overall: 0,
      isAcceptable: false,
      recommendations: ["Error analyzing image. Please try again."],
    };
  }
}

/**
 * Enhance image quality: adjust contrast, brightness, denoise.
 * Returns enhanced base64 string.
 */
export async function enhanceImage(imageBase64: string): Promise<string> {
  try {
    const imageData = await base64ToImageData(imageBase64);
    if (!imageData) return imageBase64; // Return original if conversion fails

    const data = imageData.data;
    const grayscale = toGrayscale(data);

    // Apply CLAHE-like contrast enhancement (simplified)
    const enhanced = enhanceContrast(grayscale);

    // Apply light denoise (median filter)
    const denoised = denoise(enhanced);

    // Convert back to RGBA
    const enhancedData = new Uint8ClampedArray(data.length);
    for (let i = 0; i < denoised.length; i++) {
      enhancedData[i * 4] = denoised[i];     // R
      enhancedData[i * 4 + 1] = denoised[i]; // G
      enhancedData[i * 4 + 2] = denoised[i]; // B
      enhancedData[i * 4 + 3] = 255;         // A
    }

    // Convert back to base64
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return imageBase64;

    const newImageData = ctx.createImageData(imageData.width, imageData.height);
    newImageData.data.set(enhancedData);
    ctx.putImageData(newImageData, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  } catch (error) {
    console.error("Error enhancing image:", error);
    return imageBase64; // Return original on error
  }
}

/**
 * Convert base64 string to ImageData.
 */
async function base64ToImageData(base64: string): Promise<ImageData | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(imageData);
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Convert RGBA to grayscale.
 */
function toGrayscale(data: Uint8ClampedArray): Uint8ClampedArray {
  const grayscale = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    grayscale[i / 4] = Math.round(
      0.299 * data[i] +
      0.587 * data[i + 1] +
      0.114 * data[i + 2]
    );
  }
  return grayscale;
}

/**
 * Calculate brightness score (0-100).
 * Optimal range: 60-180 (out of 255).
 */
function calculateBrightness(grayscale: Uint8ClampedArray): number {
  let sum = 0;
  for (let i = 0; i < grayscale.length; i++) {
    sum += grayscale[i];
  }
  const avgBrightness = sum / grayscale.length;

  // Scoring function
  if (avgBrightness < 30) return (avgBrightness / 30) * 20;
  if (avgBrightness < 60) return 20 + ((avgBrightness - 30) / 30) * 30;
  if (avgBrightness <= 180) return 100;
  if (avgBrightness < 220) return 100 - ((avgBrightness - 180) / 40) * 30;
  return Math.max(20, 70 - ((avgBrightness - 220) / 35) * 70);
}

/**
 * Calculate contrast score (0-100).
 * Optimal range: 100-200 (dynamic range).
 */
function calculateContrast(grayscale: Uint8ClampedArray): number {
  let min = 255;
  let max = 0;

  for (let i = 0; i < grayscale.length; i++) {
    if (grayscale[i] < min) min = grayscale[i];
    if (grayscale[i] > max) max = grayscale[i];
  }

  const dynamicRange = max - min;

  if (dynamicRange < 50) return (dynamicRange / 50) * 30;
  if (dynamicRange < 100) return 30 + ((dynamicRange - 50) / 50) * 40;
  if (dynamicRange <= 200) return 100;
  return Math.max(50, 100 - ((dynamicRange - 200) / 55) * 50);
}

/**
 * Calculate focus score (0-100) based on edge density.
 * High edge density = sharp, in-focus image.
 */
function calculateFocus(grayscale: Uint8ClampedArray, width: number, height: number): number {
  let edgeCount = 0;
  const sampleSize = Math.min(width * height, 5000);
  const step = Math.max(1, Math.floor((width * height) / sampleSize));

  for (let i = 0; i < grayscale.length - width; i += step) {
    const dx = Math.abs(grayscale[i + 1] - grayscale[i]);
    const dy = Math.abs(grayscale[i + width] - grayscale[i]);
    if (dx > 20 || dy > 20) edgeCount++;
  }

  const edgeDensity = (edgeCount / (sampleSize / step)) * 100;
  return Math.min(100, edgeDensity * 1.5);
}

/**
 * Enhance contrast using histogram stretching.
 */
function enhanceContrast(grayscale: Uint8ClampedArray): Uint8ClampedArray {
  // Find min and max
  let min = 255;
  let max = 0;
  for (let i = 0; i < grayscale.length; i++) {
    if (grayscale[i] < min) min = grayscale[i];
    if (grayscale[i] > max) max = grayscale[i];
  }

  const range = max - min || 1;
  const enhanced = new Uint8ClampedArray(grayscale.length);

  // Stretch histogram
  for (let i = 0; i < grayscale.length; i++) {
    enhanced[i] = Math.round(((grayscale[i] - min) / range) * 255);
  }

  return enhanced;
}

/**
 * Light denoise using median filter (3x3).
 */
function denoise(grayscale: Uint8ClampedArray): Uint8ClampedArray {
  const denoised = new Uint8ClampedArray(grayscale.length);
  const width = Math.sqrt(grayscale.length);
  const height = width;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const neighbors = [
        grayscale[idx - width - 1],
        grayscale[idx - width],
        grayscale[idx - width + 1],
        grayscale[idx - 1],
        grayscale[idx],
        grayscale[idx + 1],
        grayscale[idx + width - 1],
        grayscale[idx + width],
        grayscale[idx + width + 1],
      ];
      neighbors.sort((a, b) => a - b);
      denoised[idx] = neighbors[4]; // Median
    }
  }

  // Copy edges unchanged
  for (let i = 0; i < width; i++) {
    denoised[i] = grayscale[i];
    denoised[(height - 1) * width + i] = grayscale[(height - 1) * width + i];
  }
  for (let i = 0; i < height; i++) {
    denoised[i * width] = grayscale[i * width];
    denoised[i * width + width - 1] = grayscale[i * width + width - 1];
  }

  return denoised;
}

/**
 * Determine if image should be enhanced or rejected.
 */
export function shouldEnhanceImage(quality: ImageQualityScore): boolean {
  return quality.overall >= 50 && quality.overall < 75;
}

export function shouldRejectImage(quality: ImageQualityScore): boolean {
  return quality.overall < 50;
}
