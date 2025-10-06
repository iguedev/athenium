import express from 'express';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { userOps, fileOps, linkOps, mentorshipOps, initializeDatabase } from './server/database.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, discordAccounts, tradeJournalEntries, biasEntries } from './shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { initializeDatabaseTables } from './server/initDB.js';
import { generateUniqueId } from './shared/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hash password function (matches Discord bot's hashing)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database connection for new features
const connectionString = process.env.DATABASE_URL;
const postgresClient = postgres(connectionString);
const db = drizzle(postgresClient);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept videos and common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|mp4|mov|avi|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                    file.mimetype.startsWith('video/') || 
                    file.mimetype.startsWith('image/') ||
                    file.mimetype.includes('document') ||
                    file.mimetype.includes('spreadsheet');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Simple CORS
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  next();
});

// Session configuration for proper authentication

app.use(session({
  secret: 'athenium-trading-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Authentication helper middleware
const requireAuth = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await userOps.getById(req.session.userId);
      if (user) {
        req.user = user;
        req.isAuthenticated = () => true;
        return next();
      }
    } catch (error) {
      console.error('Error finding user:', error);
    }
  }
  req.isAuthenticated = () => false;
  next();
};

// Strict authentication middleware that terminates early
const requireStrictAuth = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await userOps.getById(req.session.userId);
      if (user) {
        req.user = user;
        req.isAuthenticated = () => true;
        return next();
      }
    } catch (error) {
      console.error('Error finding user:', error);
    }
  }
  
  // Terminate early for unauthenticated requests
  return res.status(401).json({ error: 'No autenticado' });
};

// Initialize database tables and data on startup - CRITICAL: Must succeed or server won't start
console.log('🚀 Starting ATHENIUM Trading Platform...');

try {
  // First, ensure all database tables exist (throws if fails)
  await initializeDatabaseTables();
  
  // Then initialize default data (only if tables were successfully created)
  await initializeDatabase();
  
  console.log('✅ Database fully initialized and ready!');
  
} catch (error) {
  console.error('💥 STARTUP FAILED: Cannot initialize database:', error);
  console.error('🛑 Server startup aborted. Please check your DATABASE_URL and database connection.');
  process.exit(1); // Exit if database cannot be initialized
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/mentorship', (req, res) => {
  res.sendFile(path.join(__dirname, 'mentorship.html'));
});

app.get('/mentorship/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'mentorship.html'));
});

app.get('/mentorship-catalog', (req, res) => {
  res.sendFile(path.join(__dirname, 'mentorship-catalog.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.get('/tradedrec', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'tradedrec.html'));
});

app.get('/profile/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// Authentication API Routes
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await userOps.getByEmail(email);
    const hashedPassword = hashPassword(password);
    
    if (user && user.password === hashedPassword) {
      // Authenticate user only if password matches
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, email: user.email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await userOps.getByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create new user with hashed password
    const newUser = {
      email,
      password: hashPassword(password),
      profilePhoto: 'default1',
      progress: '0.0',
      uniqueId: generateUniqueId()
    };
    
    const createdUser = await userOps.create(newUser);
    req.session.userId = createdUser.id;
    res.json({ success: true, user: { id: createdUser.id, email: createdUser.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth');
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

// Update user profile - with field validation
app.put('/api/user', requireStrictAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Whitelist allowed fields for security
    const allowedFields = ['profilePhoto', 'progress'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });
    }
    
    const updatedUser = await userOps.update(userId, updateData);
    
    if (updatedUser) {
      // Update session user data
      req.user = updatedUser;
      res.json(updatedUser);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Calculate user statistics from trade journal (same logic as Discord bot)
async function calculateUserStats(userId) {
  try {
    const trades = await db.select().from(tradeJournalEntries).where(eq(tradeJournalEntries.userId, userId));
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        successRate: 0.0,
        monthlyPL: 0.0,
        riskRewardRatio: 0.0
      };
    }

    const totalTrades = trades.length;
    const profitTrades = trades.filter(trade => trade.tradeType === 'profit').length;
    const successRate = ((profitTrades / totalTrades) * 100).toFixed(1);
    
    // Calculate monthly P&L (sum of all trade amounts)
    const monthlyPL = trades.reduce((sum, trade) => {
      const amount = parseFloat(trade.amount);
      return sum + amount;
    }, 0);

    // Risk/Reward ratio calculation
    const profitAmounts = trades.filter(trade => trade.tradeType === 'profit').map(trade => parseFloat(trade.amount));
    const lossAmounts = trades.filter(trade => trade.tradeType === 'loss').map(trade => Math.abs(parseFloat(trade.amount)));
    
    let riskRewardRatio = 0.0;
    if (profitAmounts.length > 0 && lossAmounts.length > 0) {
      const avgProfit = profitAmounts.reduce((a, b) => a + b, 0) / profitAmounts.length;
      const avgLoss = lossAmounts.reduce((a, b) => a + b, 0) / lossAmounts.length;
      riskRewardRatio = avgLoss > 0 ? (avgProfit / avgLoss).toFixed(1) : 0.0;
    }

    return {
      totalTrades,
      successRate: parseFloat(successRate),
      monthlyPL: monthlyPL.toFixed(2),
      riskRewardRatio: parseFloat(riskRewardRatio)
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      totalTrades: 0,
      successRate: 0.0,
      monthlyPL: 0.0,
      riskRewardRatio: 0.0
    };
  }
}

// API endpoint to get user trading statistics
app.get('/api/user/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await calculateUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// API endpoint to get Discord account information
app.get('/api/user/discord', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const discordAccount = await db.select()
      .from(discordAccounts)
      .where(eq(discordAccounts.userId, userId))
      .limit(1);

    if (discordAccount.length === 0) {
      return res.json({ linked: false });
    }

    res.json({
      linked: true,
      discordUsername: discordAccount[0].discordUsername,
      discordId: discordAccount[0].discordId,
      linkedAt: discordAccount[0].linkedAt
    });
  } catch (error) {
    console.error('Error getting Discord account:', error);
    res.status(500).json({ error: 'Error al obtener información de Discord' });
  }
});

// Public API endpoints for user profiles (by uniqueId)
app.get('/api/user/:id', async (req, res) => {
  try {
    const uniqueId = req.params.id;
    const user = await userOps.getByUniqueId(uniqueId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return public user data only
    res.json({
      id: user.id,
      email: user.email,
      uniqueId: user.uniqueId,
      progress: user.progress,
      profilePhoto: user.profilePhoto,
      tradingLevel: user.tradingLevel,
      joinedAt: user.joinedAt,
      lastActive: user.lastActive
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

app.get('/api/user/:id/stats', async (req, res) => {
  try {
    const uniqueId = req.params.id;
    const user = await userOps.getByUniqueId(uniqueId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const stats = await calculateUserStats(user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});

app.get('/api/user/:id/discord', async (req, res) => {
  try {
    const uniqueId = req.params.id;
    const user = await userOps.getByUniqueId(uniqueId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const discordAccount = await db.select()
      .from(discordAccounts)
      .where(eq(discordAccounts.userId, user.id))
      .limit(1);

    if (discordAccount.length === 0) {
      return res.json({ linked: false });
    }

    res.json({
      linked: true,
      discordUsername: discordAccount[0].discordUsername,
      discordId: discordAccount[0].discordId,
      linkedAt: discordAccount[0].linkedAt
    });
  } catch (error) {
    console.error('Error getting Discord account:', error);
    res.status(500).json({ error: 'Error fetching Discord data' });
  }
});

app.get('/api/user/:id/trades', async (req, res) => {
  try {
    const uniqueId = req.params.id;
    const user = await userOps.getByUniqueId(uniqueId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const trades = await db.select()
      .from(tradeJournalEntries)
      .where(eq(tradeJournalEntries.userId, user.id))
      .orderBy(desc(tradeJournalEntries.entryDate))
      .limit(50); // Limit to most recent 50 trades

    res.json(trades);
  } catch (error) {
    console.error('Error getting trades:', error);
    res.status(500).json({ error: 'Error fetching trades' });
  }
});

// Upload profile photo - with proper authentication check
app.post('/api/upload/profile-photo', requireStrictAuth, upload.single('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ninguna foto' });
    }

    // Validate file type for security
    if (!req.file.mimetype.startsWith('image/')) {
      // Delete uploaded file if not an image
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Solo se permiten archivos de imagen' });
    }

    // Generate custom photo identifier
    const customPhotoId = `custom-${req.file.filename}`;
    
    // Update user profile photo in database
    const userId = req.user.id;
    const updatedUser = await userOps.update(userId, { profilePhoto: customPhotoId });
    
    if (updatedUser) {
      // Update session user data
      req.user = updatedUser;
      res.json({ 
        success: true, 
        profilePhoto: customPhotoId,
        message: 'Foto de perfil actualizada correctamente'
      });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Error al subir foto de perfil' });
  }
});

// API Routes
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await userOps.getAll();
    res.json(users);
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Error al cargar usuarios' });
  }
});

app.get('/api/global-files', async (req, res) => {
  try {
    const files = await fileOps.getAll();
    res.json(files);
  } catch (error) {
    console.error('Error loading files:', error);
    res.status(500).json({ error: 'Error al cargar archivos' });
  }
});

app.get('/api/global-links', async (req, res) => {
  try {
    const links = await linkOps.getAll();
    res.json(links);
  } catch (error) {
    console.error('Error loading links:', error);
    res.status(500).json({ error: 'Error al cargar enlaces' });
  }
});

app.get('/api/global-mentorships', async (req, res) => {
  try {
    const mentorships = await mentorshipOps.getAll();
    res.json(mentorships);
  } catch (error) {
    console.error('Error loading mentorships:', error);
    res.status(500).json({ error: 'Error al cargar mentorías' });
  }
});

app.put('/api/admin/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const updatedUser = await userOps.update(userId, req.body);
    if (updatedUser) {
      res.json(updatedUser);
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Create global mentorship
app.post('/api/admin/global-mentorships', async (req, res) => {
  const { title, type, description, url, youtubeUrl, uploadedVideo } = req.body;
  
  try {
    const newMentorship = {
      title,
      type,
      description,
      youtubeUrl: type === 'youtube' ? (url || youtubeUrl) : undefined,
      uploadedVideo: type === 'upload' ? uploadedVideo : undefined
    };
    
    const createdMentorship = await mentorshipOps.create(newMentorship);
    res.json(createdMentorship);
  } catch (error) {
    console.error('Error creating mentorship:', error);
    res.status(500).json({ error: 'Error al crear mentoría' });
  }
});


// Delete mentorship (with physical file removal if uploaded)
app.delete('/api/admin/global-mentorships/:id', async (req, res) => {
  const mentorshipId = parseInt(req.params.id);
  
  try {
    // Get mentorship first to check for uploaded files
    const mentorships = await mentorshipOps.getAll();
    const mentorship = mentorships.find(m => m.id === mentorshipId);
    
    if (mentorship) {
      // Try to delete physical file if it's an uploaded video
      if (mentorship.type === 'upload' && mentorship.uploadedVideo) {
        const filePath = path.join(__dirname, 'uploads', mentorship.uploadedVideo);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            console.error('Error deleting physical video file:', error);
          }
        }
      }
      
      await mentorshipOps.delete(mentorshipId);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Mentoría no encontrada' });
    }
  } catch (error) {
    console.error('Error deleting mentorship:', error);
    res.status(500).json({ error: 'Error al eliminar mentoría' });
  }
});

// Upload global file with actual file handling
app.post('/api/admin/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const { title, description } = req.body;
    
    const newFile = {
      title: title || req.file.originalname,
      filename: req.file.filename, // Generated unique filename
      originalName: req.file.originalname, // Original filename for download
      description: description || '',
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    };
    
    const createdFile = await fileOps.create(newFile);
    res.json(createdFile);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error al subir el archivo' });
  }
});

// Upload mentorship video with actual file handling
app.post('/api/admin/upload-mentorship', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún video' });
    }

    const { title, description } = req.body;
    
    const newMentorship = {
      title: title || req.file.originalname,
      type: 'upload',
      description: description || '',
      uploadedVideo: req.file.filename, // Generated unique filename
      originalname: req.file.originalname,
      filesize: req.file.size,
      mimetype: req.file.mimetype
    };
    
    const createdMentorship = await mentorshipOps.create(newMentorship);
    res.json(createdMentorship);
  } catch (error) {
    console.error('Error uploading mentorship:', error);
    res.status(500).json({ error: 'Error al subir la mentoría' });
  }
});

// Delete file (with physical file removal)
app.delete('/api/admin/global-files/:id', async (req, res) => {
  const fileId = parseInt(req.params.id);
  
  try {
    // Get file first to check for uploaded files
    const files = await fileOps.getAll();
    const file = files.find(f => f.id === fileId);
    
    if (file) {
      // Try to delete physical file
      const filePath = path.join(__dirname, 'uploads', file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error('Error deleting physical file:', error);
        }
      }
      
      await fileOps.delete(fileId);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
});

// Create global link (if needed)
app.post('/api/admin/global-links', async (req, res) => {
  const { title, url, description } = req.body;
  
  try {
    const newLink = {
      title,
      url,
      description
    };
    
    const createdLink = await linkOps.create(newLink);
    res.json(createdLink);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Error al crear enlace' });
  }
});

// Delete link
app.delete('/api/admin/global-links/:id', async (req, res) => {
  const linkId = parseInt(req.params.id);
  
  try {
    await linkOps.delete(linkId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Error al eliminar enlace' });
  }
});

// File download endpoint
app.get('/api/files/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Get file info from database to find the original name
    const files = await fileOps.getAll();
    const file = files.find(f => f.filename === filename);
    
    if (!file) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const filePath = path.join(__dirname, 'uploads', filename);
    
    // Check if physical file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo físico no encontrado' });
    }
    
    // Send file with original name for download
    const originalName = file.originalName || file.title || filename;
    res.download(filePath, originalName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar archivo' });
        }
      }
    });
    
  } catch (error) {
    console.error('Error in file download:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// === BIAS ENTRIES API ROUTES ===

// Get all bias entries (for dashboard)
app.get('/api/bias', requireAuth, async (req, res) => {
  try {
    const bias = await db.select().from(biasEntries)
      .where(eq(biasEntries.isActive, true))
      .orderBy(desc(biasEntries.createdAt));
    
    res.json(bias);
  } catch (error) {
    console.error('Error fetching bias entries:', error);
    res.status(500).json({ error: 'Error al obtener bias entries' });
  }
});

// Create new bias entry (admin only)
app.post('/api/bias', requireStrictAuth, async (req, res) => {
  try {
    const { bias } = req.body;
    
    if (!bias || bias.trim() === '') {
      return res.status(400).json({ error: 'El texto del bias es requerido' });
    }
    
    const newBias = {
      bias: bias.trim(),
      createdBy: req.user.id,
      createdAt: new Date(),
      isActive: true
    };
    
    const result = await db.insert(biasEntries).values(newBias).returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error creating bias entry:', error);
    res.status(500).json({ error: 'Error al crear bias entry' });
  }
});

// Delete bias entry (admin only)
app.delete('/api/bias/:id', requireStrictAuth, async (req, res) => {
  try {
    const biasId = parseInt(req.params.id);
    
    if (isNaN(biasId)) {
      return res.status(400).json({ error: 'ID de bias inválido' });
    }
    
    const result = await db.delete(biasEntries)
      .where(eq(biasEntries.id, biasId))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Bias entry no encontrado' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bias entry:', error);
    res.status(500).json({ error: 'Error al eliminar bias entry' });
  }
});

// Trade Records API Routes
app.get('/api/trades', requireStrictAuth, async (req, res) => {
  try {
    const trades = await db.select()
      .from(tradeJournalEntries)
      .where(eq(tradeJournalEntries.userId, req.user.id))
      .orderBy(desc(tradeJournalEntries.entryDate));
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Error fetching trades' });
  }
});

app.post('/api/trades', requireStrictAuth, async (req, res) => {
  try {
    const { ticker, tradeType, amount, notes } = req.body;
    
    // Validate required fields
    if (!ticker || !tradeType || !amount) {
      return res.status(400).json({ error: 'Missing required fields: ticker, tradeType, amount' });
    }

    // Validate trade type
    const validTradeTypes = ['profit', 'loss', 'breakeven'];
    if (!validTradeTypes.includes(tradeType.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid trade type. Must be: profit, loss, or breakeven' });
    }

    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    // Insert trade into database
    const newTrade = await db.insert(tradeJournalEntries).values({
      userId: req.user.id,
      ticker: ticker.toUpperCase(),
      tradeType: tradeType.toLowerCase(),
      amount: parsedAmount.toString(),
      notes: notes || null
    }).returning();

    res.json({ 
      success: true, 
      trade: newTrade[0],
      message: 'Trade added successfully' 
    });

  } catch (error) {
    console.error('Error adding trade:', error);
    res.status(500).json({ error: 'Error adding trade' });
  }
});

app.delete('/api/trades/:id', requireStrictAuth, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id);
    
    // Verify the trade belongs to the user
    const trade = await db.select()
      .from(tradeJournalEntries)
      .where(and(
        eq(tradeJournalEntries.id, tradeId),
        eq(tradeJournalEntries.userId, req.user.id)
      ))
      .limit(1);

    if (trade.length === 0) {
      return res.status(404).json({ error: 'Trade not found or not authorized' });
    }

    // Delete the trade
    await db.delete(tradeJournalEntries)
      .where(and(
        eq(tradeJournalEntries.id, tradeId),
        eq(tradeJournalEntries.userId, req.user.id)
      ));

    res.json({ success: true, message: 'Trade deleted successfully' });

  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ error: 'Error deleting trade' });
  }
});

// Serve static assets
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ATHENIUM Trading Platform is running!`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🔐 Auth Page: http://localhost:${PORT}/auth`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`💼 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🎓 Mentorships: http://localhost:${PORT}/mentorship`);
  
  // Start Discord bot only if token is configured
  if (process.env.DISCORD_BOT_TOKEN) {
    import('./discord-bot.js').catch(error => {
      console.error('❌ Error starting Discord bot:', error);
    });
  } else {
    console.log('ℹ️  Discord bot disabled (no token configured)');
  }
});