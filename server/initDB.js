import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, globalFiles, globalLinks, globalMentorships } from '../shared/schema.js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create database tables using Drizzle schema - this MUST succeed or the server won't start
export async function initializeDatabaseTables() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = postgres(connectionString);
  const db = drizzle(sql);
  
  try {
    console.log('🔧 Initializing database tables using Drizzle schema...');
    
    // Create tables directly using Drizzle schema (bypass migrations for simplicity)
    // This ensures schema consistency with our TypeScript definitions
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "unique_id" TEXT NOT NULL UNIQUE,
        "progress" DECIMAL(5,2) DEFAULT '0.00',
        "profile_photo" TEXT DEFAULT 'trader1',
        "trading_level" TEXT DEFAULT 'beginner',
        "account_balance" DECIMAL(12,2) DEFAULT '0.00',
        "total_trades" INTEGER DEFAULT 0,
        "win_rate" DECIMAL(5,2) DEFAULT '0.00',
        "risk_tolerance" TEXT DEFAULT 'moderate',
        "favorite_pairs" TEXT DEFAULT 'EUR/USD,GBP/USD,USD/JPY',
        "last_active" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "is_active" BOOLEAN DEFAULT true,
        "notifications" BOOLEAN DEFAULT true,
        "preferred_timeframe" TEXT DEFAULT 'daily'
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "global_files" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT DEFAULT 'general',
        "file_size" INTEGER,
        "download_count" INTEGER DEFAULT 0,
        "is_public" BOOLEAN DEFAULT true,
        "uploaded_by" INTEGER,
        "uploaded_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "global_links" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT DEFAULT 'general',
        "is_external" BOOLEAN DEFAULT true,
        "click_count" INTEGER DEFAULT 0,
        "is_active" BOOLEAN DEFAULT true,
        "created_by" INTEGER,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "global_mentorships" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "youtube_url" TEXT,
        "uploaded_video" TEXT,
        "original_name" TEXT,
        "file_size" INTEGER,
        "mime_type" TEXT,
        "view_count" INTEGER DEFAULT 0,
        "duration" INTEGER,
        "is_active" BOOLEAN DEFAULT true,
        "created_by" INTEGER,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "discord_accounts" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users"("id"),
        "discord_id" TEXT NOT NULL UNIQUE,
        "discord_username" TEXT NOT NULL,
        "linked_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "is_active" BOOLEAN DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "trade_journal_entries" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
        "ticker" TEXT NOT NULL,
        "trade_type" TEXT NOT NULL,
        "amount" DECIMAL(12,2) NOT NULL,
        "entry_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS "bias_entries" (
        "id" SERIAL PRIMARY KEY,
        "bias" TEXT NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by" INTEGER,
        "is_active" BOOLEAN DEFAULT true
      )
    `;

    console.log('✅ All database tables created successfully!');
    
    // Test the connection by doing a simple query
    await db.select().from(users).limit(1);
    console.log('✅ Database connection verified');
    
    await sql.end();
    
  } catch (error) {
    await sql.end();
    console.error('❌ CRITICAL ERROR: Failed to initialize database tables:', error);
    throw error; // Re-throw to stop server startup
  }
}