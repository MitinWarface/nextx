import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    await requireAdmin(_req.headers.get("cookie") ?? undefined);
    const { chatId } = await params;

    const total = await (prisma as any).report.count({
      where: { targetChatId: chatId },
    });

    return ok({ total });
  } catch (err) {
    return fail(err);
  }
}
