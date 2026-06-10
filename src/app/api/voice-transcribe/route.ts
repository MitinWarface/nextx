/**
 * POST /api/voice-transcribe
 * Принимает аудиофайл (WebM/OGG/WAV) и возвращает транскрипцию через Whisper API.
 * Требует OPENAI_API_KEY в .env для удалённого Whisper.
 * Если ключа нет — возвращает fallback (заглушку).
 * Premium feature: voice_to_text
 */
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, HttpError, requireUser } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(currentUser?.id);
    const user = currentUser!;

    if (!(await hasFeature(user.id, "voice_to_text"))) {
      throw new HttpError(403, "premium_required");
    }

    const formData = await req.formData();
    const file = formData.get("audio");
    if (!(file instanceof File)) {
      throw new HttpError(400, "no_audio");
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return ok({
        text: null,
        provider: "fallback",
        hint: "Транскрипция недоступна — настройте OPENAI_API_KEY",
      });
    }

    // Отправляем в OpenAI Whisper API
    const form = new FormData();
    form.append("file", file, file.name || "audio.webm");
    form.append("model", "whisper-1");
    form.append("language", "ru");
    form.append("response_format", "text");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => "whisper_error");
      throw new HttpError(502, `whisper_api_error: ${errText}`);
    }

    const text = await whisperRes.text();
    return ok({ text: text.trim(), provider: "openai-whisper" });
  } catch (err) {
    return fail(err);
  }
}

export const dynamic = "force-dynamic";
