import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const api = useMemo(
    () => ({
      user: user ?? null,
      loading: user === undefined,

      async register(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName?.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        return cred.user;
      },

      async login(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        return cred.user;
      },

      async logout() {
        await signOut(auth);
      },

      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email.trim());
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

// Turns Firebase's auth/xxx-yyy error codes into short, human messages.
export function authErrorMessage(err) {
  const code = err?.code ?? "";
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with that email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a bit and try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return map[code] ?? "Something went wrong. Please try again.";
}
