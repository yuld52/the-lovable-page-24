-- ============================================================
--  METEORFY — Schema Completo da Base de Dados
--  Gerado em: 2026-05-03
--  Base: Neon PostgreSQL
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PRODUCTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(500)  NOT NULL,
  description       TEXT,
  price             BIGINT        NOT NULL DEFAULT 0,       -- minor units (centavos)
  currency          VARCHAR(10)   NOT NULL DEFAULT 'USD',   -- 'USD' | 'MZN' | 'BRL' | 'EUR'
  image_url         TEXT,
  delivery_url      TEXT,
  whatsapp_url      TEXT,
  delivery_files    JSONB         NOT NULL DEFAULT '[]',    -- array de paths de ficheiros
  no_email_delivery BOOLEAN       NOT NULL DEFAULT FALSE,
  payment_methods   JSONB         NOT NULL DEFAULT '["paypal"]', -- ['mpesa','emola','paypal']
  status            VARCHAR(50)   NOT NULL DEFAULT 'pending',    -- 'pending' | 'approved' | 'rejected'
  owner_id          TEXT,                                   -- Firebase UID do vendedor
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. CHECKOUTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkouts (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  owner_id    TEXT          NOT NULL,                       -- Firebase UID do vendedor
  name        VARCHAR(500)  NOT NULL,
  slug        VARCHAR(255)  NOT NULL UNIQUE,                -- URL amigável
  public_url  TEXT,
  views       INTEGER       NOT NULL DEFAULT 0,
  active      BOOLEAN       NOT NULL DEFAULT TRUE,
  config      JSONB         NOT NULL DEFAULT '{}',          -- configurações visuais do checkout
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkouts_owner   ON checkouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_slug    ON checkouts(slug);

-- ────────────────────────────────────────────────────────────
-- 3. SETTINGS  (1 linha por vendedor)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id                      SERIAL PRIMARY KEY,
  user_id                 TEXT          NOT NULL,           -- Firebase UID
  email                   TEXT,                             -- email real (guardado no login)

  -- PayPal
  paypal_client_id        TEXT,
  paypal_client_secret    TEXT,
  paypal_webhook_id       TEXT,
  environment             VARCHAR(20)   NOT NULL DEFAULT 'production', -- 'sandbox' | 'production'

  -- e2Payments (M-Pesa / e-Mola)
  e2payments_client_id        TEXT,
  e2payments_client_secret    TEXT,
  e2payments_mpesa_wallet_id  TEXT,
  e2payments_emola_wallet_id  TEXT,

  -- Meta Pixel
  facebook_pixel_id       TEXT,
  facebook_access_token   TEXT,
  meta_enabled            BOOLEAN       NOT NULL DEFAULT TRUE,

  -- UTMify
  utmfy_token             TEXT,
  utmfy_enabled           BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Tracking
  track_top_funnel        BOOLEAN       NOT NULL DEFAULT TRUE,
  track_checkout          BOOLEAN       NOT NULL DEFAULT TRUE,
  track_purchase_refund   BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Notificações
  sales_notifications     BOOLEAN       NOT NULL DEFAULT TRUE,

  -- Webhook
  webhook_url             TEXT,
  webhook_events          TEXT          NOT NULL DEFAULT 'sale.pending,sale.paid,sale.refunded'
);

CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- e2payments columns (idempotente — executar se a tabela já existir sem elas)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS email                         TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS e2payments_client_id          TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS e2payments_client_secret      TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS e2payments_mpesa_wallet_id    TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS e2payments_emola_wallet_id    TEXT;

-- ────────────────────────────────────────────────────────────
-- 4. SALES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                    SERIAL PRIMARY KEY,
  checkout_id           INTEGER,                            -- NULL se venda manual
  product_id            INTEGER,
  user_id               TEXT,                               -- Firebase UID do vendedor
  amount                BIGINT        NOT NULL DEFAULT 0,   -- minor units
  status                VARCHAR(50)   NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'captured' | 'refunded' | 'failed'
  customer_email        TEXT,                               -- email do COMPRADOR
  paypal_order_id       TEXT,
  paypal_currency       VARCHAR(10),
  paypal_amount_minor   BIGINT,
  payment_method        TEXT,                               -- 'mpesa' | 'emola' | 'paypal'
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  utm_content           TEXT,
  utm_term              TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id     ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_checkout_id ON sales(checkout_id);
CREATE INDEX IF NOT EXISTS idx_sales_status      ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at  ON sales(created_at);

-- colunas opcionais (idempotente)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method      TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_source          TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_medium          TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_campaign        TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_content         TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS utm_term            TEXT;

-- ────────────────────────────────────────────────────────────
-- 5. WITHDRAWALS (Saques)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT          NOT NULL,                     -- Firebase UID do vendedor
  amount        BIGINT        NOT NULL,                     -- minor units
  pix_key       TEXT          NOT NULL,                     -- número M-Pesa / e-Mola
  pix_key_type  VARCHAR(50)   NOT NULL DEFAULT 'email',     -- 'mpesa' | 'emola' | 'email'
  status        VARCHAR(50)   NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'rejected'
  requested_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMP,                                  -- preenchido ao aprovar/rejeitar
  admin_note    TEXT                                        -- nota do admin ao processar
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status  ON withdrawals(status);

-- colunas opcionais (idempotente)
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMP;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note    TEXT;

-- ────────────────────────────────────────────────────────────
-- 6. BANK ACCOUNTS (Contas para saque)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT          NOT NULL,                       -- Firebase UID do vendedor
  type        VARCHAR(50)   NOT NULL,                       -- 'mpesa' | 'emola'
  phone       VARCHAR(50)   NOT NULL,                       -- número de telefone
  name        VARCHAR(255),                                 -- nome do titular
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- coluna opcional (idempotente)
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- ────────────────────────────────────────────────────────────
-- 7. PUSH SUBSCRIPTIONS (Notificações push Web)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT          NOT NULL,                     -- Firebase UID do vendedor
  endpoint      TEXT          NOT NULL UNIQUE,              -- URL do push endpoint do browser
  subscription  JSONB         NOT NULL,                     -- objecto completo PushSubscription
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ────────────────────────────────────────────────────────────
-- 8. PLATFORM CONFIG (Regras e taxas — admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_config (
  key         TEXT      PRIMARY KEY,
  value       TEXT      NOT NULL,
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Valores por omissão
INSERT INTO platform_config (key, value) VALUES
  ('platform_fee_percent',  '10'),
  ('min_withdrawal_amount', '10000'),
  ('max_withdrawal_amount', '500000'),
  ('withdrawal_days',       '1-5'),
  ('support_email',         'suporte@meteorfy.com'),
  ('platform_name',         'Meteorfy')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
--  FIM DO SCHEMA
-- ============================================================
