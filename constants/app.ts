/**
 * TutorSnap — Centralized Brand Configuration
 * Single source of truth for all brand identity, contact, and metadata values.
 * Every screen, component, and service must import from this file.
 * DO NOT hardcode any of these values elsewhere in the codebase.
 */

// ─── Company Identity ─────────────────────────────────────────────────────────
export const COMPANY_NAME = "Etiendem Technologies";
export const APP_NAME = "TutorSnap";
export const APP_FULL_NAME = "TutorSnap AI";
export const AI_ASSISTANT_NAME = "AI Tutor";
export const TAGLINE = "Learn Smarter. Achieve More.";
export const COPYRIGHT = `© 2026 ${COMPANY_NAME}`;
export const SOCIAL_HANDLE = "@TutorSnapAIOfficial";

// ─── Official URLs ────────────────────────────────────────────────────────────
export const APP_URL = "https://tutorsnapai.tech";
export const APP_URL_WWW = "https://www.tutorsnapai.tech";
export const HELP_URL = "https://help.tutorsnapai.tech";
export const DOCS_URL = "https://docs.tutorsnapai.tech";
export const STATUS_URL = "https://status.tutorsnapai.tech";
export const BLOG_URL = "https://blog.tutorsnapai.tech";
export const ROADMAP_URL = "https://roadmap.tutorsnapai.tech";
export const TRUST_URL = "https://trust.tutorsnapai.tech";
export const DEVELOPER_URL = "https://developers.tutorsnapai.tech";
export const CAREERS_URL = "https://careers.tutorsnapai.tech";

// ─── Legal URLs ───────────────────────────────────────────────────────────────
export const PRIVACY_URL = `${APP_URL}/privacy`;
export const TERMS_URL = `${APP_URL}/terms`;
export const COOKIE_POLICY_URL = `${APP_URL}/cookies`;

// ─── Official Email Addresses ─────────────────────────────────────────────────
export const SUPPORT_EMAIL = "support@tutorsnapai.tech";
export const CONTACT_EMAIL = "contact@tutorsnapai.tech";
export const PARTNERSHIPS_EMAIL = "partnerships@tutorsnapai.tech";
export const PRESS_EMAIL = "press@tutorsnapai.tech";
export const LEGAL_EMAIL = "legal@tutorsnapai.tech";
export const PRIVACY_EMAIL = "privacy@tutorsnapai.tech";
export const SECURITY_EMAIL = "security@tutorsnapai.tech";
export const CAREERS_EMAIL = "careers@tutorsnapai.tech";
export const NOREPLY_EMAIL = "noreply@tutorsnapai.tech";
export const FEEDBACK_EMAIL = "feedback@tutorsnapai.tech";
export const BUGS_EMAIL = "bugs@tutorsnapai.tech";

// ─── Social Media ─────────────────────────────────────────────────────────────
export const SOCIAL_TWITTER = "https://twitter.com/TutorSnapAIOfficial";
export const SOCIAL_INSTAGRAM = "https://instagram.com/TutorSnapAIOfficial";
export const SOCIAL_TIKTOK = "https://tiktok.com/@TutorSnapAIOfficial";
export const SOCIAL_YOUTUBE = "https://youtube.com/@TutorSnapAIOfficial";
export const SOCIAL_LINKEDIN = "https://linkedin.com/company/etiendem-technologies";

// ─── App Store Links ──────────────────────────────────────────────────────────
export const IOS_STORE_URL = "https://apps.apple.com/app/tutorsnap/id6748752791";
export const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.tutorsnap.app";

// ─── Deep Link Builders ───────────────────────────────────────────────────────
/** Build a deep-link solve URL for sharing a specific problem */
export function buildSolveUrl(problem: string, subject: string): string {
  return `${APP_URL}/solve?q=${encodeURIComponent(problem)}&subject=${encodeURIComponent(subject)}`;
}

/** Build a referral deep-link URL with the user's invite code attached */
export function buildReferralUrl(code: string): string {
  return `${APP_URL}?ref=${encodeURIComponent(code)}`;
}

/** Build a classroom join URL */
export function buildClassroomUrl(code: string): string {
  return `${APP_URL}/classroom?code=${encodeURIComponent(code)}`;
}
