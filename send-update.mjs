import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const text = `🆕 Обновление интерфейса:

• Кнопка «Ещё» в боковом меню теперь открывает модальное окно вместо выпадающего списка
• Настройки чата (звук, закрепить, очистить, покинуть, заблокировать) перенесены из топбара в модалку «Настройки» → вкладка «Чат»
• Убрана кнопка «Ещё» из шапки чата (была дублирующей)
• Исправлен баг: модалка «Ещё» открывалась и сразу закрывалась (portal conflict)`;

const chats = await prisma.chat.findMany({ where: { type: "SERVICE" } });
for (const chat of chats) {
  const participants = await prisma.chatParticipant.findMany({ where: { chatId: chat.id } });
  for (const p of participants) {
    if (p.role === "BOT") continue;
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
  const lastMsg = await prisma.message.findFirst({ where: { chatId: chat.id }, orderBy: { createdAt: "desc" } });
  if (lastMsg) {
    await prisma.chat.update({ where: { id: chat.id }, data: { lastMessageId: lastMsg.id } });
  }
}
console.log("Service messages sent to", chats.length, "chats");
await prisma.$disconnect();
