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
  token?: string; // Real JWT session token (same format as Google OAuth)
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

export interface ChangeEmailResult {
  success: boolean;
  error?: string;
  message?: string;
  sent?: boolean;
  devCode?: string;
}

export interface VerifyChangeEmailResult {
  success: boolean;
  error?: string;
  newEmail?: string;
}

/**
 * Send an OTP to a new email address for change-email verification.
 * Requires the user to be signed in (passes the auth token in the header).
 */
export async function sendChangeEmailOtp(
  newEmail: string,
  authToken: string
): Promise<ChangeEmailResult> {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/trpc/emailAuth.sendChangeEmailOtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ json: { newEmail } }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const raw = await response.json();
    return (raw?.result?.data?.json ?? { success: false, error: "Unexpected response" }) as ChangeEmailResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send code",
    };
  }
}

/**
 * Verify the OTP and update the user's email address.
 * Requires the user to be signed in.
 */
export async function verifyChangeEmail(
  newEmail: string,
  code: string,
  authToken: string
): Promise<VerifyChangeEmailResult> {
  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/trpc/emailAuth.verifyChangeEmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ json: { newEmail, code } }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const raw = await response.json();
    return (raw?.result?.data?.json ?? { success: false, error: "Unexpected response" }) as VerifyChangeEmailResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify code",
    };
  }
}
