/**
 * Environment Variable Diagnostic Tool
 * Run this to debug missing credentials
 */

export function diagnoseEnvironment() {
  console.log("\n" + "=".repeat(60));
  console.log("ENVIRONMENT DIAGNOSTIC REPORT");
  console.log("=".repeat(60) + "\n");

  const checks = [
    {
      name: "Database",
      vars: ["NEON_DATABASE_URL", "DATABASE_URL"],
      critical: true,
      description: "Required for data persistence"
    },
    {
      name: "Firebase",
      vars: ["FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL"],
      critical: true,
      description: "Required for authentication and Firestore"
    },
    {
      name: "Email Service (Resend)",
      vars: ["RESEND_API_KEY", "EMAIL_FROM"],
      critical: false,
      description: "Required to send confirmation emails"
    },
    {
      name: "AI Chat (OpenRouter)",
      vars: ["OPENROUTER_API_KEY"],
      critical: false,
      description: "Required for chat support feature"
    },
    {
      name: "Push Notifications",
      vars: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
      critical: false,
      description: "Required for real-time sales notifications"
    },
    {
      name: "Payment Processing",
      vars: ["STRIPE_SECRET_KEY", "PAYPAL_CLIENT_ID"],
      critical: false,
      description: "Required for payment processing"
    },
  ];

  let allGood = true;

  checks.forEach((check) => {
    const hasAll = check.vars.every(v => process.env[v]);
    const hasSome = check.vars.some(v => process.env[v]);
    
    let status = "✓ CONFIGURED";
    if (!hasSome) {
      status = check.critical ? "✗ MISSING (CRITICAL)" : "⚠ MISSING (OPTIONAL)";
      allGood = false;
    } else if (!hasAll) {
      status = "⚠ INCOMPLETE";
      allGood = false;
    }

    console.log(`${status} | ${check.name}`);
    console.log(`  Description: ${check.description}`);
    console.log(`  Required vars:`);
    
    check.vars.forEach(varName => {
      const hasVar = !!process.env[varName];
      const symbol = hasVar ? "✓" : "✗";
      console.log(`    ${symbol} ${varName}`);
    });
    console.log();
  });

  console.log("=".repeat(60));
  if (allGood) {
    console.log("✓ All critical environment variables are configured!");
  } else {
    console.log("⚠ Some environment variables are missing or incomplete.");
    console.log("\nTo fix this:");
    console.log("1. Go to your Vercel project dashboard");
    console.log("2. Navigate to Settings → Vars");
    console.log("3. Add the missing environment variables");
    console.log("4. Redeploy your application");
  }
  console.log("=".repeat(60) + "\n");

  return allGood;
}

// Export a summary function for runtime checks
export function getEnvStatus() {
  return {
    hasDatabase: !!(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL),
    hasFirebase: !!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
    hasEmail: !!process.env.RESEND_API_KEY,
    hasChat: !!process.env.OPENROUTER_API_KEY,
  };
}
