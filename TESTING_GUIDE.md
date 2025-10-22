# 🧪 Testing Guide - Advance ERP

## 🚀 How to Start the Application

### Prerequisites
- ✅ Docker Desktop running
- ✅ Node.js 20+ installed
- ✅ PostgreSQL and Redis already running (via Docker)

---

## 📋 **Step-by-Step Startup Guide**

### **Step 1: Start Database Services** (if not already running)

```bash
# From project root
docker-compose up postgres redis -d
```

**Verify services are running:**
```bash
docker-compose ps
```

You should see:
- ✅ `advance-erp-postgres` - Up (healthy)
- ✅ `advance-erp-redis` - Up (healthy)

---

### **Step 2: Start Backend Server**

**Terminal 1 (Backend):**
```bash
cd backend
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - 10/19/2025, 6:41:37 am     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 10/19/2025, 6:41:37 am     LOG [InstanceLoader] TypeOrmModule dependencies initialized
...
🚀 Backend server running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

**Verify backend is running:**
- Open browser: http://localhost:3000
- Should see: "Hello World!"
- API Docs: http://localhost:3000/api/docs

---

### **Step 3: Start Frontend Server**

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v6.0.11  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Verify frontend is running:**
- Open browser: http://localhost:5173
- Should see: Login page with gradient background

---

## 🧪 **Testing the Application**

### **Test 1: Create a Test User (via API)**

**Using curl (Windows PowerShell):**
```powershell
curl -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"Admin@123\",\"fullName\":\"System Administrator\"}'
```

**Using curl (Linux/Mac):**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "Admin@123",
    "fullName": "System Administrator"
  }'
```

**Using Postman or Swagger UI:**
1. Open http://localhost:3000/api/docs
2. Find `POST /auth/register`
3. Click "Try it out"
4. Fill in the request body:
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "Admin@123",
  "fullName": "System Administrator"
}
```
5. Click "Execute"

**Expected Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Administrator",
    "roles": [],
    "permissions": []
  }
}
```

---

### **Test 2: Login via Frontend UI**

1. **Navigate to:** http://localhost:5173/login
2. **Enter credentials:**
   - Username: `admin`
   - Password: `Admin@123`
3. **Click:** "Sign In"
4. **Expected:** Redirect to dashboard at http://localhost:5173/dashboard
5. **You should see:**
   - Welcome message with your name
   - Your user info (username, email, roles, permissions)
   - Logout button

---

### **Test 3: Login via API (Postman/curl)**

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Administrator",
    "roles": [],
    "permissions": []
  }
}
```

---

### **Test 4: Access Protected Endpoint**

**Get current user info:**
```bash
curl -X POST http://localhost:3000/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the actual token from login response.

**Expected Response:**
```json
{
  "id": "uuid-here",
  "username": "admin",
  "email": "admin@example.com",
  "fullName": "System Administrator",
  "roles": [],
  "permissions": []
}
```

---

### **Test 5: Logout**

**Via Frontend:**
1. Click "Logout" button on dashboard
2. Should redirect to login page
3. Try accessing http://localhost:5173/dashboard
4. Should redirect back to login

**Via API:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

---

### **Test 6: Token Refresh**

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Expected:** New access token and refresh token

---

### **Test 7: Protected Routes (Frontend)**

1. **Without logging in:**
   - Try to access: http://localhost:5173/dashboard
   - **Expected:** Redirect to http://localhost:5173/login

2. **After logging in:**
   - Access: http://localhost:5173/dashboard
   - **Expected:** Dashboard page loads

3. **After logging out:**
   - Try to access: http://localhost:5173/dashboard
   - **Expected:** Redirect to login

---

## 🔍 **Verification Checklist**

### Backend Health Checks
- [ ] http://localhost:3000 → "Hello World!"
- [ ] http://localhost:3000/health → Status: ok
- [ ] http://localhost:3000/api/docs → Swagger UI loads
- [ ] Database connection working (check terminal logs)
- [ ] Redis connection working (no errors in logs)

### Frontend Health Checks
- [ ] http://localhost:5173 → Redirects to /login
- [ ] http://localhost:5173/login → Login page loads
- [ ] Forms have validation
- [ ] Console has no errors (F12 → Console)

### Authentication Flow
- [ ] Can register new user
- [ ] Can login with username
- [ ] Can login with email
- [ ] Wrong password shows error
- [ ] After 5 failed attempts, account locks
- [ ] Protected routes redirect to login
- [ ] Logout clears session
- [ ] Dashboard shows user info

---

## 🐛 **Troubleshooting**

### Backend Won't Start

**Error:** `EADDRINUSE: address already in use :::3000`
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

**Error:** `Database connection failed`
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

**Error:** `Redis connection failed`
```bash
# Restart Redis
docker-compose restart redis
```

---

### Frontend Won't Start

**Error:** Port 5173 in use
```bash
# Kill the process and restart
# Then run npm run dev again
```

**Error:** `Failed to load resource: net::ERR_CONNECTION_REFUSED`
- **Cause:** Backend not running
- **Fix:** Start backend server first

---

### Login Not Working

**Check:**
1. ✅ Backend is running (http://localhost:3000)
2. ✅ User exists (create via API first)
3. ✅ Password is correct (at least 8 chars, uppercase, lowercase, number)
4. ✅ Check browser console for errors (F12)
5. ✅ Check backend terminal for errors

---

## 📊 **Quick Test Script**

Create a file `test-auth.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Advance ERP Authentication"
echo "======================================"

# Test 1: Health check
echo "\n1️⃣ Testing backend health..."
curl -s http://localhost:3000/health | jq

# Test 2: Register user
echo "\n2️⃣ Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@123",
    "fullName": "Test User"
  }')
echo $REGISTER_RESPONSE | jq

# Test 3: Login
echo "\n3️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@123"
  }')
echo $LOGIN_RESPONSE | jq

# Extract token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

# Test 4: Get current user
echo "\n4️⃣ Getting current user info..."
curl -s -X POST http://localhost:3000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# Test 5: Logout
echo "\n5️⃣ Logging out..."
curl -s -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

echo "\n✅ All tests complete!"
```

**Run it:**
```bash
chmod +x test-auth.sh
./test-auth.sh
```

---

## 🎯 **Summary of Endpoints**

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/` | No | Health check |
| GET | `/health` | No | Detailed health |
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login user |
| POST | `/auth/refresh` | No | Refresh token |
| POST | `/auth/logout` | Yes | Logout user |
| POST | `/auth/me` | Yes | Get current user |

---

## 📝 **Next Steps**

After verifying everything works:
1. ✅ Test all authentication flows
2. ✅ Verify protected routes
3. ✅ Check database for created users
4. 🚀 **Ready for Phase 3: Chart of Accounts Module**

---

**Created:** October 19, 2025  
**Phase:** 2 Complete | Phase 3 Ready

