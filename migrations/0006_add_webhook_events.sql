-- Add webhook_events column to store which events the user wants to receive
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "webhook_events" text DEFAULT 'sale.pending,sale.paid,sale.refunded';
