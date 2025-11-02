// VPN MVP Renderer Process
// Client-side logic for UI interactions and API communication

const { ipcRenderer } = require('electron');
const axios = require('axios');

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = 'http://localhost:3000/api';
const STATUS_CHECK_INTERVAL = 5000; // 5 seconds

// ============================================
// STATE MANAGEMENT
// ============================================

let state = {
  token: localStorage.getItem('vpn_token') || null,
  isConnected: false,
  serverInfo: null,
  wireguardConfig: null,
  statusCheckInterval: null
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and token
 */
async function login(email, password) {
  try {
    console.log('Attempting login...');
    
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password
    });
    
    if (response.data.success && response.data.token) {
      state.token = response.data.token;
      localStorage.setItem('vpn_token', state.token);
      console.log('✓ Login successful');
      return response.data;
    } else {
      throw new Error('Invalid response from server');
    }
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to login. Please check your credentials.'
    );
  }
}

/**
 * Fetch server information
 * @returns {Promise<Object>} Server details
 */
async function fetchServer() {
  try {
    console.log('Fetching server information...');
    
    const response = await axios.get(`${API_BASE_URL}/server`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (response.data.success && response.data.server) {
      state.serverInfo = response.data.server;
      console.log('✓ Server info fetched:', state.serverInfo.name);
      return state.serverInfo;
    } else {
      throw new Error('Invalid server response');
    }
  } catch (error) {
    console.error('❌ Failed to fetch server:', error);
    
    // If unauthorized, clear token and return to login
    if (error.response?.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }
    
    throw new Error(
      error.response?.data?.error || 
      'Failed to fetch server information'
    );
  }
}

/**
 * Generate WireGuard configuration
 * @returns {Promise<string>} WireGuard config string
 */
async function generateConfig() {
  try {
    console.log('Generating WireGuard configuration...');
    
    const response = await axios.post(`${API_BASE_URL}/generate-config`, {}, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    
    if (response.data.success && response.data.config) {
      state.wireguardConfig = response.data.config;
      console.log('✓ Configuration generated');
      console.log('Client IP:', response.data.clientIP);
      return state.wireguardConfig;
    } else {
      throw new Error('Invalid configuration response');
    }
  } catch (error) {
    console.error('❌ Failed to generate config:', error);
    throw new Error(
      error.response?.data?.error || 
      'Failed to generate VPN configuration'
    );
  }
}

// ============================================
// VPN FUNCTIONS
// ============================================

/**
 * Connect to VPN
 */
async function connect() {
  try {
    console.log('Initiating VPN connection...');
    
    // Disable connect button during connection
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
    
    // Generate configuration from backend
    const config = await generateConfig();
    
    // Send config to main process to establish connection
    const result = await ipcRenderer.invoke('wireguard:connect', config);
    
    if (result.success) {
      console.log('✓ VPN connected successfully');
      state.isConnected = true;
      updateStatus(true);
      showError('Connected successfully!', 'connection-error', 'success');
    } else {
      throw new Error(result.error || 'Connection failed');
    }
  } catch (error) {
    console.error('❌ Connection error:', error);
    state.isConnected = false;
    updateStatus(false);
    showError(error.message, 'connection-error');
  } finally {
    // Re-enable connect button
    const connectBtn = document.getElementById('connect-btn');
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
}

/**
 * Disconnect from VPN
 */
async function disconnect() {
  try {
    console.log('Disconnecting from VPN...');
    
    // Disable disconnect button during disconnection
    const disconnectBtn = document.getElementById('disconnect-btn');
    disconnectBtn.disabled = true;
    disconnectBtn.textContent = 'Disconnecting...';
    
    // Send disconnect request to main process
    const result = await ipcRenderer.invoke('wireguard:disconnect');
    
    if (result.success) {
      console.log('✓ VPN disconnected successfully');
      state.isConnected = false;
      updateStatus(false);
      showError('Disconnected successfully', 'connection-error', 'success');
    } else {
      throw new Error(result.error || 'Disconnect failed');
    }
  } catch (error) {
    console.error('❌ Disconnect error:', error);
    showError(error.message, 'connection-error');
  } finally {
    // Re-enable disconnect button
    const disconnectBtn = document.getElementById('disconnect-btn');
    disconnectBtn.disabled = false;
    disconnectBtn.textContent = 'Disconnect';
  }
}

/**
 * Check VPN connection status
 */
async function checkStatus() {
  try {
    const result = await ipcRenderer.invoke('wireguard:status');
    
    // Update state if status changed
    if (result.connected !== state.isConnected) {
      state.isConnected = result.connected;
      updateStatus(result.connected);
    }
  } catch (error) {
    console.error('Status check error:', error);
  }
}

/**
 * Start periodic status checking
 */
function startStatusPolling() {
  // Clear any existing interval
  if (state.statusCheckInterval) {
    clearInterval(state.statusCheckInterval);
  }
  
  // Check status immediately
  checkStatus();
  
  // Set up periodic checking
  state.statusCheckInterval = setInterval(checkStatus, STATUS_CHECK_INTERVAL);
  console.log('✓ Status polling started');
}

/**
 * Stop status polling
 */
function stopStatusPolling() {
  if (state.statusCheckInterval) {
    clearInterval(state.statusCheckInterval);
    state.statusCheckInterval = null;
    console.log('✓ Status polling stopped');
  }
}

// ============================================
// UI FUNCTIONS
// ============================================

/**
 * Show login screen
 */
function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('main-screen').style.display = 'none';
  
  // Clear input fields
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  document.getElementById('error-msg').style.display = 'none';
  
  // Stop status polling
  stopStatusPolling();
  
  console.log('Showing login screen');
}

/**
 * Show main screen
 */
async function showMainScreen() {
  try {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'flex';
    
    // Fetch and display server info
    const server = await fetchServer();
    document.getElementById('server-name').textContent = server.name;
    document.getElementById('server-country').textContent = server.country;
    
    // Start status polling
    startStatusPolling();
    
    console.log('Showing main screen');
  } catch (error) {
    console.error('Error showing main screen:', error);
    showError(error.message, 'connection-error');
  }
}

/**
 * Update connection status UI
 * @param {boolean} connected - Connection state
 */
function updateStatus(connected) {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('connection-status');
  const connectBtn = document.getElementById('connect-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  
  if (connected) {
    // Update status indicator
    statusDot.className = 'status-dot connected';
    statusText.textContent = 'Connected';
    statusText.className = 'status-text connected';
    
    // Show/hide buttons
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
  } else {
    // Update status indicator
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Disconnected';
    statusText.className = 'status-text disconnected';
    
    // Show/hide buttons
    connectBtn.style.display = 'block';
    disconnectBtn.style.display = 'none';
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @param {string} containerId - ID of the error container
 * @param {string} type - Message type ('error' or 'success')
 */
function showError(message, containerId, type = 'error') {
  const container = document.getElementById(containerId);
  container.textContent = message;
  container.className = type === 'success' ? 'success-message' : 'error-message';
  container.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    container.style.display = 'none';
  }, 5000);
}

/**
 * Logout user
 */
function logout() {
  console.log('Logging out...');
  
  // Clear token
  state.token = null;
  localStorage.removeItem('vpn_token');
  
  // Reset state
  state.serverInfo = null;
  state.wireguardConfig = null;
  state.isConnected = false;
  
  // Show login screen
  showLoginScreen();
}

// ============================================
// EVENT LISTENERS
// ============================================

// Login button
document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  // Validate inputs
  if (!email || !password) {
    showError('Please enter email and password', 'error-msg');
    return;
  }
  
  try {
    // Disable login button
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    // Attempt login
    await login(email, password);
    
    // Show main screen on success
    await showMainScreen();
  } catch (error) {
    showError(error.message, 'error-msg');
  } finally {
    // Re-enable login button
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

// Allow Enter key to submit login
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('login-btn').click();
  }
});

// Connect button
document.getElementById('connect-btn').addEventListener('click', connect);

// Disconnect button
document.getElementById('disconnect-btn').addEventListener('click', disconnect);

// Logout button
document.getElementById('logout-btn').addEventListener('click', logout);

// ============================================
// INITIALIZATION
// ============================================

async function initialize() {
  console.log('===========================================');
  console.log('🚀 VPN MVP Renderer Initialized');
  console.log('===========================================');
  
  // Check if user has a saved token
  if (state.token) {
    console.log('Found saved token, validating...');
    
    try {
      // Try to fetch server info to validate token
      await showMainScreen();
    } catch (error) {
      console.error('Token validation failed:', error);
      // Token is invalid, show login screen
      showLoginScreen();
    }
  } else {
    console.log('No saved token, showing login screen');
    showLoginScreen();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);
