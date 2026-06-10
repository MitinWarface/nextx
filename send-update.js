const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const text = "Обновление: AI Rewrite + Video Avatar\n\n" +
  "AI Rewrite (premium):\n" +
  "- POST /api/ai/rewrite — переписывание текста\n" +
  "- Режимы: перевод EN/RU, сокращение, формальный/неформальный стиль, исправление ошибок\n\n" +
  "Video Avatar (premium):\n" +
  "- POST /api/users/me/video-avatar — загрузка видео-аватара\n" +
  "- Поддержка MP4/WebM/QuickTime, до 10 МБ\n\n" +
  "Все задачи из roadmap выполнены ✓";

(async () => {
  const chats = await prisma.chat.findMany({ where: { type: "SERVICE" } });
  for (const chat of chats) {
    const parts = await prisma.participant.findMany({ where: { chatId: chat.id } });
    for (const p of parts) {
      await prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: p.userId,
          type: "SYSTEM",
          content: text,
          serviceType: "UPDATE_NEWS",
        },
      });
    }
  }
  console.log("Sent to", chats.length, "chats");
  await prisma.$disconnect();
})();
