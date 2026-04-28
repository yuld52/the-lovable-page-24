# Meteorfy AI Rules & Tech Stack

## Tech Stack Overview
*   **Frontend**: React 18 with TypeScript and Vite for a modern, type-safe development environment.
*   **Styling**: Tailwind CSS for utility-first design and shadcn/ui for accessible, high-quality UI components.
*   **Routing**: Wouter for lightweight, hook-based client-side navigation.
*   **State Management**: TanStack React Query for efficient server-state fetching, caching, and synchronization.
*   **Backend**: Express.js on Node.js providing a robust RESTful API layer.
*   **Database**: Firebase Firestore as the primary NoSQL database for products, checkouts, and sales.
*   **Authentication**: Firebase Auth for secure user management and session handling.
*   **File Storage**: Firebase Storage for hosting product images and digital delivery assets.
*   **Payments**: Direct PayPal API integration for order creation and payment capture.

## Library Usage Rules

### UI & Styling
*   **Components**: Always prioritize using shadcn/ui components found in `client/src/components/ui/`. Do not reinvent basic UI primitives.
*   **Icons**: Use `lucide-react` for all application icons to maintain visual consistency.
*   **Colors**: Follow the established dark theme palette (Zinc/Purple) defined in `tailwind.config.ts` and `client/src/index.css`.

### Data & API
*   **Data Fetching**: Use the custom hooks located in `client/src/hooks/` (e.g., `useProducts`, `useCheckouts`). These hooks wrap TanStack React Query; do not use `useEffect` for fetching data.
*   **API Calls**: Use the `apiRequest` utility in `client/src/lib/queryClient.ts` for all frontend-to-backend communication to ensure Firebase Auth tokens are correctly attached.
*   **Validation**: Use Zod schemas defined in `shared/schema.ts` for both frontend form validation and backend request parsing.

### Backend & Database
*   **Storage Layer**: All database operations must be implemented within `server/firestore-storage.ts`. Route handlers should call methods on the `storage` instance rather than interacting with Firestore directly.
*   **Authentication**: Use the `requireAuth` middleware in `server/middleware/auth.ts` to protect sensitive API routes.
*   **Environment**: Always use `process.env` for secrets and configuration, ensuring they are loaded correctly via the established patterns in `server/index.ts`.

### Payments & Tracking
*   **PayPal**: Use the `PayPalVisual` component for rendering payment buttons and the `paypal.ts` utility for server-side API interactions.
*   **Tracking**: Use the centralized tracking logic in `server/tracking.ts` for Meta Pixel and UTMfy events to ensure consistent data reporting.