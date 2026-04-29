# Meteorfy - Vercel Deployment Guide

## Overview

This guide explains how to deploy Meteorfy on Vercel. The application has been adapted from a traditional Express server to Vercel's serverless architecture.

## Key Changes for Vercel

### 1. Serverless Architecture
- **Before**: Long-running Express.js server (`server/index.ts`)
- **After**: Individual serverless functions in `/api/` directory
- Each API route is now a separate Vercel serverless function

### 2. Database
- **Good News**: Neon PostgreSQL (serverless) is already compatible!
- Removed connection pooling (not needed in serverless)
- Each function creates a fresh DB connection

### 3. File Uploads
- Firebase Storage is still used for file uploads
- Upload endpoint needs to be adapted (currently in `server/routes.ts`)

### 4. Frontend
- Vite React app builds to static files
- Deployed as static site on Vercel

## Deployment Steps

### Prerequisites
1. Vercel account
2. Neon database (already configured)
3. Firebase project (for Auth and Storage)
4. PayPal developer account

### Step 1: Prepare Environment Variables

In Vercel dashboard, add these environment variables:

```
# Database (Neon)
DATABASE_URL=postgresql://user:password@endpoint.neon.tech/meteorfy?sslmode=require
NEON_DATABASE_URL=postgresql://user:password@endpoint.neon.tech/meteorfy?sslmode=require

# Firebase Admin
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# PayPal (optional)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Other
NODE_ENV=production
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard
1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables
4. Deploy!

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 3: Update Firebase Auth Settings

After deployment, add your Vercel domain to Firebase Auth authorized domains:
1. Go to Firebase Console
2. Authentication → Settings → Authorized domains
3. Add your Vercel domain (e.g., `yourapp.vercel.app`)

### Step 4: Test the Deployment

```bash
# Health check
curl https://yourapp.vercel.app/api/health

# Test API (requires auth token)
curl -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
     https://yourapp.vercel.app/api/products
```

## Project Structure (Vercel)

```
meteorfy/
├── api/                    # Serverless API functions
│   ├── _lib/               # Shared utilities
│   │   ├── database.ts    # DB connection
│   │   ├── auth.ts        # Auth middleware
│   │   └── firebase-admin.ts
│   ├── products.ts         # Products API
│   ├── checkouts.ts        # Checkouts API
│   ├── sales.ts            # Sales API
│   ├── settings.ts         # Settings API
│   ├── stats.ts            # Dashboard stats API
│   ├── withdrawals.ts      # Withdrawals API
│   ├── health.ts           # Health check
│   └── admin/             # Admin endpoints
│       └── withdrawals/
│           └── [id]/
│               ├── approve.ts
│               └── reject.ts
├── client/                 # Frontend (React)
│   └── src/
├── shared/                 # Shared types/schemas
├── vercel.json             # Vercel config
└── package.json
```

## Limitations on Vercel

### 1. File Uploads
- Vercel has a 4.5MB body size limit
- Firebase Storage is used instead (already configured)
- Need to create `api/upload.ts` endpoint

### 2. WebSockets
- Vite HMR (Hot Module Replacement) won't work on Vercel
- Only affects development, not production

### 3. Long-running Processes
- Serverless functions have a 10-second execution timeout (hobby) or 30 seconds (pro)
- PayPal webhooks should still work
- Push notifications might need adjustment

### 4. File System
- No persistent file system
- All uploads must go to cloud storage (Firebase Storage)

## Next Steps

1. **Create remaining API endpoints**:
   - `api/upload.ts` - File uploads to Firebase Storage
   - `api/paypal/*.ts` - PayPal integration
   - `api/admin/*.ts` - Admin endpoints

2. **Test locally with Vercel CLI**:
   ```bash
   vercel dev
   ```

3. **Monitor function execution times** in Vercel dashboard

4. **Set up Vercel Blob** (optional) for better file handling

## Troubleshooting

### CORS Issues
Already handled in each API function with headers:
```typescript
res.setHeader("Access-Control-Allow-Origin", "*");
```

### Database Connection Errors
- Check Neon connection string
- Ensure SSL mode is set (`sslmode=require`)

### Firebase Admin Errors
- Verify service account credentials
- Check private key format (newlines as `\n`)

## Support

For issues, check:
- Vercel docs: https://vercel.com/docs
- Neon docs: https://neon.tech/docs
- Firebase docs: https://firebase.google.com/docs