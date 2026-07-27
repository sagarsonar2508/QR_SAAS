import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  jsonb,
  bigserial,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  googleId: text("google_id").unique(),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const suites = pgTable(
  "suites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("restaurant"),
    settings: jsonb("settings").notNull().$type<Record<string, string>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("suites_user_idx").on(t.userId)]
);

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull().unique(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, string>>(),
    // Resolved redirect target for dynamic types; empty string for static types
    // (wifi/vcard), whose payload is encoded directly into the QR image.
    destination: text("destination").notNull().default(""),
    isDynamic: boolean("is_dynamic").notNull().default(true),
    fgColor: text("fg_color").notNull().default("#111827"),
    bgColor: text("bg_color").notNull().default("#FFFFFF"),
    ecLevel: text("ec_level").notNull().default("M"),
    // Module style: square | rounded | dots | classy | classy-rounded | extra-rounded
    shape: text("shape").notNull().default("square"),
    logoUrl: text("logo_url"),
    // When set, the QR renders in halftone photo-blend mode.
    blendImageUrl: text("blend_image_url"),
    active: boolean("active").notNull().default(true),
    // Smart redirects: device targeting + day/time schedule (see lib/redirect-rules).
    redirectRules: jsonb("redirect_rules").$type<import("@/lib/redirect-rules").RedirectRules | null>(),
    suiteId: uuid("suite_id").references(() => suites.id, { onDelete: "set null" }),
    // Role within a suite: menu | table | feedback | review
    role: text("role"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("qr_codes_user_idx").on(t.userId)]
);

export const scans = pgTable(
  "scans",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    qrId: uuid("qr_id")
      .notNull()
      .references(() => qrCodes.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    device: text("device"),
    os: text("os"),
    browser: text("browser"),
    country: text("country"),
    city: text("city"),
    referrer: text("referrer"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("scans_qr_ts_idx").on(t.qrId, t.ts)]
);

export const feedback = pgTable(
  "feedback",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    qrId: uuid("qr_id")
      .notNull()
      .references(() => qrCodes.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipHash: text("ip_hash"),
  },
  (t) => [index("feedback_qr_idx").on(t.qrId, t.createdAt)]
);

export const billingPlans = pgTable(
  "billing_plans",
  {
    tier: text("tier").notNull(),
    period: text("period").notNull(),
    razorpayPlanId: text("razorpay_plan_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tier, t.period] })]
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: text("tier").notNull(),
    period: text("period").notNull(),
    razorpaySubscriptionId: text("razorpay_subscription_id").notNull().unique(),
    // created → active → cancelling → cancelled | halted
    status: text("status").notNull().default("created"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)]
);

export type User = typeof users.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Suite = typeof suites.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
