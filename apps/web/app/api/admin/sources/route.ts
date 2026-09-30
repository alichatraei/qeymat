import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { ADAPTERS, markRemoved, setMuted } from "@/lib/source-admin";

const schema = z.object({
  key: z.string().min(2),
  title: z.string().min(2).max(60).optional(),
  isActive: z.boolean().optional(),
  intervalSec: z.number().int().min(15).max(86400).optional(),
  weight: z.number().min(0.1).max(3).optional(),
  endpoint: z.string().url().optional(),
  config: z.record(z.unknown()).optional(),
});

const createSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,30}$/, "کلید فقط حروف کوچک انگلیسی، عدد و خط تیره (مثلاً my-exchange)"),
  title: z.string().min(2).max(60),
  adapter: z.enum(ADAPTERS.map((item) => item.id) as [string, ...string[]]),
  endpoint: z.string().url().optional().or(z.literal("")),
  intervalSec: z.number().int().min(15).max(86400),
  weight: z.number().min(0.1).max(3),
  config: z.record(z.unknown()).optional(),
});

async function requireAdmin() {
  const admin = await getSessionUser();
  return admin?.role === "ADMIN" ? admin : null;
}

const forbidden = () =>
  NextResponse.json({ error: { code: "forbidden", message: "دسترسی ندارید." } }, { status: 403 });

/** افزودن منبع تازه */
export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." } },
      { status: 400 },
    );
  }
  const { endpoint, config, ...data } = parsed.data;
  const exists = await prisma.source.findUnique({ where: { key: data.key } });
  if (exists) {
    return NextResponse.json({ error: { code: "exists", message: "منبعی با این کلید هست." } }, { status: 400 });
  }
  const source = await prisma.source.create({
    data: { ...data, endpoint: endpoint || "", config: (config ?? {}) as object, isActive: true },
  });
  // اگر قبلاً حذف شده بود، دیگر در فهرست حذف‌شده‌ها نمی‌ماند
  await markRemoved(data.key, false);
  return NextResponse.json({ ok: true, source });
}

/** حذف منبع و نقل‌قول‌هایش؛ seed هم دیگر آن را نمی‌سازد */
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return forbidden();
  const key = request.nextUrl.searchParams.get("key") || "";
  const source = await prisma.source.findUnique({ where: { key } });
  if (!source) {
    return NextResponse.json({ error: { code: "not_found", message: "منبع پیدا نشد." } }, { status: 404 });
  }
  await prisma.$transaction([
    prisma.sourceQuote.deleteMany({ where: { sourceKey: key } }),
    prisma.source.delete({ where: { key } }),
  ]);
  await markRemoved(key, true);
  await setMuted(key, false);
  return NextResponse.json({ ok: true });
}

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
      ...(changes.title ? { title: changes.title } : {}),
      ...(changes.weight ? { weight: changes.weight } : {}),
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
