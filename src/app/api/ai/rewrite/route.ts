/**
 * POST /api/ai/rewrite — AI text rewrite (translate, shorten, fix style)
 * Requires premium feature "ai_rewrite"
 * Uses OpenAI Chat Completions API with OPENAI_API_KEY
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requireUser } from "@/lib/api-helpers";
import { fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";
import { prisma } from "@/lib/prisma";

const rewriteSchema = z.object({
  text: z.string().min(1).max(4000),
  mode: z.enum(["translate_en", "translate_ru", "shorten", "formal", "casual", "fix_errors"]),
});

const MODE_PROMPTS: Record<string, string> = {
  translate_en: "Translate the following text to English. Keep the meaning. Return ONLY the translated text, no explanations.",
  translate_ru: "Переведи следующий текст на русский язык. Сохрани смысл. Верни ТОЛЬКО переведённый текст, без объяснений.",
  shorten: "Shorten the following text significantly while keeping the key meaning. Return ONLY the shortened text.",
  formal: "Rewrite the following text in a formal business style. Return ONLY the rewritten text.",
  casual: "Перепиши следующий текст разговорным informal стилем. Верни ТОЛЬКО переписанный текст.",
  fix_errors: "Fix all grammar and spelling errors in the following text. Return ONLY the corrected text.",
};

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    if (!(await hasFeature(user!.id, "ai_rewrite"))) {
      throw new HttpError(403, "premium_required");
    }

    const body = await parseJson(req, rewriteSchema);
    const systemPrompt = MODE_PROMPTS[body.mode];

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new HttpError(503, "AI service unavailable — OPENAI_API_KEY not configured");
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.text },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "openai_error");
      throw new HttpError(502, `openai_api_error: ${errText}`);
    }

    const data = await aiRes.json();
    const result = data.choices?.[0]?.message?.content?.trim();
    const tokensUsed = data.usage?.total_tokens ?? 0;

    if (!result) {
      throw new HttpError(502, "openai_empty_response");
    }

    // Log AI request
    prisma.aiRequest.create({
      data: {
        userId: user!.id,
        requestType: body.mode,
        inputText: body.text.slice(0, 2000),
        outputText: result.slice(0, 2000),
        tokensUsed,
        model: "gpt-4o-mini",
        success: true,
      },
    }).catch(() => {});

    return ok({ result, mode: body.mode, tokensUsed });
  } catch (err) {
    return fail(err);
  }
}
