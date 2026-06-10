import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const { listingId } = await params;
    const listing = await prisma.teamExchange.findUnique({
      where: { id: listingId },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        applications: {
          include: {
            applicant: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!listing) throw new HttpError(404, "not_found");
    return ok({ listing });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { listingId } = await params;
    const listing = await prisma.teamExchange.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (listing.creatorId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.category !== undefined) data.category = body.category;
    if (body.skills !== undefined) data.skills = body.skills;
    if (body.budget !== undefined) data.budget = body.budget;
    if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.teamExchange.update({ where: { id: listingId }, data });
    return ok({ listing: updated });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);

    const { listingId } = await params;
    const listing = await prisma.teamExchange.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (listing.creatorId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.teamExchange.delete({ where: { id: listingId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
