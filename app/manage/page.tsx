"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../utils/firebase";

interface Reagent {
  productNumber: string;
  name: string;
  stock: number;
  valueStock?: number; // 月末残量の追加
}

export default function ManagePage() {
  const { user } = useAuth();
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedReagent, setSelectedReagent] = useState<Reagent | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [newValueStock, setNewValueStock] = useState<number | undefined>(undefined);

  // ▼ 編集フォームを参照するためのrefを作成
  const editFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      // 管理者でなければリダイレクト等(省略)
    }
    const fetchReagents = async () => {
      const colRef = collection(db, "reagents");
      const snapshot = await getDocs(colRef);
      const list: Reagent[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          productNumber: docSnap.id,
          name: d.name || "",
          stock: d.stock || 0,
          valueStock: d.valueStock || undefined,
        });
      });
      setReagents(list);
    };
    fetchReagents();
  }, [user]);

  const handleSelect = (r: Reagent) => {
    setSelectedReagent(r);
    setNewStock(r.stock);
    setNewValueStock(r.valueStock);
  
    setTimeout(() => {
      if (editFormRef.current) {
        // 1) 要素のトップ座標を取得
        const rect = editFormRef.current.getBoundingClientRect();
        // 2) 現在のスクロール量を考慮し、ページ全体からのオフセットを計算
        const elementTop = rect.top + window.scrollY;
  
        // 3) ヘッダーの高さなど分だけ引く (例: 100px)
        const offset = 100; 
        const scrollTarget = elementTop - offset;
  
        // 4) スムーズスクロール実行
        window.scrollTo({
          top: scrollTarget,
          behavior: "smooth",
        });
      }
    }, 0);
  };
  

  const handleUpdate = async () => {
    if (!selectedReagent) return;

    const reagentRef = doc(db, "reagents", selectedReagent.productNumber);
    await updateDoc(reagentRef, {
      stock: newStock,
      valueStock: newValueStock || null,
    });

    const historiesRef = collection(db, "histories");
    await addDoc(historiesRef, {
      productNumber: selectedReagent.productNumber,
      actionType: "update",
      date: serverTimestamp(),
      user: user?.email || user?.uid || "unknown",
      oldStock: selectedReagent.stock,
      newStock: newStock,
      oldValueStock: selectedReagent.valueStock ?? null,
      newValueStock: newValueStock ?? null,
    });

    alert("更新しました");
  };

  const handleDelete = async () => {
    if (!selectedReagent) return;
    const reagentRef = doc(db, "reagents", selectedReagent.productNumber);
    await deleteDoc(reagentRef);
    alert("削除しました");

    setReagents((prev) =>
      prev.filter((r) => r.productNumber !== selectedReagent.productNumber)
    );
    setSelectedReagent(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ページタイトル */}
      <h1 className="text-3xl font-bold text-center mb-8">試薬情報編集</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ▼ 試薬一覧 */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">試薬一覧</h2>
          {reagents.length === 0 ? (
            <p className="text-gray-500">試薬がありません。</p>
          ) : (
            <ul className="space-y-2">
              {reagents.map((r) => (
                <li key={r.productNumber}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2 rounded-lg 
                               hover:bg-blue-50 text-blue-600 
                               transition-colors underline"
                  >
                    {r.name}{" "}
                    <span className="text-sm text-gray-600">
                      (在庫: {r.stock})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ▼ 編集フォームカード */}
        <div
          ref={editFormRef} // ▼ refを付ける
          className="bg-white shadow-md rounded-lg p-6"
        >
          {selectedReagent ? (
            <>
              <h2 className="text-xl font-semibold mb-4">
                {selectedReagent.name} の編集
              </h2>

              {/* 在庫数 */}
              <div className="mb-4">
                <label className="block mb-1 font-medium">在庫数</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full 
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* 月末残量 */}
              <div className="mb-6">
                <label className="block mb-1 font-medium">月末残量</label>
                <input
                  type="number"
                  value={newValueStock !== undefined ? newValueStock : ""}
                  onChange={(e) => setNewValueStock(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full
                             focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* ボタン */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleUpdate}
                  className="bg-green-600 text-white px-4 py-2 rounded 
                             hover:bg-green-700 transition-colors"
                >
                  更新
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded 
                             hover:bg-red-700 transition-colors"
                >
                  試薬情報削除
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              左の一覧から編集する試薬を選択してください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
