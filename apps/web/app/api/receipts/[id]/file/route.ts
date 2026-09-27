import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@qeymat/db";
import { getSessionUser } from "@/lib/auth";
import { readReceipt } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** تصویر فیش — فقط برای صاحب فیش و مدیران */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("unauthorized", { status: 401 });

  const { id } = await params;
  const receipt = await prisma.receiptPayment.findUnique({ where: { id } });
  if (!receipt || (receipt.userId !== user.id && user.role !== "ADMIN")) {
    return new NextResponse("not found", { status: 404 });
  }

  const bytes = await readReceipt(receipt.receiptFile);
  if (!bytes) return new NextResponse("file missing", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": receipt.receiptMime,
      "Content-Disposition": `inline; filename="receipt-${receipt.id}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
