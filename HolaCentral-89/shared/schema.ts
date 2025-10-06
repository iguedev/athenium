import { pgTable, text, integer, serial, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced Users table with trading-specific fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  uniqueId: text("unique_id").notNull().unique(), // 8-digit unique trading ID
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0.00"), // Progress percentage
  profilePhoto: text("profile_photo").default("trader1"), // Professional trader illustrations
  // Enhanced trading profile fields
  tradingLevel: text("trading_level").default("beginner"), // beginner, intermediate, advanced, expert
  accountBalance: decimal("account_balance", { precision: 12, scale: 2 }).default("0.00"),
  totalTrades: integer("total_trades").default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default("0.00"),
  riskTolerance: text("risk_tolerance").default("moderate"), // conservative, moderate, aggressive
  favoritePairs: text("favorite_pairs").default("EUR/USD,GBP/USD,USD/JPY"), // Comma-separated
  lastActive: timestamp("last_active").defaultNow(),
  joinedAt: timestamp("joined_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  notifications: boolean("notifications").default(true),
  preferredTimeframe: text("preferred_timeframe").default("daily"), // scalping, intraday, swing, position
});

// Enhanced Global files with categories and metadata
export const globalFiles = pgTable("global_files", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  description: text("description"),
  category: text("category").default("general"), // educational, tools, reports, guides
  fileSize: integer("file_size"), // in bytes
  downloadCount: integer("download_count").default(0),
  isPublic: boolean("is_public").default(true),
  uploadedBy: integer("uploaded_by"), // user id who uploaded
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Enhanced Global links with categories
export const globalLinks = pgTable("global_links", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category").default("general"), // news, tools, education, brokers, analysis
  isExternal: boolean("is_external").default(true),
  clickCount: integer("click_count").default(0),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"), // user id who created
  createdAt: timestamp("created_at").defaultNow(),
});

// Global mentorships table
export const globalMentorships = pgTable("global_mentorships", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'youtube' or 'upload'
  description: text("description"),
  youtubeUrl: text("youtube_url"), // for YouTube videos
  uploadedVideo: text("uploaded_video"), // filename for uploaded videos
  originalname: text("original_name"), // original filename
  filesize: integer("file_size"), // file size in bytes
  mimetype: text("mime_type"), // file MIME type
  viewCount: integer("view_count").default(0),
  duration: integer("duration"), // video duration in seconds
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"), // user id who created
  createdAt: timestamp("created_at").defaultNow(),
});

// Trading sessions for progress tracking
export const tradingSessions = pgTable("trading_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sessionDate: timestamp("session_date").defaultNow(),
  duration: integer("duration"), // in minutes
  tradesCount: integer("trades_count").default(0),
  profitLoss: decimal("profit_loss", { precision: 10, scale: 2 }).default("0.00"),
  notes: text("notes"),
});

// Trading goals and achievements
export const tradingGoals = pgTable("trading_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  goalType: text("goal_type").notNull(), // profit, winrate, trades_count, learning
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0.00"),
  deadline: timestamp("deadline"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trade journal entries for individual trades
export const tradeJournalEntries = pgTable("trade_journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  ticker: text("ticker").notNull(), // The trading symbol (e.g., EURUSD, AAPL)
  tradeType: text("trade_type").notNull(), // "profit", "loss", "breakeven"
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Profit/loss amount
  entryDate: timestamp("entry_date").defaultNow(),
  notes: text("notes"), // Optional notes about the trade
});

// Discord account linking (separate table for better data integrity)
export const discordAccounts = pgTable("discord_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id),
  discordId: text("discord_id").notNull().unique(), // Discord user ID
  discordUsername: text("discord_username").notNull(), // Discord username with discriminator
  linkedAt: timestamp("linked_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Daily bias entries (administrable from admin panel)
export const biasEntries = pgTable("bias_entries", {
  id: serial("id").primaryKey(),
  bias: text("bias").notNull(), // The bias text (e.g., "BUY EURUSD", "SELL Gold")
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by"), // user id who created (admin)
  isActive: boolean("is_active").default(true),
});

// Available professional trader profile illustrations
export const profilePhotoOptions = [
  "trader1", "trader2", "trader3", "trader4", "trader5",
  "trader6", "trader7", "trader8", "trader9", "trader10"
] as const;

// Trading level enum
const tradingLevels = ["beginner", "intermediate", "advanced", "expert"] as const;

// Risk tolerance enum
const riskTolerances = ["conservative", "moderate", "aggressive"] as const;

// Preferred timeframe enum
const preferredTimeframes = ["scalping", "intraday", "swing", "position"] as const;

// Trade type enum
const tradeTypes = ["profit", "loss", "breakeven"] as const;

// Goal type enum
const goalTypes = ["profit", "winrate", "trades_count", "learning"] as const;

// File category enum
const fileCategories = ["educational", "tools", "reports", "guides", "general"] as const;

// Link category enum
const linkCategories = ["news", "tools", "education", "brokers", "analysis", "general"] as const;

// Mentorship type enum
const mentorshipTypes = ["youtube", "upload"] as const;

// Enhanced Zod schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  profilePhoto: z.enum(profilePhotoOptions).optional(),
  tradingLevel: z.enum(tradingLevels).optional(),
  riskTolerance: z.enum(riskTolerances).optional(),
  preferredTimeframe: z.enum(preferredTimeframes).optional(),
}).omit({ 
  id: true, 
  uniqueId: true,
  progress: true,
  lastActive: true,
  joinedAt: true
});

// User self-update schema (for dashboard)
export const userSelfUpdateSchema = z.object({
  profilePhoto: z.enum(profilePhotoOptions).optional(),
  tradingLevel: z.enum(tradingLevels).optional(),
  riskTolerance: z.enum(riskTolerances).optional(),
  preferredTimeframe: z.enum(preferredTimeframes).optional(),
  favoritePairs: z.string().optional(),
  notifications: z.boolean().optional(),
});

// Admin user update schema (for admin panel)
export const updateUserSchema = createInsertSchema(users, {
  email: z.string().email("Correo electrónico inválido").optional(),
  uniqueId: z.string().length(8, "ID único debe tener 8 dígitos").optional(),
  progress: z.string().regex(/^\d+(\.\d{1,2})?$/, "Progreso debe ser un número válido").optional(),
  profilePhoto: z.enum(profilePhotoOptions).optional(),
  tradingLevel: z.enum(tradingLevels).optional(),
  accountBalance: z.string().regex(/^\d+(\.\d{1,2})?$/, "Balance debe ser un número válido").optional(),
  totalTrades: z.number().min(0).optional(),
  winRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Tasa de éxito debe ser un número válido").optional(),
  riskTolerance: z.enum(riskTolerances).optional(),
  isActive: z.boolean().optional(),
}).omit({ 
  id: true,
  password: true,
  lastActive: true,
  joinedAt: true
});

export const insertGlobalFileSchema = createInsertSchema(globalFiles, {
  title: z.string().min(1, "El título es requerido"),
  filename: z.string().min(1, "El nombre del archivo es requerido"),
  description: z.string().optional(),
  category: z.enum(fileCategories).optional(),
}).omit({ 
  id: true, 
  uploadedAt: true,
  downloadCount: true,
  uploadedBy: true
});

export const insertGlobalLinkSchema = createInsertSchema(globalLinks, {
  title: z.string().min(1, "El título es requerido"),
  url: z.string().url("URL inválida"),
  description: z.string().optional(),
  category: z.enum(linkCategories).optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  clickCount: true,
  createdBy: true
});

export const insertGlobalMentorshipSchema = createInsertSchema(globalMentorships, {
  title: z.string().min(1, "El título es requerido"),
  type: z.enum(mentorshipTypes),
  description: z.string().optional(),
  youtubeUrl: z.string().url("URL inválida").optional(),
}).omit({ 
  id: true, 
  createdAt: true,
  viewCount: true,
  createdBy: true,
  originalname: true,
  filesize: true,
  mimetype: true,
  duration: true
});

export const insertTradingSessionSchema = createInsertSchema(tradingSessions, {
  duration: z.number().min(1, "Duración mínima 1 minuto").optional(),
  tradesCount: z.number().min(0).optional(),
  profitLoss: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Ganancia/Pérdida debe ser un número válido").optional(),
}).omit({
  id: true,
  userId: true,
  sessionDate: true
});

export const insertTradingGoalSchema = createInsertSchema(tradingGoals, {
  goalType: z.enum(goalTypes),
  targetValue: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor objetivo debe ser un número válido"),
  deadline: z.string().optional(),
}).omit({
  id: true,
  userId: true,
  currentValue: true,
  isCompleted: true,
  createdAt: true
});

export const insertTradeJournalEntrySchema = createInsertSchema(tradeJournalEntries, {
  ticker: z.string().min(1, "El ticker es requerido"),
  tradeType: z.enum(tradeTypes),
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "El monto debe ser un número válido"),
  notes: z.string().optional(),
}).omit({
  id: true,
  userId: true,
  entryDate: true
});

export const insertDiscordAccountSchema = createInsertSchema(discordAccounts, {
  discordId: z.string().min(1, "Discord ID es requerido"),
  discordUsername: z.string().min(1, "Username de Discord es requerido"),
}).omit({
  id: true,
  userId: true,
  linkedAt: true,
  isActive: true
});

export const insertBiasEntrySchema = createInsertSchema(biasEntries, {
  bias: z.string().min(1, "El bias es requerido"),
}).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  isActive: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type GlobalFile = typeof globalFiles.$inferSelect;
export type InsertGlobalFile = z.infer<typeof insertGlobalFileSchema>;
export type GlobalLink = typeof globalLinks.$inferSelect;
export type InsertGlobalLink = z.infer<typeof insertGlobalLinkSchema>;
export type GlobalMentorship = typeof globalMentorships.$inferSelect;
export type InsertGlobalMentorship = z.infer<typeof insertGlobalMentorshipSchema>;
export type TradingSession = typeof tradingSessions.$inferSelect;
export type InsertTradingSession = z.infer<typeof insertTradingSessionSchema>;
export type TradingGoal = typeof tradingGoals.$inferSelect;
export type InsertTradingGoal = z.infer<typeof insertTradingGoalSchema>;
export type TradeJournalEntry = typeof tradeJournalEntries.$inferSelect;
export type InsertTradeJournalEntry = z.infer<typeof insertTradeJournalEntrySchema>;
export type DiscordAccount = typeof discordAccounts.$inferSelect;
export type InsertDiscordAccount = z.infer<typeof insertDiscordAccountSchema>;
export type BiasEntry = typeof biasEntries.$inferSelect;
export type InsertBiasEntry = z.infer<typeof insertBiasEntrySchema>;

// Support ticket system tables
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  discordUserId: text("discord_user_id").notNull(),
  discordChannelId: text("discord_channel_id"), // Channel created for the ticket
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("open"), // open, in_progress, escalated, resolved, archived
  priority: text("priority").default("normal"), // low, normal, high, urgent
  category: text("category").default("general"), // general, technical, billing, trading
  assignedTo: text("assigned_to"), // Discord ID of admin assigned to ticket
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  archivedAt: timestamp("archived_at"),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  authorId: text("author_id").notNull(), // Discord user ID
  authorName: text("author_name").notNull(),
  messageContent: text("message_content").notNull(),
  isStaff: boolean("is_staff").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketAssignments = pgTable("ticket_assignments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id),
  adminId: text("admin_id").notNull(), // Discord ID of admin
  adminName: text("admin_name").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// Function to generate unique 8-digit trading ID
export function generateUniqueId(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Trading level experience points mapping
export const tradingLevelXP = {
  beginner: { min: 0, max: 100, name: "Principiante" },
  intermediate: { min: 101, max: 500, name: "Intermedio" },
  advanced: { min: 501, max: 1000, name: "Avanzado" },
  expert: { min: 1001, max: Infinity, name: "Experto" }
} as const;

// Risk tolerance descriptions
export const riskToleranceDescriptions = {
  conservative: "Conservador - Prefiere operaciones de bajo riesgo",
  moderate: "Moderado - Balance entre riesgo y retorno",
  aggressive: "Agresivo - Busca altos retornos con mayor riesgo"
} as const;