// app/manage/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
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
  const [newValueStock, setNewValueStock] = useState<number | undefined>(undefined); // 月末残量の状態

  useEffect(() => {
    if (!user?.isAdmin) {
      // 管理者でなければリダイレクトする等(ここでは省略)
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
          valueStock: d.valueStock || undefined, // Firestoreから月末残量を取得
        });
      });
      setReagents(list);
    };
    fetchReagents();
  }, [user]);

  const handleSelect = (r: Reagent) => {
    setSelectedReagent(r);
    setNewStock(r.stock);
    setNewValueStock(r.valueStock); // 月末残量を初期化
  };

  const handleUpdate = async () => {
    if (!selectedReagent) return;
    const reagentRef = doc(db, "reagents", selectedReagent.productNumber);
    await updateDoc(reagentRef, {
      stock: newStock,
      valueStock: newValueStock || null, // 月末残量をFirestoreに保存
    });
    alert("更新しました");
  };

  const handleDelete = async () => {
    if (!selectedReagent) return;
    const reagentRef = doc(db, "reagents", selectedReagent.productNumber);
    await deleteDoc(reagentRef);
    alert("削除しました");
    setSelectedReagent(null);
    setReagents(reagents.filter((r) => r.productNumber !== selectedReagent.productNumber));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">試薬情報編集</h1>
      <div className="flex space-x-4">
        <div className="w-1/2">
          <h2 className="text-xl font-semibold mb-2">試薬一覧</h2>
          <ul>
            {reagents.map((r) => (
              <li key={r.productNumber} className="mb-2">
                <button
                  onClick={() => handleSelect(r)}
                  className="underline text-blue-600"
                >
                  {r.name} (在庫: {r.stock})
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/2">
          {selectedReagent && (
            <div className="p-4 border rounded">
              <h2 className="text-xl font-semibold mb-2">
                {selectedReagent.name} の編集
              </h2>
              <div className="mb-4">
                <label className="block mb-1">在庫数</label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="border px-3 py-2 w-full"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1">月末残量</label>
                <input
                  type="number"
                  value={newValueStock !== undefined ? newValueStock : ""}
                  onChange={(e) => setNewValueStock(Number(e.target.value))}
                  className="border px-3 py-2 w-full"
                />
              </div>
              <div className="flex space-x-2">
                <button onClick={handleUpdate} className="bg-green-600 text-white px-4 py-2">
                  更新
                </button>
                <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2">
                  試薬情報削除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
