/**
 * Email OTP Sign-In Client Helpers
 *
 * Uses direct fetch to the tRPC endpoint (same pattern as oauth-service.ts)
 * to avoid the React-hook-only restriction of the tRPC React client.
 */

import { getApiBaseUrl } from "@/constants/oauth";

export interface EmailOtpResult {
  success: boolean;
  error?: string;
  message?: string;
  devCode?: string; // Only present in development builds
}

export interface EmailVerifyResult {
  success: boolean;
  error?: string;
  user?: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
  };
}

async function trpcPost<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
  const apiUrl = getApiBaseUrl();
  const response = await fetch(`${apiUrl}/api/trpc/${procedure}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  const raw = await response.json();
  const result = raw?.result?.data?.json;
  if (result === undefined) {
    throw new Error("Unexpected server response shape");
  }
  return result as T;
}

/**
 * Request a 6-digit OTP for the given email address.
 */
export async function sendEmailOtp(email: string): Promise<EmailOtpResult> {
  try {
    return await trpcPost<EmailOtpResult>("emailAuth.sendOtp", { email });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send OTP",
    };
  }
}

/**
 * Verify the 6-digit OTP and sign in / register the user.
 */
export async function verifyEmailOtp(
  email: string,
  code: string,
  name?: string
): Promise<EmailVerifyResult> {
  try {
    return await trpcPost<EmailVerifyResult>("emailAuth.verifyOtp", { email, code, name });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify OTP",
    };
  }
}
