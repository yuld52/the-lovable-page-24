-- Add per-user Meta (Facebook) access token for CAPI

ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "facebook_access_token" text;

CREATE INDEX IF NOT EXISTS "settings_facebook_access_token_idx" ON "settings" ("facebook_access_token");
