import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SIZES = new Set(["sm", "md", "lg"]);
const MAX_TILES = 40;

type LayoutItem = { assetId: string; size: "sm" | "md" | "lg" };

function parseItems(value: unknown): LayoutItem[] | null {
  if (!Array.isArray(value) || value.length > MAX_TILES) return null;
  const items: LayoutItem[] = [];
  for (const entry of value) {
    const assetId = typeof entry?.assetId === "string" ? entry.assetId.toUpperCase().slice(0, 16) : null;
    const size = SIZES.has(entry?.size) ? (entry.size as LayoutItem["size"]) : null;
    if (!assetId || !size) return null;
    items.push({ assetId, size });
  }
  return items;
}

/** چیدمان بنتوی صفحهٔ بازار کاربر؛ وب و موبایل جدا ذخیره می‌شوند */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد نشده‌اید." } }, { status: 401 });
  }
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { marketLayout: true } });
  return NextResponse.json(
    { layout: row?.marketLayout ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "وارد نشده‌اید." } }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const platform = body?.platform === "mobile" ? "mobile" : "web";
  const items = parseItems(body?.items);
  if (!items) {
    return NextResponse.json({ error: { code: "invalid_body", message: "چیدمان معتبر نیست." } }, { status: 400 });
  }

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { marketLayout: true } });
  const current =
    row?.marketLayout && typeof row.marketLayout === "object" && !Array.isArray(row.marketLayout)
      ? (row.marketLayout as Record<string, LayoutItem[]>)
      : {};
  await prisma.user.update({
    where: { id: user.id },
    data: { marketLayout: { ...current, [platform]: items } },
  });
  return NextResponse.json({ ok: true });
}
