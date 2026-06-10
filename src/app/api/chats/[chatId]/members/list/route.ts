import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-helpers";

// GET /api/chats/[chatId]/members  — список участников чата
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { chatId } = await params;
    // Проверяем, что я — участник
    const meP = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId, userId: me.id } },
      select: { id: true },
    });
    if (!meP) return NextResponse.json({ error: "not_a_participant" }, { status: 403 });
    const members = await prisma.participant.findMany({
      where: { chatId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    });
    return ok({ members });
  } catch (err) {
    return fail(err);
  }
}
