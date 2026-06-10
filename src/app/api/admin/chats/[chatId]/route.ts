import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    await requireAdmin(req.headers.get("cookie") ?? undefined);

    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { type: true } });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (chat.type === "SERVICE" || chat.type === "SELF") {
      return NextResponse.json({ error: "cannot_delete_system_chat" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { chatId } }),
      prisma.participant.deleteMany({ where: { chatId } }),
      prisma.chat.delete({ where: { id: chatId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error" }, { status: err.status ?? 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { chatId } = await params;
    const body = await req.json();
    const { isArchived, isFrozen, name, description } = body as {
      isArchived?: boolean;
      isFrozen?: boolean;
      name?: string;
      description?: string;
    };

    const chat = await prisma.chat.findUnique({ where: { id: chatId }, select: { type: true } });
    if (!chat) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (chat.type === "SERVICE" || chat.type === "SELF") {
      return NextResponse.json({ error: "cannot_modify_system_chat" }, { status: 403 });
    }

    const data: any = {};
    if (isArchived !== undefined) data.isArchived = isArchived;
    if (isFrozen !== undefined) data.isFrozen = isFrozen;
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "no_fields" }, { status: 400 });
    }

    const updated = await prisma.chat.update({ where: { id: chatId }, data });

    if (isArchived !== undefined) {
      await logAudit(admin.id, "SETTINGS_CHANGE", `chat:${chatId}`, {
        action: isArchived ? "archive" : "unarchive",
      });
    }
    if (isFrozen !== undefined) {
      await logAudit(admin.id, "SETTINGS_CHANGE", `chat:${chatId}`, {
        action: isFrozen ? "freeze" : "unfreeze",
      });
    }

    return NextResponse.json({ ok: true, chat: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Error" }, { status: err.status ?? 500 });
  }
}

export const dynamic = "force-dynamic";
