import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const albums = await prisma.privateAlbum.findMany({
      where: { userId: user!.id },
      include: {
        media: { orderBy: { sortOrder: "asc" }, take: 1 },
        _count: { select: { media: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return ok({ albums });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const body = await req.json();
    const { name, description } = body as { name: string; description?: string };
    if (!name || name.length < 1) throw new HttpError(400, "name_required");

    const album = await prisma.privateAlbum.create({
      data: {
        userId: user!.id,
        name,
        description: description ?? null,
      },
    });

    return created({ album });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
