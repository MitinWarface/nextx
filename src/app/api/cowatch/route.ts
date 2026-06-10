/**
 * POST /api/cowatch — Create a co-watching session.
 * Body: { videoUrl: string, chatId?: string }
 * Returns: { sessionId, sessionUrl }
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, created, parseJson, HttpError } from "@/lib/api-helpers";

// In-memory session store (for production, use Redis)
const cowatchSessions = new Map<string, {
  id: string;
  videoUrl: string;
  chatId: string | null;
  createdBy: string;
  viewers: string[];
  createdAt: number;
}>();

function generateSessionId(): string {
  return `cw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const createSchema = z.object({
  videoUrl: z.string().url("invalid_video_url"),
  chatId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const body = await parseJson(req, createSchema);

    // Validate URL is a known video platform (basic check)
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.videoUrl);
    } catch {
      throw new HttpError(400, "invalid_video_url");
    }

    const allowedHosts = [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "vimeo.com",
      "www.vimeo.com",
      "dailymotion.com",
      "www.dailymotion.com",
    ];
    if (!allowedHosts.some((h) => parsedUrl.hostname === h)) {
      throw new HttpError(400, "unsupported_video_platform");
    }

    const sessionId = generateSessionId();
    const sessionUrl = `/cowatch/${sessionId}`;

    cowatchSessions.set(sessionId, {
      id: sessionId,
      videoUrl: body.videoUrl,
      chatId: body.chatId ?? null,
      createdBy: user.id,
      viewers: [user.id],
      createdAt: Date.now(),
    });

    return created({
      sessionId,
      sessionUrl,
      videoUrl: body.videoUrl,
      chatId: body.chatId ?? null,
    });
  } catch (err) {
    return fail(err);
  }
}

// GET /api/cowatch — List active sessions (optional)
export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser(_req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    const sessions = Array.from(cowatchSessions.values())
      .filter((s) => s.viewers.includes(user.id) || s.createdBy === user.id)
      .map((s) => ({
        sessionId: s.id,
        videoUrl: s.videoUrl,
        chatId: s.chatId,
        viewerCount: s.viewers.length,
        createdAt: s.createdAt,
      }));

    return ok({ sessions });
  } catch (err) {
    return fail(err);
  }
}
