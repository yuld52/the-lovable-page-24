import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents (USD)
  imageUrl: text("image_url"),
  deliveryUrl: text("delivery_url"),
  whatsappUrl: text("whatsapp_url"),
  deliveryFiles: jsonb("delivery_files").$type<string[]>().default([]),
  noEmailDelivery: boolean("no_email_delivery").default(false),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const checkouts = pgTable("checkouts", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id"), // Changed from uuid to integer
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  publicUrl: text("public_url"),
  views: integer("views").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  config: jsonb("config").$type<CheckoutConfig>().default({
    timerMinutes: 10,
    timerText: "Oferta Especial por Tempo Limitado!",
    timerColor: "#dc2626",
    heroTitle: "Promoção por tempo limitado",
    heroBadgeText: "7 DIAS",
    heroImageUrl: "",
    benefitsList: [
      { icon: "zap", title: "ACESSO IMEDIATO", subtitle: "Seu produto disponível em instantes" },
      { icon: "shield", title: "PAGAMENTO SEGURO", subtitle: "Dados protegidos e criptografados" }
    ],
    privacyText: "Your information is 100% secure",
    safeText: "Safe purchase",
    deliveryText: "Delivery via E-mail",
    approvedText: "Approved content",
    testimonials: [
      {
        id: "1",
        name: "Marisa Correia",
        imageUrl: "",
        rating: 5,
        text: "\"Acreditem em mim, essa é a melhor compra que vocês vão fazer esse ano. Não percam a chance!\""
      }
    ],
    upsellProducts: [],
    orderBumpProducts: [],
    payButtonText: "Buy now",
    footerText: "Meteorfy © 2026. Todos os direitos reservados.",
    primaryColor: "#22a559",
    backgroundColor: "#f9fafb",
    highlightColor: "#f3f4f6",
    textColor: "#111827",
    showChangeCountry: true,
    showTimer: false,
    showPhone: false,
    showCpf: false,
    showSurname: false,
    showCnpj: false,
    showAddress: false,
    checkoutLanguage: "AUTO",
    checkoutCurrency: "AUTO",
    previewCurrency: "AUTO",
  }),
});

export type CheckoutConfig = {
  environment?: string;
  timerMinutes: number;
  timerText: string;
  timerColor: string;
  heroTitle: string;
  heroBadgeText: string;
  heroImageUrl: string;
  benefitsList: { icon: string; title: string; subtitle: string }[];
  privacyText: string;
  safeText: string;
  deliveryText: string;
  approvedText: string;
  testimonials: {
    id: string;
    name: string;
    imageUrl: string;
    rating: number;
    text: string;
  }[];
  upsellProducts: number[];
  orderBumpProducts: number[];
  payButtonText: string;
  footerText: string;
  primaryColor: string;
  backgroundColor: string;
  highlightColor: string;
  textColor: string;
  showChangeCountry: boolean;
  showTimer: boolean;
  showPhone: boolean;
  showCpf: boolean;
  showSurname: boolean;
  showCnpj: boolean;
  showAddress: boolean;
  checkoutLanguage: CheckoutLanguage | "AUTO";
  checkoutCurrency?: CheckoutCurrency;
  previewCurrency?: CheckoutCurrency;
};

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Changed from uuid to integer
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  paypalWebhookId: text("paypal_webhook_id"),
  facebookPixelId: text("facebook_pixel_id"),
  facebookAccessToken: text("facebook_access_token"),
  utmfyToken: text("utmfy_token"),
  salesNotifications: boolean("sales_notifications").default(false),
  environment: text("environment").default("sandbox"),
  metaEnabled: boolean("meta_enabled").default(true),
  utmfyEnabled: boolean("utmfy_enabled").default(true),
  trackTopFunnel: boolean("track_top_funnel").default(true),
  trackCheckout: boolean("track_checkout").default(true),
  trackPurchaseRefund: boolean("track_purchase_refund").default(true),
});

export type CheckoutLanguage = "pt" | "en" | "es" | "AUTO";

export type CheckoutCurrency =
  | "AUTO"
  | "AUD"
  | "BRL"
  | "CAD"
  | "CNY"
  | "CZK"
  | "DKK"
  | "EUR"
  | "HKD"
  | "HUF"
  | "ILS"
  | "JPY"
  | "MYR"
  | "MXN"
  | "TWD"
  | "NZD"
  | "NOK"
  | "PHP"
  | "PLN"
  | "GBP"
  | "SGD"
  | "SEK"
  | "CHF"
  | "THB"
  | "USD";

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  checkoutId: integer("checkout_id"),
  productId: integer("product_id"),
  amount: integer("amount").notNull(),
  status: text("status").notNull(),
  customerEmail: text("customer_email"),
  paypalOrderId: text("paypal_order_id"),
  paypalCaptureId: text("paypal_capture_id"),
  paypalCurrency: text("paypal_currency"),
  paypalAmountMinor: integer("paypal_amount_minor"),
  createdAt: timestamp("created_at").defaultNow(),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Changed from uuid to integer
  subscription: jsonb("subscription").notNull(),
  endpoint: text("endpoint").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"), // Changed from uuid to integer
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertCheckoutSchema = createInsertSchema(checkouts).omit({ id: true, createdAt: true, views: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, userId: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Checkout = typeof checkouts.$inferSelect;
export type InsertCheckout = z.infer<typeof insertCheckoutSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type CreateProductRequest = InsertProduct;
export type UpdateProductRequest = Partial<InsertProduct>;
export type CreateCheckoutRequest = InsertCheckout;
export type UpdateCheckoutRequest = Partial<CreateCheckoutRequest>;
export type UpdateSettingsRequest = Partial<InsertSettings>;
export type DashboardStats = {
  salesToday: number;
  revenuePaid: number;
  salesApproved: number;
  revenueTarget: number;
  revenueCurrent: number;
  chartData: { name: string; sales: number }[];
};
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;