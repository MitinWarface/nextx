/**
 * DELETE /api/users/me/visibility/[settingId] — reset visibility setting to default
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ settingId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { settingId } = await params;
    const setting = await prisma.visibilitySetting.findUnique({
      where: { id: settingId },
    });

    if (!setting) throw new HttpError(404, "setting_not_found");
    if (setting.userId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.visibilitySetting.delete({
      where: { id: settingId },
    });

    return ok({ deleted: true, settingId });
  } catch (err) {
    return fail(err);
  }
}
