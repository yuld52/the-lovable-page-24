import { QueryClient } from "@tanstack/react-query";
import { db } from "./db";
import type { User, Product, Checkout, Sale, Settings, Withdrawal } from "./db";

// Current session
let currentUser: User | null = null;

export function setCurrentUser(user: User | null) {
  currentUser = user;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

// Auth functions
export async function loginUser(email: string, password: string): Promise<User> {
  const user = db.users.getByEmail(email);
  if (!user || user.password !== password) {
    throw new Error('Credenciais inválidas');
  }
  currentUser = user;
  localStorage.setItem('meteorfy_session', user.id);
  return user;
}

export async function registerUser(email: string, password: string): Promise<User> {
  const existing = db.users.getByEmail(email);
  if (existing) {
    throw new Error('Este e-mail já está cadastrado');
  }
  const user = db.users.create({ email, password });
  currentUser = user;
  localStorage.setItem('meteorfy_session', user.id);
  return user;
}

export async function logoutUser(): Promise<void> {
  currentUser = null;
  localStorage.removeItem('meteorfy_session');
}

export async function restoreSession(): Promise<User | null> {
  const userId = localStorage.getItem('meteorfy_session');
  if (userId) {
    const user = db.users.getById(userId);
    if (user) {
      currentUser = user;
      return user;
    }
  }
  return null;
}

export async function checkEmailExists(email: string): Promise<boolean> {
  return !!db.users.getByEmail(email);
}

// API request wrapper - now uses localStorage directly
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // All data operations go through localStorage now
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => any =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }: { queryKey: readonly unknown[] }): Promise<any> => {
    if (!currentUser) {
      if (unauthorizedBehavior === "returnNull") return null;
      throw new Error('Não autenticado');
    }

    const path = queryKey.join('/');

    // Products
    if (path === 'api/products') {
      return db.products.getAll(currentUser.id);
    }
    if (path.startsWith('api/products/')) {
      const id = path.split('/').pop()!;
      if (path.endsWith('/approve')) {
        return db.products.approve(id);
      }
      if (path.endsWith('/reject')) {
        return db.products.reject(id);
      }
      return db.products.getById(id);
    }

    // Checkouts
    if (path === 'api/checkouts') {
      return db.checkouts.getAll(currentUser.id);
    }
    if (path.startsWith('api/checkouts/')) {
      const id = path.split('/').pop()!;
      return db.checkouts.getById(id);
    }

    // Sales
    if (path === 'api/sales') {
      return db.sales.getAll(currentUser.id);
    }

    // Settings
    if (path === 'api/settings') {
      return db.settings.get(currentUser.id) || { environment: 'sandbox' };
    }

    // Stats
    if (path.startsWith('api/stats')) {
      const params = new URLSearchParams(path.split('?')[1] || '');
      return db.getDashboardStats(
        currentUser.id,
        params.get('period') || undefined,
        params.get('productId') || undefined,
        params.get('startDate') || undefined,
        params.get('endDate') || undefined
      );
    }

    // Users (admin)
    if (path === 'api/users-v2') {
      if (currentUser.email !== 'yuldchissico11@gmail.com') {
        throw new Error('Acesso negado');
      }
      return db.users.getAll();
    }

    // Admin products
    if (path === 'api/admin/products') {
      if (currentUser.email !== 'yuldchissico11@gmail.com') {
        throw new Error('Acesso negado');
      }
      return db.products.getAll();
    }

    // Admin checkouts
    if (path === 'api/admin/checkouts') {
      if (currentUser.email !== 'yuldchissico11@gmail.com') {
        throw new Error('Acesso negado');
      }
      return db.checkouts.getAll();
    }

    // Admin withdrawals
    if (path === 'api/admin/withdrawals') {
      if (currentUser.email !== 'yuldchissico11@gmail.com') {
        throw new Error('Acesso negado');
      }
      return db.withdrawals.getAll();
    }

    // Withdrawals
    if (path === 'api/withdrawals') {
      return db.withdrawals.getAll(currentUser.id);
    }

    // PayPal public config
    if (path.startsWith('api/paypal/public-config')) {
      const params = new URLSearchParams(path.split('?')[1] || '');
      return db.getPaypalConfig(params.get('slug') || '');
    }

    return null;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});