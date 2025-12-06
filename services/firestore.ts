
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Sanitizes an object for Firestore by removing undefined values.
 * Firestore throws "invalid-argument" errors when trying to write undefined values.
 * This function recursively processes objects and arrays to ensure clean data.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as T;
  }
  
  if (obj instanceof Date) {
    return obj as T;
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }
  
  return obj;
}

export function useFirestore<T extends { id: string }>(collectionName: string, initialData: T[] = []) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isDemo } = useAuth();

  // Determine the storage key based on the current user
  const storageKey = user ? `lifeos-${user.uid}-${collectionName}` : `lifeos-${collectionName}`;

  // Load from LocalStorage immediately on mount/change
  useEffect(() => {
      const loadCachedData = () => {
          try {
              const cached = localStorage.getItem(storageKey);
              if (cached) {
                  setData(JSON.parse(cached));
                  setLoading(false);
              } else {
                  setData(initialData);
              }
          } catch (e) {
              console.warn("Failed to load cached data", e);
          }
      };
      loadCachedData();
  }, [storageKey, collectionName]);

  // Sync with Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Explicit Demo Mode skips network entirely
    if (isDemo) {
        setLoading(false);
        return;
    }

    // Reference: users/{userId}/{collectionName}
    // This works even if user.uid is "user-alexander" (Simulated) provided Firestore Rules are open
    const collectionRef = collection(db, 'users', user.uid, collectionName);
    const q = query(collectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: T[] = [];
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });
      
      // Update state and cache
      setData(results);
      localStorage.setItem(storageKey, JSON.stringify(results));
      setLoading(false);
    }, (err) => {
      console.error(`Error fetching ${collectionName} for ${user.uid}:`, err);
      // Fallback to cache if permission denied or network error
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, collectionName, isDemo, storageKey]);

  // Helper to update local state and cache immediately (Optimistic UI)
  const updateLocal = (newData: T[]) => {
      setData(newData);
      localStorage.setItem(storageKey, JSON.stringify(newData));
  };

  const add = async (item: Omit<T, 'id'>) => {
    if (!user) return;

    // 1. Optimistic Update (Local)
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = { ...item, id: tempId } as T;
    const newData = [...data, optimisticItem];
    updateLocal(newData);

    // 2. Persist
    if (isDemo) return;

    try {
      const collectionRef = collection(db, 'users', user.uid, collectionName);
      // Sanitize the item to remove undefined values before sending to Firestore
      const sanitizedItem = sanitizeForFirestore(item);
      const docRef = await addDoc(collectionRef, {
        ...sanitizedItem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Replace temp ID with real ID in local state
      const finalData = newData.map(i => i.id === tempId ? { ...i, id: docRef.id } : i);
      updateLocal(finalData);

    } catch (err) {
      console.error("Error adding doc:", err);
      // We don't revert local data immediately to allow "Offline" feel
      // It will sync next time if persistence is enabled
    }
  };

  const update = async (id: string, updates: Partial<T>) => {
    if (!user) return;

    // 1. Optimistic Update
    const oldData = [...data];
    const newData = data.map(item => item.id === id ? { ...item, ...updates } : item);
    updateLocal(newData);

    if (isDemo) return;

    try {
      // Sanitize updates to remove undefined values before sending to Firestore
      const sanitizedUpdates = sanitizeForFirestore(updates);
      
      // Don't try to update temp IDs in Firestore - create new doc instead
      if (id.startsWith('temp-')) {
        const collectionRef = collection(db, 'users', user.uid, collectionName);
        const docRef = await addDoc(collectionRef, {
          ...sanitizedUpdates,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        // Update local state with real ID
        const finalData = newData.map(i => i.id === id ? { ...i, id: docRef.id } : i);
        updateLocal(finalData);
        return;
      }

      const docRef = doc(db, 'users', user.uid, collectionName, id);
      await updateDoc(docRef, {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Error updating doc:", err);
      // If document not found, create it instead
      if (err?.code === 'not-found') {
        try {
          const collectionRef = collection(db, 'users', user.uid, collectionName);
          const sanitizedUpdates = sanitizeForFirestore(updates);
          const docRef = await addDoc(collectionRef, {
            ...sanitizedUpdates,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          // Update local state with real ID
          const finalData = newData.map(i => i.id === id ? { ...i, id: docRef.id } : i);
          updateLocal(finalData);
        } catch (addErr) {
          console.error("Error creating doc after not-found:", addErr);
        }
      }
    }
  };

  const remove = async (id: string) => {
    if (!user) return;

    // 1. Optimistic Update
    const oldData = [...data];
    const newData = data.filter(item => item.id !== id);
    updateLocal(newData);

    if (isDemo) return;

    try {
      if (id.startsWith('temp-')) return;

      const docRef = doc(db, 'users', user.uid, collectionName, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error deleting doc:", err);
    }
  };

  return { data, loading, error, add, update, remove };
}
