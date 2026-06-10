/**
 * S3/MinIO client — abstraction over AWS S3 API.
 * Falls back to local filesystem if S3 is not configured.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET = process.env.S3_BUCKET ?? "nextx";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_REGION = process.env.S3_REGION ?? "us-east-1";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL; // e.g. https://cdn.example.com

export const isS3Configured = Boolean(S3_ENDPOINT && S3_ACCESS_KEY && S3_SECRET_KEY);

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY!,
        secretAccessKey: S3_SECRET_KEY!,
      },
      forcePathStyle: true, // MinIO compatibility
    });
  }
  return s3Client;
}

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to S3 or local filesystem.
 * @param key - S3 key or local relative path (e.g. "2026-06/abc123.jpg")
 * @param buffer - File content
 * @param contentType - MIME type
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<UploadResult> {
  if (isS3Configured) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    const url = S3_PUBLIC_URL
      ? `${S3_PUBLIC_URL}/${key}`
      : `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
    return { url, key };
  }

  // Fallback: local filesystem
  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(process.cwd(), "public", "uploads", key);
  await writeFile(fullPath, buffer);
  return { url: `/uploads/${key}`, key };
}

/**
 * Get a presigned URL for private files (valid for 1 hour).
 */
export async function getPresignedUrl(key: string): Promise<string> {
  if (isS3Configured) {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  }
  return `/uploads/${key}`;
}

/**
 * Delete a file from S3 or local filesystem.
 */
export async function deleteFile(key: string): Promise<void> {
  if (isS3Configured) {
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    return;
  }
  const fullPath = path.join(process.cwd(), "public", "uploads", key);
  await unlink(fullPath).catch(() => {});
}

/**
 * Read a file from S3 or local filesystem.
 */
export async function readFileBuffer(key: string): Promise<Buffer> {
  if (isS3Configured) {
    const res = await getS3Client().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    const stream = res.Body;
    if (!stream) throw new Error("empty_response");
    const chunks: Uint8Array[] = [];
    const reader = stream.transformToWebStream().getReader();
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }
    return Buffer.concat(chunks);
  }
  const fullPath = path.join(process.cwd(), "public", "uploads", key);
  return readFile(fullPath);
}
