-- Neon PostgreSQL Schema for Meteorfy
-- Run this SQL in your Neon SQL Editor or use drizzle-kit push

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL, -- in cents (USD)
    image_url TEXT,
    delivery_url TEXT,
    whatsapp_url TEXT,
    delivery_files JSONB DEFAULT '[]'::jsonb,
    no_email_delivery BOOLEAN DEFAULT FALSE,
    payment_methods JSONB DEFAULT '["paypal"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT NOW(),
    owner_id UUID -- Firebase Auth user id (uuid)
);

-- Checkouts table
CREATE TABLE IF NOT EXISTS checkouts (
    id SERIAL PRIMARY KEY,
    owner_id UUID, -- auth user id (uuid)
    product_id INTEGER NOT NULL REFERENCES products(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    public_url TEXT,
    views INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    config JSONB DEFAULT '{
        "timerMinutes": 10,
        "timerText": "Oferta Especial por Tempo Limitado!",
        "timerColor": "#dc2626",
        "heroTitle": "Promoção por tempo limitado",
        "heroBadgeText": "7 DIAS",
        "heroImageUrl": "",
        "benefitsList": [
            {"icon": "zap", "title": "ACESSO IMEDIATO", "subtitle": "Seu produto disponível em instantes"},
            {"icon": "shield", "title": "PAGAMENTO SEGURO", "subtitle": "Dados protegidos e criptografados"}
        ],
        "privacyText": "Your information is 100% secure",
        "safeText": "Safe purchase",
        "deliveryText": "Delivery via E-mail",
        "approvedText": "Approved content",
        "testimonials": [],
        "upsellProducts": [],
        "orderBumpProducts": [],
        "payButtonText": "Buy now",
        "footerText": "Meteorfy © 2026. Todos os direitos reservados.",
        "primaryColor": "#22a559",
        "backgroundColor": "#f9fafb",
        "highlightColor": "#f3f4f6",
        "textColor": "#111827",
        "showChangeCountry": true,
        "showTimer": false,
        "showPhone": false,
        "showCpf": false,
        "showSurname": false,
        "showCnpj": false,
        "showAddress": false,
        "checkoutLanguage": "AUTO",
        "checkoutCurrency": "AUTO",
        "previewCurrency": "AUTO"
    }'::jsonb
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    checkout_id INTEGER REFERENCES checkouts(id),
    product_id INTEGER REFERENCES products(id),
    amount INTEGER NOT NULL, -- in cents
    status TEXT NOT NULL, -- pending, paid, failed, captured, refunded
    customer_email TEXT,
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    paypal_currency TEXT,
    paypal_amount_minor INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    user_id UUID, -- Firebase Auth user id (uuid)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    user_id UUID, -- Firebase Auth user id (uuid)
    paypal_client_id TEXT,
    paypal_client_secret TEXT,
    paypal_webhook_id TEXT,
    facebook_pixel_id TEXT,
    facebook_access_token TEXT,
    utmfy_token TEXT,
    sales_notifications BOOLEAN DEFAULT FALSE,
    environment TEXT DEFAULT 'sandbox', -- sandbox or production
    meta_enabled BOOLEAN DEFAULT TRUE,
    utmfy_enabled BOOLEAN DEFAULT TRUE,
    track_top_funnel BOOLEAN DEFAULT TRUE,
    track_checkout BOOLEAN DEFAULT TRUE,
    track_purchase_refund BOOLEAN DEFAULT TRUE
);

-- Push subscriptions table (optional, for reference)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID, -- Firebase Auth user id (uuid)
    subscription JSONB NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table (optional, for reference)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID, -- Firebase Auth user id (uuid)
    type TEXT NOT NULL, -- PURCHASE_APPROVED, NEW_LESSON, etc.
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_checkouts_owner_id ON checkouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_checkouts_slug ON checkouts(slug);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_checkout_id ON sales(checkout_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Comments for documentation
COMMENT ON TABLE products IS 'Digital products created by users';
COMMENT ON TABLE checkouts IS 'Checkout pages for products with custom config';
COMMENT ON TABLE sales IS 'Sales transactions with payment status';
COMMENT ON TABLE settings IS 'User settings for PayPal, Meta Pixel, UTMify, etc.';
COMMENT ON TABLE push_subscriptions IS 'Web Push notification subscriptions';
COMMENT ON TABLE notifications IS 'User notifications history';