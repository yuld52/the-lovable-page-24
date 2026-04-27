-- Per-user scoping (creator owns checkout + settings)

ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "user_id" uuid;
ALTER TABLE "checkouts" ADD COLUMN IF NOT EXISTS "owner_id" uuid;

-- Helpful indexes (non-unique; multiple rows per user allowed, API always uses latest/first)
CREATE INDEX IF NOT EXISTS "settings_user_id_idx" ON "settings" ("user_id");
CREATE INDEX IF NOT EXISTS "checkouts_owner_id_idx" ON "checkouts" ("owner_id");
