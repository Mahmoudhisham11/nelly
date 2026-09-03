"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION_NAME = "nelly_users";
const STORAGE_KEY = "nelly_user_auth";

const AuthContext = createContext({
  user: null,
  role: "user",
  isAdmin: false,
  loading: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage & sync latest role with Firestore
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== "undefined") {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const parsedUser = JSON.parse(savedData);
            if (parsedUser && parsedUser.uid) {
              // Verify and refresh latest user role from Firestore
              try {
                const userDocRef = doc(db, COLLECTION_NAME, parsedUser.uid);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                  const dbData = userSnap.data();
                  const updatedUser = {
                    uid: userSnap.id,
                    id: userSnap.id,
                    displayName: dbData.displayName || parsedUser.displayName || "مستخدم",
                    email: dbData.email || parsedUser.email,
                    role: dbData.role || "user"
                  };
                  setUser(updatedUser);
                  setRole(updatedUser.role);
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
                } else {
                  // User was deleted in Firestore
                  localStorage.removeItem(STORAGE_KEY);
                  setUser(null);
                  setRole("user");
                }
              } catch (fetchErr) {
                // If offline or network error, fallback to cached local session
                console.warn("Using cached session:", fetchErr);
                setUser(parsedUser);
                setRole(parsedUser.role || "user");
              }
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 1. Email & Password Login directly via Firestore nelly_users
  const loginWithEmail = async (email, password) => {
    setLoading(true);
    try {
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanPassword = (password || "").trim();

      if (!cleanEmail || !cleanPassword) {
        return { success: false, error: "يرجى كتابة البريد الإلكتروني وكلمة المرور." };
      }

      // Query Firestore nelly_users collection for matching email
      const q = query(
        collection(db, COLLECTION_NAME), 
        where("email", "==", cleanEmail)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: "لم يتم العثور على حساب بهذا البريد الإلكتروني." };
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Verify password stored in Firestore
      if (String(userData.password) !== cleanPassword) {
        return { success: false, error: "كلمة المرور غير صحيحة، يرجى التأكد والمحاولة مجدداً." };
      }

      const userRole = userData.role || "user";
      const authenticatedUser = {
        uid: userDoc.id,
        id: userDoc.id,
        displayName: userData.displayName || cleanEmail.split("@")[0],
        email: userData.email,
        role: userRole
      };

      // Save session
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      }

      setUser(authenticatedUser);
      setRole(userRole);

      return { success: true, user: authenticatedUser };
    } catch (error) {
      console.error("Login Error:", error);
      return { 
        success: false, 
        error: "حدث خطأ أثناء الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى." 
      };
    } finally {
      setLoading(false);
    }
  };

  // 2. Email & Password Registration directly into Firestore nelly_users
  const registerWithEmail = async (name, email, password) => {
    setLoading(true);
    try {
      const cleanName = (name || "").trim();
      const cleanEmail = (email || "").trim().toLowerCase();
      const cleanPassword = (password || "").trim();

      if (!cleanName || !cleanEmail || !cleanPassword) {
        return { success: false, error: "يرجى تعبئة جميع الحقول المطلوبة." };
      }

      // Check if email is already taken in nelly_users
      const q = query(
        collection(db, COLLECTION_NAME), 
        where("email", "==", cleanEmail)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        return { success: false, error: "هذا البريد الإلكتروني مستخدم بالفعل بحساب آخر." };
      }

      // If this is the very first user registering in nelly_users, grant them admin role
      let assignedRole = "user";
      try {
        const usersCountQuery = query(collection(db, COLLECTION_NAME), limit(1));
        const usersSnapshot = await getDocs(usersCountQuery);
        if (usersSnapshot.empty) {
          assignedRole = "admin"; // First registered user becomes Admin automatically
        }
      } catch (e) {
        assignedRole = "user";
      }

      const newUserData = {
        displayName: cleanName,
        email: cleanEmail,
        password: cleanPassword, // Stored directly in Firestore as requested
        role: assignedRole,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), newUserData);

      const authenticatedUser = {
        uid: docRef.id,
        id: docRef.id,
        displayName: cleanName,
        email: cleanEmail,
        role: assignedRole
      };

      // Save session
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
      }

      setUser(authenticatedUser);
      setRole(assignedRole);

      return { success: true, user: authenticatedUser };
    } catch (error) {
      console.error("Registration Error:", error);
      return { 
        success: false, 
        error: "حدث خطأ أثناء إنشاء الحساب في قاعدة البيانات، يرجى المحاولة لاحقاً." 
      };
    } finally {
      setLoading(false);
    }
  };

  // 3. Sign Out
  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
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
