"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp 
} from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  role: "user",
  isAdmin: false,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);

  // Sync real user with Firestore
  const syncUserWithFirestore = async (firebaseUser, customName = null) => {
    if (!firebaseUser) return "user";

    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return data.role || "user";
      } else {
        // If this is the very first user registering in the system, grant them admin role
        let assignedRole = "user";
        try {
          const usersQuery = query(collection(db, "users"), limit(1));
          const usersSnapshot = await getDocs(usersQuery);
          if (usersSnapshot.empty) {
            assignedRole = "admin"; // First user becomes Admin automatically
          }
        } catch (e) {
          assignedRole = "user";
        }

        const newUserData = {
          uid: firebaseUser.uid,
          displayName: customName || firebaseUser.displayName || "مستخدم مخزن",
          email: firebaseUser.email,
          role: assignedRole,
          createdAt: serverTimestamp(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newUserData);
        return assignedRole;
      }
    } catch (err) {
      console.error("Firestore user sync error:", err);
      return "user";
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let userRole = "user";
        try {
          userRole = await syncUserWithFirestore(currentUser);
        } catch (e) {}

        const userData = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "مستخدم المخزن",
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          role: userRole,
          isGoogle: currentUser.providerData.some(p => p.providerId === "google.com")
        };
        setUser(userData);
        setRole(userRole);
      } else {
        setUser(null);
        setRole("user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Google Sign In
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const userRole = await syncUserWithFirestore(u);

      const userData = {
        uid: u.uid,
        displayName: u.displayName || "مستخدم مخزن Nelly",
        email: u.email,
        photoURL: u.photoURL,
        role: userRole,
        isGoogle: true
      };
      setUser(userData);
      setRole(userRole);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // 2. Email & Password Login
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = result.user;
      const userRole = await syncUserWithFirestore(u);

      const userData = {
        uid: u.uid,
        displayName: u.displayName || email.split("@")[0],
        email: u.email,
        photoURL: null,
        role: userRole
      };
      setUser(userData);
      setRole(userRole);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Email Login Error:", error);
      let arabicMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      if (error.code === "auth/user-not-found") arabicMsg = "لم يتم العثور على حساب بهذا البريد.";
      if (error.code === "auth/wrong-password") arabicMsg = "كلمة المرور غير صحيحة.";
      if (error.code === "auth/invalid-email") arabicMsg = "صيغة البريد الإلكتروني غير صالحة.";
      if (error.code === "auth/invalid-credential") arabicMsg = "بيانات تسجيل الدخول غير صحيحة.";
      return { success: false, error: arabicMsg };
    } finally {
      setLoading(false);
    }
  };

  // 3. Email & Password Registration
  const registerWithEmail = async (name, email, password) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const u = result.user;

      if (name) {
        await updateProfile(u, { displayName: name.trim() });
      }

      const userRole = await syncUserWithFirestore(u, name.trim());

      const userData = {
        uid: u.uid,
        displayName: name.trim() || email.split("@")[0],
        email: u.email,
        photoURL: null,
        role: userRole
      };
      setUser(userData);
      setRole(userRole);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Registration Error:", error);
      let arabicMsg = "تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.";
      if (error.code === "auth/email-already-in-use") arabicMsg = "هذا البريد الإلكتروني مستخدم بالفعل.";
      if (error.code === "auth/weak-password") arabicMsg = "كلمة المرور ضعيفة (يجب ألا تقل عن 6 أحرف).";
      if (error.code === "auth/invalid-email") arabicMsg = "صيغة البريد الإلكتروني غير صالحة.";
      return { success: false, error: arabicMsg };
    } finally {
      setLoading(false);
    }
  };

  // 4. Real Sign Out
  const logout = async () => {
    setLoading(true);
    try {
      await fbSignOut(auth);
      setUser(null);
      setRole("user");
    } catch (error) {
      console.error("Sign-out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      isAdmin, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
