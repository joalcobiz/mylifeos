import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    updateProfile,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    isAdmin: boolean;
    isSystemAdmin?: boolean;
    theme?: string;
    [key: string]: any;
}

interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    role: 'Admin' | 'User';
    isSystemAdmin: boolean;
    theme: string;
    createdAt: Date;
}

export const MOCK_USERS: User[] = [];

export const isUserDeletable = (uid: string, currentUserUid?: string): boolean => {
    if (!currentUserUid) return false;
    if (uid === currentUserUid) return false;
    return true;
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    availableUsers: User[];
    isDemo: boolean;
    refreshUserProfile: () => Promise<void>;
    refreshAvailableUsers: () => Promise<void>;
    updateUserProfile: (uid: string, data: Partial<UserProfile>) => Promise<void>;
    deleteUserProfile: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapFirebaseUser = async (firebaseUser: FirebaseUser): Promise<User> => {
    let profile: UserProfile | null = null;
    
    try {
        const profileDoc = await getDoc(doc(db, 'userProfiles', firebaseUser.uid));
        if (profileDoc.exists()) {
            profile = profileDoc.data() as UserProfile;
        }
    } catch (error) {
        console.log('Could not fetch user profile, using defaults');
    }

    return {
        uid: firebaseUser.uid,
        displayName: profile?.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,
        isAdmin: profile?.role === 'Admin' || profile?.isSystemAdmin === true,
        isSystemAdmin: profile?.isSystemAdmin === true,
        theme: profile?.theme || 'blue'
    };
};

const createUserProfile = async (firebaseUser: FirebaseUser, displayName: string, isFirstUser: boolean = false): Promise<void> => {
    const profileRef = doc(db, 'userProfiles', firebaseUser.uid);
    
    await setDoc(profileRef, {
        uid: firebaseUser.uid,
        displayName: displayName,
        email: firebaseUser.email,
        role: isFirstUser ? 'Admin' : 'User',
        isSystemAdmin: isFirstUser,
        theme: 'blue',
        createdAt: new Date()
    });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const mappedUser = await mapFirebaseUser(firebaseUser);
                    setUser(mappedUser);
                } catch (error) {
                    console.error('Error mapping user:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadAvailableUsers = async () => {
            if (!user?.isAdmin) return;
            
            try {
                const profilesSnapshot = await getDocs(collection(db, 'userProfiles'));
                const users: User[] = [];
                profilesSnapshot.forEach((doc) => {
                    const data = doc.data() as UserProfile;
                    users.push({
                        uid: data.uid,
                        displayName: data.displayName,
                        email: data.email,
                        photoURL: null,
                        emailVerified: true,
                        isAnonymous: false,
                        isAdmin: data.role === 'Admin',
                        isSystemAdmin: data.isSystemAdmin,
                        theme: data.theme
                    });
                });
                setAvailableUsers(users);
            } catch (error) {
                console.log('Could not load available users');
            }
        };

        if (user) {
            loadAvailableUsers();
        }
    }, [user]);

    const signInWithCredentials = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error: any) {
            setLoading(false);
            
            let errorMessage = 'Login failed';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later';
                    break;
                default:
                    errorMessage = error.message || 'Authentication failed';
            }
            
            return { success: false, error: errorMessage };
        }
    };

    const signUp = async (email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> => {
        setLoading(true);
        try {
            const profilesSnapshot = await getDocs(collection(db, 'userProfiles'));
            const isFirstUser = profilesSnapshot.empty;

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            await updateProfile(userCredential.user, { displayName });
            
            await createUserProfile(userCredential.user, displayName, isFirstUser);
            
            return { success: true };
        } catch (error: any) {
            setLoading(false);
            
            let errorMessage = 'Registration failed';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password accounts are not enabled';
                    break;
                default:
                    errorMessage = error.message || 'Registration failed';
            }
            
            return { success: false, error: errorMessage };
        }
    };

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
            setIsDemo(false);
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error: any) {
            let errorMessage = 'Failed to send reset email';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email';
                    break;
                default:
                    errorMessage = error.message || 'Failed to send reset email';
            }
            return { success: false, error: errorMessage };
        }
    };

    const refreshUserProfile = async () => {
        if (auth.currentUser) {
            const mappedUser = await mapFirebaseUser(auth.currentUser);
            setUser(mappedUser);
        }
    };

    const refreshAvailableUsers = async () => {
        if (!user?.isAdmin) return;
        
        try {
            const profilesSnapshot = await getDocs(collection(db, 'userProfiles'));
            const users: User[] = [];
            profilesSnapshot.forEach((docSnap) => {
                const data = docSnap.data() as UserProfile;
                users.push({
                    uid: data.uid,
                    displayName: data.displayName,
                    email: data.email,
                    photoURL: null,
                    emailVerified: true,
                    isAnonymous: false,
                    isAdmin: data.role === 'Admin',
                    isSystemAdmin: data.isSystemAdmin,
                    theme: data.theme
                });
            });
            setAvailableUsers(users);
        } catch (error) {
            console.error('Could not refresh available users:', error);
        }
    };

    const updateUserProfile = async (uid: string, data: Partial<UserProfile>) => {
        try {
            const profileRef = doc(db, 'userProfiles', uid);
            await updateDoc(profileRef, data);
            await refreshAvailableUsers();
        } catch (error) {
            console.error('Failed to update user profile:', error);
            throw error;
        }
    };

    const deleteUserProfile = async (uid: string) => {
        try {
            const profileRef = doc(db, 'userProfiles', uid);
            await deleteDoc(profileRef);
            await refreshAvailableUsers();
        } catch (error) {
            console.error('Failed to delete user profile:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            signInWithCredentials, 
            signUp,
            signOut, 
            resetPassword,
            availableUsers,
            isDemo,
            refreshUserProfile,
            refreshAvailableUsers,
            updateUserProfile,
            deleteUserProfile
        }}>
            {!loading && children}
            {loading && (
                <div className="h-screen w-full flex items-center justify-center bg-gray-50 flex-col gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading LifeOS...</p>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
