WITH sc AS (
  SELECT c."id" as cid
  FROM "Chat" c
  JOIN "Participant" p ON p."chatId" = c."id"
  WHERE c."type" = 'SERVICE' AND p."userId" = 'cmq5vkd7y0000iri88gm0ja3i'
  LIMIT 1
)
INSERT INTO "Message" ("id", "chatId", "senderId", "type", "serviceType", "content", "createdAt", "updatedAt")
VALUES (
  'update-news-001',
  (SELECT cid FROM sc),
  'cmq5vkd7y0000iri88gm0ja3i',
  'SYSTEM',
  'NEWS',
  'NextX - Обновление панели управления

Новое:
- Панель администратора — 13 секций с матрицей ролей
- Регистрация новых пользователей
- Кнопка панели в сайдбаре (для админов)
- Иконки Избранного и Служебных уведомлений
- Кнопка «Подписка» в главном меню

Исправлено:
- Имя чата «Messenger» → «NextX»
- Исправлено «Unknown» в шапке чата
- Звонки запрещены в служебных чатах
- Кнопка «Ещё» — исправлено меню
- Убран ложный номер телефона
- Убран выбор языка из настроек
- Исправлен favicon (иконка N на фиолетовом градиенте)
- Исправлена JWT авторизация (чтение cookie через server.js)',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
