CREATE TABLE "checkouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"public_url" text,
	"views" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"config" jsonb DEFAULT '{"timerMinutes":10,"timerText":"Oferta Especial por Tempo Limitado!","timerColor":"#dc2626","heroTitle":"Promoção por tempo limitado","heroBadgeText":"7 DIAS","heroImageUrl":"","benefitsList":[{"icon":"zap","title":"ACESSO IMEDIATO","subtitle":"Seu produto disponível em instantes"},{"icon":"shield","title":"PAGAMENTO SEGURO","subtitle":"Dados protegidos e criptografados"}],"privacyText":"Your information is 100% secure","safeText":"Safe purchase","deliveryText":"Delivery via E-mail","approvedText":"Approved content","testimonials":[{"id":"1","name":"Marisa Correia","imageUrl":"","rating":5,"text":"\"Acreditem em mim, essa é a melhor compra que vocês vão fazer esse ano. Não percam a chance!\""}],"upsellProducts":[],"orderBumpProducts":[],"payButtonText":"Buy now","footerText":"Meteorfy © 2026. Todos os direitos reservados.","primaryColor":"#22a559","backgroundColor":"#f9fafb","highlightColor":"#f3f4f6","textColor":"#111827","showChangeCountry":true,"showTimer":false,"showPhone":false,"showCpf":false,"showSurname":false,"showCnpj":false,"showAddress":false,"checkoutLanguage":"pt"}'::jsonb,
	CONSTRAINT "checkouts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"image_url" text,
	"delivery_url" text,
	"whatsapp_url" text,
	"delivery_files" jsonb DEFAULT '[]'::jsonb,
	"no_email_delivery" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_id" integer,
	"product_id" integer,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"customer_email" text,
	"paypal_order_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"paypal_client_id" text,
	"paypal_client_secret" text,
	"paypal_webhook_id" text,
	"facebook_pixel_id" text,
	"utmfy_token" text,
	"environment" text DEFAULT 'sandbox'
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
