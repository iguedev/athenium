// Storage implementation for ATHENIUM Trading Platform - Based on javascript_auth_all_persistance integration
import { users, globalFiles, globalLinks, globalMentorships, generateUniqueId, profilePhotoOptions } from "../shared/schema.js";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db.js";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      return undefined;
    }
  }

  async getUserByEmail(email) {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async createUser(insertUser) {
    try {
      // Generate unique 8-digit trading ID
      let uniqueId;
      let isUnique = false;
      
      // Keep generating until we get a unique ID
      do {
        uniqueId = generateUniqueId();
        const existingUser = await db.select().from(users).where(eq(users.uniqueId, uniqueId));
        isUnique = existingUser.length === 0;
      } while (!isUnique);

      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          uniqueId,
          progress: "0.00",
          profilePhoto: "default1"
        })
        .returning();
      
      return user;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // ===== USER MANAGEMENT METHODS =====
  
  async getAllUsers() {
    try {
      const allUsers = await db.select().from(users);
      return allUsers;
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async updateUser(userId, updateData) {
    try {
      // If updating uniqueId, check for uniqueness
      if (updateData.uniqueId) {
        const existingUser = await db.select().from(users).where(eq(users.uniqueId, updateData.uniqueId));
        if (existingUser.length > 0 && existingUser[0].id !== userId) {
          throw new Error("ID único ya existe");
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // ===== GLOBAL FILES MANAGEMENT =====
  
  async getAllGlobalFiles() {
    try {
      const files = await db.select().from(globalFiles);
      return files;
    } catch (error) {
      console.error("Error getting global files:", error);
      return [];
    }
  }

  async createGlobalFile(insertFile) {
    try {
      const [file] = await db
        .insert(globalFiles)
        .values(insertFile)
        .returning();
      return file;
    } catch (error) {
      console.error("Error creating global file:", error);
      throw error;
    }
  }

  async deleteGlobalFile(fileId) {
    try {
      await db.delete(globalFiles).where(eq(globalFiles.id, fileId));
      return true;
    } catch (error) {
      console.error("Error deleting global file:", error);
      throw error;
    }
  }

  // ===== GLOBAL LINKS MANAGEMENT =====
  
  async getAllGlobalLinks() {
    try {
      const links = await db.select().from(globalLinks);
      return links;
    } catch (error) {
      console.error("Error getting global links:", error);
      return [];
    }
  }

  async createGlobalLink(insertLink) {
    try {
      const [link] = await db
        .insert(globalLinks)
        .values(insertLink)
        .returning();
      return link;
    } catch (error) {
      console.error("Error creating global link:", error);
      throw error;
    }
  }

  async deleteGlobalLink(linkId) {
    try {
      await db.delete(globalLinks).where(eq(globalLinks.id, linkId));
      return true;
    } catch (error) {
      console.error("Error deleting global link:", error);
      throw error;
    }
  }

  // ===== MENTORSHIP MANAGEMENT METHODS =====
  
  async getAllGlobalMentorships() {
    try {
      const mentorships = await db.select().from(globalMentorships);
      return mentorships;
    } catch (error) {
      console.error("Error getting all mentorships:", error);
      return [];
    }
  }

  async createGlobalMentorship(insertMentorship) {
    try {
      const [mentorship] = await db
        .insert(globalMentorships)
        .values(insertMentorship)
        .returning();
      return mentorship;
    } catch (error) {
      console.error("Error creating global mentorship:", error);
      throw error;
    }
  }

  async deleteGlobalMentorship(mentorshipId) {
    try {
      await db.delete(globalMentorships).where(eq(globalMentorships.id, mentorshipId));
      return true;
    } catch (error) {
      console.error("Error deleting global mentorship:", error);
      throw error;
    }
  }

  // ===== PROFILE PHOTO UTILITIES =====
  
  getProfilePhotoOptions() {
    return profilePhotoOptions;
  }
}

// In-memory storage implementation for development/demo purposes
export class MemoryStorage {
  constructor() {
    this.users = [];
    this.globalFiles = [];
    this.globalLinks = [];
    this.globalMentorships = [];
    this.nextUserId = 1;
    this.nextFileId = 1;
    this.nextLinkId = 1;
    this.nextMentorshipId = 1;
    this.initialized = false;
    
    // Initialize with some sample data asynchronously
    this.initializeSampleData();
  }

  async initializeSampleData() {
    // No auto-create admin user - admin@ath.com will be created manually
    // when needed with admin permissions in createUser method

    // Add sample files
    this.globalFiles.push({
      id: 1,
      title: "Guía de Trading Básica",
      filename: "trading-guide-basic.pdf",
      originalName: "trading-guide-basic.pdf",
      description: "Introducción completa al trading para principiantes",
      category: "educational",
      size: 2048000,
      downloadCount: 45,
      uploadedBy: 1,
      uploadedAt: new Date().toISOString()
    });

    // Add sample links
    this.globalLinks.push({
      id: 1,
      title: "TradingView - Análisis Técnico",
      url: "https://tradingview.com",
      description: "Plataforma profesional para análisis técnico y gráficos",
      category: "tools",
      clickCount: 128,
      createdAt: new Date().toISOString()
    });
    
    // Add sample mentorship
    this.globalMentorships.push({
      id: 1,
      title: "Introducción al Trading de Futuros",
      description: "Video tutorial completo sobre trading de futuros para principiantes",
      type: "youtube",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      filename: null,
      uploadedBy: 1,
      createdAt: new Date().toISOString()
    });
    
    // Mark initialization as complete
    this.initialized = true;
    console.log('✅ MemoryStorage initialized with sample data');
  }

  async getUser(id) {
    return this.users.find(user => user.id === id);
  }

  async getUserByEmail(email) {
    // Ensure initialization is complete before accessing users
    if (!this.initialized) {
      await this.waitForInitialization();
    }
    return this.users.find(user => user.email === email);
  }
  
  async waitForInitialization() {
    // Wait for initialization to complete
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  async createUser(insertUser) {
    // Generate unique 8-digit trading ID
    let uniqueId;
    let isUnique = false;
    
    do {
      uniqueId = generateUniqueId();
      isUnique = !this.users.find(u => u.uniqueId === uniqueId);
    } while (!isUnique);

    // Auto-assign admin permissions to admin@ath.com
    const isAdmin = insertUser.email === 'admin@ath.com';
    
    const newUser = {
      id: this.nextUserId++,
      ...insertUser,
      uniqueId,
      progress: "0.00",
      profilePhoto: "default1",
      tradingLevel: isAdmin ? "expert" : "beginner",
      accountBalance: isAdmin ? "125000.00" : "10000.00",
      totalTrades: isAdmin ? 247 : 0,
      winRate: isAdmin ? "73.2" : "0.00",
      isActive: true,
      isAdmin: isAdmin,
      joinedAt: new Date().toISOString()
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async getAllUsers() {
    return [...this.users];
  }

  async updateUser(userId, updateData) {
    const userIndex = this.users.findIndex(user => user.id === userId);
    if (userIndex === -1) {
      throw new Error("Usuario no encontrado");
    }

    // Check uniqueId uniqueness if being updated
    if (updateData.uniqueId) {
      const existingUser = this.users.find(u => u.uniqueId === updateData.uniqueId && u.id !== userId);
      if (existingUser) {
        throw new Error("ID único ya existe");
      }
    }

    this.users[userIndex] = { ...this.users[userIndex], ...updateData };
    return this.users[userIndex];
  }

  async getAllGlobalFiles() {
    return [...this.globalFiles];
  }

  async createGlobalFile(insertFile) {
    const newFile = {
      id: this.nextFileId++,
      ...insertFile,
      downloadCount: 0,
      uploadedAt: new Date().toISOString()
    };
    
    this.globalFiles.push(newFile);
    return newFile;
  }

  async deleteGlobalFile(fileId) {
    const index = this.globalFiles.findIndex(file => file.id === fileId);
    if (index !== -1) {
      this.globalFiles.splice(index, 1);
      return true;
    }
    return false;
  }

  incrementFileDownloadCount(fileId) {
    const file = this.globalFiles.find(f => f.id === fileId);
    if (file) {
      file.downloadCount = (file.downloadCount || 0) + 1;
    }
  }

  async getAllGlobalLinks() {
    return [...this.globalLinks];
  }

  async createGlobalLink(insertLink) {
    const newLink = {
      id: this.nextLinkId++,
      ...insertLink,
      clickCount: 0,
      createdAt: new Date().toISOString()
    };
    
    this.globalLinks.push(newLink);
    return newLink;
  }

  async deleteGlobalLink(linkId) {
    const index = this.globalLinks.findIndex(link => link.id === linkId);
    if (index !== -1) {
      this.globalLinks.splice(index, 1);
      return true;
    }
    return false;
  }

  // ===== MENTORSHIP METHODS =====
  
  async getAllGlobalMentorships() {
    return [...this.globalMentorships];
  }

  async createGlobalMentorship(insertMentorship) {
    const newMentorship = {
      id: this.nextMentorshipId++,
      ...insertMentorship,
      createdAt: new Date().toISOString()
    };
    
    this.globalMentorships.push(newMentorship);
    return newMentorship;
  }

  async deleteGlobalMentorship(mentorshipId) {
    const index = this.globalMentorships.findIndex(mentorship => mentorship.id === mentorshipId);
    if (index !== -1) {
      this.globalMentorships.splice(index, 1);
      return true;
    }
    return false;
  }

  getProfilePhotoOptions() {
    return profilePhotoOptions;
  }
}

// Using DatabaseStorage for persistent data
export const storage = new DatabaseStorage();
// export const storage = new MemoryStorage(); // Disabled in favor of persistent storage