// VPN MVP Electron Main Process
// Handles WireGuard connection management and IPC communication

const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');

const execAsync = promisify(exec);

let mainWindow;
let configFilePath = null;

// ============================================
// WINDOW CREATION
// ============================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'VPN MVP',
    resizable: true,
    center: true
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('✓ Main window created');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get platform-specific WireGuard command paths and syntax
 */
function getWireGuardCommands() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    // Windows uses wireguard.exe
    return {
      connect: (configPath) => `wireguard.exe /installtunnelservice "${configPath}"`,
      disconnect: () => `wireguard.exe /uninstalltunnelservice wg0`,
      status: () => `wg show`
    };
  } else if (platform === 'darwin' || platform === 'linux') {
    // macOS and Linux use wg-quick
    return {
      connect: (configPath) => `sudo wg-quick up "${configPath}"`,
      disconnect: () => `sudo wg-quick down wg0`,
      status: () => `wg show`
    };
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Save WireGuard configuration to a temporary file
 * @param {string} config - WireGuard configuration content
 * @returns {string} Path to the saved configuration file
 */
function saveConfigFile(config) {
  try {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const fileName = `wg0_${timestamp}.conf`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, config, 'utf8');
    console.log(`✓ Config saved to: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('❌ Error saving config file:', error);
    throw new Error('Failed to save configuration file');
  }
}

/**
 * Clean up configuration file
 */
function cleanupConfigFile() {
  if (configFilePath && fs.existsSync(configFilePath)) {
    try {
      fs.unlinkSync(configFilePath);
      console.log(`✓ Cleaned up config file: ${configFilePath}`);
      configFilePath = null;
    } catch (error) {
      console.error('❌ Error cleaning up config file:', error);
    }
  }
}

// ============================================
// IPC HANDLERS
// ============================================

/**
 * IPC Handler: wireguard:connect
 * Establishes WireGuard VPN connection
 */
ipcMain.handle('wireguard:connect', async (event, config) => {
  try {
    console.log('Starting WireGuard connection...');
    
    if (!config || typeof config !== 'string') {
      throw new Error('Invalid configuration provided');
    }
    
    // Save configuration to temporary file
    configFilePath = saveConfigFile(config);
    
    // Get platform-specific commands
    const commands = getWireGuardCommands();
    const connectCommand = commands.connect(configFilePath);
    
    console.log(`Executing: ${connectCommand}`);
    
    // Execute connection command
    const { stdout, stderr } = await execAsync(connectCommand);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn('Command stderr:', stderr);
    }
    
    if (stdout) {
      console.log('Command output:', stdout);
    }
    
    console.log('✓ WireGuard connection established');
    
    return { 
      success: true,
      message: 'Connected successfully'
    };
  } catch (error) {
    console.error('❌ Connection error:', error);
    
    // Clean up config file on error
    cleanupConfigFile();
    
    return { 
      success: false, 
      error: error.message || 'Failed to connect to VPN'
    };
  }
});

/**
 * IPC Handler: wireguard:disconnect
 * Disconnects from WireGuard VPN
 */
ipcMain.handle('wireguard:disconnect', async (event) => {
  try {
    console.log('Disconnecting WireGuard...');
    
    // Get platform-specific commands
    const commands = getWireGuardCommands();
    const disconnectCommand = commands.disconnect();
    
    console.log(`Executing: ${disconnectCommand}`);
    
    // Execute disconnect command
    const { stdout, stderr } = await execAsync(disconnectCommand);
    
    if (stderr && !stderr.includes('Warning')) {
      console.warn('Command stderr:', stderr);
    }
    
    if (stdout) {
      console.log('Command output:', stdout);
    }
    
    // Clean up configuration file
    cleanupConfigFile();
    
    console.log('✓ WireGuard disconnected');
    
    return { 
      success: true,
      message: 'Disconnected successfully'
    };
  } catch (error) {
    console.error('❌ Disconnect error:', error);
    
    // Still try to clean up config file
    cleanupConfigFile();
    
    return { 
      success: false, 
      error: error.message || 'Failed to disconnect from VPN'
    };
  }
});

/**
 * IPC Handler: wireguard:status
 * Check current WireGuard connection status
 */
ipcMain.handle('wireguard:status', async (event) => {
  try {
    // Get platform-specific commands
    const commands = getWireGuardCommands();
    const statusCommand = commands.status();
    
    // Execute status command
    const { stdout, stderr } = await execAsync(statusCommand);
    
    // Parse output to determine if connected
    const isConnected = stdout && stdout.includes('interface: wg0');
    
    if (isConnected) {
      console.log('Status: Connected');
      return { 
        connected: true,
        interface: 'wg0'
      };
    } else {
      console.log('Status: Disconnected');
      return { 
        connected: false
      };
    }
  } catch (error) {
    // If wg show fails, we're likely not connected
    console.log('Status: Disconnected (error checking status)');
    return { 
      connected: false
    };
  }
});

// ============================================
// APP LIFECYCLE
// ============================================

app.whenReady().then(() => {
  console.log('===========================================');
  console.log('🚀 VPN MVP Electron App Started');
  console.log('===========================================');
  console.log(`Platform: ${os.platform()}`);
  console.log(`Electron version: ${process.versions.electron}`);
  console.log(`Node version: ${process.versions.node}`);
  console.log('===========================================\n');
  
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Clean up any remaining config files
  cleanupConfigFile();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('\n👋 Application shutting down...');
  cleanupConfigFile();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});
