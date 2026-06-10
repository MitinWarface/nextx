import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, bio: true, avatarUrl: true, username: true },
  });

  if (!user) return { title: "User not found" };

  return {
    title: `${user.displayName} (@${user.username}) — NextX`,
    description: user.bio ?? `${user.displayName} on NextX Messenger`,
    openGraph: {
      title: `${user.displayName} (@${user.username})`,
      description: user.bio ?? "",
      images: user.avatarUrl ? [user.avatarUrl] : [],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      bannerUrl: true,
      bio: true,
      website: true,
      socialLinks: true,
      accountType: true,
      publicId: true,
      reputation: true,
      createdAt: true,
      location: true,
      languages: true,
      skills: true,
      accentColor: true,
      premiumStatus: true,
      premiumUntil: true,
      customDomain: true,
      domainVerified: true,
      userRole: true,
      roleBadge: true,
      builderConfig: true,
      developerApps: {
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          description: true,
          miniAppUrl: true,
          miniAppIcon: true,
          miniAppCategory: true,
          miniAppRating: true,
          miniAppInstalls: true,
        },
      },
      achievements: {
        select: {
          achievement: {
            select: {
              code: true,
              name: true,
              description: true,
              icon: true,
              category: true,
            },
          },
          unlockedAt: true,
        },
        orderBy: { unlockedAt: "desc" },
      },
      receivedGifts: {
        select: {
          id: true,
          name: true,
          emoji: true,
          rarity: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      participants: {
        where: {
          chat: { type: "CHANNEL", isArchived: false },
        },
        select: {
          chat: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              description: true,
              level: true,
              experience: true,
              _count: {
                select: { participants: true },
              },
            },
          },
        },
        orderBy: { chat: { lastMessageAt: "desc" } },
        take: 5,
      },
    },
  });

  if (!user) notFound();

  const socialLinks = user.socialLinks as Record<string, string> | null;

  const recentMessages = await prisma.message.findMany({
    where: {
      senderId: user.id,
      type: "TEXT",
      isDeleted: false,
      chat: { type: "CHANNEL" },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      chat: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const rarityColors: Record<string, string> = {
    common: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    rare: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    epic: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    legendary: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  };

  const socialIcons: Record<string, string> = {
    github: "GH",
    twitter: "X",
    telegram: "TG",
    instagram: "IG",
    linkedin: "LI",
    youtube: "YT",
  };

  const socialColors: Record<string, string> = {
    github: "bg-neutral-800 text-white",
    twitter: "bg-sky-500 text-white",
    telegram: "bg-sky-600 text-white",
    instagram: "bg-pink-500 text-white",
    linkedin: "bg-blue-700 text-white",
    youtube: "bg-red-600 text-white",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg dark:shadow-none">
          {user.bannerUrl ? (
            <div className="relative h-40 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.bannerUrl}
                alt="Banner"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
            </div>
          ) : (
            <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
          <div className="-mt-16 flex flex-col items-center px-6 pb-6">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="h-28 w-28 rounded-full object-cover ring-4 ring-card"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary text-4xl font-bold text-primary-foreground ring-4 ring-card">
                {user.displayName[0]?.toUpperCase()}
              </div>
            )}

            <h1
              className="mt-4 text-2xl font-bold"
              style={user.accentColor ? { color: user.accentColor } : undefined}
            >
              {user.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.publicId && (
              <p className="mt-1 font-mono text-xs text-muted-foreground/60">
                {user.publicId}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
                {user.accountType}
              </span>
              {user.premiumStatus === "active" && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  ★ Premium
                </span>
              )}
              {user.reputation > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  ★ {user.reputation.toFixed(1)}
                </span>
              )}
              {user.userRole && (
                <span className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  {user.roleBadge ?? "✦"} {user.userRole}
                </span>
              )}
            </div>

            {user.location && (
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {user.location}
              </p>
            )}

            {user.languages.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {user.languages.join(" · ")}
              </div>
            )}
          </div>
        </div>

        {/* About / Bio */}
        {user.bio && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">О себе</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          </div>
        )}

        {/* Website */}
        {user.website && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Сайт</h2>
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              {user.website}
            </a>
          </div>
        )}

        {/* Channels */}
        {user.participants.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Каналы</h2>
            <div className="space-y-2">
              {user.participants.map((p: any) => (
                <a
                  key={p.chat.id}
                  href={`/?chat=${p.chat.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-accent"
                >
                  {p.chat.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.chat.avatarUrl} alt={p.chat.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {p.chat.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.chat.name}</p>
                    {p.chat.description && (
                      <p className="truncate text-xs text-muted-foreground">{p.chat.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {p.chat._count.participants} подписчиков
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {user.skills.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Навыки</h2>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Social Links */}
        {socialLinks && Object.keys(socialLinks).length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Социальные сети</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(socialLinks).map(([platform, handle]) => {
                if (!handle) return null;
                const url = platform === "telegram"
                  ? `https://t.me/${handle}`
                  : platform === "github"
                    ? `https://github.com/${handle}`
                    : platform === "twitter"
                      ? `https://x.com/${handle}`
                      : platform === "instagram"
                        ? `https://instagram.com/${handle}`
                        : platform === "linkedin"
                          ? `https://linkedin.com/in/${handle}`
                          : platform === "youtube"
                            ? `https://youtube.com/@${handle}`
                            : handle;
                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${socialColors[platform] ?? "bg-muted text-muted-foreground"}`}>
                      {socialIcons[platform] ?? platform[0]?.toUpperCase()}
                    </span>
                    <span className="font-medium">{handle}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects / Developer Apps */}
        {user.developerApps.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Проекты</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {user.developerApps.map((app) => (
                <a
                  key={app.id}
                  href={app.miniAppUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-accent"
                >
                  {app.miniAppIcon ? (
                    <img src={app.miniAppIcon} alt={app.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg">
                      {app.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{app.name}</p>
                    {app.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{app.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {app.miniAppCategory && (
                        <span className="rounded bg-muted px-1.5 py-0.5 capitalize">{app.miniAppCategory}</span>
                      )}
                      {app.miniAppRating > 0 && (
                        <span>★ {app.miniAppRating.toFixed(1)}</span>
                      )}
                      {app.miniAppInstalls > 0 && (
                        <span>{app.miniAppInstalls} installs</span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentMessages.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Последняя активность</h2>
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{msg.chat.name}</span>
                    <span>·</span>
                    <span>{new Date(msg.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gift Collection */}
        {user.receivedGifts.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Коллекция подарков</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {user.receivedGifts.map((gift) => (
                <div
                  key={gift.id}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${rarityColors[gift.rarity] ?? ""}`}
                  title={`${gift.name} (${gift.rarity})`}
                >
                  <span className="text-2xl">{gift.emoji}</span>
                  <span className="line-clamp-1 text-[10px] font-medium">{gift.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement Badges */}
        {user.achievements.length > 0 && (
          <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">Достижения</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {user.achievements.map((ua) => (
                <div
                  key={ua.achievement.code}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <span className="text-2xl">{ua.achievement.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{ua.achievement.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {new Date(ua.unlockedAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Builder Sections */}
        {user.builderConfig && typeof user.builderConfig === "object" && (user.builderConfig as any).sections && (
          <>
            {((user.builderConfig as any).sections as Array<{ type: string; enabled: boolean; title?: string; content?: string; items?: Array<{ label: string; url: string }> }>)
              .filter((s) => s.enabled)
              .map((section) => (
                <div key={section.type} className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
                  {section.content && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {section.content}
                    </p>
                  )}
                  {section.type === "links" && section.items && section.items.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {section.items.map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
                        >
                          {item.label || item.url}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </>
        )}

        {/* Contact & Footer */}
        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-card p-6 shadow-sm">
          <a
            href={`/?chat=user:${user.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Написать
          </a>
          <p className="text-xs text-muted-foreground/60">
            Участник с {new Date(user.createdAt).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>
    </div>
  );
}
