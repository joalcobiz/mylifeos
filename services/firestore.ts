
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  setDoc,
  serverTimestamp,
  getDocs,
  writeBatch
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
      
      console.log(`[Firestore] ${collectionName}: received ${results.length} docs, fromCache=${snapshot.metadata.fromCache}`);
      
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
      // If document not found, create it using setDoc at the same path
      if (err?.code === 'not-found') {
        console.log("Document not found, creating with setDoc for collection:", collectionName, "id:", id);
        try {
          const sanitizedUpdates = sanitizeForFirestore(updates);
          const docRef = doc(db, 'users', user.uid, collectionName, id);
          await setDoc(docRef, {
            ...sanitizedUpdates,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log("Successfully created doc with setDoc, ID:", id);
        } catch (setErr) {
          console.error("Error creating doc with setDoc:", setErr);
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

  // Upsert: Create or update a document with a specific ID (useful for singleton collections like settings)
  const upsert = async (id: string, item: Partial<T>) => {
    if (!user) return;

    // 1. Optimistic Update
    const existingIndex = data.findIndex(d => d.id === id);
    let newData: T[];
    if (existingIndex >= 0) {
      newData = data.map(d => d.id === id ? { ...d, ...item } : d);
    } else {
      newData = [{ ...item, id } as T];
    }
    updateLocal(newData);

    if (isDemo) return;

    try {
      const sanitizedItem = sanitizeForFirestore(item);
      const docRef = doc(db, 'users', user.uid, collectionName, id);
      await setDoc(docRef, {
        ...sanitizedItem,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log(`[Firestore] Upserted ${collectionName}/${id} successfully`);
    } catch (err) {
      console.error("Error upserting doc:", err);
    }
  };

  return { data, loading, error, add, update, remove, upsert };
}

/**
 * Cleanup duplicate settings documents - keeps only the document with the target ID
 * If no document with targetId exists, migrates data from the first document
 */
export async function cleanupDuplicateSettings(
  userId: string, 
  targetId: string = 'user-settings'
): Promise<{ deleted: number; migrated: boolean }> {
  const collectionRef = collection(db, 'users', userId, 'settings');
  const snapshot = await getDocs(query(collectionRef));
  
  if (snapshot.empty) {
    return { deleted: 0, migrated: false };
  }

  const docs = snapshot.docs;
  const targetDoc = docs.find(d => d.id === targetId);
  let migrated = false;

  // If target doesn't exist, migrate from first document
  if (!targetDoc && docs.length > 0) {
    const firstDoc = docs[0];
    const targetRef = doc(db, 'users', userId, 'settings', targetId);
    await setDoc(targetRef, {
      ...firstDoc.data(),
      updatedAt: serverTimestamp()
    });
    migrated = true;
    console.log(`[Cleanup] Migrated settings from ${firstDoc.id} to ${targetId}`);
  }

  // Delete all documents except the target
  const docsToDelete = docs.filter(d => d.id !== targetId);
  
  if (docsToDelete.length === 0) {
    return { deleted: 0, migrated };
  }

  // Use batched writes for efficiency (max 500 per batch)
  const batchSize = 500;
  let deleted = 0;
  
  for (let i = 0; i < docsToDelete.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = docsToDelete.slice(i, i + batchSize);
    
    chunk.forEach(d => {
      batch.delete(d.ref);
    });
    
    await batch.commit();
    deleted += chunk.length;
    console.log(`[Cleanup] Deleted ${deleted}/${docsToDelete.length} duplicate settings`);
  }

  return { deleted, migrated };
}
