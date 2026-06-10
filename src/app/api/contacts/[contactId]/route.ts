/**
 * DELETE /api/contacts/[contactId] — remove contact
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser } from "@/lib/api-helpers";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { contactId } = await params;

    await prisma.contact.deleteMany({
      where: { id: contactId, ownerId: user!.id },
    });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
