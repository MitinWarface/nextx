/**
 * GET  /api/users/me/notes/[contactId] — get note for a contact
 * PUT  /api/users/me/notes/[contactId] — create or update note for a contact
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError, parseJson } from "@/lib/api-helpers";
import { z } from "zod";

const putSchema = z.object({
  note: z.string().max(5000),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { contactId } = await params;

    if (!contactId) throw new HttpError(400, "contactId_required");

    const contactNote = await prisma.contactNote.findUnique({
      where: {
        userId_contactId: { userId: user!.id, contactId },
      },
      select: {
        note: true,
        updatedAt: true,
      },
    });

    return ok({ note: contactNote?.note ?? "", updatedAt: contactNote?.updatedAt ?? null });
  } catch (err) {
    return fail(err);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { contactId } = await params;

    if (!contactId) throw new HttpError(400, "contactId_required");
    if (contactId === user!.id) throw new HttpError(400, "cannot_note_self");

    // Verify target user exists
    const target = await prisma.user.findUnique({
      where: { id: contactId },
      select: { id: true },
    });
    if (!target) throw new HttpError(404, "user_not_found");

    const body = await parseJson(req, putSchema);

    const contactNote = await prisma.contactNote.upsert({
      where: {
        userId_contactId: { userId: user!.id, contactId },
      },
      create: {
        userId: user!.id,
        contactId,
        note: body.note,
      },
      update: {
        note: body.note,
      },
      select: {
        note: true,
        updatedAt: true,
      },
    });

    return ok({ note: contactNote.note, updatedAt: contactNote.updatedAt });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
