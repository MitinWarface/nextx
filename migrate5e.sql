SELECT "id", "username", "role", CASE WHEN "passwordHash" IS NOT NULL THEN 'HAS_HASH' ELSE 'NO_HASH' END as hash_status FROM "User" WHERE username='me';
