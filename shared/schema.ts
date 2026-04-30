// ... (código anterior mantido) ...

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id"), // auth user id
  subscription: jsonb("subscription").notNull(),
  endpoint: text("endpoint").unique().notNull(), // to prevent duplicates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// ... (resto do arquivo mantido) ...