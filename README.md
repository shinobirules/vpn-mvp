# VPN MVP - Minimal Viable Product

A simplified VPN application built with Electron and Node.js, featuring WireGuard integration for secure VPN connections.

## 🎯 Project Overview

This is a minimal viable product (MVP) VPN application that provides:
- Simple email/password authentication
- Connection to a pre-configured WireGuard VPN server
- Basic connection status monitoring
- Desktop application with clean, modern UI

## 📋 Prerequisites

Before setting up this project, ensure you have the following installed:

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **WireGuard** - Required for VPN functionality
   - **Windows**: [Download WireGuard](https://www.wireguard.com/install/)
   - **macOS**: `brew install wireguard-tools`
   - **Linux**: `sudo apt install wireguard` (Ubuntu/Debian)
3. **WireGuard Server** - You need access to a configured WireGuard server

## 🏗️ Project Structure

```
vpn-mvp/
├── backend/               # Express API server
│   ├── index.js          # Main server file
│   ├── users.json        # User credentials
│   ├── server-config.json # WireGuard server details
│   ├── .env              # Environment variables
│   └── package.json
├── app/                   # Electron desktop app
│   ├── main.js           # Electron main process
│   ├── renderer.js       # Client-side logic
│   ├── index.html        # UI structure
│   ├── styles.css        # Styling
│   └── package.json
└── README.md
```

## 🚀 Setup Instructions

### Step 1: Backend Setup

1. **Navigate to backend folder:**
   ```powershell
   cd backend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment variables:**
   
   Edit the `.env` file and replace placeholder values with your WireGuard server details:
   ```env
   JWT_SECRET=your_random_secret_key_here_change_this
   PORT=3000
   SERVER_IP=your.server.ip.address
   SERVER_PUBLIC_KEY=your_server_public_key_here
   SERVER_PORT=51820
   ```

4. **Update server configuration:**
   
   Edit `server-config.json` with your server details:
   ```json
   {
     "server": {
       "name": "My VPN Server",
       "country": "United States",
       "ip": "your.server.ip.address",
       "publicKey": "your_server_public_key_here",
       "port": 51820,
       "allowedIPs": "0.0.0.0/0"
     }
   }
   ```

5. **Create a test user:**
   
   The default `users.json` includes a demo user. To create a new user with a hashed password, run this Node.js script:
   
   ```powershell
   node
   ```
   
   Then in the Node.js REPL:
   ```javascript
   const bcrypt = require('bcrypt');
   bcrypt.hash('your_password', 10, (err, hash) => {
     console.log(hash);
     process.exit();
   });
   ```
   
   Copy the hash and add it to `users.json`:
   ```json
   {
     "users": [
       {
         "id": 1,
         "email": "your@email.com",
         "password": "hashed_password_here"
       }
     ]
   }
   ```

6. **Start the backend server:**
   ```powershell
   npm start
   ```
   
   You should see:
   ```
   🚀 VPN MVP Backend Server Started
   Server running on: http://localhost:3000
   ```

### Step 2: Desktop App Setup

1. **Open a new terminal and navigate to app folder:**
   ```powershell
   cd app
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Start the application:**
   ```powershell
   npm start
   ```

   The Electron app window should open automatically.

## 🧪 Testing the Application

### Default Demo Credentials

The application comes with a demo user:
- **Email**: `demo@vpn.com`
- **Password**: `password123`

**Note**: The password hash in `users.json` is a placeholder. You'll need to generate a real hash for "password123" using the bcrypt script above.

### Testing Checklist

- [ ] Backend server starts without errors
- [ ] Electron app launches successfully
- [ ] Can login with test credentials
- [ ] Server information displays correctly
- [ ] Click "Connect" button generates configuration
- [ ] WireGuard connection establishes
- [ ] Status indicator shows "Connected" in green
- [ ] Your IP address changes (verify at [ipinfo.io](https://ipinfo.io))
- [ ] Click "Disconnect" button terminates connection
- [ ] Status returns to "Disconnected"
- [ ] Logout clears session and returns to login

### Verifying VPN Connection

1. Before connecting, check your IP: Visit [ipinfo.io](https://ipinfo.io)
2. Connect to VPN using the app
3. Check IP again - it should match your VPN server's IP
4. Run `wg show` in terminal to see active WireGuard interface

## 🔐 Security Notes

### Important Security Considerations

1. **JWT Secret**: Change the default `JWT_SECRET` in `.env` to a strong random string
2. **Password Storage**: All passwords are hashed with bcrypt (10 rounds minimum)
3. **HTTPS**: In production, use HTTPS for the backend API
4. **Token Expiration**: JWT tokens expire after 24 hours
5. **Never commit**: Don't commit `.env` files or real credentials to version control

### Generating Secure Credentials

Generate a secure JWT secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🛠️ Development

### Running in Development Mode

**Backend (with auto-reload):**
```powershell
cd backend
npm run dev
```

**Electron App (with DevTools):**
```powershell
cd app
npm run dev
```

### Common Commands

**Backend:**
- `npm start` - Start server
- `npm run dev` - Start with nodemon (auto-reload)

**App:**
- `npm start` - Launch Electron app
- `npm run dev` - Launch with DevTools open

## 🐛 Troubleshooting

### Backend Issues

**Error: "Cannot find module"**
- Run `npm install` in the backend folder

**Error: "JWT_SECRET is not defined"**
- Ensure `.env` file exists and contains `JWT_SECRET`

**Error: "Failed to generate WireGuard keys"**
- Install WireGuard CLI tools
- Verify `wg` command works: `wg --version`

### App Issues

**App won't connect to backend**
- Ensure backend server is running on port 3000
- Check `API_BASE_URL` in `renderer.js`

**Error: "Failed to connect to VPN"**
- Verify WireGuard is installed
- Check server configuration in `server-config.json`
- Ensure you have admin/sudo privileges (required for WireGuard)

**Windows-specific: "Access Denied"**
- Run the app as Administrator
- WireGuard requires elevated privileges on Windows

### Connection Issues

**VPN connects but no internet**
- Check server's `AllowedIPs` setting (should be `0.0.0.0/0`)
- Verify server has IP forwarding enabled
- Check server firewall rules

**Status shows "Disconnected" but VPN is active**
- Run `wg show` in terminal to verify actual status
- Restart the app

## 📝 API Documentation

### Backend Endpoints

#### POST `/api/login`
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

#### GET `/api/server` (Protected)
Get WireGuard server information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "server": {
    "name": "My VPN Server",
    "country": "United States",
    "ip": "1.2.3.4",
    "publicKey": "server_public_key",
    "port": 51820
  }
}
```

#### POST `/api/generate-config` (Protected)
Generate WireGuard configuration for the user.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "config": "[Interface]\nPrivateKey = ...\n...",
  "clientPublicKey": "client_public_key",
  "clientIP": "10.0.0.2/32"
}
```

## 🎨 UI Features

- **Modern gradient background** with purple/blue theme
- **Responsive design** that works on different screen sizes
- **Status indicators** with animated pulse effect when connected
- **Color-coded buttons** for different actions
- **Auto-hiding error/success messages** (5-second timeout)
- **Smooth transitions** and hover effects

## 🔧 Configuration Files

### backend/.env
Environment variables for the backend server.

### backend/users.json
User credentials storage (simple JSON file for MVP).

### backend/server-config.json
WireGuard server configuration details.

## 📦 Dependencies

### Backend
- **express**: Web server framework
- **cors**: Cross-origin resource sharing
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **dotenv**: Environment variable management

### App
- **electron**: Desktop application framework
- **axios**: HTTP client for API requests

## 🚧 Known Limitations (MVP Scope)

This is a minimal viable product with intentional limitations:

- ❌ No user registration (admin creates accounts)
- ❌ No multiple server selection (single server only)
- ❌ No connection history tracking
- ❌ No advanced settings or customization
- ❌ No system tray integration
- ❌ No automatic reconnection
- ❌ Database not used (JSON files for simplicity)

## 🔮 Future Enhancements

Potential features for future versions:
- Multiple server locations
- User registration and profile management
- Connection history and statistics
- Kill switch functionality
- Auto-connect on startup
- System tray integration
- Split tunneling
- Database integration (PostgreSQL/MongoDB)

## 📄 License

MIT License - Feel free to use this project for learning or as a base for your own VPN application.

## 🤝 Contributing

This is an MVP project. Contributions, issues, and feature requests are welcome!

## ⚠️ Disclaimer

This is a minimal viable product intended for educational and development purposes. For production use:
- Implement proper security measures
- Use a real database
- Add comprehensive error handling
- Implement logging and monitoring
- Use HTTPS for all communications
- Add rate limiting and DDoS protection
- Conduct security audits

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify all prerequisites are installed
3. Ensure backend server is running
4. Check console logs for detailed error messages

---

**Built with ❤️ using Electron, Node.js, and WireGuard**
#   y e s - v p n  
 