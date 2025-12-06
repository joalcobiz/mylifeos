# LIFEOS Firebase Architecture Guide

## Overview

LIFEOS uses **Firebase** as its backend infrastructure, providing:
- **Firebase Authentication** - Email/password sign-in with role-based access
- **Cloud Firestore** - NoSQL document database with real-time sync
- **Firebase Storage** - File/image storage for attachments
- **Offline Persistence** - Local IndexedDB cache for offline support

---

## Data Architecture

### User-Scoped Data Model

All user data is stored under a **per-user namespace** to ensure complete data isolation:

```
Firestore Database
├── users/
│   └── {userId}/
│       ├── projects/        # Project items
│       ├── financial/       # Income & expenses
│       ├── journal/         # Journal entries
│       ├── places/          # Places & events
│       ├── groceries/       # Grocery items
│       ├── loans/           # Money flows (debts/loans)
│       ├── itineraries/     # Trip planners
│       ├── purchases/       # Shopping lists
│       ├── documents/       # Document storage
│       ├── habits/          # Habit tracking
│       ├── goals/           # Goal tracking
│       ├── templates/       # Collection templates
│       ├── calendar/        # Calendar events
│       └── settings/        # User preferences
├── userProfiles/
│   └── {userId}/            # User profile & role info
├── publicItineraries/
│   └── {shareToken}/        # Publicly shared trip links
└── settings/                # Global app settings (admin only)
```

### Why This Structure?

1. **Data Isolation** - Each user can only access their own data under `users/{userId}/`
2. **Simple Security Rules** - One rule covers all collections: "user can access their own data"
3. **Scalability** - Firestore handles millions of documents per collection efficiently
4. **Backup Friendly** - Easy to export/delete all data for a specific user

---

## Authentication System

### Firebase Authentication

LIFEOS uses Firebase Authentication with email/password:

```typescript
// Sign in
signInWithEmailAndPassword(auth, email, password)

// Sign up
createUserWithEmailAndPassword(auth, email, password)

// Password reset
sendPasswordResetEmail(auth, email)
```

### User Roles

Roles are stored in the `userProfiles` collection:

| Role | Permissions |
|------|-------------|
| **User** | Read/write own data only |
| **Admin** | Read any user's data, write own data |
| **SystemAdmin** | Full access + Firebase admin panel + delete users |

```typescript
// User profile structure
{
  uid: string,
  email: string,
  displayName: string,
  role: 'User' | 'Admin',
  isSystemAdmin: boolean,  // Super admin flag
  createdAt: Timestamp
}
```

### First User Becomes Admin

The first user to sign up automatically becomes Admin + SystemAdmin.

---

## Security Rules

Located in `firestore.rules`:

### Core Rules

```javascript
// User data - users can only access their own data
match /users/{userId}/{collection}/{document=**} {
  allow read, write: if request.auth.uid == userId;
  allow read: if isAdmin();  // Admins can read all
}

// User profiles
match /userProfiles/{userId} {
  allow read: if isOwner(userId) || isAdmin();
  allow create: if request.auth.uid == userId;
  allow update: if isOwner(userId) || isSystemAdmin();
  allow delete: if isSystemAdmin() && userId != request.auth.uid;
}

// Public itineraries (for sharing trips)
match /publicItineraries/{shareToken} {
  allow read: if resource.data.isPublic == true;
  allow create, update, delete: if resource.data.owner == request.auth.uid;
}
```

### Security Helpers

```javascript
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function isAdmin() {
  return get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.role == 'Admin';
}

function isSystemAdmin() {
  return get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.isSystemAdmin == true;
}
```

---

## Data Persistence & Caching

### Three-Layer Cache System

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: React State (useFirestore hook)                       │
│  - Immediate UI updates (optimistic)                            │
│  - Data lives in component memory                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Layer 2: LocalStorage Cache                                     │
│  - Key: lifeos-{userId}-{collection}                            │
│  - Persists across page refreshes                               │
│  - Immediate load on app start                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Layer 3: Firestore Persistent Cache (IndexedDB)                │
│  - Built into Firebase SDK                                       │
│  - Handles offline/online sync                                   │
│  - Real-time listeners auto-update UI                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Layer 4: Cloud Firestore (Google Cloud)                        │
│  - Source of truth                                               │
│  - Real-time sync across devices                                 │
│  - Automatic backups                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Optimistic Updates

The `useFirestore` hook performs optimistic updates:

1. **Add/Update/Delete** - Immediately updates local state & cache
2. **Persist to Firestore** - Writes to cloud in background
3. **Sync confirmation** - Real-time listener confirms success
4. **Rollback on error** - If write fails, data reverts

```typescript
// Example: Adding a new item
const add = async (item) => {
  // 1. Optimistic: Add to local state immediately
  const tempId = `temp-${Date.now()}`;
  updateLocal([...data, { ...item, id: tempId }]);
  
  // 2. Write to Firestore
  const docRef = await addDoc(collectionRef, item);
  
  // 3. Replace temp ID with real ID
  updateLocal(data.map(i => i.id === tempId ? { ...i, id: docRef.id } : i));
};
```

---

## Common Issues & Solutions

### Issue: Data Disappears After Entry

**Cause:** Firestore rejects documents containing `undefined` values.

**Solution:** Sanitize all data before writing:

```typescript
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
}
```

### Issue: Cache Persistence Conflicts

**Cause:** Multiple tabs fighting for IndexedDB lock.

**Solution:** Use `persistentLocalCache` with multi-tab support or accept fallback to memory cache.

### Issue: Permission Denied Errors

**Causes:**
1. User not authenticated
2. Trying to access another user's data
3. Security rules not deployed

**Solution:** Check `firestore.rules` and redeploy via Firebase Console.

---

## File Structure

| File | Purpose |
|------|---------|
| `services/firebase.ts` | Firebase initialization & exports |
| `services/firestore.ts` | useFirestore hook for CRUD operations |
| `contexts/AuthContext.tsx` | Authentication state & user management |
| `firestore.rules` | Firestore security rules |

---

## Environment Variables

Required in `.env` or Replit Secrets:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain (project.firebaseapp.com) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket URL |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `GOOGLE_MAPS_API_KEY` | Google Maps/Places API key |

---

## Deployment Checklist

1. [ ] Deploy security rules: `firebase deploy --only firestore:rules`
2. [ ] Verify environment variables are set
3. [ ] Test authentication flow (sign up, sign in, reset)
4. [ ] Confirm first user gets SystemAdmin role
5. [ ] Test data isolation between users
6. [ ] Verify offline mode works
7. [ ] Check public trip sharing functionality

---

## For Developers

### Adding a New Collection

1. Add type definition in `types.ts`
2. Use the `useFirestore<YourType>('collectionName')` hook
3. No schema changes needed - Firestore is schemaless
4. Security rules automatically apply under `users/{userId}/`

### Testing Locally

The app includes a "Demo Mode" that bypasses Firestore:
- Data stored in localStorage only
- No cloud sync
- Useful for development without Firebase credentials

### Debugging Data Issues

1. Check browser console for Firebase errors
2. Open DevTools > Application > IndexedDB to inspect cache
3. Check Network tab for Firestore requests
4. Use Settings > Firebase > Collections to inspect raw documents

---

*Last updated: December 2024*
