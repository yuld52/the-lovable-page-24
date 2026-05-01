// Minimal types shared between frontend
export type CheckoutLanguage = "pt" | "en" | "es" | "AUTO";

export type CheckoutCurrency =
  | "AUTO" | "AUD" | "BRL" | "CAD" | "CNY" | "CZK" | "DKK" | "EUR" | "HKD"
  | "HUF" | "ILS" | "JPY" | "MYR" | "MXN" | "TWD" | "NZD" | "NOK" | "PHP"
  | "PLN" | "GBP" | "SGD" | "SEK" | "CHF" | "THB" | "USD";

export type DashboardStats = {
  salesToday: number;
  revenuePaid: number;
  salesApproved: number;
  conversionRate: number;
  revenueTarget: number;
  revenueCurrent: number;
  chartData: { name: string; sales: number }[];
};

export type CreateCheckoutRequest = any;
export type UpdateCheckoutRequest = any;
export type UpdateSettingsRequest = any;