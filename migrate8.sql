-- Premium Plans
INSERT INTO "SubscriptionPlan" ("id", "name", "durationDays", "priceKopecks", "createdAt") VALUES
  ('plan_monthly', 'Monthly', 30, 29900, NOW()),
  ('plan_yearly', 'Yearly', 365, 199000, NOW()),
  ('plan_2years', '2Years', 730, 299000, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Features
INSERT INTO "Feature" ("id", "code", "name") VALUES
  ('feat_badge', 'premium_badge', 'Premium Badge'),
  ('feat_voice', 'voice_to_text', 'Voice To Text'),
  ('feat_video', 'video_avatar', 'Video Avatar'),
  ('feat_ai', 'ai_rewrite', 'AI Rewrite'),
  ('feat_no_ads', 'no_ads', 'No Ads'),
  ('feat_tags', 'saved_tags', 'Saved Tags'),
  ('feat_tasks', 'task_lists', 'Task Lists'),
  ('feat_stickers', 'premium_stickers', 'Premium Stickers'),
  ('feat_reactions', 'premium_reactions', 'Premium Reactions'),
  ('feat_upload', 'large_upload', 'Large Upload')
ON CONFLICT ("id") DO NOTHING;

-- Plan-Feature links
-- Monthly: all 10
INSERT INTO "PlanFeature" ("planId", "featureId") VALUES
  ('plan_monthly', 'feat_badge'), ('plan_monthly', 'feat_voice'),
  ('plan_monthly', 'feat_video'), ('plan_monthly', 'feat_ai'),
  ('plan_monthly', 'feat_no_ads'), ('plan_monthly', 'feat_tags'),
  ('plan_monthly', 'feat_tasks'), ('plan_monthly', 'feat_stickers'),
  ('plan_monthly', 'feat_reactions'), ('plan_monthly', 'feat_upload')
ON CONFLICT DO NOTHING;

-- Yearly: all 10
INSERT INTO "PlanFeature" ("planId", "featureId") VALUES
  ('plan_yearly', 'feat_badge'), ('plan_yearly', 'feat_voice'),
  ('plan_yearly', 'feat_video'), ('plan_yearly', 'feat_ai'),
  ('plan_yearly', 'feat_no_ads'), ('plan_yearly', 'feat_tags'),
  ('plan_yearly', 'feat_tasks'), ('plan_yearly', 'feat_stickers'),
  ('plan_yearly', 'feat_reactions'), ('plan_yearly', 'feat_upload')
ON CONFLICT DO NOTHING;

-- 2Years: all 10
INSERT INTO "PlanFeature" ("planId", "featureId") VALUES
  ('plan_2years', 'feat_badge'), ('plan_2years', 'feat_voice'),
  ('plan_2years', 'feat_video'), ('plan_2years', 'feat_ai'),
  ('plan_2years', 'feat_no_ads'), ('plan_2years', 'feat_tags'),
  ('plan_2years', 'feat_tasks'), ('plan_2years', 'feat_stickers'),
  ('plan_2years', 'feat_reactions'), ('plan_2years', 'feat_upload')
ON CONFLICT DO NOTHING;
