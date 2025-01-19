"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  deleteUser as firebaseDeleteUser,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { auth, db } from "../utils/firebase";

/** Firestore上のデータ構造 */
interface UserData {
  username: string;
  email: string;
  isAdmin: boolean;
}

/** 一覧表示用の型 */
interface UserListItem extends UserData {
  uid: string; // FirestoreドキュメントID (== AuthのUID)
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // =========================
  // 1) 管理者以外はアクセス禁止
  // =========================
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // 未ログインなら /login へ
        router.push("/login");
      } else if (!user.isAdmin) {
        // ログイン済みでも管理者でなければ /home 等へ
        router.push("/home");
      }
    }
  }, [loading, user, router]);

  // =========================
  // 2) 新規ユーザー登録用
  // =========================
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regIsAdmin, setRegIsAdmin] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  // =========================
  // 3) ユーザー一覧・編集用
  // =========================
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // =========================
  // 4) 初回読み込み時に全ユーザーを取得
  // =========================
  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const list: UserListItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as UserData;
        return {
          uid: docSnap.id,
          username: data.username,
          email: data.email,
          isAdmin: data.isAdmin,
        };
      });
      setUserList(list);
    } catch (err: unknown) {
      console.error("ユーザー取得エラー:", err);
      // 必要であればエラーメッセージをセット
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // =========================
  // 5) 新規ユーザー登録
  // =========================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    // A) username重複チェック
    const usernameRef = doc(db, "usernames", regUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      setRegError("このユーザー名はすでに使用されています。");
      return;
    }

    try {
      // B) メールアドレスを仮生成
      const genEmail = `${regUsername}@example.com`;

      // C) Authでユーザー作成
      const cred = await createUserWithEmailAndPassword(
        auth,
        genEmail,
        regPassword
      );
      const newUid = cred.user.uid;

      // D) Firestore /users/{uid}
      await setDoc(doc(db, "users", newUid), {
        username: regUsername,
        email: genEmail,
        isAdmin: regIsAdmin,
      });

      // E) /usernames/{username} に uid を保存
      await setDoc(doc(db, "usernames", regUsername), {
        uid: newUid,
      });

      setRegSuccess("ユーザー登録が完了しました。");
      setRegUsername("");
      setRegPassword("");
      setRegIsAdmin(false);

      // 再取得
      await fetchUsers();
    } catch (err: unknown) {
      console.error("登録エラー:", err);
      if (err instanceof Error) {
        setRegError("登録に失敗しました: " + err.message);
      } else {
        setRegError("登録に失敗しました。");
      }
    }
  };

  // =========================
  // 6) ユーザー編集 (isAdmin更新)
  // =========================
  const handleUpdateUser = async () => {
    setEditError("");
    setEditSuccess("");

    if (!selectedUsername) {
      setEditError("ユーザー名を選択してください。");
      return;
    }

    try {
      // A) /usernames/{selectedUsername} → uid取得
      const usernameDocRef = doc(db, "usernames", selectedUsername);
      const usernameSnap = await getDoc(usernameDocRef);
      if (!usernameSnap.exists()) {
        setEditError("ユーザーが見つかりません。");
        return;
      }
      const { uid } = usernameSnap.data() as { uid: string };

      // B) /users/{uid} の isAdmin を更新
      await updateDoc(doc(db, "users", uid), {
        isAdmin: editIsAdmin,
      });

      setEditSuccess("ユーザー情報を更新しました。");
      setSelectedUsername("");
      setEditIsAdmin(false);

      // 再取得
      await fetchUsers();
    } catch (err: unknown) {
      console.error("更新エラー:", err);
      if (err instanceof Error) {
        setEditError("更新に失敗しました: " + err.message);
      } else {
        setEditError("更新に失敗しました。");
      }
    }
  };

  // =========================
  // 7) ユーザー削除
  // =========================
  const handleDeleteUser = async () => {
    setEditError("");
    setEditSuccess("");

    if (!selectedUsername) {
      setEditError("削除するユーザーを選択してください。");
      return;
    }

    const confirmDelete = window.confirm("本当に削除しますか？");
    if (!confirmDelete) return;

    try {
      // A) /usernames/{selectedUsername} → uid取得
      const usernameDocRef = doc(db, "usernames", selectedUsername);
      const usernameSnap = await getDoc(usernameDocRef);
      if (!usernameSnap.exists()) {
        setEditError("ユーザーが見つかりません。");
        return;
      }
      const { uid } = usernameSnap.data() as { uid: string };

      // B) /users/{uid} を削除
      await deleteDoc(doc(db, "users", uid));

      // C) /usernames/{selectedUsername} を削除
      await deleteDoc(usernameDocRef);

      // D) Authのユーザー削除
      if (uid === user?.uid && auth.currentUser) {
        await firebaseDeleteUser(auth.currentUser);
      }

      setEditSuccess("ユーザーを削除しました。");
      setSelectedUsername("");
      setEditIsAdmin(false);

      // 再取得
      await fetchUsers();
    } catch (err: unknown) {
      console.error("削除エラー:", err);
      if (err instanceof Error) {
        setEditError("削除に失敗しました: " + err.message);
      } else {
        setEditError("削除に失敗しました。");
      }
    }
  };

  // =========================
  // JSX: 管理画面UI
  // =========================
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* 新規ユーザー登録フォーム */}
      <div className="bg-white p-6 rounded shadow-md max-w-md mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-4">新規ユーザー登録</h2>

        {regError && <p className="text-red-500">{regError}</p>}
        {regSuccess && <p className="text-green-500">{regSuccess}</p>}

        <form onSubmit={handleRegister} className="space-y-4 mt-4">
          <div>
            <label className="block font-semibold mb-1">ユーザー名</label>
            <input
              type="text"
              className="border w-full px-3 py-2"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">パスワード</label>
            <input
              type="password"
              className="border w-full px-3 py-2"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">ユーザー種別</label>
            <select
              className="border w-full px-3 py-2"
              value={regIsAdmin ? "true" : "false"}
              onChange={(e) => setRegIsAdmin(e.target.value === "true")}
            >
              <option value="false">一般ユーザー</option>
              <option value="true">管理者</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            登録
          </button>
        </form>
      </div>

      {/* ユーザー一覧 + 編集 */}
      <div className="bg-white p-6 rounded shadow-md max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">ユーザー編集</h2>

        {editError && <p className="text-red-500">{editError}</p>}
        {editSuccess && <p className="text-green-500">{editSuccess}</p>}

        {/* ユーザー選択 */}
        <label className="block font-semibold mb-1">ユーザー選択</label>
        <select
          className="border w-full px-3 py-2 mb-4"
          value={selectedUsername}
          onChange={(e) => setSelectedUsername(e.target.value)}
        >
          <option value="">選択してください</option>
          {userList.map((u) => (
            <option key={u.uid} value={u.username}>
              {u.username} {u.isAdmin ? "(管理者)" : "(一般)"}
            </option>
          ))}
        </select>

        {/* ユーザー種別変更 */}
        <label className="block font-semibold mb-1">ユーザー種別</label>
        <select
          className="border w-full px-3 py-2 mb-4"
          value={editIsAdmin ? "true" : "false"}
          onChange={(e) => setEditIsAdmin(e.target.value === "true")}
        >
          <option value="false">一般ユーザー</option>
          <option value="true">管理者</option>
        </select>

        <div className="flex space-x-4">
          <button
            onClick={handleUpdateUser}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1"
          >
            更新
          </button>
          <button
            onClick={handleDeleteUser}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex-1"
          >
            削除
          </button>
        </div>
      </div>

      {/* 全ユーザー一覧 (オマケ表示) */}
      <div className="max-w-2xl mx-auto mt-8">
        <h3 className="text-xl font-semibold mb-2">登録済みユーザー一覧</h3>
        <ul className="list-disc list-inside">
          {userList.map((u) => (
            <li key={u.uid}>
              <span className="font-bold">{u.username}</span> (
              {u.email}) → {u.isAdmin ? "管理者" : "一般ユーザー"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
