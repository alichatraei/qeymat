import { SCRIPTABLE_WIDGET } from "@/lib/scriptable-widget";

/** فایل اسکریپت ویجت برای دانلود یا باز کردن در Scriptable */
export function GET() {
  return new Response(SCRIPTABLE_WIDGET, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Disposition": 'inline; filename="qeymat.js"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
