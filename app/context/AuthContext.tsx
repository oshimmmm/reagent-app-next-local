// context/AuthContext.tsx
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
  // 必要に応じて表示名やその他のカスタムフィールドを追加
  username?: string;
}

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1. AuthState 監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ログイン済みの場合
        const userData = await fetchUserData(firebaseUser);
        setUser(userData);
      } else {
        // 未ログインの場合
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Email/Password でログイン
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // サインイン後 → onAuthStateChanged が呼ばれるため、ここでは特に何もしなくてもOK
      router.push("/home");
    } catch (error) {
      console.error(error);
      alert("ログイン失敗: " + error);
      setLoading(false);
    }
  };

  // 3. ログアウト
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

  /**
   * Firestore の users コレクションから「追加情報(isAdminなど)」を取得
   * ※ 必要に応じて fields を増やせます
   */
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    // usersコレクションで、docID = uid のドキュメントを取得
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // usersコレクションにドキュメントが無いケース
      // デフォルト値にするorエラーにするなど運用次第
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        isAdmin: false,
      };
    }

    const data = userSnap.data();
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      isAdmin: data.isAdmin ?? false,
      username: data.username ?? "",
    };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
