import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface ModerationResult {
  flagged: boolean;
  categories: string[];
  score: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  hate: "Ненависть",
  "hate/threatening": "Ненависть (угрозы)",
  harassment: "Домогательства",
  "harassment/threatening": "Домогательства (угрозы)",
  self_harm: "Самоповреждение",
  "self_harm/intent": "Намерение самоповреждения",
  "self_harm/instructions": "Инструкции самоповреждения",
  sexual: "Сексуальный контент",
  "sexual/minors": "Сексуальный контент (несовершеннолетние)",
  violence: "Насилие",
  "violence/graphic": "Графическое насилие",
  "violence/revelling": "Воспевание насилия",
};

export async function moderateContent(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn("OPENAI_API_KEY not set, skipping AI moderation", "ai-moderation");
    return { flagged: false, categories: [], score: 0 };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      logger.error("OpenAI moderation API error", undefined, undefined, { status: response.status, body: errText });
      return { flagged: false, categories: [], score: 0 };
    }

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) return { flagged: false, categories: [], score: 0 };

    const flaggedCategories: string[] = [];
    let maxScore = 0;

    const cats = result.categories ?? {};
    const scores = result.category_scores ?? {};

    for (const [key, isFlagged] of Object.entries(cats)) {
      if (isFlagged) {
        flaggedCategories.push(CATEGORY_LABELS[key] ?? key);
        const s = typeof scores[key] === "number" ? scores[key] : 0;
        if (s > maxScore) maxScore = s;
      }
    }

    return {
      flagged: result.flagged ?? false,
      categories: flaggedCategories,
      score: Math.round(maxScore * 100) / 100,
    };
  } catch (err) {
    logger.error("AI moderation request failed", "ai-moderation", err instanceof Error ? err : undefined);
    return { flagged: false, categories: [], score: 0 };
  }
}

export async function logModerationEvent(params: {
  userId: string;
  type: string;
  score: number;
  reason: string;
  messageId?: string;
  chatId?: string;
  autoAction?: string;
}): Promise<void> {
  try {
    await prisma.moderationLog.create({
      data: {
        userId: params.userId,
        type: params.type,
        score: params.score,
        reason: params.reason,
        messageId: params.messageId ?? null,
        chatId: params.chatId ?? null,
        autoAction: params.autoAction ?? null,
      },
    });
  } catch (err) {
    logger.error("Failed to log moderation event", "ai-moderation", err instanceof Error ? err : undefined);
  }
}
