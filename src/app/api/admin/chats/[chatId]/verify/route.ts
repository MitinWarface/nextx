import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson } from "@/lib/api-helpers";
import { requireAdmin, logAudit } from "@/lib/admin-auth";

const verifySchema = z.object({
  isVerified: z.boolean(),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { chatId } = await params;
    const body = await parseJson(req, verifySchema);

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true, name: true, type: true },
    });
    if (!chat) return fail({ status: 404, message: "chat_not_found" });

    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: {
        isVerified: body.isVerified,
        verificationNote: body.isVerified ? (body.note ?? null) : null,
      },
      select: { id: true, isVerified: true, verificationNote: true },
    });

    await logAudit(
      admin.id,
      "SETTINGS_CHANGE",
      `chat:${chatId}`,
      { action: body.isVerified ? "verify" : "unverify", note: body.note },
    );

    return ok({ chat: updated });
  } catch (err) {
    return fail(err);
  }
}
