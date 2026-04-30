import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, numeric, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabela de Afiliados
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  ownerId: uuid("owner_id").notNull(), // Dono da plataforma (admin)
  userId: uuid("user_id"), // Usuário Firebase (se houver)
  name: text("name").notNull(),
  email: text("email").notNull(),
  code: text("code").notNull().unique(), // Código único do afiliado
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull(), // Taxa de comissão (ex: 10.00 = 10%)
  status: text("status").notNull().default("pending"), // pending, active, inactive, rejected
  totalClicks: integer("total_clicks").default(0),
  totalConversions: integer("total_conversions").default(0),
  totalEarnings: integer("total_earnings").default(0), // em centavos
  paidEarnings: integer("paid_earnings").default(0), // em centavos
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    ownerIdx: index("affiliates_owner_idx").on(table.ownerId),
    emailIdx: index("affiliates_email_idx").on(table.email),
    codeIdx: uniqueIndex("affiliates_code_idx").on(table.code),
  }
});

// Tabela de Links de Afiliados
export const affiliateLinks = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  productId: integer("product_id").references(() => products.id),
  checkoutId: integer("checkout_id").references(() => checkouts.id),
  slug: text("slug").notNull().unique(),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index("affiliate_links_affiliate_idx").on(table.affiliateId),
    slugIdx: uniqueIndex("affiliate_links_slug_idx").on(table.slug),
  }
});

// Tabela de Comissões (vendas geradas por afiliados)
export const commissions = pgTable("commissions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  saleId: integer("sale_id").references(() => sales.id),
  productId: integer("product_id").references(() => products.id),
  amount: integer("amount").notNull(), // Valor da venda em centavos
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: integer("commission_amount").notNull(), // Valor da comissão em centavos
  status: text("status").notNull().default("pending"), // pending, approved, paid, cancelled
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    affiliateIdx: index("commissions_affiliate_idx").on(table.affiliateId),
    saleIdx: index("commissions_sale_idx").on(table.saleId),
  }
});

// Tabela de Saques de Afiliados
export const affiliateWithdrawals = pgTable("affiliate_withdrawals", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  amount: integer("amount").notNull(), // em centavos
  pixKey: text("pix_key").notNull(),
  pixKeyType: text("pix_key_type").default("email"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  adminNote: text("admin_note"),
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => {
  return {
    affiliateIdx: index("affiliate_withdrawals_affiliate_idx").on(table.affiliateId),
  }
});

// Types
export type Affiliate = typeof affiliates.$inferSelect;
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;

export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;

export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;

export type AffiliateWithdrawal = typeof affiliateWithdrawals.$inferSelect;
export type InsertAffiliateWithdrawal = z.infer<typeof insertAffiliateWithdrawalSchema>;

// Schemas de inserção
export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true, updatedAt: true, totalClicks: true, totalConversions: true, totalEarnings: true, paidEarnings: true });
export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinks).omit({ id: true, createdAt: true, clicks: true, conversions: true });
export const insertCommissionSchema = createInsertSchema(commissions).omit({ id: true, createdAt: true, paidAt: true });
export const insertAffiliateWithdrawalSchema = createInsertSchema(affiliateWithdrawals).omit({ id: true, requestedAt: true, processedAt: true });

// Schemas de atualização
export const updateAffiliateSchema = insertAffiliateSchema.partial().omit({ id: true });
export const updateAffiliateLinkSchema = insertAffiliateLinkSchema.partial().omit({ id: true });
export const updateCommissionSchema = insertCommissionSchema.partial().omit({ id: true });