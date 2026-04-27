import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsRequest } from "@shared/schema";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type SettingsRow = {
  id: string;
  user_id: string;
  paypal_client_id: string | null;
  paypal_client_secret: string | null;
  paypal_webhook_id: string | null;
  facebook_pixel_id: string | null;
  facebook_access_token: string | null;
  utmfy_token: string | null;
  environment: string;
  // tracking toggles (nullable for backward compatibility)
  meta_enabled?: boolean | null;
  utmfy_enabled?: boolean | null;
  track_top_funnel?: boolean | null;
  track_checkout?: boolean | null;
  track_purchase_refund?: boolean | null;
  sales_notifications?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type SettingsModel = {
  paypalClientId?: string | null;
  paypalClientSecret?: string | null;
  paypalWebhookId?: string | null;
  facebookPixelId?: string | null;
  facebookAccessToken?: string | null;
  utmfyToken?: string | null;
  environment?: string;
  // tracking toggles
  metaEnabled?: boolean;
  utmfyEnabled?: boolean;
  trackTopFunnel?: boolean;
  trackCheckout?: boolean;
  trackPurchaseRefund?: boolean;
  salesNotifications?: boolean;
};

function mapRowToModel(row: SettingsRow): SettingsModel {
  return {
    paypalClientId: row.paypal_client_id,
    paypalClientSecret: row.paypal_client_secret,
    paypalWebhookId: row.paypal_webhook_id,
    facebookPixelId: row.facebook_pixel_id,
    facebookAccessToken: row.facebook_access_token,
    utmfyToken: row.utmfy_token,
    environment: row.environment,
    metaEnabled: row.meta_enabled ?? true,
    utmfyEnabled: row.utmfy_enabled ?? true,
    trackTopFunnel: row.track_top_funnel ?? true,
    trackCheckout: row.track_checkout ?? true,
    trackPurchaseRefund: row.track_purchase_refund ?? true,
    salesNotifications: row.sales_notifications ?? false,
  };
}

function cleanString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function useSettings() {
  return useQuery({
    queryKey: ["cloud", "settings"],
    queryFn: async () => {
      const user = auth.currentUser;
      if (!user) return null;

      const docRef = doc(db, "settings", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { environment: "sandbox", salesNotifications: false } as SettingsModel;
      }
      
      const data = docSnap.data();
      return mapRowToModel(data as unknown as SettingsRow);
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UpdateSettingsRequest) => {
      const user = auth.currentUser;
      if (!user) throw new Error("Não autenticado");

      // Read current to preserve secrets when user leaves field blank.
      const docRef = doc(db, "settings", user.uid);
      const docSnap = await getDoc(docRef);
      const existing = docSnap.exists() ? docSnap.data() as unknown as SettingsRow : null;

      const u = updates as any;

      // Helper to check if a field was explicitly set to empty string (meaning user wants to clear it)
      const isEmptyString = (v: unknown) => typeof v === "string" && v.trim() === "";

      const basePayload: any = {
        user_id: user.uid,
        paypal_client_id: isEmptyString(u.paypalClientId ?? u.paypal_client_id)
          ? null
          : (cleanString(u.paypalClientId ?? u.paypal_client_id) ?? existing?.paypal_client_id ?? null),
        paypal_client_secret: isEmptyString(u.paypalClientSecret ?? u.paypal_client_secret)
          ? null
          : (cleanString(u.paypalClientSecret ?? u.paypal_client_secret) ?? existing?.paypal_client_secret ?? null),
        paypal_webhook_id: isEmptyString(u.paypalWebhookId ?? u.paypal_webhook_id)
          ? null
          : (cleanString(u.paypalWebhookId ?? u.paypal_webhook_id) ?? existing?.paypal_webhook_id ?? null),
        facebook_pixel_id: isEmptyString(u.facebookPixelId ?? u.facebook_pixel_id)
          ? null
          : (cleanString(u.facebookPixelId ?? u.facebook_pixel_id) ?? existing?.facebook_pixel_id ?? null),
        utmfy_token: isEmptyString(u.utmfyToken ?? u.utmfy_token)
          ? null
          : (cleanString(u.utmfyToken ?? u.utmfy_token) ?? existing?.utmfy_token ?? null),
        environment: cleanString(u.environment) ?? existing?.environment ?? "sandbox",
      };

      console.log("[Settings] Payload final para salvar:", basePayload);

      const extendedPayload: any = {
        ...basePayload,
        facebook_access_token: isEmptyString(u.facebookAccessToken ?? u.facebook_access_token)
          ? null
          : (cleanString(u.facebookAccessToken ?? u.facebook_access_token) ?? (existing as any)?.facebook_access_token ?? null),

        // booleans: if undefined, preserve existing; if provided, coerce to boolean
        meta_enabled:
          (u.metaEnabled ?? u.meta_enabled) != null
            ? Boolean(u.metaEnabled ?? u.meta_enabled)
            : ((existing as any)?.meta_enabled ?? true),
        utmfy_enabled:
          (u.utmfyEnabled ?? u.utmfy_enabled) != null
            ? Boolean(u.utmfyEnabled ?? u.utmfy_enabled)
            : ((existing as any)?.utmfy_enabled ?? true),
        track_top_funnel:
          (u.trackTopFunnel ?? u.track_top_funnel) != null
            ? Boolean(u.trackTopFunnel ?? u.track_top_funnel)
            : ((existing as any)?.track_top_funnel ?? true),
        track_checkout:
          (u.trackCheckout ?? u.track_checkout) != null
            ? Boolean(u.trackCheckout ?? u.track_checkout)
            : ((existing as any)?.track_checkout ?? true),
        track_purchase_refund:
          (u.trackPurchaseRefund ?? u.track_purchase_refund) != null
            ? Boolean(u.trackPurchaseRefund ?? u.track_purchase_refund)
            : ((existing as any)?.track_purchase_refund ?? true),
        sales_notifications:
          (u.salesNotifications ?? u.sales_notifications) != null
            ? Boolean(u.salesNotifications ?? u.sales_notifications)
            : ((existing as any)?.sales_notifications ?? false),
        updated_at: new Date().toISOString(),
      };

      // Use setDoc with merge to create or update
      await setDoc(docRef, extendedPayload, { merge: true });

      // No localStorage sticky logic - Firestore is the single source of truth

      // Fetch the updated document
      const updatedSnap = await getDoc(docRef);
      if (updatedSnap.exists()) {
        return mapRowToModel(updatedSnap.data() as unknown as SettingsRow);
      }
      
      return mapRowToModel(extendedPayload as unknown as SettingsRow);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cloud", "settings"] }),
  });
}
