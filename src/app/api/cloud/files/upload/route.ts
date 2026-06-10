/**
 * POST /api/cloud/files/upload — multipart upload
 */
import type { NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { created, fail, requireUser, HttpError } from "@/lib/api-helpers";
import { isS3Configured, uploadFile } from "@/lib/s3";
import { hasFeature } from "@/lib/premium";

const MAX_FREE_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_PREMIUM_SIZE = 100 * 1024 * 1024 * 1024; // 100 GB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "text/plain": "txt",
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "file";
}

function inferCategory(mime: string): string {
  if (/^image\//.test(mime)) return "photo";
  if (/^video\//.test(mime)) return "video";
  if (/^audio\//.test(mime)) return "audio";
  if (
    /^application\/(pdf|msword|vnd\.|zip|x-gzip|json|xml|octet-stream)/.test(mime) ||
    /^text\//.test(mime)
  )
    return "document";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "no_file");
    }

    const folderId = (formData.get("folderId") as string) || null;

    if (folderId) {
      const folder = await prisma.cloudFolder.findFirst({
        where: { id: folderId, userId: user!.id },
      });
      if (!folder) throw new HttpError(404, "folder_not_found");
    }

    const isPremium = await hasFeature(user!.id, "large_upload");
    const maxSize = isPremium ? MAX_PREMIUM_SIZE : MAX_FREE_SIZE;
    if (file.size > maxSize) {
      throw new HttpError(413, "file_too_large");
    }

    const mime = file.type || "application/octet-stream";
    const ext = EXT_BY_MIME[mime] ?? "bin";
    const id = randomBytes(12).toString("hex");
    const fileName = sanitizeFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const category = inferCategory(mime);

    let url: string;

    if (isS3Configured) {
      const key = `cloud/${user!.id}/${id}.${ext}`;
      const result = await uploadFile(key, buffer, mime);
      url = result.url;
    } else {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dir = path.join(process.cwd(), "public", "uploads", "cloud", `${yyyy}-${mm}`);
      await mkdir(dir, { recursive: true });
      const stored = `${id}.${ext}`;
      const fullPath = path.join(dir, stored);
      await writeFile(fullPath, buffer);
      url = `/uploads/cloud/${yyyy}-${mm}/${stored}`;
    }

    const cloudFile = await prisma.cloudFile.create({
      data: {
        userId: user!.id,
        folderId,
        filename: fileName,
        mimeType: mime,
        size: file.size,
        url,
        category,
      },
    });

    return created({ file: cloudFile });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
