/**
 * Sharing utilities for generating and sharing deep links with analytics tracking
 */

import * as Sharing from "expo-sharing";
import * as WebClipboard from "expo-clipboard";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logShareEvent, logReferralEvent } from "./analytics";

const REFERRAL_CODE_KEY = "@tutorsnap/referralCode";
const APP_SCHEME = "tutorsnap://";
const WEB_DOMAIN = "https://tutorsnap.app";

/**
 * Generate a deep link URL for a specific screen
 */
export function generateDeepLink(screen: string, params?: Record<string, string>): string {
  const paramString = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${APP_SCHEME}${screen}${paramString}`;
}

/**
 * Generate a web link for a specific screen
 */
export function generateWebLink(screen: string, params?: Record<string, string>): string {
  const paramString = params ? `?${new URLSearchParams(params).toString()}` : "";
  return `${WEB_DOMAIN}/${screen}${paramString}`;
}

/**
 * Share leaderboard rank via native share sheet
 */
export async function shareLeaderboardRank(
  userName: string,
  rank: number,
  solvedThisWeek: number,
  streak: number
): Promise<void> {
  const message = `🏆 I'm ranked #${rank} on the TutorSnap leaderboard this week!\n\n📊 Stats:\n• Problems solved: ${solvedThisWeek}\n• Current streak: ${streak} days\n\nJoin me and compete! 🚀`;
  
  const deepLink = generateDeepLink("leaderboard");
  const webLink = generateWebLink("leaderboard");
  
  const fullMessage = Platform.OS === "web" 
    ? `${message}\n\n${webLink}`
    : `${message}\n\n${deepLink}`;

  try {
    const platform = Platform.OS === "web" ? "clipboard" : "native_share";
    await logShareEvent("share_leaderboard", { rank, solvedThisWeek, streak, platform });
    
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(fullMessage);
    } else {
      await Sharing.shareAsync(fullMessage, {
        mimeType: "text/plain",
        dialogTitle: "Share Your Leaderboard Rank",
      });
    }
  } catch (error) {
    console.warn("Failed to share leaderboard rank:", error);
  }
}

/**
 * Copy leaderboard link to clipboard
 */
export async function copyLeaderboardLink(): Promise<void> {
  const link = generateWebLink("leaderboard");
  try {
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(link);
    } else {
      // console.log("Leaderboard link:", link);
    }
  } catch (error) {
    console.warn("Failed to copy leaderboard link:", error);
  }
}

/**
 * Share a specific solution via deep link
 */
export async function shareSolution(
  solutionId: string,
  problemText: string,
  subject?: string
): Promise<void> {
  const message = `📚 Check out this solution on TutorSnap!\n\nProblem: ${problemText}${subject ? `\nSubject: ${subject}` : ""}\n\nGet step-by-step solutions for any problem! 🎓`;
  
  const deepLink = generateDeepLink("solution", { id: solutionId });
  const webLink = generateWebLink(`solution/${solutionId}`);
  
  const fullMessage = Platform.OS === "web"
    ? `${message}\n\n${webLink}`
    : `${message}\n\n${deepLink}`;

  try {
    const platform = Platform.OS === "web" ? "clipboard" : "native_share";
    await logShareEvent("share_solution", { solutionId, subject, platform });
    
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(fullMessage);
    } else {
      await Sharing.shareAsync(fullMessage, {
        mimeType: "text/plain",
        dialogTitle: "Share Solution",
      });
    }
  } catch (error) {
    console.warn("Failed to share solution:", error);
  }
}

/**
 * Copy solution link to clipboard
 */
export async function copySolutionLink(solutionId: string): Promise<void> {
  const link = generateWebLink(`solution/${solutionId}`);
  try {
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(link);
    } else {
      // console.log("Solution link:", link);
    }
  } catch (error) {
    console.warn("Failed to copy solution link:", error);
  }
}

/**
 * Get or create referral code
 */
export async function getReferralCode(): Promise<string> {
  try {
    let code = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
    if (!code) {
      code = `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
      await logReferralEvent("referral_code_generated", { referralCode: code });
    }
    return code;
  } catch (error) {
    console.warn("Failed to get referral code:", error);
    return "TUTORSNAP";
  }
}

/**
 * Generate referral link with tracking
 */
export async function generateReferralLink(): Promise<string> {
  const code = await getReferralCode();
  return generateWebLink("", { ref: code });
}

/**
 * Share referral link
 */
export async function shareReferralLink(): Promise<void> {
  const code = await getReferralCode();
  const link = generateWebLink("", { ref: code });
  
  const message = `🎓 Join me on TutorSnap! Get AI-powered solutions for any math or science problem.\n\nUse my referral code: ${code}\n\n${link}`;

  try {
    const platform = Platform.OS === "web" ? "clipboard" : "native_share";
    await logShareEvent("share_referral", { referralCode: code, platform });
    await logReferralEvent("referral_link_shared", { referralCode: code });
    
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(message);
    } else {
      await Sharing.shareAsync(message, {
        mimeType: "text/plain",
        dialogTitle: "Share TutorSnap",
      });
    }
  } catch (error) {
    console.warn("Failed to share referral link:", error);
  }
}

/**
 * Copy referral link to clipboard
 */
export async function copyReferralLink(): Promise<void> {
  const link = await generateReferralLink();
  try {
    if (Platform.OS === "web") {
      await WebClipboard.setStringAsync(link);
    } else {
      // console.log("Referral link:", link);
    }
  } catch (error) {
    console.warn("Failed to copy referral link:", error);
  }
}
