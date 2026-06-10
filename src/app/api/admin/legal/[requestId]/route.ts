/**
 * PATCH /api/admin/legal/[requestId] — update status/notes
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, parseJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["PENDING", "REVIEWED", "DISMISSED", "ACTION_TAKEN"]).optional(),
  responseNotes: z.string().max(5000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { requestId } = await params;
    const body = await parseJson(req, patchSchema);

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.responseNotes !== undefined) updateData.responseNotes = body.responseNotes;

    const request = await prisma.legalRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    return ok({ request });
  } catch (err) {
    return fail(err);
  }
}
