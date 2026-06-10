import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(10000),
    }),
  ).min(1).max(50),
  chatId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    const body = schema.parse(await req.json());

    // Load user's memories
    const memories = await prisma.aiMemory.findMany({
      where: {
        userId: me.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: { key: true, value: true },
    });

    // Build system prompt with memory context
    let systemContent = "You are a helpful AI assistant in the NextX messenger. Respond in the same language as the user. Be concise and helpful.";
    if (memories.length > 0) {
      const memoryBlock = memories.map((m) => `${m.key}: ${m.value}`).join("\n");
      systemContent += `\n\nUser's remembered context:\n${memoryBlock}`;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new HttpError(500, "ai_not_configured");

    const apiMessages = [
      { role: "system" as const, content: systemContent },
      ...body.messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new HttpError(502, err.error?.message ?? "ai_request_failed");
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new HttpError(502, "empty_response");

    // Log AI request
    await prisma.aiRequest.create({
      data: {
        userId: me.id,
        requestType: "ai_chat",
        inputText: JSON.stringify(body.messages.slice(-3)),
        outputText: content,
        tokensUsed: data.usage?.total_tokens ?? 0,
        model: "gpt-4o-mini",
      },
    });

    return ok({ content, tokensUsed: data.usage?.total_tokens ?? 0 });
  } catch (err) {
    return fail(err);
  }
}
