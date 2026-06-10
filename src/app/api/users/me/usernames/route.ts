/**
 * GET  /api/users/me/usernames  — list all usernames for the current user
 * POST /api/users/me/usernames  — add a new username (premium-gated)
 * DELETE /api/users/me/usernames — remove a username (premium-gated)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError, requireUser } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;
const MAX_USERNAMES = 3;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const user = await prisma.user.findUnique({
      where: { id: currentUser!.id },
      select: {
        username: true,
        usernameHistory: true,
      },
    });
    if (!user) throw new HttpError(404, "user_not_found");

    return ok({
      primary: user.username,
      history: user.usernameHistory,
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    // Check premium feature
    const hasMultiUsername = await hasFeature(currentUser!.id, "multi_username");
    if (!hasMultiUsername) throw new HttpError(403, "premium_required");

    const body = await parseJson(req, z.object({
      username: z.string().min(3).max(32).regex(USERNAME_RE, "invalid_username_format"),
    }));

    const u = body.username.trim().toLowerCase();

    // Check uniqueness
    const existing = await prisma.user.findUnique({
      where: { username: u },
      select: { id: true },
    });
    if (existing && existing.id !== currentUser!.id) {
      throw new HttpError(409, "username_taken");
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: currentUser!.id },
      select: { username: true, usernameHistory: true },
    });
    if (!user) throw new HttpError(404, "user_not_found");

    // Check max limit (primary + history)
    const totalCount = 1 + user.usernameHistory.length;
    if (totalCount >= MAX_USERNAMES) {
      throw new HttpError(400, "max_usernames_reached");
    }

    // Add current username to history and set new primary
    const newHistory = [...user.usernameHistory];
    if (!newHistory.includes(user.username)) {
      newHistory.push(user.username);
    }

    await prisma.user.update({
      where: { id: currentUser!.id },
      data: {
        username: u,
        usernameHistory: newHistory,
      },
    });

    return ok({ username: u, history: newHistory });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);

    const hasMultiUsername = await hasFeature(currentUser!.id, "multi_username");
    if (!hasMultiUsername) throw new HttpError(403, "premium_required");

    const body = await parseJson(req, z.object({
      username: z.string().min(3).max(32),
    }));

    const user = await prisma.user.findUnique({
      where: { id: currentUser!.id },
      select: { username: true, usernameHistory: true },
    });
    if (!user) throw new HttpError(404, "user_not_found");

    // Can't remove primary username
    if (body.username === user.username) {
      throw new HttpError(400, "cannot_remove_primary");
    }

    const idx = user.usernameHistory.indexOf(body.username);
    if (idx === -1) {
      throw new HttpError(404, "username_not_found");
    }

    const newHistory = user.usernameHistory.filter((u) => u !== body.username);
    await prisma.user.update({
      where: { id: currentUser!.id },
      data: { usernameHistory: newHistory },
    });

    return ok({ history: newHistory });
  } catch (err) {
    return fail(err);
  }
}
