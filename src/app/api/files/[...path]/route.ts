/**
 * GET /api/files/[...path] — serve files from S3 (presigned URL redirect) or local filesystem
 */
import type { NextRequest } from "next/server";
import { getPresignedUrl, isS3Configured } from "@/lib/s3";
import { NextResponse } from "next/server";

const DANGEROUS_SEGMENTS = ["..", "~", "\\", "\0"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const key = path.join("/");

    if (!key) {
      return NextResponse.json({ error: "no path" }, { status: 400 });
    }

    for (const seg of path) {
      if (DANGEROUS_SEGMENTS.includes(seg) || seg.includes("..")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    if (isS3Configured) {
      const url = await getPresignedUrl(key);
      return NextResponse.redirect(url, 302);
    }

    return NextResponse.rewrite(new URL(`/${key}`, req.url));
  } catch (err) {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}

export const dynamic = "force-dynamic";
