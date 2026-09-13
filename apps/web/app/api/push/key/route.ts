import { NextResponse } from "next/server";

/** کلید عمومی VAPID برای ثبت اشتراک در مرورگر. */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
}
