import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";
import { getIdToken } from "firebase/auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const user = auth.currentUser;
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (user) {
    const idToken = await getIdToken(user);
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  // In Vercel, API routes are at the same domain
  const baseUrl = process.env.NODE_ENV === "production" 
    ? "" // Same domain in production
    : "http://localhost:3000"; // Local development;

  const res = await fetch(`${baseUrl}${url}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const user = auth.currentUser;
    const headers: Record<string, string> = {};
    
    if (user) {
      const idToken = await getIdToken(user);
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    const baseUrl = process.env.NODE_ENV === "production" 
      ? "" 
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}${queryKey.join("/")}`, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});