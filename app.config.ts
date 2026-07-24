// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Production configuration
const PRODUCTION_DOMAIN = "tutorsnapai.tech";
const PRODUCTION_API_URL = `https://api.${PRODUCTION_DOMAIN}`;
const PRODUCTION_MOBILE_SCHEME = "tutorsnap";

// Bundle ID - fixed for production
const bundleId = "com.tutorsnap.app";

// Determine environment and scheme
const isProduction = process.env.NODE_ENV === "production";
const mobileScheme = PRODUCTION_MOBILE_SCHEME; // Always use tutorsnap for consistent deep linking
const scheme = mobileScheme;

const env = {
  // App branding
  appName: "TutorSnap",
  appSlug: "mathgenius-ai",
  logoUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663631387285/OgColqtMKjfePObm.png",
  scheme,
  iosBundleId: bundleId,
  androidPackage: bundleId,
  // Production URLs
  productionDomain: PRODUCTION_DOMAIN,
  productionApiUrl: PRODUCTION_API_URL,
  productionMobileScheme: PRODUCTION_MOBILE_SCHEME,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.3.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  description: "TutorSnap is your AI-powered academic tutor for every subject — from Algebra and Calculus to Chemistry, History, and Grammar. Snap a photo of any problem, type it in, or ask the AI tutor directly. Get step-by-step solutions, practice quizzes, flashcards, a study planner, and a classroom sharing tool for teachers and students.",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "16",

    associatedDomains: [
      `applinks:${PRODUCTION_DOMAIN}`,
      `applinks:www.${PRODUCTION_DOMAIN}`,
      `webcredentials:${PRODUCTION_DOMAIN}`,
    ],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription: "TutorSnap uses your photo library to scan math and science problems.",
      NSCameraUsageDescription: "TutorSnap uses your camera to take photos of problems for AI solving.",
      NSMicrophoneUsageDescription: "TutorSnap uses your microphone for voice input on the solve screen.",
      NSUserNotificationsUsageDescription: "TutorSnap sends study reminders, streak alerts, and classroom notifications.",
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
          NSPrivacyAccessedAPITypeReasons: ["C617.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
          NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
        },
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace",
          NSPrivacyAccessedAPITypeReasons: ["E174.1"],
        },
      ],
    },
  },
  android: {
    versionCode: 16,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    googleServicesFile: "./google-services.json",
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
          {
            scheme: "https",
            host: PRODUCTION_DOMAIN,
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-system-ui",
    "expo-web-browser",
    "expo-file-system",
    "expo-document-picker",
    "expo-mail-composer",
    [
      "expo-notifications",
      {
        "icon": "./assets/images/icon.png",
        "color": "#0a7ea4",
        "sounds": []
      }
    ],
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to scan problems.",
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera to take photos of problems.",
      },
    ],
    [
      "expo-camera",
      {
        "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera.",
        "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone.",
        "recordAudioAndroid": false,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    "@react-native-google-signin/google-signin",
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          kotlinVersion: "2.0.21",
          ndkVersion: "27.1.12297006",
          extraMavenRepos: [
            "https://maven.google.com",
          ],
        },
        ios: {
          // AppCheckCore (used by Firebase/Google Sign-In) depends on GoogleUtilities
          // and RecaptchaInterop as static libraries that do not define modules.
          // Setting modular_headers for these pods resolves the Swift compilation error:
          // "The Swift pod AppCheckCore depends upon GoogleUtilities and RecaptchaInterop,
          //  which do not define modules."
          useFrameworks: "static",
          extraPods: [
            {
              name: "GoogleUtilities",
              modular_headers: true,
            },
            {
              name: "RecaptchaInterop",
              modular_headers: true,
            },
          ],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
  extra: {
    eas: {
      projectId: "ce53088c-980c-49a0-ae2b-0427d8dc97c2",
    },
  },
};

export default config;
