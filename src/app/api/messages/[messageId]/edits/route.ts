/**
 * GET /api/messages/[messageId]/edits — edit history for a message
 */
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, chatId: true },
    });
    if (!message) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Only message author and admins can view edit history
    const participant = await prisma.participant.findUnique({
      where: { chatId_userId: { chatId: message.chatId, userId: user!.id } },
      select: { role: true },
    });
    const isAdmin = participant?.role === "OWNER" || participant?.role === "ADMIN";
    const isAuthor = message.senderId === user!.id;
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const edits = await prisma.messageEdit.findMany({
      where: { messageId },
      orderBy: { createdAt: "desc" },
      include: {
        editor: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    return ok({
      edits: edits.map((e) => ({
        id: e.id,
        oldContent: e.oldContent,
        newContent: e.newContent,
        editedBy: e.editor,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
