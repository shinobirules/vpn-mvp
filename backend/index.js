// VPN MVP Backend Server
// Express server with JWT authentication and WireGuard configuration generation

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
require('dotenv').config();

const execAsync = promisify(exec);
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';

// In-memory IP allocation tracking
const allocatedIPs = new Map(); // Map<userId, ipAddress>
let nextIPIndex = 2; // Start from 10.0.0.2 (10.0.0.1 is usually the server)

// Load users and server configuration
let users = [];
let serverConfig = {};

try {
  const usersData = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
  users = JSON.parse(usersData).users;
  console.log('✓ Loaded users from users.json');
} catch (error) {
  console.error('❌ Error loading users.json:', error.message);
  console.log('Creating default users.json...');
  users = [];
}

try {
  const configData = fs.readFileSync(path.join(__dirname, 'server-config.json'), 'utf8');
  serverConfig = JSON.parse(configData).server;
  console.log('✓ Loaded server configuration');
} catch (error) {
  console.error('❌ Error loading server-config.json:', error.message);
}

// Middleware
app.use(cors({
  origin: ['http://localhost', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate WireGuard key pair using system WireGuard CLI
 * @returns {Promise<{privateKey: string, publicKey: string}>}
 */
async function generateKeyPair() {
  try {
    console.log('Generating WireGuard key pair...');
    
    // Generate private key
    const { stdout: privateKey } = await execAsync('wg genkey');
    const trimmedPrivateKey = privateKey.trim();
    
    // Generate public key from private key
    const { stdout: publicKey } = await execAsync(`echo ${trimmedPrivateKey} | wg pubkey`);
    const trimmedPublicKey = publicKey.trim();
    
    console.log('✓ Key pair generated successfully');
    
    return {
      privateKey: trimmedPrivateKey,
      publicKey: trimmedPublicKey
    };
  } catch (error) {
    console.error('❌ Error generating key pair:', error.message);
    throw new Error('Failed to generate WireGuard keys. Ensure WireGuard is installed.');
  }
}

/**
 * Allocate a unique IP address for a user
 * @param {number} userId - User ID
 * @returns {string} Allocated IP address in CIDR notation
 */
function allocateIP(userId) {
  // Check if user already has an allocated IP
  if (allocatedIPs.has(userId)) {
    const existingIP = allocatedIPs.get(userId);
    console.log(`User ${userId} already has IP: ${existingIP}`);
    return existingIP;
  }
  
  // Allocate new IP
  const ipAddress = `10.0.0.${nextIPIndex}/32`;
  allocatedIPs.set(userId, ipAddress);
  nextIPIndex++;
  
  console.log(`✓ Allocated IP ${ipAddress} to user ${userId}`);
  return ipAddress;
}

/**
 * JWT verification middleware
 * Extracts and verifies JWT token from Authorization header
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================
// API ENDPOINTS
// ============================================

/**
 * POST /api/login
 * Authenticate user and return JWT token
 */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    console.log(`Login attempt for: ${email}`);
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token (24 hour expiration)
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`✓ Login successful for: ${email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * GET /api/server
 * Return WireGuard server details (protected route)
 */
app.get('/api/server', verifyToken, (req, res) => {
  try {
    console.log(`Fetching server info for user: ${req.user.email}`);
    
    if (!serverConfig || !serverConfig.name) {
      return res.status(404).json({ error: 'Server configuration not found' });
    }
    
    // Return server details (without sensitive internal data)
    res.json({
      success: true,
      server: {
        name: serverConfig.name,
        country: serverConfig.country,
        ip: serverConfig.ip,
        publicKey: serverConfig.publicKey,
        port: serverConfig.port
      }
    });
  } catch (error) {
    console.error('❌ Error fetching server config:', error);
    res.status(500).json({ error: 'Failed to fetch server configuration' });
  }
});

/**
 * POST /api/generate-config
 * Generate WireGuard configuration for the authenticated user
 */
app.post('/api/generate-config', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`Generating WireGuard config for user: ${req.user.email}`);
    
    // Validate server configuration
    if (!serverConfig || !serverConfig.publicKey) {
      return res.status(500).json({ error: 'Server configuration is incomplete' });
    }
    
    // Generate client key pair
    const { privateKey, publicKey } = await generateKeyPair();
    
    // Allocate IP address for this user
    const clientIP = allocateIP(userId);
    
    // Build WireGuard configuration file
    const wireguardConfig = `[Interface]
PrivateKey = ${privateKey}
Address = ${clientIP}
DNS = 1.1.1.1

[Peer]
PublicKey = ${serverConfig.publicKey}
Endpoint = ${serverConfig.ip}:${serverConfig.port}
AllowedIPs = ${serverConfig.allowedIPs}
PersistentKeepalive = 25
`;
    
    console.log(`✓ Generated config for user ${userId} with IP ${clientIP}`);
    console.log(`Client public key: ${publicKey}`);
    
    res.json({
      success: true,
      config: wireguardConfig,
      clientPublicKey: publicKey,
      clientIP: clientIP
    });
  } catch (error) {
    console.error('❌ Error generating config:', error);
    res.status(500).json({ 
      error: 'Failed to generate WireGuard configuration',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    allocatedIPs: allocatedIPs.size 
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🚀 VPN MVP Backend Server Started');
  console.log('===========================================');
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Loaded users: ${users.length}`);
  console.log(`Server configured: ${serverConfig.name || 'Not configured'}`);
  console.log('===========================================\n');
  
  // Warn if using default JWT secret
  if (JWT_SECRET === 'default_secret_change_in_production') {
    console.warn('⚠️  WARNING: Using default JWT secret! Change this in production!');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
