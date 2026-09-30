-- کد تأیید مرحله‌ی دوم مدیر برای ارتقای دستی کاربر
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'ADMIN_GRANT';
