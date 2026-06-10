import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, requireUser, HttpError } from "@/lib/api-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  try {
    const { listingId } = await params;
    const listing = await prisma.freelanceListing.findUnique({
      where: { id: listingId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reviews: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: true, orders: true } },
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
    const listing = await prisma.freelanceListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (listing.userId !== user!.id) throw new HttpError(403, "forbidden");

    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.price !== undefined) data.price = body.price;
    if (body.portfolio !== undefined) data.portfolio = body.portfolio;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await prisma.freelanceListing.update({ where: { id: listingId }, data });
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
    const listing = await prisma.freelanceListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new HttpError(404, "not_found");
    if (listing.userId !== user!.id) throw new HttpError(403, "forbidden");

    await prisma.freelanceListing.delete({ where: { id: listingId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
