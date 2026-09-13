/**
 * تولید جفت‌کلید VAPID برای اعلان مرورگر.
 *
 *   npm run vapid:generate
 *
 * خروجی را در فایل .env بگذارید. اگر این کلیدها را عوض کنید،
 * همه‌ی اشتراک‌های موجود باطل می‌شوند و کاربران باید دوباره اجازه بدهند.
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\nاین دو خط را در .env قرار دهید:\n");
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);
console.log("کلید خصوصی را هرگز در سمت کلاینت یا ریپو قرار ندهید.\n");
