/**
 * GET  /api/stories         — лента активных stories
 * POST /api/stories         — создать story (multipart: file + caption)
 */
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, parseJson, requireUser } from "@/lib/api-helpers";
import { createStory, listActiveStories } from "@/services/story-service";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const stories = await listActiveStories({ viewerId: user.id });
    return ok({ stories });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;
    const formData = await req.formData();
    const file = formData.get("file");
    const captionRaw = formData.get("caption");
    const channelIdRaw = formData.get("channelId");
    const mediaTypeRaw = formData.get("mediaType");
    if (!file || !(file instanceof File)) {
      return fail(new Error("file_required"));
    }
    if (file.size > MAX_SIZE) {
      return fail(new Error("file_too_large"));
    }
    const mime = file.type || "image/jpeg";
    const isImage = ALLOWED_IMAGE.has(mime);
    const isVideo = ALLOWED_VIDEO.has(mime);
    if (!isImage && !isVideo) {
      return fail(new Error("unsupported_mime"));
    }
    const mediaType: "IMAGE" | "VIDEO" = isVideo ? "VIDEO" : "IMAGE";
    const ext = mimeToExt(mime);
    const now = new Date();
    const subdir = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);
    const mediaUrl = `/uploads/${subdir}/${filename}`;
    const caption =
      typeof captionRaw === "string" && captionRaw.trim().length > 0
        ? captionRaw.trim().slice(0, 500)
        : null;

    // Handle channel stories
    let channelId: string | null = null;
    if (typeof channelIdRaw === "string" && channelIdRaw.trim().length > 0) {
      channelId = channelIdRaw.trim();
      // Verify user is owner/admin of the channel
      const participant = await prisma.participant.findUnique({
        where: { chatId_userId: { chatId: channelId, userId: user.id } },
        select: { role: true },
      });
      if (!participant || (participant.role !== "OWNER" && participant.role !== "ADMIN")) {
        return fail(new Error("not_channel_owner"));
      }
    }

    const story = await createStory({
      authorId: user.id,
      channelId,
      mediaUrl,
      mediaType,
      caption,
    });
    return ok({ story });
  } catch (err) {
    return fail(err);
  }
}

function mimeToExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}
