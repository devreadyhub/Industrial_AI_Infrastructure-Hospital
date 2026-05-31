# AI Chat Authentication Guide

## Overview
The AI Chat now requires username/password authentication. This ensures:
- Proper access control
- Audit logging of all AI interactions
- Secure token-based communication
- Separate session from main application login

## How to Login to AI Chat

1. **Open the AI Chat window** - It will display a login form
2. **Enter your Staff ID/Username** - This is typically your staff code (e.g., `ADMIN-MAIN-001`)
3. **Enter your Password** - Use your password
4. **Click Login** - The form will authenticate you

## Default Admin Credentials
For testing purposes, use the admin account configured in `.env`:
- **Staff ID**: `ADMIN-MAIN-001` (set by `ADMIN_STAFF_ID`)
- **Password**: Check your `ADMIN_PASSWORD` environment variable
- **Name**: Admin (configurable via `ADMIN_NAME`)

## Creating New AI Chat Users

You can create new staff accounts for AI chat access by:
1. Registering via the main application login screen (Register button)
2. Or directly adding staff records to the database with:
   - `staffCode`: The staff ID
   - `firstName`, `lastName`: Name
   - `passwordHash`: Bcrypt hash of password
   - `clearanceLevel`: At least 1 (set to 1 for regular staff, 5 for admin)

## Authentication Flow

```
┌─────────────┐
│ AI Chat UI  │
└──────┬──────┘
       │ User enters credentials
       ▼
┌─────────────────────┐
│ AIChatLogin Component│
│  - Validates input   │
│  - Calls /api/auth/login
└──────┬──────────────┘
       │ Returns JWT token
       ▼
┌──────────────────────┐
│ localStorage.authToken│
│ localStorage.aiChatUser
└──────┬───────────────┘
       │ Token sent with requests
       ▼
┌──────────────────────┐
│ /api/ai/* endpoints  │
│ - authenticateAIUser │
│ - protectRoute(0)    │
└──────┬───────────────┘
       │ Success/Error
       ▼
┌──────────────────┐
│ AI Chat Response │
└──────────────────┘
```

## Troubleshooting

### "Error: fetch failed"
- **Cause**: Invalid credentials or network issue
- **Solution**: Verify your staff ID and password are correct

### "Authorization header missing"
- **Cause**: Token not being sent properly
- **Solution**: Check browser's localStorage - should have `authToken` key

### "Invalid or expired token"
- **Cause**: Token has expired (default: 1 hour)
- **Solution**: Logout and login again

### Can't see "Chat socket: Connected"
- **Cause**: Backend not running or socket connection failed
- **Solution**: Verify backend is running on configured port (default: 4000)

## Logout

Click the **Logout** button in the top-right corner of the AI Chat window to:
- Clear authentication token
- Disconnect socket
- Return to login screen
