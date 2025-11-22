# Admin Authentication System

**Status**: ✅ Active - All admin pages protected with username/password

---

## Overview

All admin pages (`/admin/*`) are now protected with a secure authentication system. Users must login with username and password to access admin features.

---

## Protected Pages

- `/admin/iq` - FunBet IQ detailed calculations
- `/admin/stats` - Admin statistics dashboard
- Any future `/admin/*` routes

---

## Default Credentials

**⚠️ IMPORTANT: Change these in production!**

```
Username: admin
Password: admin123
```

---

## How to Change Admin Credentials

### Method 1: Environment Variables (Recommended)

**Step 1**: Generate password hash
```bash
cd /app/backend
python3 -c "import hashlib; print(hashlib.sha256('YOUR_NEW_PASSWORD'.encode()).hexdigest())"
```

**Step 2**: Add to `/app/backend/.env`
```env
ADMIN_USERNAME=your_username
ADMIN_PASSWORD_HASH=your_generated_hash
```

**Step 3**: Restart backend
```bash
sudo supervisorctl restart backend
```

### Method 2: Direct Code Edit (Not Recommended)

Edit `/app/backend/admin_auth.py` lines 10-13:
```python
ADMIN_USERNAME = 'your_username'
ADMIN_PASSWORD_HASH = 'your_hash'
```

---

## How It Works

### 1. User Flow

```
1. User visits /admin/iq or /admin/stats
2. System checks for valid auth token
3. If no token → Redirect to /admin/login
4. User enters username/password
5. Backend verifies credentials
6. Backend creates 24-hour session token
7. Token stored in localStorage
8. User redirected to intended admin page
9. User can logout anytime
```

### 2. Session Management

**Token Lifetime**: 24 hours  
**Storage**: localStorage (client-side)  
**Validation**: Every page load  
**Expiration**: Automatic cleanup of expired sessions

### 3. Security Features

✅ **Password Hashing**: SHA-256 hashing (never store plain passwords)  
✅ **Session Tokens**: Secure random tokens (32 bytes)  
✅ **Token Expiration**: 24-hour automatic expiry  
✅ **Session Validation**: Every request validates token  
✅ **Auto Cleanup**: Expired sessions removed automatically  
✅ **HTTPS Ready**: Secure in production with HTTPS  

---

## API Endpoints

### 1. Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "token": "random_token_here",
  "username": "admin",
  "expires_in": 86400
}
```

**Response (Failure)**:
```json
{
  "detail": "Invalid username or password"
}
```

### 2. Verify Session
```http
GET /api/admin/verify
Authorization: Bearer <token>
```

**Response (Valid)**:
```json
{
  "success": true,
  "username": "admin",
  "expires_at": "2025-11-23T18:00:00Z"
}
```

**Response (Invalid)**:
```json
{
  "detail": "Session expired or invalid"
}
```

### 3. Logout
```http
POST /api/admin/logout
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Frontend Components

### 1. AdminLogin Page
**Location**: `/app/frontend/src/pages/AdminLogin.jsx`

**Features**:
- Username/password form
- Error handling
- Loading states
- Automatic redirect after login
- Remembers intended destination

### 2. ProtectedRoute Component
**Location**: `/app/frontend/src/components/ProtectedRoute.jsx`

**Features**:
- Wraps admin pages
- Validates token on mount
- Shows loading spinner during validation
- Redirects to login if not authenticated
- Remembers intended destination

**Usage**:
```jsx
<Route path="/admin/iq" element={
  <ProtectedRoute>
    <AdminIQ />
  </ProtectedRoute>
} />
```

### 3. Logout Button
Both AdminIQ and AdminStats pages have logout buttons that:
- Call logout API
- Clear localStorage
- Redirect to login page

---

## Backend Implementation

### Files

1. **`/app/backend/admin_auth.py`**
   - Credential verification
   - Session management
   - Token generation/validation
   - Password hashing

2. **`/app/backend/server.py`**
   - Authentication endpoints (lines 91-165)
   - `require_admin_auth()` dependency
   - Login/logout/verify routes

### Key Functions

**`verify_credentials(username, password)`**
- Hashes password
- Compares with stored hash
- Returns True/False

**`create_session(username)`**
- Generates secure token
- Stores in memory (24hr expiry)
- Returns token

**`verify_session(token)`**
- Checks if token exists
- Checks if expired
- Returns session data or None

**`require_admin_auth(authorization)`**
- FastAPI dependency
- Extracts Bearer token
- Validates session
- Raises 401 if invalid

---

## Testing the Authentication

### 1. Test Login
```bash
curl -X POST http://localhost:8001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: 200 OK with token

### 2. Test Verify
```bash
TOKEN="your_token_here"
curl -X GET http://localhost:8001/api/admin/verify \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 OK with session details

### 3. Test Logout
```bash
curl -X POST http://localhost:8001/api/admin/logout \
  -H "Authorization: Bearer $TOKEN"
```

Expected: 200 OK with success message

### 4. Test Protected Route Access
```bash
# Without token (should fail)
curl -X GET http://localhost:8001/api/admin/iq

# With token (should succeed)
curl -X GET http://localhost:8001/api/admin/iq \
  -H "Authorization: Bearer $TOKEN"
```

---

## Adding Authentication to New Admin Routes

### Backend
```python
# In server.py

@api_router.get("/admin/new-feature")
async def admin_new_feature(session = Depends(require_admin_auth)):
    # session contains username and auth info
    # This endpoint is now protected
    return {"message": "Admin only content"}
```

### Frontend
```jsx
// In App.js

<Route path="/admin/new-feature" element={
  <ProtectedRoute>
    <NewFeature />
  </ProtectedRoute>
} />
```

---

## Session Storage

### Current Implementation
- **Storage**: In-memory dictionary
- **Persistence**: Lost on backend restart
- **Suitable for**: Development, low-traffic

### Production Upgrade (Future)
Consider upgrading to:
- **Redis**: Distributed session storage
- **Database**: MongoDB sessions collection
- **JWT**: Stateless authentication

---

## Security Considerations

### ✅ Implemented
- Password hashing (SHA-256)
- Secure token generation
- Token expiration (24 hours)
- Bearer token authentication
- Auto cleanup of expired sessions
- No plain passwords in code/logs

### 🔄 Production Recommendations
- Use HTTPS in production
- Store credentials in environment variables
- Implement rate limiting on login endpoint
- Add CAPTCHA for multiple failed attempts
- Use stronger hashing (bcrypt/argon2)
- Implement refresh tokens
- Add audit logging

---

## Troubleshooting

### Issue: "Session expired or invalid"

**Causes**:
1. Token expired (24 hours)
2. Backend restarted (sessions lost)
3. Invalid token

**Solution**: Login again

### Issue: "Invalid username or password"

**Causes**:
1. Wrong credentials
2. Password hash mismatch

**Solution**: 
- Check credentials
- Verify ADMIN_PASSWORD_HASH in `.env`

### Issue: Can't logout / stays logged in

**Cause**: Token still in localStorage

**Solution**:
```javascript
// In browser console
localStorage.removeItem('adminToken');
localStorage.removeItem('adminUsername');
```

### Issue: Login works but redirects back to login

**Cause**: ProtectedRoute not detecting token

**Solution**:
- Check browser console for errors
- Verify backend is running
- Check `/api/admin/verify` endpoint

---

## Monitoring

### Check Active Sessions
```bash
# In Python (backend running)
cd /app/backend
python3 -c "
from admin_auth import active_sessions
print(f'Active sessions: {len(active_sessions)}')
for token, session in active_sessions.items():
    print(f\"  {session['username']}: expires {session['expires_at']}\")
"
```

### Check Backend Logs
```bash
tail -f /var/log/supervisor/backend.err.log | grep -i "admin"
```

Expected output:
```
Admin login successful: admin
```

---

## Migration from Old System

The old AdminStats page had a simple password-only system. This has been replaced with the new token-based system.

**Changes**:
- ❌ Removed: `sessionStorage` password check
- ❌ Removed: Hardcoded password in component
- ✅ Added: Token-based authentication
- ✅ Added: Centralized auth system
- ✅ Added: Session management

**No action required**: System auto-migrates on page load

---

## Future Enhancements

1. **Multiple Admin Users**
   - Store users in database
   - Different permission levels
   - User management interface

2. **Two-Factor Authentication**
   - TOTP/SMS verification
   - Backup codes
   - Device trust

3. **Audit Logging**
   - Log all admin actions
   - IP tracking
   - Activity timeline

4. **Password Reset**
   - Email-based reset
   - Security questions
   - Time-limited reset links

---

## Quick Reference

**Login URL**: `/admin/login`  
**Default Username**: `admin`  
**Default Password**: `admin123`  
**Token Lifetime**: 24 hours  
**Storage**: localStorage  

**Change Password**: Edit `.env` with new hash  
**Check Sessions**: See Monitoring section  
**Add Protection**: Use `ProtectedRoute` wrapper  

---

**End of Documentation**
