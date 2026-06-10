/**
 * POST /api/ai/translate-call — translate text for voice call
 * Requires premium feature "ai_chat"
 * Uses OpenAI Chat Completions API
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const translateSchema = z.object({
  text: z.string().min(1).max(5000),
  from: z.string().min(2).max(5),  // source language code (e.g., "ru", "en")
  to: z.string().min(2).max(5),    // target language code
});

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "Russian",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  tr: "Turkish",
  uk: "Ukrainian",
  pl: "Polish",
  nl: "Netherlands",
  hi: "Hindi",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    if (!user) throw new HttpError(401, "unauthorized");

    if (!(await hasFeature(user.id, "ai_chat"))) {
      throw new HttpError(403, "premium_required");
    }

    const body = await parseJson(req, translateSchema);
    const { text, from, to } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new HttpError(503, "AI service unavailable — OPENAI_API_KEY not configured");
    }

    const fromLang = LANGUAGE_NAMES[from] ?? from;
    const toLang = LANGUAGE_NAMES[to] ?? to;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a real-time translator for a voice call. Translate the following text from ${fromLang} to ${toLang}. Keep the meaning and tone natural. Return ONLY the translated text, no explanations or quotes.`,
          },
          { role: "user", content: text },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "openai_error");
      throw new HttpError(502, `openai_api_error: ${errText}`);
    }

    const data = await aiRes.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    const tokensUsed = data.usage?.total_tokens ?? 0;

    if (!translated) {
      throw new HttpError(502, "openai_empty_response");
    }

    // Log AI request
    prisma.aiRequest.create({
      data: {
        userId: user.id,
        requestType: "translate_call",
        inputText: `[${from}->${to}] ${text.slice(0, 1000)}`,
        outputText: translated.slice(0, 1000),
        tokensUsed,
        model: "gpt-4o-mini",
        success: true,
      },
    }).catch(() => {});

    return ok({ translated, from, to, tokensUsed });
  } catch (err) {
    return fail(err);
  }
}
