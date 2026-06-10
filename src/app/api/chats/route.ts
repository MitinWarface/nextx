/**
 * GET  /api/chats        — список чатов текущего пользователя
 * POST /api/chats        — создать чат (private | group)
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createGroupChat,
  getOrCreatePrivateChat,
  listChats,
} from "@/services/chat-service";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { checkAndAwardAchievements } from "@/lib/achievement-checker";

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PRIVATE"),
    otherUserId: z.string().min(1),
  }),
  z.object({
    type: z.literal("GROUP"),
    name: z.string().min(1).max(120),
    memberIds: z.array(z.string().min(1)).min(1),
    description: z.string().max(500).optional(),
  }),
  z.object({
    type: z.literal("CHANNEL"),
    name: z.string().min(1).max(120),
    memberIds: z.array(z.string().min(1)).min(0).default([]),
    description: z.string().max(500).optional(),
    isPrivate: z.boolean().optional(),
    maxSubscribers: z.number().int().min(0).optional(),
  }),
]);

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "50") || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset") ?? "0") || 0, 0);
    const chats = await listChats({ userId: user!.id, limit, offset });
    return ok({ chats });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const body = await parseJson(req, createSchema);

    if (body.type === "PRIVATE") {
      const chat = await getOrCreatePrivateChat({
        userId: user!.id,
        otherUserId: body.otherUserId,
      });
      return ok({ chat });
    }

    if (body.type === "CHANNEL") {
      const chat = await createGroupChat({
        creatorId: user!.id,
        name: body.name,
        memberIds: body.memberIds ?? [],
        type: "CHANNEL",
        description: body.description,
        isPrivate: body.isPrivate,
        maxSubscribers: body.maxSubscribers,
      });
      checkAndAwardAchievements(user!.id).catch(console.error);
      return ok({ chat });
    }

    const chat = await createGroupChat({
      creatorId: user!.id,
      name: body.name,
      memberIds: body.memberIds,
      type: "GROUP",
      description: body.description,
    });
    checkAndAwardAchievements(user!.id).catch(console.error);
    return ok({ chat });
  } catch (err) {
    if (err instanceof HttpError) return fail(err);
    return fail(err);
  }
}
