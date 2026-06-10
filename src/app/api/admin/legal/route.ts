/**
 * GET  /api/admin/legal — list legal requests
 * POST /api/admin/legal — create legal request
 * PATCH /api/admin/legal/[requestId] — update status/notes
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { fail, ok, HttpError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req.headers.get("cookie") ?? undefined);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.legalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok({ requests });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req.headers.get("cookie") ?? undefined);
    const body = await req.json();
    const { organization, requestType, description, targetUserIds, referenceNumber } = body;

    if (!organization || !requestType || !description) {
      throw new HttpError(400, "missing_fields");
    }

    const request = await prisma.legalRequest.create({
      data: {
        organization,
        requestType,
        description,
        targetUserIds: targetUserIds ?? [],
        referenceNumber: referenceNumber ?? null,
        status: "pending",
      },
    });

    return ok({ request });
  } catch (err) {
    return fail(err);
  }
}
