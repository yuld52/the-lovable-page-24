# Environment Variables Setup Guide

## Overview

Your Meteorfy application requires several environment variables to function properly. If credentials are missing, the app will log warnings showing exactly what's missing.

## Critical Variables (Required for Core Features)

### 1. Database Connection

**Why:** Required for storing users, products, sales data, and all persistent information.

**Variables needed:**
- `NEON_DATABASE_URL` (PostgreSQL from Neon)
- OR `DATABASE_URL` (any PostgreSQL database)

**How to get:**
1. Create a Neon PostgreSQL database at https://neon.tech
2. Get your connection string from the Neon dashboard
3. Add to Vercel: Go to Settings → Vars, add `NEON_DATABASE_URL`

**Example format:** `postgresql://user:password@host/database?sslmode=require`

---

### 2. Firebase Authentication & Firestore

**Why:** Required for user authentication, authorization, and data management.

**Variables needed:**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

**How to get:**
1. Go to https://console.firebase.google.com
2. Create a new project or select existing one
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Extract these values from the JSON:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

**Add to Vercel:** Settings → Vars, add each variable

⚠️ **Important:** The private key contains newlines. Make sure to paste it exactly as provided, including `\n` sequences.

---

## Optional Variables (Nice to Have)

### 3. Email Service (Resend)

**Why:** Sends order confirmations, withdrawal updates, and product approval emails.

**Variables needed:**
- `RESEND_API_KEY`
- `EMAIL_FROM` (optional, defaults to `Meteorfy <onboarding@resend.dev>`)

**How to get:**
1. Sign up at https://resend.com
2. Go to API Keys section
3. Copy your API key
4. Add `RESEND_API_KEY` to Vercel Vars

**Without this:** Emails won't be sent, but the app will still work.

---

### 4. AI Chat Support (OpenRouter)

**Why:** Powers the intelligent support chatbot.

**Variables needed:**
- `OPENROUTER_API_KEY`

**How to get:**
1. Sign up at https://openrouter.ai
2. Go to Keys section
3. Create an API key
4. Add `OPENROUTER_API_KEY` to Vercel Vars

**Without this:** Chat feature will show an error, but the rest of the app works.

---

## How to Add Variables in Vercel

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** (top navigation)
4. Click **Vars** in the left sidebar
5. Click **Add New**
6. Enter the variable name (e.g., `NEON_DATABASE_URL`)
7. Enter the value (e.g., your database connection string)
8. Click **Save**
9. Redeploy your application (or it will auto-redeploy)

---

## Checking What's Missing

When you run your app locally or on Vercel, it will log a detailed diagnostic report:

```
============================================================
ENVIRONMENT DIAGNOSTIC REPORT
============================================================

✗ MISSING (CRITICAL) | Database
✓ CONFIGURED | Firebase
⚠ MISSING (OPTIONAL) | Email Service
...
```

- ✗ = Missing (and marked as critical or optional)
- ✓ = Configured
- ⚠ = Missing but optional

---

## Troubleshooting

### "NEON_DATABASE_URL is required"
→ Add your PostgreSQL connection string to Vercel Vars

### "Firebase credentials missing"
→ Check that `FIREBASE_PRIVATE_KEY` and `FIREBASE_CLIENT_EMAIL` are both set
→ Make sure the private key includes `\n` characters exactly as provided

### "RESEND_API_KEY not configured - emails will not be sent"
→ This is optional. Add it if you want to send emails.

### "OPENROUTER_API_KEY not configured - chat will not work"
→ This is optional. Add it if you want the chat feature.

### Port 5000 already in use
→ Kill existing processes: `killall -9 node tsx npm`
→ Then restart your dev server

---

## Development vs Production

- **Development:** Run `npm run dev` locally. Variables from Vercel are available automatically.
- **Production:** Deploy to Vercel. Make sure all critical variables are set before deploying.

---

## Security Notes

- **Never commit `.env` files to GitHub**
- **Never share API keys or private keys**
- **Use Vercel Vars for all sensitive data**
- **Firebase private key is very sensitive — treat it like a password**

---

## Still Having Issues?

If variables are set but the app still says they're missing:

1. **Restart the dev server** — kill existing processes and run `npm run dev` again
2. **Redeploy on Vercel** — go to Dashboard → Deployments → Redeploy
3. **Check variable names** — make sure the spelling is exactly right (case-sensitive)
4. **Check values** — make sure you didn't accidentally include extra spaces or quotes

---

Good luck! Your Meteorfy platform should be fully operational once these variables are configured.
