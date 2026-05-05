import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  impersonatedProfile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  impersonate: (targetUid: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [impersonatedProfile, setImpersonatedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              role: u.email === 'pfelipm@gmail.com' ? 'admin' : 'teacher'
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setProfile(newProfile);
          } else {
            setProfile(userDoc.data() as UserProfile);
          }
        } else {
          setProfile(null);
          setImpersonatedProfile(null);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Listen for profile changes (e.g., impersonation)
  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
        if (snapshot.exists()) {
          const newProfile = snapshot.data() as UserProfile;
          setProfile(newProfile);
          
          if (newProfile.impersonatedBy) {
            const targetDoc = await getDoc(doc(db, 'users', newProfile.impersonatedBy));
            if (targetDoc.exists()) {
              setImpersonatedProfile(targetDoc.data() as UserProfile);
            }
          } else {
            setImpersonatedProfile(null);
          }
        }
      });
      return unsubscribe;
    }
  }, [user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      alert("Error al iniciar sesión. Por favor, inténtalo de nuevo.");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const impersonate = async (targetUid: string) => {
    if (profile?.role !== 'admin') return;
    // For simplicity, we'll store the impersonated UID in the admin's profile
    // and use it in our data fetching logic.
    await setDoc(doc(db, 'users', user!.uid), { ...profile, impersonatedBy: targetUid }, { merge: true });
  };

  const stopImpersonation = async () => {
    if (!profile?.impersonatedBy) return;
    const { impersonatedBy, ...rest } = profile;
    await setDoc(doc(db, 'users', user!.uid), rest);
  };

  return (
    <AuthContext.Provider value={{ user, profile, impersonatedProfile, loading, login, logout, impersonate, stopImpersonation }}>
      {children}
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
