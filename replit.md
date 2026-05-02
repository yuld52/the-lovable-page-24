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
- **File Uploads**: Local disk storage via Multer (stored in `public/uploads/`)
- **Payments**: PayPal integration (per-user credentials stored in DB settings table)
- **Push Notifications**: web-push with VAPID keys

### Dev Server
- Single port 5000: Express serves both the API and the Vite dev middleware
- Workflow command: `npm run dev` → `node start-all.js` → `npx tsx --watch server/index.ts`
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
│   ├── paypal.ts     # PayPal API helpers
│   ├── static.ts     # Production static file serving
│   └── middleware/   # Auth middleware (Firebase JWT verification)
├── shared/           # Shared types and schema
│   └── schema.ts     # Drizzle database schema definitions
├── migrations/       # SQL migration files
├── public/uploads/   # Local file uploads (multer)
└── start-all.js      # Dev startup script
```

### Key Design Decisions

1. **Single-port development**: Express server handles both API routes and Vite frontend (via `setupVite`) on port 5000. No separate Vite dev server needed.

2. **Firebase Auth**: JWT tokens from Firebase are verified server-side using Firebase Admin SDK. The `requireAuth` middleware validates Bearer tokens on protected routes.

3. **Neon PostgreSQL**: Uses `@neondatabase/serverless` with WebSocket support. `NEON_DATABASE_URL` is set in Replit env vars.

4. **Environment Secrets**: All secrets are managed via Replit Secrets — no `.env` loading at runtime.

## External Dependencies & Required Secrets

### Secrets (set in Replit Secrets panel)
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key ✅
- `SESSION_SECRET`: Express session secret ✅

### Environment Variables (set in Replit env)
- `PORT`: 5000 ✅
- `NODE_ENV`: development ✅
- `FIREBASE_PROJECT_ID`: meteorfy1 ✅
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email ✅
- `NEON_DATABASE_URL`: Neon PostgreSQL connection string ✅
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Web push notification keys ✅

### Optional Secrets (configure when ready)
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`: PayPal payments
- `FACEBOOK_PIXEL_ID` / `FACEBOOK_ACCESS_TOKEN`: Meta/Facebook pixel tracking
- `UTMIFY_TOKEN`: UTMify analytics token
