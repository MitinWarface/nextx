/**
 * PATCH  /api/users/me/reminders/[reminderId] — mark complete
 * DELETE /api/users/me/reminders/[reminderId] — remove
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, noContent, HttpError } from "@/lib/api-helpers";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { reminderId } = await params;

    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, userId: me.id },
    });
    if (!reminder) throw new HttpError(404, "reminder_not_found");

    const updated = await prisma.reminder.update({
      where: { id: reminderId },
      data: { isCompleted: true },
    });

    return ok({ reminder: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> },
) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");
    const { reminderId } = await params;

    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, userId: me.id },
    });
    if (!reminder) throw new HttpError(404, "reminder_not_found");

    await prisma.reminder.delete({ where: { id: reminderId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
