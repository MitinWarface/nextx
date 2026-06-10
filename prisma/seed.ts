/**
 * Скрипт сидинга БД: создаёт 4 пользователей + 3 чата + 6 сообщений.
 * Все пароли: "password123" (для dev).
 * Запуск: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password123";

async function main() {
  console.log("🌱 Seeding database…");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Чистим существующие данные (в порядке зависимостей)
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.chat.deleteMany();
  await prisma.session.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const me = await prisma.user.create({
    data: {
      username: "me",
      displayName: "You",
      email: "me@chatgram.local",
      passwordHash,
      status: "ONLINE",
      avatarUrl: null,
    },
  });

  const david = await prisma.user.create({
    data: {
      username: "david_moore",
      displayName: "David Moore",
      email: "david@chatgram.local",
      passwordHash,
      status: "ONLINE",
    },
  });

  const jessica = await prisma.user.create({
    data: {
      username: "jessica_drew",
      displayName: "Jessica Drew",
      email: "jessica@chatgram.local",
      passwordHash,
      status: "ONLINE",
    },
  });

  const greg = await prisma.user.create({
    data: {
      username: "greg_james",
      displayName: "Greg James",
      email: "greg@chatgram.local",
      passwordHash,
      status: "OFFLINE",
      lastSeenAt: new Date(Date.now() - 60 * 60 * 1000),
    },
  });

  console.log(`   Default password for all users: "${DEFAULT_PASSWORD}"`);

  // Create service + self chats for each user
  for (const u of [me, david, jessica, greg]) {
    await prisma.chat.create({
      data: {
        type: "SERVICE",
        name: "Messenger",
        participants: { create: { userId: u.id, role: "MEMBER" } },
      },
    });
    await prisma.chat.create({
      data: {
        type: "SELF",
        name: "Избранное",
        participants: { create: { userId: u.id, role: "OWNER" } },
      },
    });
  }

  // Личный чат с David
  const davidChat = await prisma.chat.create({
    data: {
      type: "PRIVATE",
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: me.id, unreadCount: 0, lastReadMessageId: null },
          { userId: david.id, unreadCount: 0, lastReadMessageId: null },
        ],
      },
    },
  });

  // Личный чат с Jessica
  const jessicaChat = await prisma.chat.create({
    data: {
      type: "PRIVATE",
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: me.id, unreadCount: 2 },
          { userId: jessica.id, unreadCount: 0 },
        ],
      },
    },
  });

  // Группа Office Chat
  const officeChat = await prisma.chat.create({
    data: {
      type: "GROUP",
      name: "Office Chat",
      creatorId: me.id,
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: me.id, role: "OWNER" },
          { userId: david.id, role: "MEMBER" },
          { userId: jessica.id, role: "MEMBER" },
          { userId: greg.id, role: "MEMBER" },
        ],
      },
    },
  });

  // Сообщения в чате с David
  const now = Date.now();
  await prisma.message.createMany({
    data: [
      {
        chatId: davidChat.id,
        senderId: david.id,
        type: "TEXT",
        content: "OMG 😍 do you remember what you did last night at the work night out?",
        createdAt: new Date(now - 6 * 60_000),
      },
      {
        chatId: davidChat.id,
        senderId: me.id,
        type: "TEXT",
        content: "no haha",
        createdAt: new Date(now - 5 * 60_000),
      },
      {
        chatId: davidChat.id,
        senderId: me.id,
        type: "TEXT",
        content: "i don't remember anything 😘",
        createdAt: new Date(now - 4 * 60_000),
      },
      {
        chatId: jessicaChat.id,
        senderId: jessica.id,
        type: "TEXT",
        content: "Ok, see you later",
        createdAt: new Date(now - 22 * 60_000),
      },
      {
        chatId: jessicaChat.id,
        senderId: jessica.id,
        type: "TEXT",
        content: "Are you coming tonight?",
        createdAt: new Date(now - 30 * 60_000),
      },
      {
        chatId: officeChat.id,
        senderId: greg.id,
        type: "TEXT",
        content: "I got a job at SpaceX 🚀",
        createdAt: new Date(now - 60 * 60_000),
      },
    ],
  });

  console.log("✅ Seeded:", { me: me.id, david: david.id, jessica: jessica.id, greg: greg.id });
  console.log(`   Chats: ${[davidChat, jessicaChat, officeChat].length}`);

  // ── Premium seed: 4 tiers + 10 features + plan-feature links ──
  console.log("📦 Seeding premium plans & features…");

  const features = await Promise.all(
    [
      { code: "voice_to_text", name: "Расшифровка голосовых" },
      { code: "video_avatar", name: "Видеоаватары" },
      { code: "ai_rewrite", name: "AI-переписывание" },
      { code: "no_ads", name: "Без рекламы" },
      { code: "large_upload", name: "Большие файлы" },
      { code: "saved_tags", name: "Теги в Избранном" },
      { code: "task_lists", name: "Списки задач" },
      { code: "premium_stickers", name: "Премиум-стикеры" },
      { code: "premium_reactions", name: "Любые реакции" },
      { code: "premium_badge", name: "Premium-значок" },
    ].map((f) =>
      prisma.feature.upsert({
        where: { code: f.code },
        update: {},
        create: f,
      })
    ),
  );
  const featureMap = new Map(features.map((f) => [f.code, f.id]));

  const plans = await Promise.all(
    [
      { name: "FREE", durationDays: 0, priceKopecks: 0, sortOrder: 0, featureCodes: [] },
      { name: "PLUS", durationDays: 30, priceKopecks: 29900, sortOrder: 1, featureCodes: ["no_ads", "large_upload", "premium_badge"] },
      { name: "PREMIUM", durationDays: 30, priceKopecks: 59900, sortOrder: 2, featureCodes: ["no_ads", "large_upload", "premium_badge", "voice_to_text", "video_avatar", "ai_rewrite", "premium_stickers", "premium_reactions", "saved_tags", "task_lists"] },
      { name: "BUSINESS", durationDays: 30, priceKopecks: 149900, sortOrder: 3, featureCodes: ["no_ads", "large_upload", "premium_badge", "voice_to_text", "video_avatar", "ai_rewrite", "premium_stickers", "premium_reactions", "saved_tags", "task_lists"] },
    ].map(async (p) => {
      const plan = await prisma.subscriptionPlan.upsert({
        where: { id: `seed_${p.name}` },
        update: { priceKopecks: p.priceKopecks },
        create: {
          id: `seed_${p.name}`,
          name: p.name,
          durationDays: p.durationDays,
          priceKopecks: p.priceKopecks,
          isPopular: p.name === "PREMIUM",
          sortOrder: p.sortOrder,
        },
      });
      // Link features
      for (const code of p.featureCodes) {
        const fid = featureMap.get(code);
        if (fid) {
          await prisma.planFeature.upsert({
            where: { planId_featureId: { planId: plan.id, featureId: fid } },
            update: {},
            create: { planId: plan.id, featureId: fid },
          }).catch(() => {});
        }
      }
      return plan;
    }),
  );
  console.log(`   Plans: ${plans.map((p) => p.name).join(", ")}`);
  console.log(`   Features: ${features.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
