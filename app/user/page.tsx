"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface UserData {
  username: string;
  email: string;
  isAdmin: boolean;
}

interface UserListItem extends UserData {
  id: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // 管理者以外はアクセス不可
  useEffect(() => {
    if (status !== "loading") {
      if (!session) {
        router.push("/login");
      } else if (!session.user?.isAdmin) {
        router.push("/home");
      }
    }
  }, [session, status, router]);

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regIsAdmin, setRegIsAdmin] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("ユーザー情報の取得に失敗しました");
      }
      const list: UserListItem[] = await res.json();
      setUserList(list);
    } catch (err: unknown) {
      console.error("ユーザー取得エラー:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (userList.find((u) => u.username === regUsername)) {
      setRegError("このユーザー名はすでに使用されています。");
      return;
    }

    try {
      const genEmail = `${regUsername}`;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          isAdmin: regIsAdmin,
          email: genEmail,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "登録に失敗しました");
      }
      setRegSuccess("ユーザー登録が完了しました。");
      setRegUsername("");
      setRegPassword("");
      setRegIsAdmin(false);
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

  const handleUpdateUser = async () => {
    setEditError("");
    setEditSuccess("");

    if (!selectedUsername) {
      setEditError("ユーザー名を選択してください。");
      return;
    }
    const selectedUser = userList.find((u) => u.username === selectedUsername);
    if (!selectedUser) {
      setEditError("ユーザーが見つかりません。");
      return;
    }
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: editIsAdmin }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "更新に失敗しました");
      }
      setEditSuccess("ユーザー情報を更新しました。");
      setSelectedUsername("");
      setEditIsAdmin(false);
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

  const handleDeleteUser = async () => {
    setEditError("");
    setEditSuccess("");

    if (!selectedUsername) {
      setEditError("削除するユーザーを選択してください。");
      return;
    }
    const confirmDelete = window.confirm("本当に削除しますか？");
    if (!confirmDelete) return;

    const selectedUser = userList.find((u) => u.username === selectedUsername);
    if (!selectedUser) {
      setEditError("ユーザーが見つかりません。");
      return;
    }
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "削除に失敗しました");
      }
      setEditSuccess("ユーザーを削除しました。");
      setSelectedUsername("");
      setEditIsAdmin(false);
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
            <option key={u.id} value={u.username}>
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

      {/* 登録済みユーザー一覧 */}
      <div className="max-w-2xl mx-auto mt-8">
        <h3 className="text-xl font-semibold mb-2">登録済みユーザー一覧</h3>
        <ul className="list-disc list-inside">
          {userList.map((u) => (
            <li key={u.id}>
              <span className="font-bold">{u.username}</span> ({u.email}) →{" "}
              {u.isAdmin ? "管理者" : "一般ユーザー"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
