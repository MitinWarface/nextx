/**
 * GET    /api/marketplace/[listingId] — listing details with reviews
 * PATCH  /api/marketplace/[listingId] — update listing (owner only)
 * DELETE /api/marketplace/[listingId] — delete listing (owner only)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, noContent, requireUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const { listingId } = await params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { reviews: true, purchases: true } },
      },
    });

    if (!listing) throw new HttpError(404, "listing_not_found");

    return ok({ listing });
  } catch (err) {
    return fail(err);
  }
}

const updateListingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  price: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().nullable(),
  category: z.string().min(1).max(100).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { listingId } = await params;

    const existing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true },
    });
    if (!existing) throw new HttpError(404, "listing_not_found");
    if (existing.sellerId !== user.id) throw new HttpError(403, "forbidden");

    const body = await parseJson(req, updateListingSchema);

    const listing = await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      },
      include: {
        seller: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    return ok({ listing });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const { listingId } = await params;

    const existing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true },
    });
    if (!existing) throw new HttpError(404, "listing_not_found");
    if (existing.sellerId !== user.id) throw new HttpError(403, "forbidden");

    await prisma.marketplaceListing.delete({ where: { id: listingId } });

    return noContent();
  } catch (err) {
    return fail(err);
  }
}
