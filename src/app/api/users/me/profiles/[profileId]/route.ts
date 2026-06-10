/**
 * PATCH  /api/users/me/profiles/[profileId] — update profile
 * DELETE /api/users/me/profiles/[profileId] — delete profile (not default)
 * POST   /api/users/me/profiles/[profileId] — switch active profile
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, noContent, parseJson, HttpError, requireUser } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  about: z.string().max(500).nullable().optional(),
  statusEmoji: z.string().max(4).nullable().optional(),
  statusText: z.string().max(64).nullable().optional(),
});

const switchSchema = z.object({
  action: z.literal("switch"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { profileId } = await params;

    const existing = await prisma.userProfile.findFirst({
      where: { id: profileId, userId: user!.id },
    });
    if (!existing) throw new HttpError(404, "profile_not_found");

    const body = await parseJson(req, updateSchema);
    const profile = await prisma.userProfile.update({
      where: { id: profileId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.about !== undefined && { about: body.about }),
        ...(body.statusEmoji !== undefined && { statusEmoji: body.statusEmoji }),
        ...(body.statusText !== undefined && { statusText: body.statusText }),
      },
    });

    return ok({ profile });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { profileId } = await params;

    const existing = await prisma.userProfile.findFirst({
      where: { id: profileId, userId: user!.id },
    });
    if (!existing) throw new HttpError(404, "profile_not_found");
    if (existing.isDefault) throw new HttpError(400, "cannot_delete_default");

    await prisma.userProfile.delete({ where: { id: profileId } });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);
    const { profileId } = await params;

    const body = await parseJson(req, switchSchema);
    const existing = await prisma.userProfile.findFirst({
      where: { id: profileId, userId: user!.id },
    });
    if (!existing) throw new HttpError(404, "profile_not_found");

    await prisma.$transaction([
      prisma.userProfile.updateMany({
        where: { userId: user!.id },
        data: { isDefault: false },
      }),
      prisma.userProfile.update({
        where: { id: profileId },
        data: { isDefault: true },
      }),
    ]);

    return ok({ switchedTo: profileId });
  } catch (err) {
    return fail(err);
  }
}
