import { Pool } from "pg";
import ws from "ws";

// Neon serverless connection - no pooling needed
const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";

if (!connectionString) {
  console.error("DATABASE_URL or NEON_DATABASE_URL is required");
}

// For Neon serverless, we create a new connection for each request
// No connection pooling in serverless
export async function getDbClient() {
  if (!connectionString) {
    throw new Error("Database URL not configured");
  }

  const client = new Pool({ 
    connectionString,
    max: 1, // Serverless: only need 1 connection per invocation
    idleTimeoutMillis: 0,
  });

  return client;
}

// Helper to convert snake_case to camelCase
export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v));
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to convert camelCase to snake_case
export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  }
  if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}