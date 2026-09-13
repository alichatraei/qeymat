import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  key: z.string().min(2),
  isActive: z.boolean().optional(),
  intervalSec: z.number().int().min(15).max(3600).optional(),
  endpoint: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

/** ویرایش تنظیمات یک منبع نرخ از پنل مدیریت. */
export async function PATCH(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_body", message: "درخواست نامعتبر است." } }, { status: 400 });
  }

  const { key, ...changes } = parsed.data;
  const source = await prisma.source.update({
    where: { key },
    data: {
      ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
      ...(changes.intervalSec ? { intervalSec: changes.intervalSec } : {}),
      ...(changes.endpoint ? { endpoint: changes.endpoint } : {}),
      ...(changes.config ? { config: changes.config as object } : {}),
    },
  });

  return NextResponse.json({ ok: true, source });
}

/** اجرای دستی یک منبع از طریق سرویس کرالر. */
export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const workerUrl = process.env.WORKER_URL || "http://worker:4001";

  try {
    const response = await fetch(
      `${workerUrl}/run${body?.key ? `?source=${encodeURIComponent(body.key)}` : ""}`,
      {
        method: "POST",
        headers: { "x-worker-token": process.env.WORKER_TOKEN || "" },
        signal: AbortSignal.timeout(25000),
      },
    );
    const payload = await response.json();
    return NextResponse.json(payload, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "worker_unreachable", message: "سرویس کرالر پاسخ نداد." } },
      { status: 502 },
    );
  }
}
