/**
 * Shared application-level constants.
 * All hardcoded URLs, email addresses, and app-wide strings belong here.
 * Import from this file instead of repeating strings across screens.
 */

export const APP_NAME = "TutorSnap";
export const APP_URL = "https://tutorsnapai.tech";
export const SUPPORT_EMAIL = "support@tutorsnapai.tech";
export const PRIVACY_URL = `${APP_URL}/privacy`;
export const TERMS_URL = `${APP_URL}/terms`;

/** Build a deep-link solve URL for sharing a specific problem */
export function buildSolveUrl(problem: string, subject: string): string {
  return `${APP_URL}/solve?q=${encodeURIComponent(problem)}&subject=${encodeURIComponent(subject)}`;
}

/** Build a referral deep-link URL with the user's invite code attached */
export function buildReferralUrl(code: string): string {
  return `${APP_URL}?ref=${encodeURIComponent(code)}`;
}
