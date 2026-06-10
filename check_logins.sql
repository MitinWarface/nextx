SELECT success, COUNT(*) FROM "LoginHistory" WHERE "createdAt" > NOW() - INTERVAL '15 minutes' GROUP BY success;
