SELECT id, username, "isBanned", "isPermabanned", "passwordHash" IS NOT NULL as has_hash, LENGTH("passwordHash") as hash_len FROM "User" WHERE username = 'me';
