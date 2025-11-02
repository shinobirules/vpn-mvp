# VPN MVP - Quick Start Guide

## 🚀 Fast Setup (Windows)

### Step 1: Install Dependencies
Run these batch files in order:
1. Double-click `setup-backend.bat` - Installs backend dependencies
2. Double-click `setup-app.bat` - Installs Electron app dependencies

### Step 2: Configure Server Details

Edit `backend/.env` with your WireGuard server information:
- SERVER_IP
- SERVER_PUBLIC_KEY
- JWT_SECRET (generate a random string)

Edit `backend/server-config.json` with your server details.

### Step 3: Run the Application

1. Double-click `start-backend.bat` - Starts the API server
2. Double-click `start-app.bat` - Opens the Electron app

### Step 4: Login

Use the demo credentials:
- Email: `demo@vpn.com`
- Password: `password123`

---

## 📝 Manual Setup (Alternative)

If batch files don't work, run these commands in PowerShell:

### Backend Setup
```powershell
cd backend
npm install
node generate-password.js
# Update .env and server-config.json
node index.js
```

### App Setup (in new terminal)
```powershell
cd app
npm install
npm start
```

---

## ✅ Verification Checklist

Before first run, ensure:
- [ ] Node.js is installed (`node --version`)
- [ ] WireGuard is installed (`wg --version`)
- [ ] Backend .env file is configured
- [ ] server-config.json has your server details
- [ ] Backend server is running (http://localhost:3000)

---

## 🔧 Troubleshooting

### "Scripts disabled" Error
Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Cannot find module" Error
Make sure you ran the setup scripts or `npm install` in both folders.

### WireGuard Connection Fails
- Run the app as Administrator (WireGuard requires elevated privileges)
- Verify WireGuard is installed: `wg --version`
- Check server configuration in backend/server-config.json

### Backend Won't Start
- Check if port 3000 is available
- Verify .env file exists in backend folder
- Check console for error messages

---

## 📚 More Information

See `README.md` for complete documentation including:
- Detailed setup instructions
- API documentation
- Security considerations
- Development guide
- Known limitations

---

**Need Help?** Check the full README.md or console logs for detailed error messages.
