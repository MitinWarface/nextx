/**
 * POST /api/users/me/video-avatar — upload video avatar (premium)
 * Uses existing S3/local upload
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireUser } from "@/lib/api-helpers";
import { fail, ok, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    if (!(await hasFeature(user!.id, "video_avatar"))) {
      throw new HttpError(403, "premium_required");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new HttpError(400, "file_required");

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new HttpError(400, "file_too_large");
    }

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      throw new HttpError(400, "invalid_video_type");
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const key = `video-avatars/${user!.id}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadFile(key, buffer, file.type);

    await prisma.user!.update({
      where: { id: user!.id },
      data: { animatedAvatarUrl: result.url },
    });

    return ok({ animatedAvatarUrl: result.url });
  } catch (err) {
    return fail(err);
  }
}
