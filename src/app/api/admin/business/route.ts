/**
 * GET  /api/admin/business — list business accounts
 * POST /api/admin/business — create business account
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAudit } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const accounts = await prisma.businessAccount.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      take: 100,
    });
    return ok({ accounts });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { userId, companyName, description, website } = body;

    if (!userId || !companyName) throw new HttpError(400, "missing_fields");

    const existing = await prisma.businessAccount.findUnique({ where: { userId } });
    if (existing) throw new HttpError(400, "already_exists");

    const account = await prisma.businessAccount.create({
      data: { userId, companyName, description: description ?? null, website: website ?? null },
    });

    await logAudit(admin.id, "CREATE_BUSINESS_ACCOUNT", "business", { userId, companyName });
    return ok({ account });
  } catch (err) {
    return fail(err);
  }
}
