import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONTENT = `🎉 NextX — Обновление панели управления

━━━━━━━━━━━━━━━━━━━━━━━

🆕 НОВОЕ:
• Панель администратора — 13 секций с матрицей ролей (OWNER → Analytics Manager)
• Регистрация новых пользователей (/register)
• Кнопка панели управления в сайдбаре (только для админов)
• Иконки Избранного и Служебных уведомлений (фиолетовый градиент)
• Кнопка «Подписка» в главном меню

🔧 ИСПРАВЛЕНО:
• Имя чата «Messenger» → «NextX»
• Исправлено отображение «Unknown» в шапке чата
• Звонки запрещены в служебных и избранных чатах
• Кнопка «Ещё» — исправлено открытие контекстного меню
• Убран ложный номер телефона из профиля
• Убран выбор языка из настроек
• Исправлен favicon (иконка «N» на фиолетовом градиенте)
• Manifest.json — исправлен синтаксис
• JWT авторизация — исправлено чтение cookie через server.js`;

async function main() {
  // Find the mementomori user
  const user = await prisma.user.findUnique({
    where: { username: "mementomori" },
    select: { id: true },
  });
  if (!user) {
    console.error("User mementomori not found");
    return;
  }

  // Find their service chat
  const chat = await prisma.chat.findFirst({
    where: { type: "SERVICE", participants: { some: { userId: user.id } } },
  });
  if (!chat) {
    console.error("Service chat not found");
    return;
  }

  // Create system user or use user themselves
  const systemUser = await prisma.user.findFirst({ where: { username: "system" } });
  const senderId = systemUser?.id ?? user.id;

  // Send the message
  const message = await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId,
      type: "SYSTEM",
      serviceType: "NEWS",
      content: CONTENT,
    },
  });

  // Update chat lastMessageAt
  await prisma.chat.update({
    where: { id: chat.id },
    data: { lastMessageAt: new Date() },
  });

  console.log("Message sent:", message.id);

  // Also emit via socket if possible
  try {
    const { default: { Server } } = await import("socket.io");
    // Just log it — socket emit from script isn't practical
    console.log("Socket emit skipped (server-side only)");
  } catch {}

  await prisma.$disconnect();
}

main().catch(console.error);
