import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getDb, isFirebaseConfigured } from "./firebase";
import type { Department, Gender, Subject } from "./subjects";

export type Role = "student" | "tutor" | "super_admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  department?: Department;
  subjects?: Subject[];
  studentId?: string;
  gender?: Gender;
  acknowledgedLegal?: { privacy?: number; terms?: number };
  createdAt?: number;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  configured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      unsubProfile?.();
      unsubProfile = undefined;
      if (u) {
        // Live profile so gender/legal acknowledgement updates immediately.
        unsubProfile = onSnapshot(
          doc(getDb(), "users", u.uid),
          (snap) => {
            setProfile(snap.exists() ? ({ uid: u.uid, ...(snap.data() as Omit<UserProfile, "uid">) }) : null);
            setLoading(false);
          },
          (err) => {
            console.error("Failed to load profile", err);
            setProfile(null);
            setLoading(false);
          },
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      unsub();
      unsubProfile?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, configured: isFirebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
