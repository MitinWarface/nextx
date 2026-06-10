/**
 * Checks achievement conditions and awards unlocked achievements.
 * Called after key actions (message send, group create, premium purchase, etc.)
 */
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // Ensure achievement records exist in DB
  for (const def of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: def.code },
      create: def,
      update: {},
    });
  }

  const alreadyUnlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const unlockedIdSet = new Set(alreadyUnlocked.map((a) => a.achievementId));

  // Get all achievements from DB
  const allAchievements = await prisma.achievement.findMany();
  const achievementMap = new Map(allAchievements.map((a) => [a.code, a]));

  // Gather counts in parallel
  const [messageCount, groupCount, channelCount, giftSentCount, hasWallet, user] = await Promise.all([
    prisma.message.count({ where: { senderId: userId, isDeleted: false } }),
    prisma.chat.count({ where: { creatorId: userId, type: "GROUP" } }),
    prisma.chat.count({ where: { creatorId: userId, type: "CHANNEL" } }),
    prisma.gift.count({ where: { senderId: userId } }),
    prisma.wallet.findUnique({ where: { userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, premiumStatus: true } }),
  ]);

  const checks: Array<{ code: string; condition: boolean }> = [
    { code: "first_message", condition: messageCount >= 1 },
    { code: "100_messages", condition: messageCount >= 100 },
    { code: "1000_messages", condition: messageCount >= 1000 },
    { code: "first_group", condition: groupCount >= 1 },
    { code: "10_groups", condition: groupCount >= 10 },
    { code: "first_channel", condition: channelCount >= 1 },
    { code: "gift_master", condition: giftSentCount >= 10 },
    { code: "first_wallet", condition: !!hasWallet },
    { code: "early_adopter", condition: user ? user.createdAt < new Date("2027-01-01") : false },
    { code: "premium_1month", condition: user?.premiumStatus === "active" },
    { code: "premium_6months", condition: false },
    { code: "verified", condition: false },
  ];

  for (const { code, condition } of checks) {
    if (condition) {
      const achievement = achievementMap.get(code);
      if (!achievement || unlockedIdSet.has(achievement.id)) continue;

      try {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        });
        newlyUnlocked.push(code);
      } catch {
        // Duplicate race — ignore
      }
    }
  }

  return newlyUnlocked;
}
