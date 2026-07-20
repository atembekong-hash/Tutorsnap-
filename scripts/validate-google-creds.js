const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const webId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

function valid(id) {
  return id && !id.startsWith("https://") && id.endsWith(".apps.googleusercontent.com");
}

console.log("Android valid:", valid(androidId), "->", androidId ? androidId.substring(0, 40) : "MISSING");
console.log("Web valid:", valid(webId), "->", webId ? webId.substring(0, 40) : "MISSING");
console.log("iOS valid:", valid(iosId), "->", iosId ? iosId.substring(0, 40) : "MISSING");

if (valid(androidId) && valid(webId) && valid(iosId)) {
  console.log("✅ All client IDs are correctly formatted");
} else {
  console.log("❌ Some client IDs are still malformed");
  process.exit(1);
}
