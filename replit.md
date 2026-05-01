# Meteorfy - Sales Platform

## Overview

Meteorfy is a full-stack sales and checkout platform built with React, Express, and PostgreSQL. It provides a dashboard for managing products, creating customizable checkout pages, and tracking sales with PayPal payment integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite (served via Express middleware in dev mode)
- **UI Components**: Radix UI primitives wrapped with shadcn/ui styling

### Backend Architecture
- **Framework**: Express.js with TypeScript (run via `tsx`)
- **Database**: Neon PostgreSQL (serverless) via `@neondatabase/serverless`
- **Authentication**: Firebase Auth (JWT verification via Firebase Admin SDK)
- **File Uploads**: Firebase Storage (admin SDK) + local multer
- **Payments**: PayPal integration
- **Push Notifications**: web-push with VAPID keys

### Dev Server
- Single port 5000: Express serves both the API and the Vite dev middleware
- Workflow command: `node --import tsx/esm server/index.ts`
- In production: Vite builds static files served by Express static middleware

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks for API calls
│   │   ├── pages/        # Route page components
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Main entry point (also sets up Vite middleware)
│   ├── routes.ts     # API route handlers
│   ├── firebase-admin.ts  # Firebase Admin SDK setup
│   ├── neon-storage.ts    # Neon DB storage layer
│   └── middleware/   # Auth middleware
├── shared/           # Shared types and schema
│   └── schema.ts     # Drizzle database schema definitions
├── migrations/       # SQL migration files
```

### Key Design Decisions

1. **Single-port development**: Express server handles both API routes and Vite frontend (via `setupVite`) on port 5000. No need for a separate Vite dev server.

2. **Firebase Auth**: JWT tokens from Firebase are verified server-side using Firebase Admin SDK. The `requireAuth` middleware validates Bearer tokens on protected routes.

3. **Neon PostgreSQL**: Uses `@neondatabase/serverless` for database access. `DATABASE_URL` secret is set in Replit secrets.

4. **Environment Secrets**: All secrets are in the `.env` file and also registered in Replit secrets. The server loads `.env` at startup as a fallback.

## External Dependencies & Required Secrets

### Secrets (set in Replit Secrets panel)
- `DATABASE_URL`: Neon PostgreSQL connection string (already configured)
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key (needs real key for admin features)
- `PAYPAL_CLIENT_ID`: PayPal app client ID
- `PAYPAL_CLIENT_SECRET`: PayPal app secret
- `PAYPAL_WEBHOOK_ID`: PayPal webhook ID
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Web push notification keys
- `FACEBOOK_PIXEL_ID` / `FACEBOOK_ACCESS_TOKEN`: Meta/Facebook pixel tracking
- `UTMIFY_TOKEN`: UTMify analytics token

### Important Notes
- Firebase Admin private key must be a valid RSA key for auth verification to work. If invalid, the server falls back to no-credential mode (some admin features may not work).
- PayPal credentials are also stored per-user in the `settings` table in the database.

## Environment Variables (non-secret)
- `PORT`: 5000 (set in Replit env)
- `NODE_ENV`: development or production
