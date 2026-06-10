SELECT success, COUNT(*) as cnt, MAX("createdAt") as last FROM "LoginHistory" GROUP BY success ORDER BY last DESC LIMIT 10;
