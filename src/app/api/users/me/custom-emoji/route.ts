/**
 * GET  /api/users/me/custom-emoji   — list user's custom emoji
 * POST /api/users/me/custom-emoji   — upload new custom emoji
 * DELETE /api/users/me/custom-emoji — remove custom emoji by id
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseJson, requireUser, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

const FREE_LIMIT = 50;
const PREMIUM_LIMIT = 500;

const postSchema = z.object({
  shortcode: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_]+$/, "invalid_shortcode"),
});

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const emojis = await prisma.customEmoji.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ emojis });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const isPremium = await hasFeature(user!.id, "premium_stickers");
    const limit = isPremium ? PREMIUM_LIMIT : FREE_LIMIT;

    const count = await prisma.customEmoji.count({ where: { userId: user!.id } });
    if (count >= limit) {
      throw new HttpError(403, `custom_emoji_limit_reached_${limit}`);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "no_file");
    }

    const mime = file.type;
    if (!mime.startsWith("image/")) {
      throw new HttpError(400, "invalid_file_type");
    }

    const body = postSchema.parse({ shortcode: formData.get("shortcode") ?? "" });

    const existing = await prisma.customEmoji.findUnique({
      where: { userId_shortcode: { userId: user!.id, shortcode: body.shortcode } },
    });
    if (existing) {
      throw new HttpError(409, "shortcode_taken");
    }

    const ext = mime.includes("png") ? "png" : mime.includes("gif") ? "gif" : mime.includes("webp") ? "webp" : "jpg";
    const id = randomBytes(12).toString("hex");
    const fileName = `${id}.${ext}`;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dir = path.join(process.cwd(), "public", "uploads", "emoji", `${yyyy}-${mm}`);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), buffer);

    const imageUrl = `/uploads/emoji/${yyyy}-${mm}/${fileName}`;

    const emoji = await prisma.customEmoji.create({
      data: {
        userId: user!.id,
        shortcode: body.shortcode,
        imageUrl,
      },
    });

    return ok({ emoji });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const body = await parseJson(
      req,
      z.object({ id: z.string().min(1) }),
    );

    const emoji = await prisma.customEmoji.findUnique({ where: { id: body.id } });
    if (!emoji || emoji.userId !== user!.id) {
      throw new HttpError(404, "emoji_not_found");
    }

    // Try to delete the file (best-effort)
    try {
      const filePath = path.join(process.cwd(), "public", emoji.imageUrl);
      await unlink(filePath);
    } catch {}

    await prisma.customEmoji.delete({ where: { id: body.id } });

    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
