# Meteorfy - Sales Platform

## Overview

Meteorfy is a full-stack sales and checkout platform built with React, Express, and PostgreSQL. It provides a dashboard for managing products, creating customizable checkout pages, and tracking sales with PayPal payment integration. The application follows a monorepo structure with shared types and validation schemas between frontend and backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with hot module replacement
- **UI Components**: Radix UI primitives wrapped with shadcn/ui styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Passport.js with local strategy, session-based auth using express-session
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Hashing**: bcryptjs

### Data Layer
- **Database**: PostgreSQL (Supabase/Neon) - configured via `DATABASE_URL` environment variable.
- **Migration Strategy**: The project uses `db:push` to synchronize the Drizzle schema directly with the connected PostgreSQL database.
- **Decision**: The user chose to use Supabase as the primary database while maintaining the project on the Replit Free tier.

### API Design
- **Route Definitions**: Centralized in `shared/routes.ts` with type-safe request/response schemas
- **Pattern**: RESTful API endpoints under `/api/*` prefix
- **Type Safety**: Shared Zod schemas ensure frontend-backend type consistency

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks for API calls
│   │   ├── pages/        # Route page components
│   │   └── lib/          # Utilities and query client
├── server/           # Express backend
│   ├── auth.ts       # Passport authentication setup
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   └── storage.ts    # Database operations interface
├── shared/           # Shared code between frontend/backend
│   ├── schema.ts     # Drizzle database schema
│   └── routes.ts     # API route definitions with Zod schemas
```

### Key Design Decisions

1. **Monorepo with Shared Types**: The `shared/` directory contains database schemas and API route definitions used by both frontend and backend, ensuring type safety across the stack.

2. **Storage Interface Pattern**: `server/storage.ts` implements an `IStorage` interface, abstracting database operations and making the storage layer testable and swappable.

3. **Session-Based Authentication**: Uses PostgreSQL-backed sessions for stateful auth, appropriate for this type of admin dashboard application.

4. **Dark Theme by Default**: The UI is designed with a dark color scheme (zinc/blue palette) optimized for the dashboard experience.

## External Dependencies

### Database
- **PostgreSQL**: Required database, connection via `DATABASE_URL` environment variable

### Payment Processing
- **PayPal Integration**: Settings table stores PayPal credentials (clientId, clientSecret, webhookId) with sandbox/production environment support

### Frontend Libraries
- **Recharts**: Dashboard sales visualization charts
- **date-fns**: Date formatting and manipulation
- **lucide-react**: Icon library

### Development Tools
- **Vite**: Development server with HMR and production builds
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database schema management

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `SESSION_SECRET`: Express session secret (defaults to "coldpay_secret" in development)
- `NODE_ENV`: Environment mode (development/production)