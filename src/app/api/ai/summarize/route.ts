/**
 * POST /api/ai/summarize — AI chat summary
 * Requires premium feature "ai_chat"
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { requireUser, fail, ok, parseJson, HttpError } from "@/lib/api-helpers";
import { hasFeature } from "@/lib/premium";
import { prisma } from "@/lib/prisma";

const summarizeSchema = z.object({
  chatId: z.string().min(1),
  messageCount: z.number().int().min(10).max(200).default(50),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req.headers.get("cookie") ?? undefined);
    requireUser(user?.id);

    if (!(await hasFeature(user!.id, "ai_chat"))) {
      throw new HttpError(403, "premium_required");
    }

    const body = await parseJson(req, summarizeSchema);

    const messages = await prisma.message.findMany({
      where: {
        chatId: body.chatId,
        isDeleted: false,
        type: "TEXT",
        content: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: body.messageCount,
      select: {
        content: true,
        sender: { select: { displayName: true } },
        createdAt: true,
      },
    });

    if (messages.length === 0) {
      throw new HttpError(404, "no_messages");
    }

    const reversed = [...messages].reverse();
    const conversation = reversed
      .map((m) => `${m.sender.displayName}: ${m.content}`)
      .join("\n");

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
          {
            role: "system",
            content: "Summarize this chat conversation in 3-5 bullet points. Focus on key topics, decisions, and important information. Return ONLY the summary, no preamble. Use the same language as the conversation.",
          },
          { role: "user", content: conversation },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "openai_error");
      throw new HttpError(502, `openai_api_error: ${errText}`);
    }

    const data = await aiRes.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    const tokensUsed = data.usage?.total_tokens ?? 0;

    if (!summary) {
      throw new HttpError(502, "openai_empty_response");
    }

    prisma.aiRequest.create({
      data: {
        userId: user!.id,
        requestType: "chat_summary",
        inputText: `chat:${body.chatId} msgs:${body.messageCount}`,
        outputText: summary.slice(0, 2000),
        tokensUsed,
        model: "gpt-4o-mini",
        success: true,
      },
    }).catch(() => {});

    return ok({ summary, messageCount: messages.length, tokensUsed });
  } catch (err) {
    return fail(err);
  }
}
