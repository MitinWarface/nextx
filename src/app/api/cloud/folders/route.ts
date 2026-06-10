/**
 * POST /api/cloud/folders — create folder
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { created, fail, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await req.json();
    const name = (body.name ?? "").trim();
    if (!name) throw new HttpError(400, "name_required");

    const parentId = body.parentId ?? null;

    if (parentId) {
      const parent = await prisma.cloudFolder.findFirst({
        where: { id: parentId, userId: user!.id },
      });
      if (!parent) throw new HttpError(404, "parent_not_found");
    }

    const folder = await prisma.cloudFolder.create({
      data: {
        userId: user!.id,
        name,
        parentId,
      },
    });

    return created({ folder });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
