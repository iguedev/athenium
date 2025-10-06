import { pgTable, text, integer, serial, decimal, timestamp, boolean } from "drizzle-orm/pg-core";

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
  assignedTo: integer("assigned_to"), // Admin user ID assigned to ticket
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
export function generateUniqueId() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}