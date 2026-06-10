import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, HttpError } from "@/lib/api-helpers";

const schema = z.object({
  channelTopic: z.string().min(1).max(500),
  style: z.enum(["news", "announcement", "casual", "educational"]).default("casual"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  topic: z.string().max(200).optional(),
});

const stylePrompts: Record<string, string> = {
  news: "Write a news-style post for a channel. Use factual, informative tone with clear structure.",
  announcement: "Write an announcement post. Be clear, exciting, and informative.",
  casual: "Write a casual, friendly post for a channel audience. Keep it engaging and conversational.",
  educational: "Write an educational post that teaches something valuable. Be informative yet accessible.",
};

const lengthGuide: Record<string, string> = {
  short: "2-3 sentences (50-100 words)",
  medium: "1-2 paragraphs (100-250 words)",
  long: "3-4 paragraphs with details (250-500 words)",
};

export async function POST(req: NextRequest) {
  try {
    const me = await getCurrentUser();
    if (!me) throw new HttpError(401, "unauthorized");

    // Premium gate
    if ((me as any).premiumStatus !== "active" && (me as any).role !== "ADMIN" && (me as any).role !== "SUPER_ADMIN" && (me as any).role !== "OWNER" && (me as any).role !== "DEVELOPER") {
      throw new HttpError(403, "premium_required");
    }

    const body = schema.parse(await req.json());

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new HttpError(500, "ai_not_configured");

    const systemPrompt = `You are a professional content writer for a messenger channel. 
${stylePrompts[body.style]}
Write in Russian. 
Length: ${lengthGuide[body.length]}.
Channel topic: ${body.channelTopic}
${body.topic ? `Specific topic to write about: ${body.topic}` : ""}
Do not include any meta-commentary. Just output the post content directly.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: body.topic ? `Write about: ${body.topic}` : "Generate a post for my channel" },
        ],
        temperature: 0.8,
        max_tokens: 1024,
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
        requestType: "generate_post",
        inputText: JSON.stringify({ channelTopic: body.channelTopic, style: body.style, length: body.length, topic: body.topic }),
        outputText: content,
        tokensUsed: data.usage?.total_tokens ?? 0,
        model: "gpt-4o-mini",
      },
    });

    return ok({ content });
  } catch (err) {
    return fail(err);
  }
}
