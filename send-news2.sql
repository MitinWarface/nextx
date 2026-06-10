UPDATE "Chat" SET "lastMessageAt" = NOW()
WHERE "id" IN (
  SELECT c."id" FROM "Chat" c
  JOIN "Participant" p ON p."chatId" = c."id"
  WHERE c."type" = 'SERVICE' AND p."userId" = 'cmq5vkd7y0000iri88gm0ja3i'
);
