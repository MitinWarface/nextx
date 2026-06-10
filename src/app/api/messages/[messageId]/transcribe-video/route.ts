/**
 * POST /api/messages/[messageId]/transcribe-video
 * Extracts audio from video, sends to OpenAI Whisper, returns transcript.
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, requireUser, HttpError } from "@/lib/api-helpers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    requireUser(user?.id);
    const { messageId } = await params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        type: true,
        mediaUrl: true,
        chatId: true,
        chat: {
          select: {
            participants: { select: { userId: true } },
          },
        },
      },
    });

    if (!message) throw new HttpError(404, "message_not_found");
    if (message.type !== "VIDEO") throw new HttpError(400, "not_a_video");
    if (!message.mediaUrl) throw new HttpError(400, "no_media");

    const isParticipant = message.chat.participants.some(
      (p) => p.userId === user!.id,
    );
    if (!isParticipant) throw new HttpError(403, "forbidden");

    const videoUrl = message.mediaUrl;

    // Try to use ffmpeg for audio extraction + OpenAI Whisper
    let transcript: string | null = null;

    try {
      // Dynamic import for ffmpeg
      const ffmpeg = (await import("fluent-ffmpeg")).default;
      const { execSync } = await import("child_process");
      const { writeFile, unlink, readFile } = await import("fs/promises");
      const { join } = await import("path");
      const { tmpdir } = await import("os");

      const tmpDir = tmpdir();
      const audioPath = join(tmpDir, `audio-${Date.now()}.ogg`);
      const videoPath = join(tmpDir, `video-${Date.now()}.mp4`);

      // Download video
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error("download_failed");
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      await writeFile(videoPath, videoBuffer);

      // Extract audio with ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .noVideo()
          .audioCodec("libopus")
          .format("ogg")
          .on("end", () => resolve())
          .on("error", reject)
          .save(audioPath);
      });

      // Send to OpenAI Whisper
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("no_openai_key");

      const formData = new FormData();
      const audioBuffer = await readFile(audioPath);
      const audioBlob = new Blob([audioBuffer], { type: "audio/ogg" });
      formData.append("file", audioBlob, "audio.ogg");
      formData.append("model", "whisper-1");
      formData.append("response_format", "text");

      const whisperRes = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        },
      );

      if (!whisperRes.ok) throw new Error("whisper_failed");
      transcript = await whisperRes.text();

      // Cleanup temp files
      await unlink(videoPath).catch(() => {});
      await unlink(audioPath).catch(() => {});
    } catch (ffmpegErr) {
      // If ffmpeg is not available or fails, return error
      console.error("[transcribe]", ffmpegErr);
      throw new HttpError(
        501,
        "transcription_unavailable: " +
          (ffmpegErr instanceof Error ? ffmpegErr.message : "unknown"),
      );
    }

    return ok({ transcript: transcript ?? "" });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
