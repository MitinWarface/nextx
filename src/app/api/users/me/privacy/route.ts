/**
 * GET  /api/users/me/privacy  — read current user's privacy settings
 * PATCH /api/users/me/privacy — update privacy settings
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";

const privacyModes = ["EVERYONE", "CONTACTS", "NOBODY"] as const;

const patchSchema = z.object({
  profilePhoto: z.enum(privacyModes).optional(),
  lastSeen: z.enum(privacyModes).optional(),
  online: z.enum(privacyModes).optional(),
  messages: z.enum(privacyModes).optional(),
  calls: z.enum(privacyModes).optional(),
  groupAdd: z.enum(privacyModes).optional(),
  readReceipts: z.boolean().optional(),
});

async function getOrCreate(userId: string) {
  const existing = await prisma.privacySettings.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.privacySettings.create({
    data: {
      userId,
      profileVisibility: "EVERYONE",
      lastSeenVisibility: "EVERYONE",
      onlineVisibility: "EVERYONE",
      messagePermission: "EVERYONE",
      callPermission: "EVERYONE",
      groupAddPermission: "EVERYONE",
      readReceipts: true,
    },
  });
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const settings = await getOrCreate(user!.id);
    return ok({ settings });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, patchSchema);
    await getOrCreate(user!.id); // ensure exists
    // Map API field names to Prisma column names
    const data: Record<string, unknown> = {};
    if (body.profilePhoto !== undefined) data.profileVisibility = body.profilePhoto;
    if (body.lastSeen !== undefined) data.lastSeenVisibility = body.lastSeen;
    if (body.online !== undefined) data.onlineVisibility = body.online;
    if (body.messages !== undefined) data.messagePermission = body.messages;
    if (body.calls !== undefined) data.callPermission = body.calls;
    if (body.groupAdd !== undefined) data.groupAddPermission = body.groupAdd;
    if (body.readReceipts !== undefined) data.readReceipts = body.readReceipts;
    const settings = await prisma.privacySettings.update({
      where: { userId: user!.id },
      data,
    });
    return ok({ settings });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
