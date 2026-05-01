// Browser-based database using localStorage
// Replaces Neon/PostgreSQL with local storage

export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Product {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  price: number; // in cents (USD)
  imageUrl: string | null;
  deliveryUrl: string | null;
  whatsappUrl: string | null;
  deliveryFiles: string[];
  noEmailDelivery: boolean;
  paymentMethods: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Checkout {
  id: string;
  ownerId: string;
  productId: string;
  name: string;
  slug: string;
  publicUrl: string | null;
  views: number;
  active: boolean;
  config: CheckoutConfig;
  createdAt: string;
}

export interface CheckoutConfig {
  environment?: string;
  timerMinutes: number;
  timerText: string;
  timerColor: string;
  heroTitle: string;
  heroBadgeText: string;
  heroImageUrl: string;
  benefitsList: { icon: string; title: string; subtitle: string }[];
  privacyText: string;
  safeText: string;
  deliveryText: string;
  approvedText: string;
  testimonials: {
    id: string;
    name: string;
    imageUrl: string;
    rating: number;
    text: string;
  }[];
  upsellProducts: string[];
  orderBumpProducts: string[];
  payButtonText: string;
  footerText: string;
  primaryColor: string;
  backgroundColor: string;
  highlightColor: string;
  textColor: string;
  showChangeCountry: boolean;
  showTimer: boolean;
  showPhone: boolean;
  showCpf: boolean;
  showSurname: boolean;
  showCnpj: boolean;
  showAddress: boolean;
  checkoutLanguage: string;
  checkoutCurrency: string;
}

export interface Sale {
  id: string;
  checkoutId: string | null;
  productId: string | null;
  userId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  customerEmail: string | null;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalCurrency: string | null;
  paypalAmountMinor: number | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  createdAt: string;
}

export interface Settings {
  userId: string;
  paypalClientId: string | null;
  paypalClientSecret: string | null;
  paypalWebhookId: string | null;
  facebookPixelId: string | null;
  facebookAccessToken: string | null;
  utmfyToken: string | null;
  salesNotifications: boolean;
  environment: string;
  metaEnabled: boolean;
  utmfyEnabled: boolean;
  trackTopFunnel: boolean;
  trackCheckout: boolean;
  trackPurchaseRefund: boolean;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  pixKey: string;
  pixKeyType: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
}

const DB_PREFIX = 'meteorfy_';

function getCollection<T>(name: string): T[] {
  try {
    const data = localStorage.getItem(DB_PREFIX + name);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCollection<T>(name: string, data: T[]): void {
  localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Seed default admin user if not exists
function seedAdminUser() {
  const users = getCollection<User>('users');
  const adminExists = users.find(u => u.email === 'yuldchissico11@gmail.com');
  if (!adminExists) {
    users.push({
      id: generateId(),
      email: 'yuldchissico11@gmail.com',
      password: 'admin123',
      createdAt: new Date().toISOString()
    });
    setCollection('users', users);
  }
}

// Initialize
seedAdminUser();

export const db = {
  // Users
  users: {
    getAll: (): User[] => getCollection<User>('users'),
    getById: (id: string): User | undefined => getCollection<User>('users').find(u => u.id === id),
    getByEmail: (email: string): User | undefined => getCollection<User>('users').find(u => u.email.toLowerCase() === email.toLowerCase()),
    create: (user: Omit<User, 'id' | 'createdAt'>): User => {
      const users = getCollection<User>('users');
      const newUser: User = { ...user, id: generateId(), createdAt: new Date().toISOString() };
      users.push(newUser);
      setCollection('users', users);
      return newUser;
    },
    delete: (id: string): void => {
      const users = getCollection<User>('users').filter(u => u.id !== id);
      setCollection('users', users);
    },
    update: (id: string, updates: Partial<User>): User | undefined => {
      const users = getCollection<User>('users');
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return undefined;
      users[idx] = { ...users[idx], ...updates };
      setCollection('users', users);
      return users[idx];
    }
  },

  // Products
  products: {
    getAll: (ownerId?: string, status?: string): Product[] => {
      let items = getCollection<Product>('products');
      if (ownerId) items = items.filter(p => p.ownerId === ownerId);
      if (status) items = items.filter(p => p.status === status);
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    getById: (id: string): Product | undefined => getCollection<Product>('products').find(p => p.id === id),
    create: (product: Omit<Product, 'id' | 'createdAt'>): Product => {
      const products = getCollection<Product>('products');
      const newProduct: Product = { ...product, id: generateId(), createdAt: new Date().toISOString() };
      products.push(newProduct);
      setCollection('products', products);
      return newProduct;
    },
    update: (id: string, updates: Partial<Product>): Product | undefined => {
      const products = getCollection<Product>('products');
      const idx = products.findIndex(p => p.id === id);
      if (idx === -1) return undefined;
      products[idx] = { ...products[idx], ...updates };
      setCollection('products', products);
      return products[idx];
    },
    delete: (id: string): void => {
      const products = getCollection<Product>('products').filter(p => p.id !== id);
      setCollection('products', products);
    },
    approve: (id: string): Product | undefined => db.products.update(id, { status: 'approved' }),
    reject: (id: string): Product | undefined => db.products.update(id, { status: 'rejected' })
  },

  // Checkouts
  checkouts: {
    getAll: (ownerId?: string): Checkout[] => {
      let items = getCollection<Checkout>('checkouts');
      if (ownerId) items = items.filter(c => c.ownerId === ownerId);
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    getById: (id: string): Checkout | undefined => getCollection<Checkout>('checkouts').find(c => c.id === id),
    getBySlug: (slug: string): Checkout | undefined => getCollection<Checkout>('checkouts').find(c => c.slug === slug),
    getByProductId: (productId: string): Checkout[] => getCollection<Checkout>('checkouts').filter(c => c.productId === productId),
    create: (checkout: Omit<Checkout, 'id' | 'createdAt'>): Checkout => {
      const checkouts = getCollection<Checkout>('checkouts');
      const newCheckout: Checkout = { ...checkout, id: generateId(), createdAt: new Date().toISOString() };
      checkouts.push(newCheckout);
      setCollection('checkouts', checkouts);
      return newCheckout;
    },
    update: (id: string, updates: Partial<Checkout>): Checkout | undefined => {
      const checkouts = getCollection<Checkout>('checkouts');
      const idx = checkouts.findIndex(c => c.id === id);
      if (idx === -1) return undefined;
      checkouts[idx] = { ...checkouts[idx], ...updates };
      setCollection('checkouts', checkouts);
      return checkouts[idx];
    },
    delete: (id: string): void => {
      const checkouts = getCollection<Checkout>('checkouts').filter(c => c.id !== id);
      setCollection('checkouts', checkouts);
    },
    incrementViews: (id: string): void => {
      const checkouts = getCollection<Checkout>('checkouts');
      const idx = checkouts.findIndex(c => c.id === id);
      if (idx !== -1) {
        checkouts[idx].views = (checkouts[idx].views || 0) + 1;
        setCollection('checkouts', checkouts);
      }
    }
  },

  // Sales
  sales: {
    getAll: (userId?: string): Sale[] => {
      let items = getCollection<Sale>('sales');
      if (userId) items = items.filter(s => s.userId === userId);
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    getById: (id: string): Sale | undefined => getCollection<Sale>('sales').find(s => s.id === id),
    getByPaypalOrderId: (orderId: string): Sale | undefined => getCollection<Sale>('sales').find(s => s.paypalOrderId === orderId),
    create: (sale: Omit<Sale, 'id' | 'createdAt'>): Sale => {
      const sales = getCollection<Sale>('sales');
      const newSale: Sale = { ...sale, id: generateId(), createdAt: new Date().toISOString() };
      sales.push(newSale);
      setCollection('sales', sales);
      return newSale;
    },
    updateStatus: (id: string, status: string): void => {
      const sales = getCollection<Sale>('sales');
      const idx = sales.findIndex(s => s.id === id);
      if (idx !== -1) {
        sales[idx].status = status as Sale['status'];
        setCollection('sales', sales);
      }
    }
  },

  // Settings
  settings: {
    get: (userId: string): Settings | undefined => getCollection<Settings>('settings').find(s => s.userId === userId),
    getAny: (): Settings | undefined => getCollection<Settings>('settings')[0],
    upsert: (userId: string, updates: Partial<Settings>): Settings => {
      const settings = getCollection<Settings>('settings');
      const idx = settings.findIndex(s => s.userId === userId);
      if (idx === -1) {
        const newSettings: Settings = {
          userId,
          paypalClientId: null,
          paypalClientSecret: null,
          paypalWebhookId: null,
          facebookPixelId: null,
          facebookAccessToken: null,
          utmfyToken: null,
          salesNotifications: false,
          environment: 'sandbox',
          metaEnabled: true,
          utmfyEnabled: true,
          trackTopFunnel: true,
          trackCheckout: true,
          trackPurchaseRefund: true,
          ...updates
        };
        settings.push(newSettings);
        setCollection('settings', settings);
        return newSettings;
      } else {
        settings[idx] = { ...settings[idx], ...updates };
        setCollection('settings', settings);
        return settings[idx];
      }
    }
  },

  // Withdrawals
  withdrawals: {
    getAll: (userId?: string): Withdrawal[] => {
      let items = getCollection<Withdrawal>('withdrawals');
      if (userId) items = items.filter(w => w.userId === userId);
      return items.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    },
    getById: (id: string): Withdrawal | undefined => getCollection<Withdrawal>('withdrawals').find(w => w.id === id),
    create: (withdrawal: Omit<Withdrawal, 'id' | 'requestedAt'>): Withdrawal => {
      const withdrawals = getCollection<Withdrawal>('withdrawals');
      const newWithdrawal: Withdrawal = { ...withdrawal, id: generateId(), requestedAt: new Date().toISOString() };
      withdrawals.push(newWithdrawal);
      setCollection('withdrawals', withdrawals);
      return newWithdrawal;
    },
    updateStatus: (id: string, status: string, adminNote?: string): Withdrawal | undefined => {
      const withdrawals = getCollection<Withdrawal>('withdrawals');
      const idx = withdrawals.findIndex(w => w.id === id);
      if (idx === -1) return undefined;
      withdrawals[idx].status = status as Withdrawal['status'];
      withdrawals[idx].processedAt = new Date().toISOString();
      if (adminNote) withdrawals[idx].adminNote = adminNote;
      setCollection('withdrawals', withdrawals);
      return withdrawals[idx];
    }
  },

  // Dashboard stats
  getDashboardStats: (userId: string, period?: string, productId?: string, startDateStr?: string, endDateStr?: string) => {
    const sales = db.sales.getAll(userId).filter(s => s.status === 'paid');
    const checkouts = db.checkouts.getAll(userId);

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    if (period === "custom" && startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else if (period === "1") {
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === "7") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "90") {
      startDate.setDate(startDate.getDate() - 90);
    } else if (period === "30" || !period) {
      startDate.setDate(startDate.getDate() - 30);
    }

    let filteredSales = sales.filter(s => {
      const d = new Date(s.createdAt);
      return d >= startDate && d <= endDate;
    });

    if (productId && productId !== "all") {
      filteredSales = filteredSales.filter(s => s.productId === productId);
    }

    let totalViews = 0;
    checkouts.forEach(c => {
      if (productId && productId !== "all") {
        if (c.productId === productId) totalViews += (c.views || 0);
      } else {
        totalViews += (c.views || 0);
      }
    });

    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const conversionRate = totalViews > 0 ? (filteredSales.length / totalViews) * 100 : 0;

    const chartData: { name: string; sales: number }[] = [];
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = diffDays; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const daySales = filteredSales.filter(s => {
        const sd = new Date(s.createdAt);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      const dayTotal = daySales.reduce((sum, s) => sum + (s.amount || 0), 0);
      chartData.push({ name: key, sales: dayTotal / 100 });
    }

    return {
      salesToday: totalRevenue / 100,
      revenuePaid: totalRevenue / 100,
      salesApproved: filteredSales.length,
      conversionRate,
      revenueTarget: 10000,
      revenueCurrent: totalRevenue / 100,
      chartData,
    };
  },

  // PayPal config for checkout
  getPaypalConfig: (slug: string) => {
    const checkout = db.checkouts.getBySlug(slug);
    if (!checkout) return null;
    const settings = checkout.ownerId ? db.settings.get(checkout.ownerId) : null;
    const fallback = db.settings.getAny();
    return {
      clientId: settings?.paypalClientId || fallback?.paypalClientId || null,
      environment: settings?.environment || fallback?.environment || 'sandbox',
    };
  },

  // Clear all data (for debugging)
  clearAll: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(DB_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    seedAdminUser();
  }
};