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

### Mobile Responsiveness

The app is fully mobile-responsive. Key implementation details:

- **`Sidebar`** (`client/src/components/Sidebar.tsx`): Accepts `isOpen`/`onClose` props. On mobile it becomes a `fixed` overlay that slides in from the left (`-translate-x-full` → `translate-x-0`); on desktop it is `md:relative md:w-80`.
- **`AdminSidebar`** (`client/src/components/AdminSidebar.tsx`): Same mobile overlay pattern as Sidebar.
- **`Layout`** (`client/src/components/Layout.tsx`): Manages `sidebarOpen` state, passes it to Sidebar and as `onMenuToggle` to Header. Shows a black overlay on mobile when sidebar is open. Main content padding is `p-4 md:p-8`.
- **`Header`** (`client/src/components/Header.tsx`): Accepts optional `onMenuToggle` prop. Shows hamburger `Menu` icon on mobile only (`md:hidden`). Height is `h-16 md:h-28`.
- **`AdminLayout`** (`client/src/components/AdminLayout.tsx`): New reusable wrapper for all admin pages. Manages its own `sidebarOpen` state. Shows a mobile top bar with hamburger + "Admin Panel" label on small screens.
- **Admin pages**: All 9 admin pages (`Admin`, `AdminProducts`, `AdminUsers`, `AdminWithdrawals`, `AdminEmail`, `AdminSales`, `AdminRulesFees`, `AdminRevenueRanking`, `AdminSettings`) updated to use `AdminLayout` instead of raw `flex` div with `AdminSidebar`.
- **Page content**: Admin page main padding is `p-4 md:p-8`. Dashboard grids use `grid-cols-1 md:grid-cols-3`. Financeiro tabs are `w-full sm:w-fit`. Sales table uses `overflow-x-auto`.

### Key Design Decisions

1. **Single-port development**: Express server handles both API routes and Vite frontend (via `setupVite`) on port 5000. No separate Vite dev server needed.

2. **Firebase Auth**: JWT tokens from Firebase are verified server-side using Firebase Admin SDK. The `requireAuth` middleware validates Bearer tokens on protected routes.

3. **Neon PostgreSQL**: Uses `@neondatabase/serverless` with WebSocket support. `NEON_DATABASE_URL` is set in Replit env vars.

4. **Environment Secrets**: All secrets are managed via Replit Secrets — no `.env` loading at runtime.

5. **Tracking Architecture**:
   - `server/tracking.ts` is the central hub for all outbound tracking calls.
   - **Meta CAPI** (`sendMetaCapiEvent`): sends server-side events to Graph API v18.0 with `event_id` for browser+CAPI deduplication, real currency, IP/UA, `_fbc`/`_fbp` cookies forwarded via headers.
   - **Webhook** (`sendWebhookNotification`): fires `sale.pending` on order creation and `sale.paid` on capture. Payload is HMAC-SHA256 signed (`X-Meteorfy-Signature: sha256=...`). Secret defaults to env `WEBHOOK_SECRET` or `"meteorfy-secret"`.
   - **Meta Pixel browser-side** (in `PublicCheckout.tsx`): injects `fbevents.js` dynamically when `pixelId` is configured; fires `PageView` + `ViewContent` on load, `InitiateCheckout` on PayPal button click, `Purchase` on capture success (with shared `eventId` passed to CAPI for deduplication).
   - **UTMify** (`sendUtmifyOrder`): fires `waiting_payment` on create-order and `paid` on capture-order.
   - `GET /api/public/tracking-config/:slug` exposes only safe fields (pixelId, toggles) to the browser — access token never leaves the server.

6. **PayPal Currency Fallback**: If checkout currency is not in PayPal's supported list (e.g. MZN), server auto-falls back to USD using `totalUsdCents` for the PayPal charge amount.

## External Dependencies & Required Secrets

### Secrets currently set in Replit Secrets
- `FIREBASE_PROJECT_ID`: meteorfy1 ✅
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email ✅
- `NEON_DATABASE_URL`: Neon PostgreSQL connection string ✅
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: Web push notification keys ✅
- `DATABASE_URL`: Replit-managed Postgres (not used — app uses NEON_DATABASE_URL) ✅
- `RESEND_API_KEY`: Resend transactional email API key ✅

### Secrets that still need to be added
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key (needed for server-side auth token verification)
- `OPENROUTER_API_KEY`: OpenRouter API key (needed for the AI chat assistant feature)

### Optional secrets (configure when ready)
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`: PayPal (configured per-user via the app's Settings UI)
- `FACEBOOK_PIXEL_ID` / `FACEBOOK_ACCESS_TOKEN`: Meta/Facebook pixel tracking
- `UTMIFY_TOKEN`: UTMify analytics token
- `EMAIL_FROM`: Sender address for Resend emails (e.g. `Meteorfy <noreply@yourdomain.com>`). Requires a verified domain in Resend. Defaults to `onboarding@resend.dev` (test only).

### Email System (Resend)
- **Service file**: `server/email.ts` — Resend client + 4 HTML email templates
- **NOTE**: Resend Replit integration was dismissed by user; API key stored manually as `RESEND_API_KEY` secret.
- Triggered fire-and-forget (non-blocking) from `server/routes.ts` at 4 points:
  1. **PayPal capture** → buyer gets "Pagamento confirmado" + seller gets "Nova Venda"
  2. **Withdrawal requested** → seller gets "Pedido de saque recebido" (pending)
  3. **Withdrawal approved** (admin) → seller gets "Saque aprovado"
  4. **Withdrawal rejected** (admin) → seller gets "Saque recusado"
- Seller email address is resolved via `adminAuth.getUser(userId)` (Firebase Admin SDK)
- **Production**: Set `EMAIL_FROM` to a Resend-verified domain address to avoid deliverability issues

## Dev Startup
- Workflow: `Start application` runs `npm run dev`
- `npm run dev` → `node start-all.js` → spawns `tsx --watch server/index.ts` on port 5000
- Express on port 5000 serves both the API and the Vite frontend (via Vite middleware in dev mode)
- `start-all.js` uses an absolute path to resolve the tsx binary reliably
