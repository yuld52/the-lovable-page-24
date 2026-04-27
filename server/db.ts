// Firebase Firestore Migration Note:
// This file has been modified to skip PostgreSQL connection
// All database operations should now use Firebase Firestore

// Create a stub pool that throws errors for any database operations
// This allows the app to start without PostgreSQL
type PoolLike = {
  query: (sql: string, params?: any[]) => Promise<any>;
  on: (event: string, callback: Function) => void;
  end: () => Promise<void>;
};

function createFailingPool(message: string): PoolLike {
  const stub: any = {
    query: async () => {
      throw new Error(message);
    },
    on: () => {
      // no-op
    },
    end: async () => {
      // no-op
    },
  };
  return stub as PoolLike;
}

// Use Firebase Firestore instead of PostgreSQL
// The pool is now a stub that throws errors - all DB operations should migrate to Firestore
export const pool: PoolLike = createFailingPool("PostgreSQL disabled - use Firebase Firestore instead");

// For compatibility with existing code, create a stub db object
export const db: any = {
  select: () => ({
    from: () => ({
      where: () => [],
      orderBy: () => [],
    }),
  }),
  insert: (_table: any) => ({
    values: () => ({
      returning: () => [],
    }),
  }),
  update: (_table: any) => ({
    set: () => ({
      where: () => ({
        returning: () => [],
      }),
    }),
  }),
  delete: (_table: any) => ({
    where: () => ({
      returning: () => [],
    }),
  }),
};

export function ensurePool() {
  // No-op - PostgreSQL is disabled
  console.log("[DB] PostgreSQL disabled - using Firebase Firestore instead");
}

// Flag to check if PostgreSQL is enabled
export const isPostgresEnabled = false;
