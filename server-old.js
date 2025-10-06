import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS and security headers
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration temporarily disabled due to dependency conflicts
// For now, we'll create sample video files for demonstration

// Simple file upload handling without multer - for demo purposes
function generateUniqueFilename(originalName) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const fileExtension = path.extname(originalName) || '.pdf';
  const baseName = path.basename(originalName, path.extname(originalName)) || 'file';
  return baseName + '-' + uniqueSuffix + fileExtension;
}

// Basic session middleware for demo
let sessions = new Map();
function mockAuth(req, res, next) {
  req.isAuthenticated = () => true;
  req.user = { id: 1, email: 'admin@ath.com', isAdmin: true };
  next();
}
app.use(mockAuth);

// Simple in-memory storage for demo
class SimpleStorage {
  constructor() {
    this.users = [{ id: 1, email: 'admin@ath.com', profilePhoto: 'default1', progress: '25.5', uniqueId: '12345678', isAdmin: true }];
    this.files = [];
    this.links = [];
    this.mentorships = [];
  }
  async getAllUsers() { return this.users; }
  async updateUser(id, data) { 
    const user = this.users.find(u => u.id === id);
    if (user) Object.assign(user, data);
    return user;
  }
  async getAllGlobalFiles() { return this.files; }
  async getAllGlobalLinks() { return this.links; }
  async getAllGlobalMentorships() { return this.mentorships; }
}
const storage = new SimpleStorage();

// Helper function to check if user is admin
function isAdmin(user) {
  // Check if user exists and has admin privileges
  return user && (user.isAdmin === true || user.email === 'admin@ath.com');
}

// API Routes for dashboard functionality

// User self-update endpoint (for dashboard profile changes)
app.patch('/api/user/me', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  try {
    const validatedData = userSelfUpdateSchema.parse(req.body);
    const updatedUser = await storage.updateUser(req.user.id, validatedData);
    
    // Return safe user data only
    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      uniqueId: updatedUser.uniqueId,
      progress: updatedUser.progress,
      profilePhoto: updatedUser.profilePhoto
    };
    
    res.json(safeUser);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error al actualizar perfil' });
  }
});

app.get('/api/global-files', async (req, res) => {
  try {
    const files = await storage.getAllGlobalFiles();
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
});

// File download endpoint
app.get('/api/files/download/:filename', async (req, res) => {
  // Security: Require authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const filename = req.params.filename;
  
  // Security: Validate filename to prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  
  try {
    // Use path.resolve and fs.realpath for better security (same as video endpoint)
    const uploadsRealPath = fs.realpathSync(uploadsDir);
    const filePath = path.resolve(uploadsDir, filename);
    const fileRealPath = fs.realpathSync(filePath);
    
    // Security: Ensure resolved real path is within uploads directory  
    if (!fileRealPath.startsWith(uploadsRealPath + path.sep)) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }
    
    // Check if file exists and is a regular file
    if (!fs.existsSync(fileRealPath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const stat = fs.statSync(fileRealPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Ruta no es un archivo válido' });
    }
  
    // Get file info from storage to track downloads
    try {
      const files = await storage.getAllGlobalFiles();
      const fileInfo = files.find(f => f.filename === filename);
      
      if (fileInfo) {
        // Increment download count
        storage.incrementFileDownloadCount(fileInfo.id);
      }
    } catch (error) {
      console.log('Error updating download count:', error);
    }
    
    // Send file using the secure real path
    res.download(fileRealPath, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar archivo' });
        }
      }
    });
  } catch (error) {
    console.error('Error serving download file:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Video streaming endpoint for mentorships
app.get('/api/files/video/:filename', async (req, res) => {
  // Security: Require authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  const filename = req.params.filename;
  
  // Security: Validate filename to prevent path traversal
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Nombre de archivo inválido' });
  }
  
  try {
    // Use path.resolve and check existence before realpath for better security
    const uploadsRealPath = fs.realpathSync(uploadsDir);
    const filePath = path.resolve(uploadsDir, filename);
    
    // Check if file exists first (before realpath)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    
    const fileRealPath = fs.realpathSync(filePath);
    
    // Security: Ensure resolved real path is within uploads directory  
    if (!fileRealPath.startsWith(uploadsRealPath + path.sep)) {
      return res.status(400).json({ error: 'Ruta de archivo inválida' });
    }
    
    const stat = fs.statSync(fileRealPath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Ruta no es un archivo válido' });
    }
    
    // Determine proper MIME type based on file extension (simple mapping)
    const getMimeType = (filename) => {
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.wmv': 'video/x-ms-wmv',
        '.flv': 'video/x-flv'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    };
    const mimeType = getMimeType(filename);
    const isVideo = mimeType.startsWith('video/');
    
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range && isVideo) {
      // Handle range requests for video streaming with validation
      const parts = range.replace(/bytes=/, "").split("-");
      let start, end;
      
      if (parts[0] === '') {
        // Suffix range: bytes=-500
        start = Math.max(0, fileSize - parseInt(parts[1], 10));
        end = fileSize - 1;
      } else {
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      }
      
      // Clamp and validate range values
      start = Math.max(0, start);
      end = Math.min(fileSize - 1, end);
      
      if (isNaN(start) || isNaN(end) || start > end) {
        res.set('Content-Range', `bytes */${fileSize}`);
        return res.status(416).json({ error: 'Rango de bytes solicitado no satisfacible' });
      }
      
      const chunksize = (end - start) + 1;
      const stream = fs.createReadStream(fileRealPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      };
      res.writeHead(206, head);
      stream.pipe(res);
    } else {
      // Send the whole file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(fileRealPath).pipe(res);
    }
  } catch (error) {
    console.error('Error serving video file:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Simplified file upload endpoint (admin only) - simulates file upload for demo
app.post('/api/admin/upload-file', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const { title, description, category, filename } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    const fileData = {
      title: title,
      filename: filename || generateUniqueFilename(title + '.pdf'),
      description: description || ''
    };
    
    const newFile = await storage.createGlobalFile(fileData);
    res.json(newFile);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al guardar archivo' });
  }
});

app.get('/api/global-links', async (req, res) => {
  try {
    const links = await storage.getAllGlobalLinks();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener enlaces' });
  }
});

app.get('/api/profile-photos', (req, res) => {
  const photos = storage.getProfilePhotoOptions();
  res.json(photos);
});

// API Routes for admin functionality
app.get('/api/admin/users', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const users = await storage.getAllUsers();
    // Return safe user data only (no passwords)
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      uniqueId: user.uniqueId,
      progress: user.progress,
      profilePhoto: user.profilePhoto
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.put('/api/admin/user/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const userId = parseInt(req.params.id);
    const validatedData = updateUserSchema.parse(req.body);
    const updatedUser = await storage.updateUser(userId, validatedData);
    
    // Return safe user data only
    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      uniqueId: updatedUser.uniqueId,
      progress: updatedUser.progress,
      profilePhoto: updatedUser.profilePhoto
    };
    
    res.json(safeUser);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error al actualizar usuario' });
  }
});

app.post('/api/admin/global-files', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const validatedData = insertGlobalFileSchema.parse(req.body);
    const newFile = await storage.createGlobalFile(validatedData);
    res.json(newFile);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error al crear archivo' });
  }
});

app.delete('/api/admin/global-files/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const fileId = parseInt(req.params.id);
    await storage.deleteGlobalFile(fileId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar archivo' });
  }
});

app.post('/api/admin/global-links', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const validatedData = insertGlobalLinkSchema.parse(req.body);
    const newLink = await storage.createGlobalLink(validatedData);
    res.json(newLink);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error al crear enlace' });
  }
});

app.delete('/api/admin/global-links/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const linkId = parseInt(req.params.id);
    await storage.deleteGlobalLink(linkId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar enlace' });
  }
});


// Mentorship endpoints
app.get('/api/global-mentorships', async (req, res) => {
  try {
    const mentorships = await storage.getAllGlobalMentorships();
    res.json(mentorships);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener mentorías' });
  }
});

app.post('/api/admin/global-mentorships', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    // Validate input using Zod schema
    const validatedData = insertGlobalMentorshipSchema.parse({
      title: req.body.title,
      description: req.body.description || '',
      type: req.body.type,
      youtubeUrl: req.body.url || req.body.youtubeUrl || null, // Frontend sends 'url', backend expects 'youtubeUrl'
      filename: req.body.filename || 'placeholder_filename'
    });
    
    // Add uploadedBy which is omitted from schema validation
    const mentorshipData = {
      ...validatedData,
      uploadedBy: req.user.id
    };
    
    const newMentorship = await storage.createGlobalMentorship(mentorshipData);
    res.json(newMentorship);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Error al crear mentoría' });
  }
});

app.delete('/api/admin/global-mentorships/:id', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const mentorshipId = parseInt(req.params.id);
    await storage.deleteGlobalMentorship(mentorshipId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar mentoría' });
  }
});

// Temporary mentorship creation endpoint (admin only) - creates sample video for demo
app.post('/api/admin/upload-mentorship', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acceso denegado: se requieren permisos de administrador' });
  }
  
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    // Generate a sample video filename
    const sampleFilename = generateUniqueFilename(title + '.mp4');
    
    // Create a simple sample video file for demonstration
    const sampleVideoPath = path.join(uploadsDir, sampleFilename);
    const sampleVideoContent = `Sample video content for: ${title}\nGenerated at: ${new Date().toISOString()}`;
    fs.writeFileSync(sampleVideoPath, sampleVideoContent);

    const mentorshipData = {
      title: title,
      description: description || '',
      type: 'file',
      youtubeUrl: null,
      filename: sampleFilename,
      uploadedBy: req.user.id
    };
    
    const newMentorship = await storage.createGlobalMentorship(mentorshipData);
    console.log(`Created sample video: ${sampleFilename} for mentorship: ${title}`);
    res.json(newMentorship);
  } catch (error) {
    console.error('Error creating mentorship:', error);
    res.status(500).json({ error: error.message || 'Error al crear mentoría' });
  }
});

// Explicit denial of uploads directory access
app.all(/^\/uploads(\/|$)/, (req, res) => {
  res.status(403).json({ error: 'Acceso denegado' });
});

// Serve only specific safe static assets
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'script.js'));
});

// Serve attached assets if they exist
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets'), {
  dotfiles: 'deny',
  index: false
}));

// Route handling for specific pages
app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth');
  }
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth');
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/mentorship/:id', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth');
  }
  res.sendFile(path.join(__dirname, 'mentorship.html'));
});

// Catch all handler for other routes - serve main page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ ATHENIUM Trading Platform is running on port ${PORT}`);
  console.log(`🌍 Open http://localhost:${PORT} to view the project`);
  console.log(`🔐 Authentication: http://localhost:${PORT}/auth`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});