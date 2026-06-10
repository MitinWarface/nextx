/**
 * PATCH /api/admin/business/[accountId] — update business account
 * DELETE /api/admin/business/[accountId] — delete business account
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, parseJson } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  website: z.string().url().max(500).optional(),
  verified: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { accountId } = await params;
    const body = await parseJson(req, patchSchema);

    const updateData: Record<string, unknown> = {};
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.verified !== undefined) updateData.verified = body.verified;

    const account = await prisma.businessAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    await logAudit(admin.id, "UPDATE_BUSINESS_ACCOUNT", "business", { accountId, ...updateData });
    return ok({ account });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const { accountId } = await params;

    await prisma.businessAccount.delete({ where: { id: accountId } });
    await logAudit(admin.id, "DELETE_BUSINESS_ACCOUNT", "business", { accountId });
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
