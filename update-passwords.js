import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './shared/schema.js';
import { sql } from 'drizzle-orm';

// Hash password function (matches Discord bot's hashing)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const connectionString = process.env.DATABASE_URL;
const postgresClient = postgres(connectionString);
const db = drizzle(postgresClient);

async function updatePasswords() {
  console.log('🔄 Updating passwords to hashed versions...');
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    
    console.log(`Found ${allUsers.length} users to update`);
    
    for (const user of allUsers) {
      // Check if password is already hashed (SHA-256 hashes are 64 characters long)
      if (user.password && user.password.length !== 64) {
        const hashedPassword = hashPassword(user.password);
        
        // Update the user's password
        await db.update(users)
          .set({ password: hashedPassword })
          .where(sql`${users.id} = ${user.id}`);
        
        console.log(`✅ Updated password for user: ${user.email}`);
      } else {
        console.log(`⏭️  Skipped user ${user.email} (password already hashed or empty)`);
      }
    }
    
    console.log('✅ All passwords updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
    process.exit(1);
  }
}

updatePasswords();
