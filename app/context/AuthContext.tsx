// app/context/AuthContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../utils/firebase";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface User {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  username?: string;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  // ▼ 従来のメール+パスワードログイン
  login: (email: string, password: string) => Promise<void>;
  // ▼ 新しく追加: ユーザー名+パスワードログイン
  loginWithUsernameAndPassword: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithUsernameAndPassword: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ---------------------------
  // 1. AuthState 監視
  // ---------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ログイン済み
        const userData = await fetchUserData(firebaseUser);
        setUser(userData);
      } else {
        // 未ログイン
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------
  // 2. メール+パスワード ログイン (従来)
  // ---------------------------
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (error) {
      console.error(error);
      alert("ログイン失敗: " + error);
      setLoading(false);
    }
  };

  // ---------------------------
  // 2.1. ユーザー名+パスワード ログイン (新規追加)
  // ---------------------------
  const loginWithUsernameAndPassword = async (username: string, password: string) => {
    try {
      setLoading(true);

      // 1) usernames/{username} ドキュメントから uid を取得
      const usernameRef = doc(db, "usernames", username);
      const usernameSnap = await getDoc(usernameRef);
      if (!usernameSnap.exists()) {
        throw new Error("このユーザー名は存在しません");
      }
      const { uid } = usernameSnap.data() as { uid: string };

      // 2) users/{uid} ドキュメントから email を取得
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        throw new Error("ユーザー情報が存在しません");
      }
      const userData = userSnap.data();
      const email = userData.email; // たとえば "oshima@example.com" など

      // 3) 取得したemail + password で Firebase Auth にログイン
      await signInWithEmailAndPassword(auth, email, password);

      router.push("/home");
    } catch (error) {
      console.error(error);
      alert("ログイン失敗: " + error);
      setLoading(false);
    }
  };

  // ---------------------------
  // 3. ログアウト
  // ---------------------------
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error(error);
      alert("ログアウト失敗: " + error);
    }
  };

  // ---------------------------
  // Firestore の ユーザー情報取得
  // ---------------------------
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        isAdmin: false,
      };
    }
    const data = snap.data();
    return {
      uid: firebaseUser.uid,
      email: data.email ?? firebaseUser.email,
      isAdmin: data.isAdmin ?? false,
      username: data.username ?? "",
    };
  };

  // ---------------------------
  // Context提供
  // ---------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithUsernameAndPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
