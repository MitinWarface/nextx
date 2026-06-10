"use client";

import * as React from "react";
import {
  MessageCircle,
  Layers,
  MessagesSquare,
  Radio,
  Gift,
  Crown,
  Shield,
  Bot,
  Code,
  Rocket,
  Zap,
  Lock,
  Wallet,
  Coins,
  Heart,
  Star,
  Repeat,
  CreditCard,
  Search,
  Phone,
  Users,
  Folder,
  Archive,
  Pin,
  Palette,
  EyeOff,
  Image,
  Filter,
  Globe,
  BarChart3,
  Rss,
  FileText,
  CalendarClock,
  Sparkles,
  Languages,
  Video,
  Smartphone,
  Webhook,
  Wrench,
  Key,
  Settings,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  MonitorSmartphone,
  Settings2,
  PanelLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const sections: DocSection[] = [
  { id: "about", title: "О NextX", icon: <Layers className="h-4 w-4" />, color: "text-blue-500" },
  { id: "features", title: "Возможности", icon: <Zap className="h-4 w-4" />, color: "text-yellow-500" },
  { id: "chats", title: "Чаты и группы", icon: <MessagesSquare className="h-4 w-4" />, color: "text-green-500" },
  { id: "channels", title: "Каналы", icon: <Radio className="h-4 w-4" />, color: "text-purple-500" },
  { id: "gifts", title: "Подарки и кошелёк", icon: <Gift className="h-4 w-4" />, color: "text-pink-500" },
  { id: "premium", title: "Premium", icon: <Crown className="h-4 w-4" />, color: "text-amber-500" },
  { id: "security", title: "Безопасность", icon: <Shield className="h-4 w-4" />, color: "text-red-500" },
  { id: "ai", title: "AI-функции", icon: <Sparkles className="h-4 w-4" />, color: "text-cyan-500" },
  { id: "bots", title: "Боты и Mini Apps", icon: <Bot className="h-4 w-4" />, color: "text-indigo-500" },
  { id: "api", title: "API и разработка", icon: <Code className="h-4 w-4" />, color: "text-orange-500" },
  { id: "quickstart", title: "Быстрый старт", icon: <Rocket className="h-4 w-4" />, color: "text-emerald-500" },
];

function SectionBlock({
  id,
  icon,
  color,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-accent ${color}`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h4 className="mb-1 font-semibold">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = React.useState("about");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);

  React.useEffect(() => {
    const headings = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );

    headings.forEach((h) => observerRef.current!.observe(h));

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background">
      <title>NextX — Документация</title>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">NextX Documentation</h1>
              <p className="text-muted-foreground">Мессенджер нового поколения — полное руководство</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              v1.0.0
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Next.js 15
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              TypeScript
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              PostgreSQL
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex gap-8">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Sidebar */}
          <aside
            className={`
              fixed top-0 left-0 z-40 h-full w-64 border-r border-border bg-background/95 backdrop-blur-sm
              overflow-y-auto pt-24 pb-8 px-4 transition-transform duration-200
              lg:sticky lg:translate-x-0 lg:pt-8
              ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${activeSection === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }
                  `}
                >
                  <span className={s.color}>{s.icon}</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Overlay for mobile */}
          {mobileMenuOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Content */}
          <main className="flex-1 min-w-0 py-8 lg:py-12 space-y-16">
            {/* О NextX */}
            <SectionBlock id="about" icon={<Layers className="h-5 w-5" />} color="text-blue-500" title="О NextX">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-2">Что такое NextX?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  NextX — мессенджер нового поколения, объединяющий мгновенные сообщения, голосовые и видеозвонки,
                  каналы, платежи и AI-инструменты в единой экосистеме. Построен на современном стеке с акцентом
                  на производительность, безопасность и удобство разработки.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Технологический стек</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { name: "Next.js 15", desc: "App Router, SSR, RSC" },
                    { name: "TypeScript", desc: "Строгая типизация" },
                    { name: "PostgreSQL", desc: "Основная БД" },
                    { name: "Redis", desc: "Кэширование, pub/sub" },
                    { name: "Socket.io", desc: "Real-time доставка" },
                    { name: "LiveKit", desc: "Групповые звонки" },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-3 rounded-lg bg-accent/50 px-4 py-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Ключевые преимущества</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FeatureCard
                    icon={<Lock className="h-5 w-5" />}
                    title="End-to-end шифрование"
                    description="Все личные чаты защищены сквозным шифрованием. Только вы и собеседник можете прочитать сообщения."
                  />
                  <FeatureCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="AI-powered"
                    description="Встроенный AI-помощник для перевода, суммаризации, генерации контента и умного поиска."
                  />
                  <FeatureCard
                    icon={<Layers className="h-5 w-5" />}
                    title="Единая экосистема"
                    description="Чаты, каналы, платежи, боты, мини-приложения и облачное хранилище — всё в одном приложении."
                  />
                </div>
              </div>
            </SectionBlock>

            {/* Возможности */}
            <SectionBlock id="features" icon={<Zap className="h-5 w-5" />} color="text-yellow-500" title="Возможности">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Масштаб платформы</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { value: "28+", label: "Разделов админки", color: "text-blue-500" },
                    { value: "300+", label: "API endpoints", color: "text-green-500" },
                    { value: "<50ms", label: "Доставка сообщений", color: "text-purple-500" },
                    { value: "1000", label: "Участников в звонке", color: "text-amber-500" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-accent/40 p-4 text-center">
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Основные возможности</h3>
                <BulletList
                  items={[
                    "Личные и групповые чаты",
                    "Публичные и приватные каналы",
                    "Групповые голосовые и видеозвонки",
                    "Сквозное шифрование (E2EE)",
                    "Встроенный кошелёк NextCoin",
                    "Подарки и P2P-рынок",
                    "AI-помощник и переводчик",
                    "Боты и мини-приложения",
                    "Облачное хранилище файлов",
                    "Premium-подписка с расширенными функциями",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* Чаты и группы */}
            <SectionBlock id="chats" icon={<MessagesSquare className="h-5 w-5" />} color="text-green-500" title="Чаты и группы">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Типы чатов</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FeatureCard
                    icon={<MessageSquare className="h-5 w-5" />}
                    title="Личные чаты"
                    description="1 на 1 с E2E-шифрованием, скриншоты, голосовые сообщения, стикеры."
                  />
                  <FeatureCard
                    icon={<Users className="h-5 w-5" />}
                    title="Группы"
                    description="До 100 000 участников, админы, модераторы, настройки прав, папки."
                  />
                  <FeatureCard
                    icon={<Radio className="h-5 w-5" />}
                    title="Каналы"
                    description="Неограниченная аудитория, комментарии, статистика, монетизация."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Управление чатами</h3>
                <BulletList
                  items={[
                    "PIN-блокировка чатов",
                    "Цветовые метки для визуальной организации",
                    "Тихая отправка (без звука у получателя)",
                    "Одноразовые фото и видео",
                    "Папки чатов с фильтрами",
                    "Архивация и закрепление чатов",
                    "Поиск по сообщениям и медиа",
                    "Переслать, ответить, цитировать",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* Каналы */}
            <SectionBlock id="channels" icon={<Radio className="h-5 w-5" />} color="text-purple-500" title="Каналы">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Типы каналов</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard
                    icon={<Globe className="h-5 w-5" />}
                    title="Публичные каналы"
                    description="Доступны по @username, индексируются в поиске, открытая статистика."
                  />
                  <FeatureCard
                    icon={<Lock className="h-5 w-5" />}
                    title="Приватные каналы"
                    description="По пригласительным ссылкам, скрыты от поиска, контролируемый доступ."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Монетизация и инструменты</h3>
                <BulletList
                  items={[
                    "Платные посты и подписки",
                    "Бусты каналов для продвижения",
                    "Аналитика: подписчики, охваты, вовлечённость",
                    "Автопостинг из RSS-лент",
                    "Черновики и планировщик публикаций",
                    "Комментарии и обсуждения",
                    "Медиа-контент: фото, видео, документы",
                    "Интеграция с AI для генерации постов",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* Подарки и кошелёк */}
            <SectionBlock id="gifts" icon={<Gift className="h-5 w-5" />} color="text-pink-500" title="Подарки и кошелёк">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">NextCoin (NC)</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Встроенная валюта платформы для покупок, переводов, подписок и подарков. Безопасные транзакции
                  с историями и чеками.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-accent/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Валюта</span>
                    </div>
                    <p className="text-sm text-muted-foreground">NextCoin (NC) — внутренняя валюта кошелька</p>
                  </div>
                  <div className="rounded-lg bg-accent/40 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Пополнение</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Через YooKassa, банковские карты и другие методы</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Подарки</h3>
                <BulletList
                  items={[
                    "4 уровня редкости: Common, Rare, Epic, Legendary",
                    "Рынок подарков (P2P-торговля)",
                    "Вишлист — добавляйте желаемые подарки",
                    "Чеки и переводы между пользователями",
                    "Коллекции и статистика подарков",
                    "Ограниченные серийные подарки",
                    "Подарки с анимациями и эффектами",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* Premium */}
            <SectionBlock id="premium" icon={<Crown className="h-5 w-5" />} color="text-amber-500" title="Premium">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Тиры подписки</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { name: "FREE", price: "Бесплатно", color: "text-muted-foreground", border: "border-border" },
                    { name: "PLUS", price: "199 ₽/мес", color: "text-blue-500", border: "border-blue-500/30" },
                    { name: "PREMIUM", price: "499 ₽/мес", color: "text-amber-500", border: "border-amber-500/30" },
                    { name: "BUSINESS", price: "999 ₽/мес", color: "text-purple-500", border: "border-purple-500/30" },
                  ].map((tier) => (
                    <div key={tier.name} className={`rounded-xl border ${tier.border} bg-accent/30 p-5 text-center`}>
                      <p className={`text-xl font-bold ${tier.color}`}>{tier.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{tier.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Premium-функции</h3>
                <BulletList
                  items={[
                    "Голосовой текст (speech-to-text)",
                    "AI-перевод сообщений в реальном времени",
                    "Видео-аватары для звонков",
                    "Большие лимиты на загрузки файлов",
                    "Расширенные настройки приватности",
                    "Приоритетная поддержка",
                    "Эксклюзивные стикеры и темы",
                    "Расширенная аналитика каналов",
                    "Мульти-устройства без ограничений",
                    "Ранний доступ к новым функциям",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* Безопасность */}
            <SectionBlock id="security" icon={<Shield className="h-5 w-5" />} color="text-red-500" title="Безопасность">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Защита аккаунта</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard
                    icon={<Lock className="h-5 w-5" />}
                    title="2FA TOTP"
                    description="Двухфакторная аутентификация через Google Authenticator или совместимые приложения."
                  />
                  <FeatureCard
                    icon={<MonitorSmartphone className="h-5 w-5" />}
                    title="Доверенные устройства"
                    description="Управление списком устройств, удаление доступа с незнакомых устройств."
                  />
                  <FeatureCard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    title="Panic Mode"
                    description="Экстренное удаление всех данных при компрометации аккаунта."
                  />
                  <FeatureCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Центр безопасности"
                    description="Просмотр активных сеансов, истории входов, настроек приватности."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Дополнительно</h3>
                <BulletList
                  items={[
                    "Антиспам и автоматическая модерация",
                    "Режим невидимки (скрытие онлайн-статуса)",
                    "Сквозное шифрование для всех чатов",
                    "Блокировка пересылки сообщений",
                    "Ограничения на скриншоты",
                    "Настройки видимости профиля",
                  ]}
                />
              </div>
            </SectionBlock>

            {/* AI-функции */}
            <SectionBlock id="ai" icon={<Sparkles className="h-5 w-5" />} color="text-cyan-500" title="AI-функции">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Возможности AI</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FeatureCard
                    icon={<Languages className="h-5 w-5" />}
                    title="AI-помощник"
                    description="Перевод, рерайтинг и суммаризация текста сообщений в один клик."
                  />
                  <FeatureCard
                    icon={<Search className="h-5 w-5" />}
                    title="AI-поиск"
                    description="Умный поиск по переписке с контекстным пониманием запроса."
                  />
                  <FeatureCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="AI-модерация"
                    description="Автоматическое обнаружение нарушений в группах и каналах."
                  />
                  <FeatureCard
                    icon={<FileText className="h-5 w-5" />}
                    title="AI-генерация постов"
                    description="Создание контента для каналов с настройкой тона и стиля."
                  />
                  <FeatureCard
                    icon={<Languages className="h-5 w-5" />}
                    title="AI-перевод звонков"
                    description="Субтитры с переводом в реальном времени во время голосовых звонков."
                  />
                  <FeatureCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="AI-реакции"
                    description="Автоматические предложения реакций на сообщения и посты."
                  />
                </div>
              </div>
            </SectionBlock>

            {/* Боты и мини-приложения */}
            <SectionBlock id="bots" icon={<Bot className="h-5 w-5" />} color="text-indigo-500" title="Боты и Mini Apps">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Bot API</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Полноценный API для создания ботов: вебхуки, инлайн-режим, клавиатуры,
                  обработка файлов и платежей через встроенную систему.
                </p>
                <BulletList
                  items={[
                    "Webhook и polling режимы",
                    "Инлайн-режим и query-боты",
                    "Клавиатуры и inline-кнопки",
                    "Обработка файлов и медиа",
                    "Payment API для платежей через ботов",
                    "Middleware и плагины",
                  ]}
                />
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Визуальный конструктор и Mini Apps</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard
                    icon={<Wrench className="h-5 w-5" />}
                    title="Конструктор без кода"
                    description="Блочная логика, шаблоны и триггеры — собирайте ботов визуально."
                  />
                  <FeatureCard
                    icon={<Smartphone className="h-5 w-5" />}
                    title="Mini Apps"
                    description="Веб-приложения в iframe внутри мессенджера с полным доступом к API."
                  />
                </div>
                <div className="mt-4 rounded-lg bg-accent/40 p-4">
                  <h4 className="font-medium mb-2">Каталог приложений</h4>
                  <p className="text-sm text-muted-foreground">
                    Публичный каталог с поиском и рейтингом. Устанавливайте приложения одной кнопкой.
                  </p>
                </div>
              </div>
            </SectionBlock>

            {/* API для разработчиков */}
            <SectionBlock id="api" icon={<Code className="h-5 w-5" />} color="text-orange-500" title="API и разработка">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Developer Portal</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Полнофункциональный портал для управления приложениями, API-ключами, вебхуками
                  и мониторинга запросов.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FeatureCard
                    icon={<Key className="h-5 w-5" />}
                    title="API ключи"
                    description="Создание, ротация и управление ключами доступа с настройкой прав."
                  />
                  <FeatureCard
                    icon={<Webhook className="h-5 w-5" />}
                    title="Webhook настройка"
                    description="Настройка URL-адресов для получения событий в реальном времени."
                  />
                  <FeatureCard
                    icon={<BarChart3 className="h-5 w-5" />}
                    title="Аналитика"
                    description="Статистика запросов, время отклика, коды ошибок, rate limits."
                  />
                  <FeatureCard
                    icon={<Settings2 className="h-5 w-5" />}
                    title="Управление приложениями"
                    description="Создание, редактирование и удаление приложений в одном месте."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Авторизация</h3>
                <div className="rounded-lg bg-muted p-4 font-mono text-sm">
                  <span className="text-muted-foreground">Authorization:</span>{" "}
                  <span className="text-primary">Bearer YOUR_API_KEY</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Все API-запросы требуют заголовок <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Authorization: Bearer</code> с валидным ключом.
                </p>
              </div>
            </SectionBlock>

            {/* Быстрый старт */}
            <SectionBlock id="quickstart" icon={<Rocket className="h-5 w-5" />} color="text-emerald-500" title="Быстрый старт">
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-4">Начните за 4 шага</h3>
                <div className="space-y-4">
                  {[
                    {
                      step: "01",
                      title: "Регистрация",
                      description: "Создайте аккаунт через email или номер телефона. Процесс занимает менее 30 секунд.",
                      icon: <UserPlus className="h-5 w-5" />,
                    },
                    {
                      step: "02",
                      title: "Первый чат",
                      description: "Найдите пользователя по username или номеру и отправьте первое сообщение.",
                      icon: <MessageSquare className="h-5 w-5" />,
                    },
                    {
                      step: "03",
                      title: "Настройка профиля",
                      description: "Добавьте аватар, настройте приватность и уведомления в разделе «Настройки».",
                      icon: <Settings className="h-5 w-5" />,
                    },
                    {
                      step: "04",
                      title: "Подключение Premium",
                      description: "Откройте расширенные возможности: AI-помощник, увеличенные лимиты, эксклюзивные темы.",
                      icon: <Crown className="h-5 w-5" />,
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 rounded-lg bg-accent/30 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-primary">{item.icon}</span>
                          <h4 className="font-semibold">{item.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-lg font-semibold mb-3">Полезные ссылки</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href="/register"
                    className="flex items-center gap-3 rounded-lg bg-accent/40 p-4 transition-colors hover:bg-accent"
                  >
                    <UserPlus className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Регистрация</p>
                      <p className="text-xs text-muted-foreground">Создайте аккаунт</p>
                    </div>
                  </a>
                  <a
                    href="/developer"
                    className="flex items-center gap-3 rounded-lg bg-accent/40 p-4 transition-colors hover:bg-accent"
                  >
                    <Code className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Developer Portal</p>
                      <p className="text-xs text-muted-foreground">API и инструменты</p>
                    </div>
                  </a>
                  <a
                    href="/bots/constructor"
                    className="flex items-center gap-3 rounded-lg bg-accent/40 p-4 transition-colors hover:bg-accent"
                  >
                    <Bot className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Конструктор ботов</p>
                      <p className="text-xs text-muted-foreground">Создайте бота без кода</p>
                    </div>
                  </a>
                  <a
                    href="/apps"
                    className="flex items-center gap-3 rounded-lg bg-accent/40 p-4 transition-colors hover:bg-accent"
                  >
                    <Smartphone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Mini Apps</p>
                      <p className="text-xs text-muted-foreground">Каталог приложений</p>
                    </div>
                  </a>
                </div>
              </div>
            </SectionBlock>

            {/* Footer */}
            <footer className="border-t border-border pt-8 pb-12">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold">NextX</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Мессенджер нового поколения
                </p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>v1.0.0</span>
                  <span>•</span>
                  <span>Next.js 15</span>
                  <span>•</span>
                  <span>TypeScript</span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  © 2026 NextX. Все права защищены.
                </p>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
