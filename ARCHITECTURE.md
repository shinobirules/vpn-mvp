# VPN MVP - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VPN MVP Application                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   Electron App       │         │   Express Backend    │
│   (Desktop UI)       │◄───────►│   (API Server)       │
│                      │  HTTP   │                      │
│  - Login Screen      │         │  - Authentication    │
│  - Status Display    │         │  - Config Generator  │
│  - Connect/Disconnect│         │  - JWT Validation    │
└──────────────────────┘         └──────────────────────┘
         │                                  │
         │ IPC                              │
         ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Electron Main       │         │   WireGuard CLI      │
│  Process             │         │                      │
│                      │         │  - Key Generation    │
│  - WireGuard Cmds    │◄────────┤  - Config Creation   │
│  - File Management   │         │                      │
└──────────────────────┘         └──────────────────────┘
         │
         ▼
┌──────────────────────┐
│   WireGuard VPN      │
│                      │
│  - Tunnel Interface  │
│  - Encrypted Traffic │
└──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  WireGuard Server    │
│                      │
│  - Remote Server     │
│  - IP: From Config   │
└──────────────────────┘
```

## 📊 Data Flow

### 1. Login Flow
```
User Input
   │
   ▼
[renderer.js] ──login(email, password)──► [Backend API]
                                              │
                                              ▼
                                         Verify with bcrypt
                                              │
                                              ▼
                                         Generate JWT token
                                              │
                                              ▼
[renderer.js] ◄─────token + user data────── Return
   │
   ▼
Save to localStorage
   │
   ▼
Show Main Screen
```

### 2. Connection Flow
```
User clicks "Connect"
   │
   ▼
[renderer.js] ──generateConfig()──► [Backend API]
                                         │
                                         ▼
                                    Generate keys (wg genkey)
                                         │
                                         ▼
                                    Allocate IP (10.0.0.X)
                                         │
                                         ▼
                                    Build WG config
                                         │
                                         ▼
[renderer.js] ◄─────config string───── Return
   │
   ▼
[renderer.js] ──invoke('wireguard:connect', config)──► [main.js]
                                                           │
                                                           ▼
                                                      Save config to temp
                                                           │
                                                           ▼
                                                      Execute platform cmd
                                                           │
                                                           ▼
                                                      wg-quick up / wireguard.exe
                                                           │
                                                           ▼
[renderer.js] ◄───────{success: true}───────────────── Return
   │
   ▼
Update UI to "Connected"
```

### 3. Status Check Flow
```
Every 5 seconds:
   │
   ▼
[renderer.js] ──invoke('wireguard:status')──► [main.js]
                                                  │
                                                  ▼
                                              Execute: wg show
                                                  │
                                                  ▼
                                              Parse output
                                                  │
                                                  ▼
[renderer.js] ◄─────{connected: true/false}──── Return
   │
   ▼
Update status indicator
```

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
└─────────────────────────────────────────────────────────┘

Layer 1: Authentication
├── Email/Password Input
├── Bcrypt Hashing (10 rounds)
├── JWT Token Generation
└── 24-hour Token Expiration

Layer 2: API Protection
├── CORS Policy (localhost only)
├── JWT Verification Middleware
├── Token Validation on Each Request
└── 401 Unauthorized on Invalid Tokens

Layer 3: VPN Encryption
├── WireGuard Protocol
├── Client Key Pair Generation
├── Encrypted Tunnel
└── Server Public Key Verification

Layer 4: Network Security
├── AllowedIPs: 0.0.0.0/0 (full tunnel)
├── PersistentKeepalive: 25 seconds
├── DNS: 1.1.1.1 (Cloudflare)
└── IP Forwarding on Server
```

## 📁 File Structure

```
Yes vpn/
│
├── backend/                      # Express API Server
│   ├── index.js                 # Main server (Express + API)
│   ├── package.json             # Backend dependencies
│   ├── .env                     # Environment secrets
│   ├── users.json               # User credentials (bcrypt hashed)
│   ├── server-config.json       # WireGuard server details
│   └── generate-password.js     # Password hash generator
│
├── app/                          # Electron Desktop App
│   ├── main.js                  # Electron main process
│   ├── renderer.js              # UI logic & API calls
│   ├── index.html               # Application UI
│   ├── styles.css               # Modern styling
│   └── package.json             # App dependencies
│
├── setup-backend.bat            # Backend setup script
├── setup-app.bat                # App setup script
├── start-backend.bat            # Run backend server
├── start-app.bat                # Launch Electron app
│
├── README.md                    # Complete documentation
├── QUICKSTART.md                # Quick setup guide
├── PROJECT_FILES.md             # File list & status
└── ARCHITECTURE.md              # This file
```

## 🔄 Component Interactions

### Frontend (Electron Renderer)
- Handles UI state management
- Makes HTTP requests to backend API
- Communicates with main process via IPC
- Manages localStorage for token persistence
- Polls connection status every 5 seconds

### Backend (Express Server)
- Authenticates users with JWT
- Manages user credentials (JSON file)
- Generates WireGuard configurations
- Allocates unique IPs to clients
- Calls WireGuard CLI for key generation

### Main Process (Electron)
- Manages WireGuard connections
- Executes platform-specific commands
- Handles file I/O (temp config files)
- Provides IPC handlers for renderer
- Cleans up resources on app quit

### WireGuard Layer
- Generates cryptographic key pairs
- Creates encrypted VPN tunnel
- Routes all traffic through server
- Maintains persistent connection
- Handles automatic reconnection

## 🌐 Network Flow

```
Client Device                    VPN Server
     │                                │
     │  1. WireGuard Handshake        │
     ├───────────────────────────────►│
     │                                │
     │  2. Encrypted Tunnel Established│
     │◄──────────────────────────────►│
     │                                │
     │  3. All Traffic Encrypted      │
     ├═══════════════════════════════►│
     │                                │
     │                                ▼
     │                           Internet
     │                                │
     │  4. Response Encrypted         │
     │◄═══════════════════════════════┤
     │                                │
     ▼                                ▼
   User sees server IP           Decrypted at server
```

## 💾 State Management

### Backend State
- **Users**: Loaded from users.json on startup
- **Server Config**: Loaded from server-config.json
- **IP Allocation**: In-memory Map (resets on restart)
- **Sessions**: JWT tokens (stateless, client-side)

### Frontend State
```javascript
state = {
  token: localStorage.getItem('vpn_token'),  // Persistent
  isConnected: false,                        // Runtime
  serverInfo: null,                          // Fetched
  wireguardConfig: null,                     // Generated
  statusCheckInterval: null                  // Polling timer
}
```

## 🔧 Platform Compatibility

### Windows
```
Commands:
- Connect: wireguard.exe /installtunnelservice <path>
- Disconnect: wireguard.exe /uninstalltunnelservice wg0
- Status: wg show

Requirements:
- WireGuard Windows installer
- Run as Administrator
```

### macOS
```
Commands:
- Connect: sudo wg-quick up <path>
- Disconnect: sudo wg-quick down wg0
- Status: wg show

Requirements:
- brew install wireguard-tools
- sudo privileges
```

### Linux
```
Commands:
- Connect: sudo wg-quick up <path>
- Disconnect: sudo wg-quick down wg0
- Status: wg show

Requirements:
- apt install wireguard (Ubuntu/Debian)
- sudo privileges
```

## 📊 Performance Considerations

### Backend
- Synchronous file reads (users.json, config.json) on startup
- Async operations for all API calls
- In-memory IP allocation (fast, but not persistent)
- No database overhead (JSON files)

### Frontend
- Polling interval: 5 seconds (configurable)
- LocalStorage for token persistence
- Minimal DOM updates (only on state change)
- Axios for efficient HTTP requests

### VPN
- WireGuard: Modern, fast VPN protocol
- Minimal CPU usage
- Low latency overhead
- Efficient packet encryption

## 🎯 MVP Scope Decisions

### ✅ Included
- Single server configuration (simplicity)
- JSON file storage (no DB setup)
- JWT authentication (stateless)
- Basic UI (essential features only)
- Manual server configuration (admin-managed)

### ❌ Excluded (Future Versions)
- Multiple servers (adds complexity)
- User registration (admin creates users)
- Connection history (needs persistence)
- Advanced settings (MVP keeps it simple)
- System tray (desktop integration)
- Auto-reconnect (adds complexity)

## 🚀 Deployment Architecture

```
Development:
├── Backend: localhost:3000
├── Electron: Local process
└── WireGuard: Local CLI

Production:
├── Backend: Dedicated server (HTTPS)
├── Electron: Packaged .exe/.dmg/.AppImage
├── WireGuard: System service
└── Distribution: electron-builder
```

---

This architecture provides a solid foundation for a VPN MVP while maintaining simplicity and extensibility for future enhancements.
