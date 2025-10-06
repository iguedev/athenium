import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, globalFiles, globalLinks, globalMentorships } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Create the connection
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
export const db = drizzle(sql);

// Database operations for users
export const userOps = {
  async getAll() {
    return await db.select().from(users);
  },

  async getById(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  },

  async getByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  },

  async getByUniqueId(uniqueId) {
    const result = await db.select().from(users).where(eq(users.uniqueId, uniqueId));
    return result[0];
  },

  async create(userData) {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  },

  async update(id, userData) {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }
};

// Database operations for global files
export const fileOps = {
  async getAll() {
    return await db.select().from(globalFiles);
  },

  async create(fileData) {
    const result = await db.insert(globalFiles).values(fileData).returning();
    return result[0];
  },

  async delete(id) {
    const result = await db.delete(globalFiles).where(eq(globalFiles.id, id)).returning();
    return result[0];
  }
};

// Database operations for global links
export const linkOps = {
  async getAll() {
    return await db.select().from(globalLinks);
  },

  async create(linkData) {
    const result = await db.insert(globalLinks).values(linkData).returning();
    return result[0];
  },

  async delete(id) {
    const result = await db.delete(globalLinks).where(eq(globalLinks.id, id)).returning();
    return result[0];
  }
};

// Database operations for global mentorships
export const mentorshipOps = {
  async getAll() {
    return await db.select().from(globalMentorships);
  },

  async create(mentorshipData) {
    const result = await db.insert(globalMentorships).values(mentorshipData).returning();
    return result[0];
  },

  async delete(id) {
    const result = await db.delete(globalMentorships).where(eq(globalMentorships.id, id)).returning();
    return result[0];
  }
};

// Initialize database with default data if needed
export async function initializeDatabase() {
  try {
    // Check if we have any users
    const existingUsers = await userOps.getAll();
    
    if (existingUsers.length === 0) {
      // Create default admin user
      const adminUser = {
        email: 'admin@ath.com',
        password: 'admin123', // In real app, this should be hashed
        uniqueId: '12345678',
        progress: '25.5',
        profilePhoto: 'default1'
      };
      
      const traderUser = {
        email: 'trader1@example.com', 
        password: 'trader123', // In real app, this should be hashed
        uniqueId: '87654321',
        progress: '78.2',
        profilePhoto: 'stock1'
      };

      await userOps.create(adminUser);
      await userOps.create(traderUser);

      console.log('✅ Default users created');
    }

    // Check if we have any files
    const existingFiles = await fileOps.getAll();
    if (existingFiles.length === 0) {
      await fileOps.create({
        title: 'Trading Guide',
        filename: 'guide.pdf',
        description: 'Basic trading guide'
      });
      console.log('✅ Default files created');
    }

    // Check if we have any links
    const existingLinks = await linkOps.getAll();
    if (existingLinks.length === 0) {
      await linkOps.create({
        title: 'TradingView',
        url: 'https://tradingview.com',
        description: 'Professional charts'
      });
      console.log('✅ Default links created');
    }

    // Check if we have any mentorships
    const existingMentorships = await mentorshipOps.getAll();
    if (existingMentorships.length === 0) {
      await mentorshipOps.create({
        title: 'Intro to Trading',
        type: 'youtube',
        youtubeUrl: 'https://youtube.com/watch?v=example',
        description: 'Basic tutorial'
      });
      console.log('✅ Default mentorships created');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}