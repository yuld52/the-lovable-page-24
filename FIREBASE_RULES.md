# Firebase Security Rules Configuration

## Firestore Rules

Copy these rules to your Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Settings - users can only read/write their own settings
    match /settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products - users can only read/write their own products
    match /products/{productId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      
      // Allow public read for active products (for checkout pages)
      allow read: if resource.data.active == true;
    }
    
    // Checkouts - users can only read/write their own checkouts
    match /checkouts/{checkoutId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow write: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      
      // Allow public read by slug (for checkout pages)
      allow read: if true;
    }
    
    // Sales - users can only read/write their own sales
    match /sales/{saleId} {
      allow read, write: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
  }
}
```

## Storage Rules

Copy these rules to your Firebase Console > Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only upload to their own folder
    match /uploads/{userId}/{allPaths=**} {
      allow read: if true; // Public read for product images
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Delivery files - users can only upload to their own folder
    match /deliveries/{userId}/{allPaths=**} {
      allow read: if true; // Public read for delivery files
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## How to Apply These Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **meteorfy-11bff**
3. For Firestore Rules:
   - Navigate to **Firestore Database** > **Rules**
   - Click **Edit rules**
   - Paste the Firestore rules above
   - Click **Publish**

4. For Storage Rules:
   - Navigate to **Storage** > **Rules**
   - Click **Edit rules**
   - Paste the Storage rules above
   - Click **Publish**

## Enable Authentication Providers

1. Go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

## Create Firestore Database

If not already created:
1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a location close to your users
5. Click **Enable**

## Create Storage Bucket

If not already created:
1. Go to **Storage**
2. Click **Get started**
3. Choose **Start in production mode**
4. Select a location close to your users
5. Click **Done**
