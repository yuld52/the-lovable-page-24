// ultra-stable PayPal SDK loader designed for dynamic locale switching.
// optimized to prevent E-01 connection errors and "Bootstrap" conflicts.

export type PayPalComponents = "buttons" | "card-fields" | string;

let activeConfigKey: string | null = null;
let currentPromise: Promise<any> | null = null;

function cleanupPayPalScripts() {
  const scripts = document.querySelectorAll('script[src*="paypal.com/sdk/js"]');
  scripts.forEach(s => {
    try { s.remove(); } catch (e) { /* ignore */ }
  });
}

export async function loadPayPalSdk(params: {
  clientId: string;
  currency: string;
  buyerCountry?: string;
  enableFunding?: string;
  components: PayPalComponents;
  environment?: "sandbox" | "production";
  locale?: string;
}) {
  const { clientId, currency, locale } = params;

  // Unique key for this specific configuration
  const configKey = `${clientId}-${currency}-${locale}`;

  // If we're already loading THIS exact config, reuse the promise
  if (currentPromise && activeConfigKey === configKey) {
    return currentPromise;
  }

  // If already loaded THIS config, return the existing object
  if (activeConfigKey === configKey && (window as any).paypal?.Buttons) {
    return { paypal: (window as any).paypal };
  }

  // Set the new config key
  activeConfigKey = configKey;

  currentPromise = (async () => {
    // We clean up scripts but we ARE GENTLE with window.paypal. 
    // Deleting it too fast can crash existing instances that are still cleaning up.
    cleanupPayPalScripts();

    // Instead of deleting, we only reload if the config is different.
    // If window.paypal already exists and it's the wrong locale, 
    // we have to reload, but we'll let the new script overwrite it.

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const qs = new URLSearchParams({
        "client-id": clientId,
        currency,
        components: "buttons",
      });

      if (locale) {
        qs.set("locale", locale);
      }

      script.src = `https://www.paypal.com/sdk/js?${qs.toString()}`;
      script.async = true;

      script.onload = () => {
        let attempts = 0;
        const check = setInterval(() => {
          // Check for a healthy PayPal instance
          if ((window as any).paypal && (window as any).paypal.Buttons) {
            clearInterval(check);
            resolve({ paypal: (window as any).paypal });
          } else if (attempts > 120) { // 6 seconds
            clearInterval(check);
            reject(new Error("PayPal Fail to Init"));
          }
          attempts++;
        }, 50);
      };

      script.onerror = (e) => {
        console.error("[PayPal SDK] Script error:", e);
        reject(new Error("PayPal Link Error"));
      };

      document.body.appendChild(script);
    });
  })();

  return currentPromise;
}
